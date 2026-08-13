"""
Manajemen sesi browser Threads (persistent, reusable).

Storage state (storage.json) adalah SATU-SATUNYA sumber session utama:

1. Jika storage state ada DAN terverifikasi live -> restore, health
   check, pakai ("Session restored.").
2. Jika storage tidak ada -> status NO_SESSION (ThreadsAuthRequiredError).
3. Jika storage invalid / kedaluwarsa / tidak bisa diverifikasi ->
   status EXPIRED (ThreadsSessionExpiredError) / AUTH_UNVERIFIED
   (ThreadsAuthUnverifiedError).
4. cookies.txt HANYA mekanisme import eksplisit via
   threads/import_cookies.py - TIDAK ada fallback otomatis di
   get_context().
5. Storage lama TIDAK pernah dihapus otomatis.

Health check (check_session) TIDAK menganggap HTTP 200 = valid:
- Buka halaman Threads (canonical threads.com, ikuti redirect normal).
- Cek cookie sesi (sessionid, ds_user_id) pada domain aktual browser.
- Deteksi redirect ke halaman login (URL /login) / login wall muncul
  -> SESSION_EXPIRED.
- Indikator UI authenticated-only hanya penguat, bukan syarat.

TIDAK ada remap domain (mis. .threads.com -> .threads.net). Domain
cookie dipertahankan sebagaimana domain aktual browser.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict, Optional

from loguru import logger

from shared.browser import PlaywrightManager

from threads import selectors
from threads.config import ThreadsConfig
from threads.cookies import ThreadsCookieManager
from threads.errors import (
    ThreadsAuthRequiredError,
    ThreadsAuthUnverifiedError,
    ThreadsBrowserError,
    ThreadsSessionExpiredError,
)

SESSION_COOKIE_NAMES = ("sessionid", "ds_user_id")

SESSION_VALID = "valid"
SESSION_EXPIRED = "expired"
SESSION_NO_SESSION = "no_session"
SESSION_AUTH_UNVERIFIED = "auth_unverified"

# URL cek keberadaan cookie sesi. Domain aktual bisa berubah; dicek pada
# canonical saat ini + legacy tanpa remap apa pun.
COOKIE_CHECK_URLS = (
    "https://www.threads.com/",
    "https://www.threads.net/",
)


class ThreadsSessionManager:
    """Sesi autentikasi Threads dengan persistensi storage state."""

    def __init__(
        self,
        config: ThreadsConfig,
        cookie_manager: Optional[ThreadsCookieManager],
    ):
        self.config = config
        self.cookie_manager = cookie_manager
        self.storage_state_file: Path = config.storage_state_file
        self._context: Optional[Any] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_context(self, browser: PlaywrightManager) -> Any:
        """Dapatkan BrowserContext terautentikasi dari storage.json.

        Raises:
            ThreadsAuthRequiredError  - storage tidak ada (NO_SESSION)
            ThreadsSessionExpiredError- storage expired/redirect login
            ThreadsAuthUnverifiedError- storage invalid/tidak bisa
                                        diverifikasi (AUTH_UNVERIFIED)

        TIDAK pernah fallback ke cookies.txt. TIDAK menghapus storage.
        """
        if not self.storage_state_file.exists():
            raise ThreadsAuthRequiredError(
                "Threads session TIDAK tersedia (NO_SESSION) - belum ada "
                f"storage state di {self.storage_state_file}.\n"
                "Jalankan threads/login.py untuk login manual di browser "
                "(session akan disimpan setelah autentikasi terbukti)."
            )
        context = await self._restore_from_state(browser)
        if context is None:
            raise ThreadsAuthUnverifiedError(
                "Threads session tidak bisa diverifikasi (AUTH_UNVERIFIED) "
                f"dari {self.storage_state_file}.\n"
                "Jalankan threads/login.py untuk login manual di browser."
            )
        self._context = context
        return context

    async def save_state(self, context: Optional[Any] = None) -> None:
        """Simpan storage state saat ini ke storage.json (reusable).

        Dipanggil HANYA setelah autentikasi terbukti valid (login.py /
        import_cookies.py). Tidak dipanggil dari health check.
        """
        context = context or self._context
        if context is None:
            return
        try:
            self.storage_state_file.parent.mkdir(parents=True, exist_ok=True)
            await context.storage_state(path=str(self.storage_state_file))
            logger.info(
                f"[Threads] Storage state disimpan: {self.storage_state_file}"
            )
        except Exception as e:
            logger.warning(f"[Threads] Gagal menyimpan storage state: {e}")

    async def close_context(self) -> None:
        if self._context is not None:
            try:
                await self._context.close()
            except Exception:
                pass
            self._context = None

    # ------------------------------------------------------------------
    # Health check (read-only, tanpa side effect)
    # ------------------------------------------------------------------

    async def check_session(self, context: Any) -> Dict[str, Any]:
        """Cek status sesi Threads pada context yang diberikan (READ-ONLY).

        TIDAK menyimpan storage, TIDAK mengubah cookies.

        Returns:
            {"status": "valid"|"expired"|"no_session", "url": ...}
            + "ui_confirmed": bool (indikator UI authenticated-only,
              hanya penguat, tidak menentukan status)

        Raises ThreadsBrowserError jika navigasi gagal total.
        """
        logger.info("[Threads] session check")
        has_cookies = await self._context_has_session_cookies(context)
        if not has_cookies:
            logger.warning(
                "[Threads] Cookie sesi (sessionid/ds_user_id) tidak ada "
                "di context - session invalid"
            )
            return {"status": SESSION_NO_SESSION}

        page = await context.new_page()
        try:
            await page.goto(
                selectors.THREADS_HOME,
                wait_until="domcontentloaded",
                timeout=self.config.timeout_ms,
            )
        except Exception as e:
            await page.close()
            raise ThreadsBrowserError(
                f"Gagal membuka {selectors.THREADS_HOME} untuk health "
                f"check: {str(e)[:160]}"
            ) from e

        try:
            current_url = page.url or ""

            # 1. Redirect ke halaman login = session expired
            redirected_to_login = any(
                marker in current_url for marker in selectors.LOGIN_URL_MARKERS
            )

            # 2. Form login muncul di halaman
            login_wall = False
            if not redirected_to_login:
                for selector in selectors.LOGIN_FORM_INPUTS:
                    count = await page.locator(selector).count()
                    if count > 0:
                        login_wall = True
                        break

            if redirected_to_login or login_wall:
                logger.warning(
                    "[Threads] session expired - halaman mengarahkan ke login"
                )
                return {"status": SESSION_EXPIRED, "url": current_url}

            # 3. Indikator UI authenticated-only (penguat saja - selector
            #    belum tentu terverifikasi, jadi TIDAK dijadikan syarat)
            ui_confirmed = await self._ui_authenticated_indicator(page)

            logger.info("[Threads] session valid")
            return {
                "status": SESSION_VALID,
                "url": current_url,
                "ui_confirmed": ui_confirmed,
            }
        finally:
            await page.close()

    async def ensure_valid_session(self, context: Any) -> None:
        """Pastikan session valid; raise ThreadsSessionExpiredError jika tidak.

        Dipanggil sebelum publish - session expired TIDAK boleh retry.
        """
        result = await self.check_session(context)
        if result["status"] != SESSION_VALID:
            raise ThreadsSessionExpiredError(
                "Threads session expired untuk akun ini - lakukan "
                "re-authentication: jalankan threads/login.py (login manual "
                "via browser) atau threads/import_cookies.py (cookie baru)."
            )

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _restore_from_state(self, browser: PlaywrightManager) -> Optional[Any]:
        """Restore context dari storage.json + authentication check.

        Returns context jika terverifikasi valid; None / raise error
        jelas jika tidak. TIDAK menyimpan / menghapus apa pun.
        """
        logger.info("[Threads] Loading storage state...")
        try:
            state = json.loads(self.storage_state_file.read_text("utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            logger.warning(f"[Threads] Storage state tidak terbaca ({e})")
            raise ThreadsAuthUnverifiedError(
                f"Storage state tidak bisa dibaca (AUTH_UNVERIFIED): {e}\n"
                "Jalankan threads/login.py untuk login ulang di browser."
            ) from e

        if not self._state_has_valid_session(state):
            logger.warning("[Threads] Storage state tidak berisi session valid")
            raise ThreadsSessionExpiredError(
                "Storage state TIDAK berisi session Threads yang valid "
                "(EXPIRED). Jalankan threads/login.py untuk login ulang "
                "di browser."
            )

        try:
            context = await browser.new_context(
                storage_state=str(self.storage_state_file),
                viewport={
                    "width": self.config.viewport[0],
                    "height": self.config.viewport[1],
                },
            )
        except Exception as e:
            logger.warning(f"[Threads] Gagal restore storage state ({e})")
            raise ThreadsAuthUnverifiedError(
                f"Storage state tidak bisa direstore (AUTH_UNVERIFIED): {e}\n"
                "Jalankan threads/login.py untuk login ulang di browser."
            ) from e

        result = await self.check_session(context)
        if result["status"] == SESSION_VALID:
            logger.info("[Threads] Session restored.")
            return context

        try:
            await context.close()
        except Exception:
            pass

        if result["status"] == SESSION_EXPIRED:
            raise ThreadsSessionExpiredError(
                "Session dari storage state KEDALUWARSA - halaman "
                "mengarahkan ke login (EXPIRED). Jalankan threads/login.py "
                "untuk login ulang di browser."
            )
        raise ThreadsAuthUnverifiedError(
            "Session dari storage state tidak bisa diverifikasi "
            "(AUTH_UNVERIFIED). Jalankan threads/login.py untuk login "
            "ulang di browser."
        )

    def _state_has_valid_session(self, state: dict) -> bool:
        """Cek cookie sesi di storage state + kedaluwarsanya."""
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

    async def _context_has_session_cookies(self, context: Any) -> bool:
        """Cek cookie sesi pada domain aktual Threads (tanpa remap)."""
        try:
            for url in COOKIE_CHECK_URLS:
                cookies = await context.cookies(url)
                names = {c["name"] for c in cookies}
                if all(name in names for name in SESSION_COOKIE_NAMES):
                    return True
        except Exception:
            pass
        return False

    async def _ui_authenticated_indicator(self, page: Any) -> bool:
        """Indikator UI authenticated-only (penguat, bukan syarat)."""
        for selector in selectors.AUTHENTICATED_UI_INDICATORS:
            try:
                if await page.locator(selector).count() > 0:
                    return True
            except Exception:
                continue
        return False

    async def is_logged_in(self, context: Any) -> bool:
        """Cek cepat (tanpa navigasi) apakah context masih login."""
        try:
            return await self._context_has_session_cookies(context)
        except Exception:
            return False
