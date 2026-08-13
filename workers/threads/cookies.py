"""
Manajemen cookie Threads (file Netscape -> Playwright).

Pola sama dengan facebook/cookies.py: worker TIDAK pernah login
username/password. Autentikasi dari file cookie ekspor Netscape yang
SUDAH LOGIN ke Threads di browser user.

Validasi:
1. Parse file Netscape (shared.cookies).
2. Penanda sesi login wajib ada: sessionid + ds_user_id (+ csrftoken
   dipakai Threads untuk request POST).
3. Cookie kedaluwarsa -> error jelas, minta ekspor ulang.
4. Domain cookie DI-PERTAHANKAN sebagaimana tercatat di file ekspor
   (TIDAK ada remap domain). Threads saat ini canonical di
   www.threads.com; cookie domain lama (mis. .threads.net) TIDAK
   di-remap - Playwright yang menentukan apakah cookie dikirim ke
   domain aktual.

Nilai cookie TIDAK pernah di-log / dimasukkan ke error message.
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from loguru import logger

from shared.cookies import NetscapeCookie, parse_netscape_cookies

# Penanda sesi login Threads aktif
SESSION_COOKIE_NAMES = ("sessionid", "ds_user_id")
# csrftoken dibutuhkan Threads untuk request POST (publish)
REQUIRED_COOKIE_NAMES = SESSION_COOKIE_NAMES + ("csrftoken",)


class ThreadsCookieManager:
    """Load, validasi, dan konversi cookie Threads dari file Netscape."""

    def __init__(self, cookies_file: Path):
        self.cookies_file = Path(cookies_file)

    def load_playwright_cookies(self) -> List[dict]:
        """Baca file Netscape lalu konversi ke daftar cookie Playwright.

        Melempar ThreadsCookieFileMissing jika file tidak ada / tidak
        berisi cookie valid.
        """
        from threads.errors import ThreadsCookieFileMissing

        if not self.cookies_file.exists():
            raise ThreadsCookieFileMissing(
                f"File cookie Threads tidak ditemukan: {self.cookies_file}\n"
                "Langkah: ekspor cookie Threads (format Netscape, mis. "
                "ekstensi browser 'Get cookies.txt LOCALLY') dalam keadaan "
                "SUDAH LOGIN ke threads.com, lalu simpan isinya di:\n"
                f"  {self.cookies_file}\n"
                "Atau jalankan threads/login.py untuk login manual via browser."
            )

        logger.info("[Threads] Loading cookies...")
        parsed = parse_netscape_cookies(self.cookies_file)
        if not parsed:
            raise ThreadsCookieFileMissing(
                f"Tidak ada cookie valid di {self.cookies_file}. "
                "Periksa isi file (format Netscape, 7 kolom dipisah tab)."
            )

        logger.info(
            f"[Threads] Parsed {len(parsed)} cookies dari "
            f"{self.cookies_file.name}"
        )
        return [self._to_playwright(c) for c in parsed]

    def _to_playwright(self, c: NetscapeCookie) -> dict:
        """Konversi satu NetscapeCookie ke format Playwright.

        Domain cookie dipertahankan apa adanya (TIDAK di-remap). Threads
        canonical di www.threads.com; browser yang menentukan pengiriman
        cookie ke domain aktual.
        """
        return c.to_playwright()

    def find_session_cookie(
        self, cookies: List[NetscapeCookie], name: str
    ) -> Optional[NetscapeCookie]:
        return next((c for c in cookies if c.name == name), None)

    def validate_parsed(self, cookies: List[NetscapeCookie]) -> None:
        """Validasi cookie hasil parse: kehadiran sesi + kedaluwarsa.

        Melempar ThreadsCookieExpired / ThreadsSessionInvalid dengan
        langkah perbaikan yang jelas. Tidak pernah menampilkan nilai
        cookie.
        """
        from threads.errors import ThreadsCookieExpired, ThreadsSessionInvalid

        expired = [c for c in cookies if c.is_expired]
        if expired:
            names = ", ".join(c.name for c in expired[:5])
            raise ThreadsCookieExpired(
                "Cookie Threads KEDALUWARSA: "
                f"{names}{'...' if len(expired) > 5 else ''} "
                f"(periksa {self.cookies_file}).\n"
                "Ekspor ulang cookie baru dari browser (login ke "
                "threads.com lalu ekspor cookies), ganti isi "
                f"{self.cookies_file}, lalu jalankan lagi."
            )

        missing = [
            name
            for name in SESSION_COOKIE_NAMES
            if not self.find_session_cookie(cookies, name)
        ]
        if missing:
            raise ThreadsSessionInvalid(
                "File cookie tidak berisi penanda sesi login Threads "
                f"({', '.join(missing)}). Pastikan Anda MENGEKSPOR cookie "
                "dalam keadaan SUDAH LOGIN ke threads.com. Cookie "
                f"{', '.join(missing)} adalah penanda sesi aktif."
            )

        if not self.find_session_cookie(cookies, "csrftoken"):
            logger.warning(
                "[Threads] csrftoken tidak ditemukan di file cookie - "
                "publish post bisa gagal (Threads butuh csrftoken untuk "
                "request POST)."
            )
