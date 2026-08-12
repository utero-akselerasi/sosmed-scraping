"""
Konfigurasi Threads Worker (browser automation).

Semua nilai diambil dari environment variable (THREADS_*). Pola sama
dengan facebook/config.py - variabel bisa berada di workers/.env ATAU
di .env / .env.local level proyek (config memuat keduanya tanpa menimpa).

TIDAK ADA kredensial di sini:
- Tidak ada THREADS_PASSWORD / THREADS_SESSIONID / THREADS_ACCESS_TOKEN /
  THREADS_APP_SECRET. Autentikasi hanya lewat storage state Playwright
  atau file cookie Netscape (lihat threads/session.py).

Variabel yang didukung:
    THREADS_ENABLED                  (default: false) - WAJIB false tanpa
                                     konfigurasi eksplisit
    THREADS_HEADLESS                 (default: true)  - false untuk
                                     development/debug browser terlihat
    THREADS_SESSION_DIR              (default: ./data/sessions/threads)
    THREADS_COOKIES_FILE             (default: <session_dir>/cookies.txt)
    THREADS_STORAGE_STATE_FILE       (default: <session_dir>/storage.json)
    THREADS_TIMEOUT_MS               (default: 30000)
    THREADS_SLOW_MO_MS               (default: 0) - hanya development
    THREADS_VIEWPORT                 (default: "1280,800")
    THREADS_RETRY_COUNT              (default: 1) - retry timeout/navigation
    THREADS_RETRY_BASE_DELAY_SECONDS (default: 2.0)
    THREADS_MAX_POSTS                (default: 50) - batas post per keyword
    THREADS_LIVE_TEST                (default: false) - test publish asli
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Tuple

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


def _parse_viewport(raw: str) -> Tuple[int, int]:
    """Parse '1280,800' -> (1280, 800). Fallback default jika invalid."""
    try:
        width, height = raw.split(",", 1)
        return int(width.strip()), int(height.strip())
    except (ValueError, AttributeError):
        return 1280, 800


@dataclass(frozen=True)
class ThreadsConfig:
    """Konfigurasi lengkap Threads worker (immutable)."""

    enabled: bool
    headless: bool
    session_dir: Path
    cookies_file: Path
    storage_state_file: Path
    published_log_file: Path
    timeout_ms: int
    slow_mo_ms: int
    viewport: Tuple[int, int]
    retry_count: int
    retry_base_delay: float
    max_posts_per_keyword: int
    live_test: bool

    @classmethod
    def from_env(cls) -> "ThreadsConfig":
        load_env_files()
        session_dir = _resolve_path(
            "THREADS_SESSION_DIR", "./data/sessions/threads"
        )
        cookies_file = _resolve_path(
            "THREADS_COOKIES_FILE", str(session_dir / "cookies.txt")
        )
        storage_state_file = _resolve_path(
            "THREADS_STORAGE_STATE_FILE", str(session_dir / "storage.json")
        )
        return cls(
            enabled=os.getenv("THREADS_ENABLED", "false").lower() == "true",
            headless=os.getenv("THREADS_HEADLESS", "true").lower() == "true",
            session_dir=session_dir,
            cookies_file=cookies_file,
            storage_state_file=storage_state_file,
            published_log_file=session_dir / "published.json",
            timeout_ms=int(os.getenv("THREADS_TIMEOUT_MS", 30000)),
            slow_mo_ms=int(os.getenv("THREADS_SLOW_MO_MS", 0)),
            viewport=_parse_viewport(os.getenv("THREADS_VIEWPORT", "1280,800")),
            retry_count=int(os.getenv("THREADS_RETRY_COUNT", 1)),
            retry_base_delay=float(
                os.getenv("THREADS_RETRY_BASE_DELAY_SECONDS", 2.0)
            ),
            max_posts_per_keyword=int(os.getenv("THREADS_MAX_POSTS", 50)),
            live_test=os.getenv("THREADS_LIVE_TEST", "false").lower() == "true",
        )
