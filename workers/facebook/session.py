"""
Manajemen sesi browser Facebook (persistent).

Setelah cookie dimuat dan sesi terverifikasi, storage state Playwright
disimpan ke facebook_state.json agar run berikutnya lebih cepat (tidak
perlu membuka ulang facebook.com untuk verifikasi).

Alur:
1. Jika facebook_state.json ada DAN cookie sesinya masih valid -> pakai
   storage state ("Session restored.").
2. Jika tidak ada / invalid / kedaluwarsa -> bangun ulang dari file cookie
   Netscape (FacebookCookieManager), verifikasi login, lalu simpan state
   baru otomatis.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Optional

from loguru import logger

from shared.browser import PlaywrightManager
from shared.cookies import parse_netscape_cookies

from .cookies import FacebookCookieManager, FacebookSessionInvalid

SESSION_COOKIE_NAMES = ("c_user", "xs")
FACEBOOK_HOME = "https://www.facebook.com/"


class FacebookSession:
    """Sesi autentikasi Facebook dengan persistensi storage state."""

    def __init__(
        self,
        config,
        cookie_manager: FacebookCookieManager,
    ):
        self.config = config
        self.cookie_manager = cookie_manager
        self.storage_state_file: Path = config.storage_state_file
        self._context: Optional[Any] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_context(self, browser: PlaywrightManager) -> Any:
        """Dapatkan BrowserContext yang terautentikasi (state atau cookies)."""
        if self.storage_state_file.exists():
            context = await self._restore_from_state(browser)
            if context is not None:
                self._context = context
                return context
            logger.warning(
                "Storage state tidak valid/kedaluwarsa - "
                "membangun ulang dari file cookies..."
            )

        context = await self._build_from_cookies(browser)
        self._context = context
        return context

    async def save_state(self, context: Optional[Any] = None) -> None:
        """Simpan storage state saat ini ke facebook_state.json."""
        context = context or self._context
        if context is None:
            return
        try:
            self.storage_state_file.parent.mkdir(parents=True, exist_ok=True)
            await context.storage_state(path=str(self.storage_state_file))
            logger.info(
                f"Storage state disimpan: {self.storage_state_file}"
            )
        except Exception as e:
            logger.warning(f"Gagal menyimpan storage state: {e}")

    async def close_context(self) -> None:
        if self._context is not None:
            try:
                await self._context.close()
            except Exception:
                pass
            self._context = None

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _restore_from_state(self, browser: PlaywrightManager) -> Optional[Any]:
        """Coba restore context dari storage state. None jika gagal/kedaluwarsa."""
        logger.info("Loading storage state...")
        try:
            state = json.loads(self.storage_state_file.read_text("utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            logger.warning(f"Storage state tidak terbaca ({e})")
            return None

        if not self._state_has_valid_session(state):
            return None

        try:
            context = await browser.new_context(
                storage_state=str(self.storage_state_file)
            )
        except Exception as e:
            logger.warning(f"Gagal restore storage state ({e})")
            return None

        if await self.is_logged_in(context):
            logger.info("Session restored.")
            return context

        try:
            await context.close()
        except Exception:
            pass
        return None

    def _state_has_valid_session(self, state: dict) -> bool:
        """Cek cookie sesi (c_user/xs) di storage state dan kedaluwarsanya."""
        cookies = state.get("cookies") or []
        now = time.time()
        found: dict = {}
        for c in cookies:
            if c.get("name") in SESSION_COOKIE_NAMES:
                found[c["name"]] = c
        if not all(name in found for name in SESSION_COOKIE_NAMES):
            return False
        for c in found.values():
            expires = c.get("expires", 0) or 0
            # Playwright bisa mengekspor expires=-1 untuk cookie sesi
            if 0 < expires < now:
                return False
        return True

    async def _build_from_cookies(self, browser: PlaywrightManager) -> Any:
        """Bangun context baru dari file cookie Netscape + verifikasi login."""
        playwright_cookies = self.cookie_manager.load_playwright_cookies()
        parsed = parse_netscape_cookies(self.config.cookies_file)
        self.cookie_manager.validate_parsed(parsed)

        context = await browser.new_context(
            viewport={"width": 1280, "height": 800}
        )
        await context.add_cookies(playwright_cookies)

        await self._verify_login(context)

        # Sesuai spec: simpan storage state agar run berikutnya lebih cepat
        await self.save_state(context)
        return context

    async def _verify_login(self, context: Any) -> None:
        """Buka facebook.com dan pastikan sesi benar-benar login.

        Mengecek cookie sesi di context + tidak diarahkan ke halaman login.
        """
        page = await context.new_page()
        try:
            await page.goto(
                FACEBOOK_HOME,
                wait_until="domcontentloaded",
                timeout=self.config.timeout_ms,
            )
        except Exception as e:
            await page.close()
            raise FacebookSessionInvalid(
                f"Gagal membuka facebook.com untuk verifikasi sesi: {e}"
            ) from e

        try:
            has_session = await self._context_has_session_cookies(context)
            login_wall = (
                "login" in page.url
                or await page.locator('input[name="email"]').count() > 0
            )
            if login_wall or not has_session:
                raise FacebookSessionInvalid(
                    "Sesi Facebook TIDAK valid - halaman meminta login. "
                    "Cookie tidak dikenali Facebook.\n"
                    "Ekspor ulang cookie (pastikan SUDAH login di browser) "
                    f"dan ganti isi {self.config.cookies_file}."
                )
            logger.info("Sesi Facebook terverifikasi (login aktif).")
        finally:
            await page.close()

    async def _context_has_session_cookies(self, context: Any) -> bool:
        cookies = await context.cookies(FACEBOOK_HOME)
        names = {c["name"] for c in cookies}
        return all(name in names for name in SESSION_COOKIE_NAMES)

    async def is_logged_in(self, context: Any) -> bool:
        """Cek cepat (tanpa navigasi) apakah context masih login."""
        try:
            return await self._context_has_session_cookies(context)
        except Exception:
            return False

    async def rebuild(self, browser: PlaywrightManager) -> Any:
        """Tutup context lama dan bangun ulang dari cookie file."""
        await self.close_context()
        self._context = await self._build_from_cookies(browser)
        return self._context
