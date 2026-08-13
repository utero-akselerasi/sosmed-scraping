"""
Profil akun Threads yang sedang login (getThreadsProfile).

Mengambil informasi dari UI browser (bukan API). Minimal:
    {username, displayName, authenticated, profileUrl, status}

- Username diambil HANYA dari link profil di sidebar navigasi
  (div[role="navigation"] a[href^="/@"]) - selector ini BELUM
  terverifikasi live (UNVERIFIED).
- TIDAK ada fallback page-wide a[href^="/@"]: link itu memuat author
  post dari feed (akun LAIN), bukan identitas akun login.
- Jika username tidak bisa diverifikasi -> username None + status
  USERNAME_NOT_VERIFIED (TIDAK menebak dari ds_user_id / API internal).
- displayName diambil dari halaman profil (@username) via <h1>.
  UNVERIFIED - jika tidak stabil, diisi None.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Optional

from loguru import logger

from threads import selectors
from threads.config import ThreadsConfig

_USERNAME_RE = re.compile(r"^/@([^/]+)/?$")

USERNAME_VERIFIED = "USERNAME_VERIFIED"
USERNAME_NOT_VERIFIED = "USERNAME_NOT_VERIFIED"


async def get_threads_profile(context: Any, config: ThreadsConfig) -> Dict[str, Any]:
    """Ambil profil akun yang sedang login.

    Mengembalikan:
        {"username": str|None, "displayName": str|None,
         "authenticated": bool, "profileUrl": str|None,
         "status": "USERNAME_VERIFIED"|"USERNAME_NOT_VERIFIED"}

    Username TIDAK pernah ditebak - jika selector identitas belum
    terbukti, hasilnya USERNAME_NOT_VERIFIED.
    """
    page = await context.new_page()
    try:
        await page.goto(
            selectors.THREADS_HOME,
            wait_until="domcontentloaded",
            timeout=config.timeout_ms,
        )
        username = await _find_username(page)

        if not username:
            logger.warning(
                "[Threads] Username TIDAK terverifikasi via UI (link /@ di "
                "sidebar navigasi tidak terlihat) - selector identitas "
                "belum terbukti"
            )
            return {
                "username": None,
                "displayName": None,
                "authenticated": True,
                "profileUrl": None,
                "status": USERNAME_NOT_VERIFIED,
            }

        display_name = await _find_display_name(page, username)

        return {
            "username": username,
            "displayName": display_name,
            "authenticated": True,
            "profileUrl": f"{selectors.THREADS_HOST}/@{username}",
            "status": USERNAME_VERIFIED,
        }
    finally:
        await page.close()


async def _find_username(page: Any) -> Optional[str]:
    """Cari username akun sendiri dari link profil di sidebar navigasi.

    HANYA selector nav-scoped (PROFILE_LINK) yang dipakai - selector ini
    masih kandidat UNVERIFIED. Tanpa fallback page-wide: a[href^="/@"]
    di halaman home berisi author post acak dari feed.
    """
    try:
        count = await page.locator(selectors.PROFILE_LINK).count()
        if count == 0:
            return None
        href = await page.locator(selectors.PROFILE_LINK).first.get_attribute(
            "href"
        )
    except Exception:
        return None
    if href:
        match = _USERNAME_RE.match(href.split("?")[0])
        if match:
            return match.group(1)
    return None


async def _find_display_name(page: Any, username: str) -> Optional[str]:
    """Buka halaman profil lalu baca nama tampilan dari <h1>.

    UNVERIFIED - requires live Threads UI verification; jika tidak
    stabil, hasil None (bukan selector palsu).
    """
    try:
        await page.goto(
            f"{selectors.THREADS_HOST}/@{username}",
            wait_until="domcontentloaded",
            timeout=page.context.default_timeout
            if hasattr(page.context, "default_timeout")
            else 30000,
        )
        count = await page.locator(selectors.PROFILE_DISPLAY_NAME).count()
        if count == 0:
            return None
        text = await page.locator(selectors.PROFILE_DISPLAY_NAME).first.inner_text()
        return text.strip() or None
    except Exception:
        return None
