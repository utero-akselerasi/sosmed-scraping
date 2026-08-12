"""Unit test parser detail post Threads (post_parser.py).

Selector yang diuji = selector VERIFIED Phase 7. Fake page menyediakan
data eval_all/attributes; hasil harus mengikuti struktur DOM yang
terverifikasi live (column body, Like7.3K, time datetime, dll).
"""

from threads import selectors
from threads.post_parser import (
    display_name_from_og_title,
    extract_action_counts,
    extract_content_from_spans,
    extract_post_username,
    extract_views,
    parse_count_value,
    parse_post_data,
)
from fake_playwright import FakeContext, FakePage

POST_URL = "https://www.threads.com/@uteroindonesia/post/DbSiiYZne76"

COLUMN_BODY = selectors.DETAIL_COLUMN_BODY
CONTENT_SPANS = selectors.DETAIL_CONTENT_SPANS
ACTION_BUTTONS = selectors.DETAIL_ACTION_BUTTONS
MEDIA_IMAGES = selectors.DETAIL_MEDIA_IMAGES
VIDEOS = selectors.DETAIL_VIDEOS
EDITED = selectors.DETAIL_EDITED_BUTTON
OG_TITLE = selectors.META_OG_TITLE
OG_IMAGE = selectors.META_OG_IMAGE
TIME = selectors.DETAIL_TIME


def _page(**kwargs) -> FakePage:
    context = FakeContext()
    return FakePage(context, url="about:blank", **kwargs)


# ----------------------------------------------------------------------
# Pure helpers
# ----------------------------------------------------------------------

def test_parse_count_value():
    assert parse_count_value("7.3K") == 7300
    assert parse_count_value("1.1K") == 1100
    assert parse_count_value("337") == 337
    assert parse_count_value("2.380") == 2380
    assert parse_count_value("") is None
    assert parse_count_value("abc") is None
    assert parse_count_value("1.2M") == 1200000
    # UI Indonesia: "rb" (ribu) / "jt" (juta)
    assert parse_count_value("2,6 rb") == 2600
    assert parse_count_value("1,2 jt") == 1200000
    assert parse_count_value("7,5 K") == 7500


def test_extract_content_skips_headers():
    spans = ["uteroindonesia", "RS thread", "2d", "Konten utama post"]
    assert extract_content_from_spans(spans, "uteroindonesia") == \
        "Konten utama post"


def test_extract_content_skips_community_badge_id():
    """UI id-ID: badge komunitas ('komunitas malang') muncul sebelum
    tanggal - harus di-skip, bukan dianggap content."""
    spans = [
        "goodnessneverfades", "komunitas malang", "22/07/2026",
        "URGENT!!! Dibutuhkan KOL Malang",
    ]
    assert extract_content_from_spans(spans, "goodnessneverfades") == \
        "URGENT!!! Dibutuhkan KOL Malang"


def test_extract_content_skips_location_badge_id():
    """VERIFIED live 2026-08-11: badge LOKASI tanpa kata 'komunitas'
    ('Malang', 'poliponi bali') sebelum waktu ID ('4 hari') bukan
    content."""
    spans = ["hanumjane", "Malang", "4 hari", "Hi! Warga Threads! Ada Festival Kuliner"]
    assert extract_content_from_spans(spans, "hanumjane") == \
        "Hi! Warga Threads! Ada Festival Kuliner"


def test_extract_content_skips_community_badge_no_prefix():
    """VERIFIED live 2026-08-11: badge komunitas TANPA prefix
    ('SODFESTIVAL2026') + waktu relatif ID ('5 hari')."""
    spans = ["kikiraihaan", "SODFESTIVAL2026", "5 hari", "Breakdown Setlist Hindia"]
    assert extract_content_from_spans(spans, "kikiraihaan") == \
        "Breakdown Setlist Hindia"


def test_extract_content_id_relative_time_with_date():
    """VERIFIED live 2026-08-11: 'poliponi bali' bukan content."""
    spans = ["tudindaa_", "poliponi bali", "04/07/2026", "Review pribadi sebagai warga festival"]
    assert extract_content_from_spans(spans, "tudindaa_") == \
        "Review pribadi sebagai warga festival"


def test_extract_content_id_relative_time_just_now():
    spans = ["userx", "Baru saja", "Konten baru"]
    assert extract_content_from_spans(spans, "userx") == "Konten baru"


def test_extract_content_no_time_fallback():
    """Tanpa span waktu di header - fallback skip header yang dikenal."""
    spans = ["userx", "komunitas malang", "Konten utama"]
    assert extract_content_from_spans(spans, "userx") == "Konten utama"


def test_extract_content_multi_line_span():
    spans = ["uteroindonesia", "1d", "Baris satu\nBaris dua"]
    assert extract_content_from_spans(spans, "uteroindonesia") == \
        "Baris satu\nBaris dua"


def test_extract_content_empty():
    assert extract_content_from_spans([], "uteroindonesia") == ""
    assert extract_content_from_spans(["uteroindonesia", "2d"], "uteroindonesia") == ""


def test_extract_action_counts():
    buttons = [
        "More", "Follow", "Translate",
        "Like7.3K", "Reply1.1K", "Repost337", "Share961",
    ]
    counts = extract_action_counts(buttons)
    assert counts == {
        "likes_count": 7300,
        "comments_count": 1100,
        "reposts_count": 337,
        "shares_count": 961,
    }


def test_extract_action_counts_id():
    """UI id-ID: Suka/Balas/Posting ulang/Bagikan."""
    buttons = [
        "Ikuti", "Lainnya",
        "Suka25", "Balas22", "Posting ulang3", "Bagikan20",
    ]
    counts = extract_action_counts(buttons)
    assert counts == {
        "likes_count": 25,
        "comments_count": 22,
        "reposts_count": 3,
        "shares_count": 20,
    }


def test_extract_action_counts_missing():
    counts = extract_action_counts(["More", "SortTopMore"])
    assert counts["likes_count"] is None
    assert counts["shares_count"] is None


def test_extract_views():
    spans = ["Feeds", "Follow", "727K views", "2d"]
    assert extract_views(spans) == 727000
    assert extract_views(spans[:2]) is None


def test_extract_views_id():
    spans = ["Untuk Anda", "2,6 rb tayangan"]
    assert extract_views(spans) == 2600
    assert extract_views(["Untuk Anda"]) is None


def test_display_name_from_og_title():
    assert display_name_from_og_title(
        "hariyani (@uteroindonesia) on Threads"
    ) == "hariyani"
    assert display_name_from_og_title(
        "@transformer2800 on Threads"
    ) is None
    assert display_name_from_og_title(None) is None


def test_extract_post_username():
    assert extract_post_username(POST_URL) == "uteroindonesia"
    assert extract_post_username(
        "https://www.threads.com/@x/post/abc/media"
    ) == "x"
    assert extract_post_username("https://www.threads.com/@profile") is None


# ----------------------------------------------------------------------
# parse_post_data (async, fake page)
# ----------------------------------------------------------------------

async def test_parse_full_post_image():
    page = _page(
        visible_selectors={
            TIME, OG_TITLE, OG_IMAGE,
            selectors.DETAIL_PROFILE_PIC_ALT.format(username="uteroindonesia"),
        },
        attributes={
            TIME: {"datetime": "2026-08-08T20:14:52.000Z"},
            OG_TITLE: {"content": "hariyani (@uteroindonesia) on Threads"},
            OG_IMAGE: {"content": "https://cdn.example.com/og_media.webp"},
            selectors.DETAIL_PROFILE_PIC_ALT.format(
                username="uteroindonesia"
            ): {"src": "https://cdn.example.com/avatar.jpg"},
        },
        eval_all={
            CONTENT_SPANS: [
                "uteroindonesia", "RS thread", "2d",
                "Kok bisa ya di Indonesia katanya usus buntu...",
            ],
            ACTION_BUTTONS: [
                "More", "Follow", "Translate",
                "Like7.3K", "Reply1.1K", "Repost337", "Share961",
            ],
            MEDIA_IMAGES: [
                {"alt": "uteroindonesia's profile picture",
                 "src": "https://cdn.example.com/avatar.jpg"},
                {"alt": "Photo by hariyani on August 08, 2026. May be a meme.",
                 "src": "https://cdn.example.com/photo.webp"},
            ],
            VIDEOS: [],
            selectors.DETAIL_VIEWS_SPAN: [
                "For you", "Feeds", "727K views", "2d",
            ],
        },
    )
    data = await parse_post_data(page, POST_URL, "utero")
    assert data is not None
    assert data["platform_post_id"] == "DbSiiYZne76"
    assert data["username"] == "uteroindonesia"
    assert data["full_name"] == "hariyani"
    assert data["post_type"] == "image"
    assert data["content"] == "Kok bisa ya di Indonesia katanya usus buntu..."
    assert data["media_urls"] == ["https://cdn.example.com/photo.webp"]
    assert data["profile_picture_url"] == "https://cdn.example.com/avatar.jpg"
    assert data["likes_count"] == 7300
    assert data["comments_count"] == 1100
    assert data["shares_count"] == 961
    assert data["reposts_count"] == 337
    assert data["views_count"] == 727000
    assert data["posted_at"] == "2026-08-08T20:14:52.000Z"
    assert data["post_url"] == POST_URL
    assert data["metadata"]["keyword_source"] == "utero"
    assert data["metadata"]["reposts_count"] == 337
    assert data["metadata"]["is_edited"] is False
    assert page.url == POST_URL


async def test_parse_full_post_id():
    """Struktur DOM live saat ini (UI id-ID): 'Bodi kolom', tombol
    Suka/Balas/Posting ulang/Bagikan, 'Foto profil <user>',
    '<n> rb tayangan', badge komunitas."""
    body_id = selectors.DETAIL_COLUMN_BODY_ID
    page = _page(
        visible_selectors={
            TIME, OG_TITLE, OG_IMAGE,
            selectors.DETAIL_PROFILE_PIC_ALT_ID.format(
                username="goodnessneverfades"
            ),
        },
        attributes={
            TIME: {"datetime": "2026-07-22T08:31:44.000Z"},
            OG_TITLE: {
                "content": "BUZZER DAN INFLUENCER AGENCY "
                "(@goodnessneverfades) di Threads"
            },
            OG_IMAGE: {"content": "https://cdn.example.com/og.webp"},
            selectors.DETAIL_PROFILE_PIC_ALT_ID.format(
                username="goodnessneverfades"
            ): {"src": "https://cdn.example.com/avatar.jpg"},
        },
        eval_all={
            selectors.DETAIL_CONTENT_SPANS_ID: [
                "goodnessneverfades", "komunitas malang", "22/07/2026",
                "URGENT!!! Dibutuhkan KOL Malang",
            ],
            selectors.DETAIL_ACTION_BUTTONS_ID: [
                "Ikuti", "Lainnya",
                "Suka25", "Balas22", "Posting ulang3", "Bagikan20",
            ],
            selectors.DETAIL_MEDIA_IMAGES_ID: [
                {"alt": "Foto profil goodnessneverfades",
                 "src": "https://cdn.example.com/avatar.jpg"},
                {"alt": "Photo by x on August 08, 2026.",
                 "src": "https://cdn.example.com/photo.webp"},
            ],
            selectors.DETAIL_VIDEOS_ID: [],
            selectors.DETAIL_VIEWS_SPAN: [
                "Untuk Anda", "2,6 rb tayangan",
            ],
        },
    )
    data = await parse_post_data(
        page,
        "https://www.threads.com/@goodnessneverfades/post/DbFqtXpGKpz",
        "festival mbois",
    )
    assert data is not None
    assert data["platform_post_id"] == "DbFqtXpGKpz"
    assert data["username"] == "goodnessneverfades"
    assert data["full_name"] == "BUZZER DAN INFLUENCER AGENCY"
    assert data["post_type"] == "image"
    assert data["content"] == "URGENT!!! Dibutuhkan KOL Malang"
    assert data["media_urls"] == ["https://cdn.example.com/photo.webp"]
    assert data["profile_picture_url"] == "https://cdn.example.com/avatar.jpg"
    assert data["likes_count"] == 25
    assert data["comments_count"] == 22
    assert data["reposts_count"] == 3
    assert data["shares_count"] == 20
    assert data["views_count"] == 2600
    assert data["posted_at"] == "2026-07-22T08:31:44.000Z"
    assert data["metadata"]["is_edited"] is False


async def test_parse_video_post():
    page = _page(
        eval_all={
            CONTENT_SPANS: ["aldilasalma", "1d", "Video asik"],
            ACTION_BUTTONS: ["Like49", "Reply11", "Repost10", "Share2"],
            MEDIA_IMAGES: [],
            VIDEOS: [
                "https://cdn.example.com/v1.mp4",
                "https://cdn.example.com/v2.mp4",
            ],
            selectors.DETAIL_VIEWS_SPAN: ["2.5K views"],
        },
    )
    data = await parse_post_data(
        page, "https://www.threads.com/@aldilasalma/post/DbXdnEgEQvI", "makanan"
    )
    assert data["post_type"] == "video"
    assert data["media_urls"] == [
        "https://cdn.example.com/v1.mp4",
        "https://cdn.example.com/v2.mp4",
    ]
    assert data["likes_count"] == 49
    assert data["views_count"] == 2500


async def test_parse_text_post_no_media():
    page = _page(
        eval_all={
            CONTENT_SPANS: ["userx", "4d", "Hanya teks"],
            ACTION_BUTTONS: ["Like5", "Reply1", "Repost0", "Share0"],
            MEDIA_IMAGES: [],
            VIDEOS: [],
        },
    )
    data = await parse_post_data(
        page, "https://www.threads.com/@userx/post/AbC123", "news"
    )
    assert data["post_type"] == "text"
    assert data["media_urls"] == []
    assert data["likes_count"] == 5
    assert data["comments_count"] == 1
    assert data["reposts_count"] == 0


async def test_parse_edited_flag():
    page = _page(
        visible_selectors={EDITED},
        eval_all={
            CONTENT_SPANS: ["userx", "4d", "Teks"],
            EDITED: ["Edited"],
        },
    )
    data = await parse_post_data(
        page, "https://www.threads.com/@userx/post/AbC123", "news"
    )
    assert data["metadata"]["is_edited"] is True


async def test_parse_hydration_wait_ignores_empty_buttons():
    """VERIFIED live 2026-08-11: tombol aksi post media bisa masih
    kosong saat domcontentloaded. Parser menunggu (bounded) hingga teks
    count muncul sebelum membaca Like/Balas/dll."""
    body_id = selectors.DETAIL_COLUMN_BODY_ID
    page = _page(
        visible_selectors={selectors.DETAIL_ACTION_BUTTONS_ID},
        eval_all={
            selectors.DETAIL_CONTENT_SPANS_ID: ["hanumjane", "Malang", "4 hari", "Hi!"],
            selectors.DETAIL_ACTION_BUTTONS_ID: [
                "Ikuti", "Ikuti", "Lainnya",
                "Suka71", "Balas22", "Posting ulang5", "Bagikan90",
            ],
            selectors.DETAIL_MEDIA_IMAGES_ID: [
                {"alt": "Foto profil hanumjane", "src": "https://cdn/a.jpg"},
                {"alt": "Photo by @hanumjane on August 06, 2026.",
                 "src": "https://cdn/photo.webp"},
            ],
            selectors.DETAIL_VIDEOS_ID: [],
            selectors.DETAIL_VIEWS_SPAN: ["11,9 rb tayangan"],
        },
    )
    data = await parse_post_data(
        page, "https://www.threads.com/@hanumjane/post/DbuhTi_klbl", "mbois"
    )
    assert data["post_type"] == "image"
    assert data["media_urls"] == ["https://cdn/photo.webp"]
    assert data["likes_count"] == 71
    assert data["comments_count"] == 22
    assert data["reposts_count"] == 5
    assert data["shares_count"] == 90
    assert data["views_count"] == 11900
    assert data["content"] == "Hi!"


async def test_parse_video_src_read_before_hydration():
    """VERIFIED live 2026-08-11: src video dibaca segera karena bisa
    di-clear setelah autoplay gagal - post tetap terdeteksi video."""
    body_id = selectors.DETAIL_COLUMN_BODY_ID
    page = _page(
        visible_selectors={selectors.DETAIL_ACTION_BUTTONS_ID},
        eval_all={
            selectors.DETAIL_CONTENT_SPANS_ID: ["muhammadhafizhrp", "07/06/2026", "Msi bocil"],
            selectors.DETAIL_ACTION_BUTTONS_ID: [
                "Ikuti", "Lainnya", "Suka186", "Balas51", "Bagikan2",
            ],
            selectors.DETAIL_MEDIA_IMAGES_ID: [],
            selectors.DETAIL_VIDEOS_ID: ["https://cdn.example.com/video.mp4"],
            selectors.DETAIL_VIEWS_SPAN: ["3,6 rb tayangan"],
        },
    )
    data = await parse_post_data(
        page, "https://www.threads.com/@muhammadhafizhrp/post/DZRuSKOk1ow", "lokal"
    )
    assert data["post_type"] == "video"
    assert data["media_urls"] == ["https://cdn.example.com/video.mp4"]
    assert data["likes_count"] == 186
    assert data["views_count"] == 3600
    assert data["content"] == "Msi bocil"


async def test_parse_video_cover_only_without_video_tag():
    """VERIFIED live 2026-08-11: video element jarang ter-mount; post
    video hanya menampilkan cover (img alt kosong, CDN v51.71878-15).
    Tanpa <video> ter-mount, post TETAP diklasifikasikan video dengan
    media_urls kosong (src tidak tersedia - jangan mengarang)."""
    page = _page(
        visible_selectors={selectors.DETAIL_ACTION_BUTTONS_ID},
        eval_all={
            selectors.DETAIL_CONTENT_SPANS_ID: ["muhammadhafizhrp", "07/06/2026", "Msi bocil"],
            selectors.DETAIL_ACTION_BUTTONS_ID: [
                "Ikuti", "Lainnya", "Suka186", "Balas51", "Bagikan2",
            ],
            selectors.DETAIL_MEDIA_IMAGES_ID: [
                {"alt": "Foto profil muhammadhafizhrp",
                 "src": "https://cdn.example.com/avatar.jpg"},
                {"alt": "",
                 "src": "https://instagram.fsub32-2.fna.fbcdn.net/v/t51.71878-15/718894234"},
            ],
            selectors.DETAIL_VIDEOS_ID: [],
            selectors.DETAIL_VIEWS_SPAN: ["3,6 rb tayangan"],
        },
    )
    data = await parse_post_data(
        page, "https://www.threads.com/@muhammadhafizhrp/post/DZRuSKOk1ow", "lokal"
    )
    assert data["post_type"] == "video"
    assert data["media_urls"] == []
    assert data["content"] == "Msi bocil"


async def test_parse_image_with_cover_tiles_still_image():
    """VERIFIED live 2026-08-11: post gambar carousel punya img "Photo
    by" PLUS tile cover alt kosong - tetap diklasifikasikan image."""
    page = _page(
        visible_selectors={selectors.DETAIL_ACTION_BUTTONS_ID},
        eval_all={
            selectors.DETAIL_CONTENT_SPANS_ID: ["hanumjane", "Malang", "4 hari", "Hi!"],
            selectors.DETAIL_ACTION_BUTTONS_ID: [
                "Ikuti", "Lainnya", "Suka71", "Balas22", "Bagikan90",
            ],
            selectors.DETAIL_MEDIA_IMAGES_ID: [
                {"alt": "Foto profil hanumjane", "src": "https://cdn/a.jpg"},
                {"alt": "Photo by @hanumjane on August 06, 2026.",
                 "src": "https://cdn/photo1.webp"},
                {"alt": "",
                 "src": "https://instagram.fsub32-2.fna.fbcdn.net/v/t51.71878-15/tile1"},
                {"alt": "",
                 "src": "https://instagram.fsub32-2.fna.fbcdn.net/v/t51.71878-15/tile2"},
            ],
            selectors.DETAIL_VIDEOS_ID: [],
        },
    )
    data = await parse_post_data(
        page, "https://www.threads.com/@hanumjane/post/DbuhTi_klbl", "mbois"
    )
    assert data["post_type"] == "image"
    assert data["media_urls"] == ["https://cdn/photo1.webp"]


async def test_parse_invalid_url_returns_none():
    page = _page()
    data = await parse_post_data(page, "https://www.threads.com/", "news")
    assert data is None


async def test_parse_missing_fields_no_crash():
    """Field yang tidak ada di DOM -> None / kosong, tidak crash."""
    page = _page()
    data = await parse_post_data(
        page, "https://www.threads.com/@ghost/post/ZzZ999", "news"
    )
    assert data is not None
    assert data["likes_count"] is None
    assert data["views_count"] is None
    assert data["posted_at"] is None
    assert data["profile_picture_url"] is None
    assert data["full_name"] is None
    assert data["content"] == ""
    assert data["media_urls"] == []
    assert data["post_type"] == "text"