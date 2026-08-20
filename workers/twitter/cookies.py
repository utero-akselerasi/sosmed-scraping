"""
Manajemen cookie X (Twitter).

Worker TIDAK pernah melakukan login username/password. Autentikasi hanya
dari file cookie ekspor Netscape (twitter_cookies.txt):

1. Baca file cookie Netscape.
2. Konversi ke format Playwright (shared.cookies).
3. Validasi: cookie sesi (auth_token + ct0) harus ada dan belum kedaluwarsa.
4. Jika kedaluwarsa/hilang, laporkan pesan jelas agar user mengekspor
   cookie baru - tanpa fallback otomatis ke data palsu.
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from loguru import logger

from shared.cookies import NetscapeCookie, parse_netscape_cookies

# Cookie yang menandakan sesi login X aktif
# (auth_token = sesi login, ct0 = token CSRF yang diperlukan request X)
SESSION_COOKIE_NAMES = ("auth_token", "ct0")


class TwitterCookieError(Exception):
    """Error umum terkait cookie X."""


class TwitterCookieFileMissing(TwitterCookieError):
    """File cookie tidak ditemukan."""


class TwitterCookieExpired(TwitterCookieError):
    """Sesi cookie sudah kedaluwarsa - perlu ekspor cookie baru."""


class TwitterSessionInvalid(TwitterCookieError):
    """Sesi tidak valid (cookie sesi hilang / tidak login)."""


class TwitterCookieManager:
    """Load, validasi, dan konversi cookie X dari file Netscape."""

    def __init__(self, cookies_file: Path):
        self.cookies_file = Path(cookies_file)

    def load_playwright_cookies(self) -> List[dict]:
        """Baca file Netscape lalu konversi ke daftar cookie Playwright.

        Melempar TwitterCookieFileMissing jika file tidak ada.
        """
        if not self.cookies_file.exists():
            raise TwitterCookieFileMissing(
                f"File cookie X tidak ditemukan: {self.cookies_file}\n"
                "Langkah: login ke x.com di browser, ekspor cookie "
                "(format Netscape, mis. dengan ekstensi browser "
                "'Get cookies.txt LOCALLY') lalu simpan isinya di:\n"
                f"  {self.cookies_file}"
            )

        logger.info("Loading cookies...")
        logger.info("Converting Netscape cookies...")
        parsed = parse_netscape_cookies(self.cookies_file)
        if not parsed:
            raise TwitterCookieFileMissing(
                f"Tidak ada cookie valid di {self.cookies_file}. "
                "Periksa isi file (format Netscape, 7 kolom dipisah tab)."
            )

        logger.info(f"Parsed {len(parsed)} cookies dari {self.cookies_file.name}")
        return [c.to_playwright() for c in parsed]

    def find_session_cookie(
        self, cookies: List[NetscapeCookie], name: str
    ) -> Optional[NetscapeCookie]:
        return next((c for c in cookies if c.name == name), None)

    def validate_parsed(self, cookies: List[NetscapeCookie]) -> None:
        """Validasi cookie hasil parse: cek kehadiran + kedaluwarsa sesi.

        Hanya cookie sesi (auth_token/ct0) yang diperiksa kedaluwarsanya.
        Cookie lain (mis. __cf_bm milik Cloudflare) kedaluwarsa setiap
        ~30 menit secara normal dan di-refresh otomatis oleh browser.

        Melempar TwitterCookieExpired / TwitterSessionInvalid dengan pesan
        yang jelas tentang apa yang harus dilakukan user.
        """
        session_cookies = [
            c for c in cookies if c.name in SESSION_COOKIE_NAMES
        ]
        expired = [c for c in session_cookies if c.is_expired]
        if expired:
            names = ", ".join(c.name for c in expired[:5])
            raise TwitterCookieExpired(
                "Cookie sesi X KEDALUWARSA: "
                f"{names}{'...' if len(expired) > 5 else ''} (periksa "
                f"{self.cookies_file}).\n"
                "Ekspor ulang cookie baru dari browser (login ke x.com "
                "lalu ekspor cookies), ganti isi "
                f"{self.cookies_file}, lalu jalankan worker lagi."
            )

        missing = [
            name for name in SESSION_COOKIE_NAMES
            if not self.find_session_cookie(cookies, name)
        ]
        if missing:
            raise TwitterSessionInvalid(
                "File cookie tidak berisi cookie sesi login "
                f"({', '.join(missing)}). Pastikan Anda MENGEKSPOR cookie "
                "dalam keadaan SUDAH LOGIN ke x.com. Cookie "
                f"{', '.join(missing)} adalah penanda sesi aktif."
            )
