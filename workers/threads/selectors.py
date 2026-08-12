"""
Selector Threads terpusat - satu-satunya tempat selector UI Threads.

UI Threads adalah React SPA yang bisa berubah sewaktu-waktu, karena itu:

1. Utamakan atribut stabil: aria-label, role, placeholder, href pattern.
2. JANGAN pakai div:nth-child / rantai descendant acak.
3. Setiap selector punya fallback berurutan (list dipakai urut).
4. Selector yang belum terverifikasi live ditandai:
       UNVERIFIED - requires live Threads UI verification
   dan diverifikasi manual dengan threads/check_session.py / login
   script (THREADS_HEADLESS=false).

Host: canonical saat ini https://www.threads.com/ (www.threads.net
melakukan 301 redirect ke www.threads.com). Navigasi selalu memakai
THREADS_HOME dan mengikuti redirect normal browser - TIDAK ada remap
host/manual. Catatan: status canonical bisa berubah; jangan hardcode
asumsi final di luar modul ini.
"""

from __future__ import annotations

import re
from urllib.parse import quote_plus

# ----------------------------------------------------------------------
# URLs
# ----------------------------------------------------------------------

THREADS_HOST = "https://www.threads.com"
THREADS_HOME = THREADS_HOST + "/"

# Halaman search Threads: https://www.threads.com/search?q=<keyword>
THREADS_SEARCH_URL = THREADS_HOST + "/search"


def threads_search_url(keyword: str) -> str:
    """Bangun URL search Threads untuk sebuah keyword.

    Keyword di-URL-encode (spasi -> '+', dsb) sesuai query string
    browser Threads (?q=<keyword>). VERIFIED live: search menghasilkan
    link post /@username/post/<id>.
    """
    return THREADS_SEARCH_URL + "?q=" + quote_plus(keyword)


# Penanda halaman login Threads di URL setelah redirect
LOGIN_URL_MARKERS = ("/login",)

# ----------------------------------------------------------------------
# Deteksi login wall (health check)
# ----------------------------------------------------------------------
# UNVERIFIED - requires live Threads UI verification - bentuk input login
# bisa berubah (username / phone / email dalam satu field).
LOGIN_FORM_INPUTS = (
    'input[name="username"]',
    'input[placeholder*="Username" i]',
    'input[placeholder*="phone" i]',
    'input[placeholder*="email" i]',
    'input[placeholder*="username" i]',
)

# ----------------------------------------------------------------------
# Indikator UI authenticated-only (penguat health check, BUKAN syarat)
# ----------------------------------------------------------------------
# Elemen yang hanya muncul saat login. Statusnya UNVERIFIED sampai
# terbukti live - karena itu hanya dipakai sebagai reinforcement, bukan
# penentu valid/tidak.
# UNVERIFIED - requires live Threads UI verification.
AUTHENTICATED_UI_INDICATORS = (
    'a[href="/compose"]',
    'div[role="navigation"] a[href^="/@"]',
)

# ----------------------------------------------------------------------
# Composer (buat post baru)
# ----------------------------------------------------------------------
# Tombol/ikon pembuka composer di sidebar kiri (desktop web) - ikon "+".
# UNVERIFIED - requires live Threads UI verification.
COMPOSER_OPEN_BUTTONS = (
    'a[href="/compose"]',
    'div[role="button"][aria-label="New post"]',
    'button[aria-label="New post"]',
)

# Textarea isi post di modal composer.
# Placeholder "What's new?" adalah penanda paling stabil di Threads web.
COMPOSER_TEXTAREA = (
    'textarea[placeholder="What\'s new?"]',
    'div[role="dialog"] textarea',
    'textarea[role="textbox"]',
)

# Tombol submit post di modal composer (teks "Post").
# UNVERIFIED - requires live Threads UI verification (posisi/teks bisa berubah).
COMPOSER_POST_BUTTONS = (
    'div[role="dialog"] div[role="button"]:has-text("Post")',
    'div[role="dialog"] button:has-text("Post")',
    'div[role="button"]:has-text("Post")',
    'button:has-text("Post")',
)

# Modal composer dianggap tertutup jika textarea tidak lagi terlihat.
COMPOSER_MODAL_DIALOG = 'div[role="dialog"]'

# ----------------------------------------------------------------------
# Media upload
# ----------------------------------------------------------------------
# Input file di modal composer (Threads web memakai input[type=file]).
# UNVERIFIED - requires live Threads UI verification.
MEDIA_FILE_INPUT = 'div[role="dialog"] input[type="file"]'

# Indikator upload masih berjalan / selesai (thumbnail pratinjau media).
# UNVERIFIED - requires live Threads UI verification.
MEDIA_UPLOAD_PROGRESS = (
    'div[role="dialog"] [role="progressbar"]',
    'div[role="dialog"] [aria-label*="Uploading" i]',
)
MEDIA_PREVIEW_IMAGE = 'div[role="dialog"] img[src*="blob:"]'

# ----------------------------------------------------------------------
# Profile
# ----------------------------------------------------------------------
# Link menuju profil akun SENDIRI di sidebar navigasi (href="/@username").
# Feed home memuat link /@ akun LAIN (author post) - lokator WAJIB
# discope ke sidebar navigasi. JANGAN pakai fallback page-wide
# a[href^="/@"]: itu mengambil author random dari feed, bukan identitas
# akun login.
# UNVERIFIED - requires live Threads UI verification (struktur sidebar).
PROFILE_LINK = 'div[role="navigation"] a[href^="/@"]'

# Nama tampilan di halaman profil (@username).
PROFILE_DISPLAY_NAME = 'h1[dir="auto"]'

# Link post di halaman profil (threads.com/@user/post/<id>).
POST_LINK = 'a[href*="/post/"]'

# ----------------------------------------------------------------------
# Scraping: search page (halaman detail post sebagai sumber data utama)
# ----------------------------------------------------------------------
# Semua selector di bawah ini VERIFIED live (Phase 7, 2026-08-11) pada
# halaman detail post threads.com/@user/post/<id>. Halaman detail memuat
# post utama + thread terkait/reply dengan struktur identik - parsing
# WAJIB discope ke grup pertama (DETAIL_COLUMN_BODY) atau posisi DOM
# pertama untuk post utama.

# Regex path post: /@<username>/post/<post_id> (juga menangkap variant
# /media). Dedup memakai post_id, bukan URL lengkap (search page
# mengeluarkan link /post/<id> dan /post/<id>/media untuk post yang sama).
POST_URL_RE = re.compile(r"/@([^/]+)/post/([A-Za-z0-9_-]+)")

# Container utama post dalam kolom detail. VERIFIED: tidak ada
# article/main/section - hanya div ini (aria-label="Column body").
# CATATAN 2026-08-11 (Phase 10 live): UI Threads memakai locale id-ID
# (worker men-set locale="id-ID"), jadi container menjadi
# aria-label="Bodi kolom". Untuk robust, kedua varian dipertahankan:
# ID primary (live saat ini), EN fallback.
DETAIL_COLUMN_BODY = '[aria-label="Column body"]'
DETAIL_COLUMN_BODY_ID = '[aria-label="Bodi kolom"]'

# Timestamp ISO UTC post utama = elemen <time> PERTAMA di halaman.
DETAIL_TIME = 'time'

# Content post: span[dir="auto"] di dalam column body (bukan div!).
# Header (username, waktu relatif, "RS thread") harus di-skip.
DETAIL_CONTENT_SPANS = '[aria-label="Column body"] span[dir="auto"]'
DETAIL_CONTENT_SPANS_ID = '[aria-label="Bodi kolom"] span[dir="auto"]'
DETAIL_CONTENT_SPANS_ALL = (DETAIL_CONTENT_SPANS_ID, DETAIL_CONTENT_SPANS)

# Tombol aksi Like/Reply/Repost/Share: teks gabungan label+count
# ("Like7.3K"). Grup pertama di column body = post utama. UI id-ID
# memakai "Suka/Balas/Posting ulang/Bagikan" (lihat _ACTION_PREFIXES
# di post_parser.py).
DETAIL_ACTION_BUTTONS = '[aria-label="Column body"] [role="button"]'
DETAIL_ACTION_BUTTONS_ID = '[aria-label="Bodi kolom"] [role="button"]'
DETAIL_ACTION_BUTTONS_ALL = (DETAIL_ACTION_BUTTONS_ID, DETAIL_ACTION_BUTTONS)

# Media gambar: img dengan alt "Photo by ..." di column body (bukan
# avatar yang alt-nya "<username>'s profile picture"). Pasangankan
# dengan DETAIL_PROFILE_PIC_ALT untuk memisahkan avatar.
DETAIL_MEDIA_IMAGES = '[aria-label="Column body"] img'
DETAIL_MEDIA_IMAGES_ID = '[aria-label="Bodi kolom"] img'
DETAIL_MEDIA_IMAGES_ALL = (DETAIL_MEDIA_IMAGES_ID, DETAIL_MEDIA_IMAGES)

# Media video: <video> dengan src CDN (poster kosong - jangan diandalkan).
DETAIL_VIDEOS = '[aria-label="Column body"] video'
DETAIL_VIDEOS_ID = '[aria-label="Bodi kolom"] video'
DETAIL_VIDEOS_ALL = (DETAIL_VIDEOS_ID, DETAIL_VIDEOS)

# Avatar akun: alt persis "<username>'s profile picture". Format pakai
# username hasil parse URL (DETAIL_PROFILE_PIC_ALT.format(username=...)).
# UI id-ID memakai "Foto profil <username>".
DETAIL_PROFILE_PIC_ALT = 'img[alt="{username}\'s profile picture"]'
DETAIL_PROFILE_PIC_ALT_ID = 'img[alt="Foto profil {username}"]'
DETAIL_PROFILE_PIC_ALT_ALL = (
    DETAIL_PROFILE_PIC_ALT_ID,
    DETAIL_PROFILE_PIC_ALT,
)

# View count: span pertama di halaman dengan teks pola "727K views"
# (UI id-ID: "2,6 rb tayangan" - dilihat di post_parser._VIEWS_RE).
DETAIL_VIEWS_SPAN = 'span'

# Penanda post diedit (tombol aria-label="Edited") di column body.
# UI id-ID kemungkinan "Diedit" (belum terverifikasi live - post yang
# dites belum pernah diedit; EN tetap jadi fallback).
DETAIL_EDITED_BUTTON = '[aria-label="Edited"]'
DETAIL_EDITED_BUTTON_ID = '[aria-label="Diedit"]'
DETAIL_EDITED_BUTTON_ALL = (DETAIL_EDITED_BUTTON_ID, DETAIL_EDITED_BUTTON)

# Meta og (fallback/verifikasi): display name dari og:title
# ("DisplayName (@username) on Threads"), gambar utama dari og:image,
# content dari og:description (TERPOTONG ~200 char - bukan sumber utama).
META_OG_TITLE = 'meta[property="og:title"]'
META_OG_IMAGE = 'meta[property="og:image"]'
META_OG_DESCRIPTION = 'meta[property="og:description"]'
