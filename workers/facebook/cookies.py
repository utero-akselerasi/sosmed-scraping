"""
Manajemen cookie Facebook.

Worker TIDAK pernah melakukan login username/password. Autentikasi hanya
dari file cookie ekspor Netscape (facebook_cookies.txt):

1. Baca file cookie Netscape.
2. Konversi ke format Playwright (shared.cookies).
3. Validasi: cookie sesi (c_user + xs) harus ada dan belum kedaluwarsa.
4. Jika kedaluwarsa/hilang, laporkan pesan jelas agar user mengekspor
   cookie baru - tanpa fallback otomatis ke data palsu.
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from loguru import logger

from shared.cookies import NetscapeCookie, parse_netscape_cookies

# Cookie yang menandakan sesi login Facebook aktif
SESSION_COOKIE_NAMES = ("c_user", "xs")


class FacebookCookieError(Exception):
    """Error umum terkait cookie Facebook."""


class FacebookCookieFileMissing(FacebookCookieError):
    """File cookie tidak ditemukan."""


class FacebookCookieExpired(FacebookCookieError):
    """Sesi cookie sudah kedaluwarsa - perlu ekspor cookie baru."""


class FacebookSessionInvalid(FacebookCookieError):
    """Sesi tidak valid (cookie sesi hilang / tidak login)."""


class FacebookCookieManager:
    """Load, validasi, dan konversi cookie Facebook dari file Netscape."""

    def __init__(self, cookies_file: Path):
        self.cookies_file = Path(cookies_file)

    def load_playwright_cookies(self) -> List[dict]:
        """Baca file Netscape lalu konversi ke daftar cookie Playwright.

        Melempar FacebookCookieFileMissing jika file tidak ada.
        """
        if not self.cookies_file.exists():
            raise FacebookCookieFileMissing(
                f"File cookie Facebook tidak ditemukan: {self.cookies_file}\n"
                "Langkah: ekspor cookie Facebook (format Netscape, mis. "
                "dengan ekstensi browser 'Get cookies.txt LOCALLY') lalu "
                f"simpan isinya di:\n  {self.cookies_file}"
            )

        logger.info("Loading cookies...")
        logger.info("Converting Netscape cookies...")
        parsed = parse_netscape_cookies(self.cookies_file)
        if not parsed:
            raise FacebookCookieFileMissing(
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
        """Validasi cookie hasil parse: cek kehadiran sesi + kedaluwarsa.

        Melempar FacebookCookieExpired / FacebookSessionInvalid dengan pesan
        yang jelas tentang apa yang harus dilakukan user.
        """
        expired = [c for c in cookies if c.is_expired]
        if expired:
            names = ", ".join(c.name for c in expired[:5])
            raise FacebookCookieExpired(
                "Cookie Facebook KEDALUWARSA: "
                f"{names}{'...' if len(expired) > 5 else ''} (periksa "
                f"{self.cookies_file}).\n"
                "Ekspor ulang cookie baru dari browser (login ke "
                "facebook.com lalu ekspor cookies), ganti isi "
                f"{self.cookies_file}, lalu jalankan worker lagi."
            )

        missing = [
            name for name in SESSION_COOKIE_NAMES
            if not self.find_session_cookie(cookies, name)
        ]
        if missing:
            raise FacebookSessionInvalid(
                "File cookie tidak berisi cookie sesi login "
                f"({', '.join(missing)}). Pastikan Anda MENGEKSPOR cookie "
                "dalam keadaan SUDAH LOGIN ke facebook.com. Cookie "
                f"{', '.join(missing)} adalah penanda sesi aktif."
            )
