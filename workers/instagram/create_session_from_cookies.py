"""
Create Instaloader session file from a Netscape-format cookies file.

Usage:
    cd workers
    venv\\Scripts\\python instagram\\create_session_from_cookies.py

Reads cookies from cookies.txt (Netscape format), injects them into an
Instaloader instance, validates the session with test_login(), and saves
the session to instagram_session. No username/password login is performed.
"""

import sys
from pathlib import Path

WORKERS_DIR = Path(__file__).resolve().parent.parent
COOKIES_FILE = WORKERS_DIR / "cookies.txt"
SESSION_FILE = WORKERS_DIR / "instagram_session"


def parse_netscape_cookies(path: Path):
    cookies = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) != 7:
                print(f"WARNING: skip baris tidak valid: {line[:80]}")
                continue
            domain, _sub, path_str, secure_str, expires_str, name, value = parts
            cookies.append(
                {
                    "domain": domain,
                    "path": path_str,
                    "secure": secure_str.upper() == "TRUE",
                    "expires": int(expires_str) if expires_str.isdigit() else 0,
                    "name": name,
                    "value": value,
                }
            )
    return cookies


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
