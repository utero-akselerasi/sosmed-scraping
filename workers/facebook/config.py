"""
Konfigurasi Facebook Worker.

Semua nilai diambil dari environment variable (FACEBOOK_*). Variabel bisa
berada di workers/.env (dibaca otomatis oleh load_dotenv dari working
directory) ATAU di file .env / .env.local level proyek - config.py memuat
keduanya sebagai fallback, tanpa menimpa nilai yang sudah ada.

Variabel yang didukung:
    FACEBOOK_ENABLED                  (default: true)
    FACEBOOK_COOKIES_FILE             (default: ./facebook_cookies.txt)
    FACEBOOK_STORAGE_STATE_FILE       (default: ./facebook_state.json)
    FACEBOOK_HEADLESS                 (default: true)
    FACEBOOK_TIMEOUT_MS               (default: 30000)
    FACEBOOK_MAX_POSTS                (default: 20)  - per halaman
    FACEBOOK_MAX_PAGES                (default: 5)
    FACEBOOK_MAX_SCROLLS              (default: 10)
    FACEBOOK_SCROLL_DELAY_SECONDS     (default: 2.0)
    FACEBOOK_REQUEST_DELAY_SECONDS    (default: 1.5)
    FACEBOOK_RETRY_COUNT              (default: 3)
    FACEBOOK_RETRY_BASE_DELAY_SECONDS (default: 2.0)
    FACEBOOK_PAGES                    - daftar URL/nama halaman publik,
                                        dipisahkan koma (wajib diisi)
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

from dotenv import load_dotenv

WORKERS_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = WORKERS_DIR.parent


def load_env_files() -> None:
    """Muat env dari workers/.env (cwd) lalu fallback .env / .env.local
    level proyek. Nilai yang sudah ter-set tidak pernah ditimpa."""
    load_dotenv()
    for name in (".env", ".env.local"):
        env_file = PROJECT_ROOT / name
        if env_file.exists():
            load_dotenv(env_file, override=False)


def _resolve_path(env_name: str, default: str) -> Path:
    """Resolve path relatif terhadap direktori workers/."""
    raw = os.getenv(env_name) or default
    path = Path(raw)
    if not path.is_absolute():
        path = WORKERS_DIR / path
    return path


@dataclass(frozen=True)
class FacebookConfig:
    """Konfigurasi lengkap Facebook worker (immutable)."""

    enabled: bool
    cookies_file: Path
    storage_state_file: Path
    headless: bool
    timeout_ms: int
    max_posts_per_page: int
    max_pages: int
    max_scrolls: int
    scroll_delay: float
    request_delay: float
    retry_count: int
    retry_base_delay: float
    pages: List[str] = field(default_factory=list)

    @classmethod
    def from_env(cls) -> "FacebookConfig":
        load_env_files()
        pages = [
            p.strip()
            for p in os.getenv("FACEBOOK_PAGES", "").split(",")
            if p.strip()
        ]
        return cls(
            enabled=os.getenv("FACEBOOK_ENABLED", "true").lower() == "true",
            cookies_file=_resolve_path(
                "FACEBOOK_COOKIES_FILE", "./facebook_cookies.txt"
            ),
            storage_state_file=_resolve_path(
                "FACEBOOK_STORAGE_STATE_FILE", "./facebook_state.json"
            ),
            headless=os.getenv("FACEBOOK_HEADLESS", "true").lower() == "true",
            timeout_ms=int(os.getenv("FACEBOOK_TIMEOUT_MS", 30000)),
            max_posts_per_page=int(os.getenv("FACEBOOK_MAX_POSTS", 20)),
            max_pages=int(os.getenv("FACEBOOK_MAX_PAGES", 5)),
            max_scrolls=int(os.getenv("FACEBOOK_MAX_SCROLLS", 10)),
            scroll_delay=float(os.getenv("FACEBOOK_SCROLL_DELAY_SECONDS", 2.0)),
            request_delay=float(os.getenv("FACEBOOK_REQUEST_DELAY_SECONDS", 1.5)),
            retry_count=int(os.getenv("FACEBOOK_RETRY_COUNT", 3)),
            retry_base_delay=float(
                os.getenv("FACEBOOK_RETRY_BASE_DELAY_SECONDS", 2.0)
            ),
            pages=pages,
        )
