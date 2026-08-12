"""Unit test konfigurasi + URL builder Threads scraper (Phase 6).

- THREADS_MAX_POSTS -> ThreadsConfig.max_posts_per_keyword (default 50,
  pola INSTAGRAM_MAX_POSTS).
- THREADS_SEARCH_URL + threads_search_url() -> URL search canonical
  https://www.threads.com/search?q=<keyword>.
"""

from pathlib import Path

import pytest

from threads import selectors
from threads.config import ThreadsConfig


def _from_env(monkeypatch: pytest.MonkeyPatch) -> ThreadsConfig:
    monkeypatch.delenv("THREADS_MAX_POSTS", raising=False)
    return ThreadsConfig.from_env()


# ----------------------------------------------------------------------
# THREADS_MAX_POSTS
# ----------------------------------------------------------------------

def test_max_posts_default_is_50(monkeypatch):
    monkeypatch.delenv("THREADS_MAX_POSTS", raising=False)
    # Hermetis: jangan biarkan workers/.env (yang berisi THREADS_MAX_POSTS
    # terisi) ikut terbaca - test ini hanya menguji default kode.
    monkeypatch.setattr("threads.config.load_env_files", lambda: None)
    config = ThreadsConfig.from_env()
    assert config.max_posts_per_keyword == 50


def test_max_posts_from_env(monkeypatch):
    monkeypatch.setenv("THREADS_MAX_POSTS", "10")
    config = ThreadsConfig.from_env()
    assert config.max_posts_per_keyword == 10


# ----------------------------------------------------------------------
# URL builder
# ----------------------------------------------------------------------

def test_search_url_constant():
    assert selectors.THREADS_SEARCH_URL == "https://www.threads.com/search"


def test_search_url_simple_keyword():
    assert selectors.threads_search_url("mbois") == \
        "https://www.threads.com/search?q=mbois"


def test_search_url_keyword_with_spaces():
    assert selectors.threads_search_url("festival mbois") == \
        "https://www.threads.com/search?q=festival+mbois"


def test_search_url_keyword_with_hashtag():
    assert selectors.threads_search_url("#festival") == \
        "https://www.threads.com/search?q=%23festival"


def test_search_url_keyword_empty():
    assert selectors.threads_search_url("") == \
        "https://www.threads.com/search?q="