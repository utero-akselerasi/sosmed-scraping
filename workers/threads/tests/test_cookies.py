"""Unit test cookie Threads: parsing Netscape, validasi, konversi
Playwright. Domain cookie DI-PERTAHANKAN apa adanya (TIDAK ada remap
.threads.com -> .threads.net)."""

import time
from pathlib import Path

import pytest

from shared.cookies import parse_netscape_cookies
from threads.cookies import ThreadsCookieManager

SAMPLE_COOKIES = (
    "# Netscape HTTP Cookie File\n"
    "# https://curl.haxx.se/rfc/cookie_spec.html\n"
    "\n"
    ".threads.com\tTRUE\t/\tTRUE\t1817882899\tig_did\t16E91300-08A6-46CB-8CD9-E8492C763D36\n"
    ".threads.com\tTRUE\t/\tTRUE\t1820906909\tmid\tanl9ogALAAGIsYaZNd1OwAxW_sJi\n"
    ".threads.com\tTRUE\t/\tTRUE\t1820906938\tcsrftoken\tiLHgjk5m84A8GZwlXnH6bOPYrZIu0FtL\n"
    ".threads.com\tTRUE\t/\tTRUE\t1794122938\tds_user_id\t36044675218\n"
    ".threads.com\tTRUE\t/\tTRUE\t1817882923\tsessionid\t36044675218%3AhIGIjg3MtPvOaQ%3A28%3AAYhS-M1zKtyh_SmSgIvAdAoX9ms2vutycggdKXq9bg\n"
)


def _write_cookies(tmp_path: Path, content: str) -> Path:
    f = tmp_path / "cookies.txt"
    f.write_text(content, encoding="utf-8")
    return f


def test_parse_netscape_sample(tmp_path):
    f = _write_cookies(tmp_path, SAMPLE_COOKIES)
    parsed = parse_netscape_cookies(f)
    assert len(parsed) == 5
    names = {c.name for c in parsed}
    assert {"sessionid", "ds_user_id", "csrftoken"}.issubset(names)


def test_validate_valid_session(tmp_path):
    f = _write_cookies(tmp_path, SAMPLE_COOKIES)
    manager = ThreadsCookieManager(f)
    parsed = parse_netscape_cookies(f)
    manager.validate_parsed(parsed)  # tidak boleh raise


def test_validate_missing_sessionid(tmp_path):
    content = SAMPLE_COOKIES.replace(
        ".threads.com\tTRUE\t/\tTRUE\t1817882923\tsessionid\t36044675218%3AhIGIjg3MtPvOaQ%3A28%3AAYhS-M1zKtyh_SmSgIvAdAoX9ms2vutycggdKXq9bg\n",
        "",
    )
    f = _write_cookies(tmp_path, content)
    manager = ThreadsCookieManager(f)
    parsed = parse_netscape_cookies(f)
    from threads.errors import ThreadsSessionInvalid

    with pytest.raises(ThreadsSessionInvalid):
        manager.validate_parsed(parsed)


def test_validate_expired_cookie(tmp_path):
    expired_ts = int(time.time()) - 1000
    content = SAMPLE_COOKIES.replace(
        "1794122938\tds_user_id\t36044675218",
        f"{expired_ts}\tds_user_id\t36044675218",
    )
    f = _write_cookies(tmp_path, content)
    manager = ThreadsCookieManager(f)
    parsed = parse_netscape_cookies(f)
    from threads.errors import ThreadsCookieExpired

    with pytest.raises(ThreadsCookieExpired):
        manager.validate_parsed(parsed)


def test_playwright_conversion_preserves_domain(tmp_path):
    f = _write_cookies(tmp_path, SAMPLE_COOKIES)
    manager = ThreadsCookieManager(f)
    cookies = manager.load_playwright_cookies()
    sessionid = next(c for c in cookies if c["name"] == "sessionid")
    # Domain dipertahankan apa adanya - TIDAK ada remap domain
    assert sessionid["domain"] == ".threads.com"
    assert sessionid["path"] == "/"
    assert sessionid["secure"] is True
    # Nilai cookie tetap utuh (tidak di-log, tapi konversi benar)
    assert sessionid["value"].startswith("36044675218")


def test_missing_cookie_file(tmp_path):
    manager = ThreadsCookieManager(tmp_path / "nope.txt")
    from threads.errors import ThreadsCookieFileMissing

    with pytest.raises(ThreadsCookieFileMissing):
        manager.load_playwright_cookies()
