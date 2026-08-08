"""
Netscape Cookie File Parser - shared by all workers.

Facebook dan Instagram worker sama-sama autentikasi dari file cookie
ekspor Netscape (tanpa username/password). Modul ini menjadi satu-satunya
tempat parsing format Netscape dan konversi ke format Playwright, sehingga
tidak ada logika yang diduplikasi antar worker.

Format Netscape (per baris, dipisahkan tab):
    #domain  includeSubdomains  path  secure  expires  name  value

- expires: timestamp epoch detik; 0 berarti cookie sesi (berlaku sampai
  browser ditutup).
- Domain dengan prefix `#HttpOnly_` berarti cookie httpOnly.
- Baris yang diawali `#` (kecuali `#HttpOnly_`) adalah komentar.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

HTTPONLY_PREFIX = "#HttpOnly_"


@dataclass
class NetscapeCookie:
    """Satu entri cookie dari file Netscape."""

    domain: str
    include_subdomains: bool
    path: str
    secure: bool
    expires: int  # 0 = cookie sesi (tanpa tanggal kedaluwarsa)
    name: str
    value: str
    http_only: bool = False

    @property
    def is_expired(self) -> bool:
        """Cookie sesi (expires=0) tidak pernah 'kedaluwarsa' oleh waktu."""
        if self.expires <= 0:
            return False
        return self.expires < int(time.time())

    def to_playwright(self) -> dict:
        """Konversi ke dict cookie yang diterima Playwright add_cookies()."""
        cookie = {
            "name": self.name,
            "value": self.value,
            "domain": self.domain,
            "path": self.path,
            "secure": self.secure,
            "httpOnly": self.http_only,
        }
        # Cookie sesi (expires=0) tidak menyertakan field expires
        if self.expires > 0:
            cookie["expires"] = self.expires
        return cookie


def _parse_line(line: str) -> Optional[NetscapeCookie]:
    """Parse satu baris file Netscape; None jika baris bukan cookie valid."""
    parts = line.split("\t")
    if len(parts) != 7:
        # Beberapa exporter memakai spasi pengganti tab
        parts = line.split()
        if len(parts) != 7:
            return None

    raw_domain, sub, path, secure, expires, name, value = parts
    http_only = False
    domain = raw_domain
    if domain.startswith(HTTPONLY_PREFIX):
        http_only = True
        domain = domain[len(HTTPONLY_PREFIX):]

    try:
        expires_int = int(expires)
    except ValueError:
        return None

    return NetscapeCookie(
        domain=domain,
        include_subdomains=sub.upper() == "TRUE",
        path=path,
        secure=secure.upper() == "TRUE",
        expires=expires_int,
        name=name,
        value=value,
        http_only=http_only,
    )


def parse_netscape_cookies(path: Path) -> List[NetscapeCookie]:
    """Parse seluruh file cookie Netscape menjadi daftar NetscapeCookie."""
    cookies: List[NetscapeCookie] = []
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            # Prefix #HttpOnly_ BUKAN komentar - penanda cookie httpOnly
            if line.startswith("#") and not line.startswith(HTTPONLY_PREFIX):
                continue
            cookie = _parse_line(line)
            if cookie is not None:
                cookies.append(cookie)
    return cookies
