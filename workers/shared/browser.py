"""
Playwright Browser Manager - shared lifecycle untuk worker berbasis browser.

Menangani launch Chromium, pembuatan context, dan pemulihan saat proses
browser crash/terputus. Dipakai oleh Facebook worker; worker lain yang
memakai Playwright di masa depan (mis. resolusi Google News di website
scraper) bisa memakai modul yang sama.
"""

from __future__ import annotations

from typing import Any, Optional

from loguru import logger


class PlaywrightManager:
    """Lifecycle Playwright: launch, context, recovery, close."""

    def __init__(
        self,
        headless: bool = True,
        timeout_ms: int = 30000,
        args: Optional[list] = None,
        user_agent: Optional[str] = None,
        locale: Optional[str] = None,
    ):
        self.headless = headless
        self.timeout_ms = timeout_ms
        self.args = args if args is not None else ["--no-sandbox"]
        self.user_agent = user_agent
        self.locale = locale
        self._playwright: Any = None
        self._browser: Any = None

    @property
    def is_running(self) -> bool:
        """Browser masih terhubung dan bisa dipakai."""
        return bool(
            self._playwright
            and self._browser
            and self._browser.is_connected()
        )

    async def start(self) -> None:
        """Launch Playwright + Chromium (headless sesuai config)."""
        from playwright.async_api import async_playwright

        self._playwright = await async_playwright().start()
        await self._launch_browser()

    async def _launch_browser(self) -> None:
        self._browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=self.args,
        )
        logger.debug(f"Playwright Chromium launched (headless={self.headless})")

    async def ensure_running(self) -> None:
        """Relaunch browser jika proses crash / terputus."""
        if self.is_running:
            return
        logger.warning("Browser terputus - merelaunch Playwright...")
        try:
            await self._browser.close()
        except Exception:
            pass
        try:
            await self._playwright.stop()
        except Exception:
            pass
        self._browser = None
        self._playwright = None
        await self.start()

    async def new_context(self, **kwargs) -> Any:
        """Buat BrowserContext baru; relaunch dulu jika browser mati."""
        if not self.is_running:
            await self.ensure_running()
        options: dict = {}
        if self.user_agent:
            options["user_agent"] = self.user_agent
        if self.locale:
            options["locale"] = self.locale
        options.update(kwargs)
        context = await self._browser.new_context(**options)
        context.set_default_timeout(self.timeout_ms)
        context.set_default_navigation_timeout(self.timeout_ms)
        return context

    async def close(self) -> None:
        """Tutup browser dan Playwright dengan aman."""
        for coro in (
            self._browser.close() if self._browser else None,
            self._playwright.stop() if self._playwright else None,
        ):
            if coro is None:
                continue
            try:
                await coro
            except Exception:
                pass
        self._browser = None
        self._playwright = None
        logger.debug("Playwright ditutup")
