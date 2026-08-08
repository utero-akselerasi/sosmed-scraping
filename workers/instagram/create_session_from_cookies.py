"""
Create Instaloader session file from a Netscape-format cookies file.

Usage:
    cd workers
    venv\\Scripts\\python instagram\\create_session_from_cookies.py

Reads cookies from cookies.txt (Netscape format), injects them into an
Instaloader instance, validates the session with test_login(), and saves
the session to instagram_session. No username/password login is performed.

Paths are configurable via env vars:
    INSTAGRAM_COOKIES_FILE  (default: workers/cookies.txt)
    INSTAGRAM_SESSION_FILE  (default: workers/instagram_session)
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Parser Netscape dipakai bersama: shared/cookies.py
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from shared.cookies import parse_netscape_cookies

load_dotenv()

WORKERS_DIR = Path(__file__).resolve().parent.parent

# Configurable via env var. Defaults to workers/cookies.txt.
# Example: INSTAGRAM_COOKIES_FILE=C:/Users/you/Downloads/cookies.txt
COOKIES_FILE = Path(os.getenv("INSTAGRAM_COOKIES_FILE", "cookies.txt"))
if not COOKIES_FILE.is_absolute():
    COOKIES_FILE = WORKERS_DIR / COOKIES_FILE

SESSION_FILE = Path(os.getenv("INSTAGRAM_SESSION_FILE", "instagram_session"))
if not SESSION_FILE.is_absolute():
    SESSION_FILE = WORKERS_DIR / SESSION_FILE


def main() -> None:
    if not COOKIES_FILE.exists():
        print(f"ERROR: file cookies tidak ditemukan: {COOKIES_FILE}")
        sys.exit(1)

    cookies = parse_netscape_cookies(COOKIES_FILE)
    if not cookies:
        print("ERROR: tidak ada cookie valid di file.")
        sys.exit(1)
    print(f"Parsed {len(cookies)} cookies dari {COOKIES_FILE}")

    import instaloader

    loader = instaloader.Instaloader(quiet=True)

    for c in cookies:
        loader.context._session.cookies.set(
            c["name"],
            c["value"],
            domain=c["domain"],
            path=c["path"],
            secure=c["secure"],
            expires=c["expires"] if c["expires"] > 0 else None,
        )

    username = None
    try:
        username = loader.test_login()
    except Exception as e:
        print(f"ERROR: test_login gagal: {e}")
        sys.exit(1)

    if not username:
        print("ERROR: session cookie tidak valid (test_login = None).")
        sys.exit(1)

    loader.context.username = username
    print(f"Login valid: @{username}")

    loader.save_session_to_file(str(SESSION_FILE))

    if not SESSION_FILE.exists() or SESSION_FILE.stat().st_size == 0:
        print("ERROR: session file gagal ditulis.")
        sys.exit(1)

    print(f"SUKSES: session tersimpan di {SESSION_FILE} ({SESSION_FILE.stat().st_size} bytes)")
    print("Langkah berikutnya: venv\\Scripts\\python instagram\\test_scrape.py")


if __name__ == "__main__":
    main()
