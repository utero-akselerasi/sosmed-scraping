"""
Threads browser automation - session-based (tanpa Meta Graph API).

Modul:
    config.py           - konfigurasi dari environment (THREADS_*)
    errors.py           - error types terpusat
    selectors.py        - selector UI Threads terpusat
    cookies.py          - cookie Netscape -> Playwright
    session.py          - session manager + health check
    profile.py          - getThreadsProfile
    search.py           - keyword -> URL detail post (metode A, dedup)
    post_parser.py      - parse halaman detail post (timestamp ISO exact)
    publisher.py        - createTextPost / createImagePost
    worker.py           - worker (scrape keywords + simpan DB) untuk
                          run_all.py

Script:
    login.py            - login manual -> simpan storage state
    import_cookies.py   - import cookie Netscape -> storage state
    check_session.py    - test connection + profil
    publish_text.py     - publish thread teks
    publish_image.py    - publish thread gambar
"""
