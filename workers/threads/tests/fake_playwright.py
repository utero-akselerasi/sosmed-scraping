"""
Fake Playwright (page/context/browser) untuk unit test Threads.

Meniru subset API Playwright yang dipakai threads/session.py,
threads/profile.py, threads/publisher.py - cukup untuk mensimulasikan
skenario sukses / expired / timeout / upload gagal tanpa browser asli.
"""

from __future__ import annotations

import json
from typing import Any, Callable, Dict, List, Optional


class FakeTimeout(Exception):
    """Meniru Playwright TimeoutError."""


class FakeLocator:
    def __init__(self, page: "FakePage", selector: str):
        self.page = page
        self.selector = selector
        self.first = self

    async def count(self) -> int:
        return 1 if self.selector in self.page.visible_selectors else 0

    async def is_visible(self) -> bool:
        return self.selector in self.page.visible_selectors

    async def click(self, timeout: Optional[int] = None) -> None:
        if self.selector not in self.page.visible_selectors:
            raise FakeTimeout(f"click: {self.selector} tidak terlihat")
        behavior = self.page.click_behaviors.get(self.selector)
        if behavior:
            behavior(self)

    async def fill(self, value: str) -> None:
        self.page.last_fill[self.selector] = value

    async def set_input_files(self, path: str) -> None:
        if self.page.set_input_files_error:
            raise FakeTimeout("set_input_files gagal (simulasi)")
        self.page.last_file[self.selector] = path
        self.page.context.files_uploaded[self.selector] = path

    async def wait_for(
        self, state: str = "visible", timeout: Optional[int] = None
    ) -> None:
        visible = self.selector in self.page.visible_selectors
        if state == "hidden":
            ok = not visible
        else:  # visible / attached: selector harus ADA
            ok = visible
        if not ok:
            raise FakeTimeout(
                f"wait_for {state}: {self.selector} (timeout={timeout})"
            )

    async def get_attribute(self, name: str) -> Optional[str]:
        attrs = self.page.attributes.get(self.selector, {})
        return attrs.get(name)

    async def inner_text(self) -> str:
        return self.page.texts.get(self.selector, "")

    async def evaluate_all(self, js: str) -> list:
        """Fake locator.evaluate_all - mengembalikan data yang sudah
        disiapkan test (page.eval_all[selector]). Ekspresi JS asli
        diabaikan; test bertanggung jawab menyediakan hasil yang
        seharusnya dikembalikan Playwright asli untuk selector itu."""
        return list(self.page.eval_all.get(self.selector, []))


class FakePage:
    def __init__(
        self,
        context: "FakeContext",
        url: str = "about:blank",
        visible_selectors: Optional[set] = None,
        attributes: Optional[Dict[str, Dict[str, str]]] = None,
        texts: Optional[Dict[str, str]] = None,
        eval_all: Optional[Dict[str, list]] = None,
        click_behaviors: Optional[Dict[str, Callable]] = None,
        goto_url: Optional[str] = None,
        set_input_files_error: bool = False,
    ):
        self.context = context
        self.url = url
        self.goto_url = goto_url  # jika diset, goto selalu mendarat di URL ini (simulasi redirect)
        self.visible_selectors = set(visible_selectors or [])
        self.attributes = attributes or {}
        self.texts = texts or {}
        self.eval_all = eval_all or {}
        self.click_behaviors = click_behaviors or {}
        self.set_input_files_error = set_input_files_error
        self.last_fill: Dict[str, str] = {}
        self.last_file: Dict[str, str] = {}
        self.closed = False

    async def goto(self, url: str, wait_until: str = "load", timeout: Optional[int] = None) -> None:
        if self.context.goto_fail_times > 0:
            self.context.goto_fail_times -= 1
            raise FakeTimeout(f"goto {url} gagal (simulasi)")
        self.url = self.goto_url if self.goto_url is not None else url

    def locator(self, selector: str) -> FakeLocator:
        return FakeLocator(self, selector)

    async def close(self) -> None:
        self.closed = True

    async def wait_for_timeout(self, ms: int) -> None:
        import asyncio

        await asyncio.sleep(0)


class FakeContext:
    def __init__(
        self,
        page: Optional[FakePage] = None,
        cookies: Optional[List[Dict[str, Any]]] = None,
        default_timeout: int = 30000,
        goto_fail_times: int = 0,
        goto_url: Optional[str] = None,
    ):
        self._page = page or FakePage(self, url="about:blank", goto_url=goto_url)
        self.cookie_list = cookies if cookies is not None else []
        self.default_timeout = default_timeout
        self.goto_fail_times = goto_fail_times
        self.added_cookies: List[Dict[str, Any]] = []
        self.files_uploaded: Dict[str, str] = {}
        self.closed = False

    async def new_page(self) -> FakePage:
        return FakePage(
            self,
            url=self._page.url,
            goto_url=self._page.goto_url,
            visible_selectors=set(self._page.visible_selectors),
            attributes=dict(self._page.attributes),
            texts=dict(self._page.texts),
            eval_all=dict(self._page.eval_all),
            click_behaviors=dict(self._page.click_behaviors),
            set_input_files_error=self._page.set_input_files_error,
        )

    async def cookies(self, url: str = "") -> List[Dict[str, Any]]:
        return list(self.cookie_list)

    async def add_cookies(self, cookies: List[Dict[str, Any]]) -> None:
        self.added_cookies.extend(cookies)
        names = {c.get("name") for c in self.cookie_list}
        for c in cookies:
            if c.get("name") not in names:
                self.cookie_list.append(c)

    async def storage_state(self, path: str = "") -> Any:
        data = {"cookies": self.cookie_list, "origins": []}
        if path:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f)
        return data

    async def close(self) -> None:
        self.closed = True


class FakeBrowser:
    def __init__(self, context: Optional[FakeContext] = None, goto_url: Optional[str] = None):
        self._context = context or FakeContext()
        self.goto_url = goto_url

    async def start(self) -> None:
        pass

    async def new_context(self, **kwargs) -> FakeContext:
        # Simulasi Playwright: storage_state mengisi cookie context baru
        storage_state = kwargs.get("storage_state")
        if storage_state:
            try:
                with open(storage_state, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return FakeContext(
                    cookies=data.get("cookies") or [],
                    goto_url=self.goto_url,
                )
            except (OSError, json.JSONDecodeError):
                return FakeContext(goto_url=self.goto_url)
        return self._context

    async def close(self) -> None:
        pass
