"""
Create Instagram session file for Instaloader.

Usage:
    cd workers
    venv\\Scripts\\python instagram\\create_session.py

Username and password are requested interactively.
Supports 2FA when Instagram requires it.
Session file is saved to workers/instagram_session.
"""

import os
import sys
import getpass
from pathlib import Path

SESSION_FILE = Path(__file__).resolve().parent.parent / "instagram_session"


def prompt_password(prompt: str = "Password Instagram: ") -> str:
    try:
        return getpass.getpass(prompt)
    except (OSError, EOFError):
        print("WARNING: input password tidak bisa disembunyikan, akan ditampilkan.")
        return input(prompt)


def prompt_2fa_code() -> str:
    try:
        return input("Kode 2FA (dikirim Instagram ke email/telepon): ").strip()
    except EOFError:
        print("\nERROR: tidak ada input untuk kode 2FA.")
        print("Jalankan ulang script secara manual untuk menyelesaikan 2FA.")
        sys.exit(1)


def main() -> None:
    try:
        import instaloader
    except ImportError:
        print("ERROR: instaloader tidak terpasang di environment ini.")
        sys.exit(1)

    from instaloader.exceptions import (
        BadCredentialsException,
        ConnectionException,
        TwoFactorAuthRequiredException,
    )

    username = input("Username Instagram: ").strip()
    if not username:
        print("ERROR: username tidak boleh kosong.")
        sys.exit(1)

    password = prompt_password()

    loader = instaloader.Instaloader(quiet=True)

    try:
        loader.login(username, password)
    except TwoFactorAuthRequiredException:
        print("Instagram meminta verifikasi 2FA.")
        loader.two_factor_login(prompt_2fa_code())
    except BadCredentialsException:
        print("ERROR: username atau password salah.")
        sys.exit(1)
    except ConnectionException as e:
        print(f"ERROR: gagal terhubung ke Instagram: {e}")
        sys.exit(1)

    if not loader.test_login():
        print("ERROR: login tidak valid, session tidak dibuat.")
        sys.exit(1)

    loader.save_session_to_file(str(SESSION_FILE))

    if not SESSION_FILE.exists() or SESSION_FILE.stat().st_size == 0:
        print("ERROR: session file gagal ditulis.")
        sys.exit(1)

    print(f"SUKSES: session tersimpan di {SESSION_FILE}")
    print("Worker kini dapat memuat session via INSTAGRAM_SESSION_FILE.")


if __name__ == "__main__":
    main()
