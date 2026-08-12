"""
Error types Threads Worker - terpusat agar status error konsisten.

Kode status (sesuai kontrak integrasi):
    THREADS_SESSION_EXPIRED
    THREADS_AUTH_REQUIRED
    THREADS_PUBLISH_FAILED
    THREADS_MEDIA_UPLOAD_FAILED
    THREADS_TIMEOUT
    THREADS_RATE_LIMITED
    THREADS_SELECTOR_CHANGED
    THREADS_BROWSER_ERROR

Aturan keamanan: pesan error TIDAK PERNAH mengandung cookie / sessionid /
csrftoken / token / password. Hanya deskripsi teknis + langkah perbaikan.
"""

from __future__ import annotations


class ThreadsError(Exception):
    """Base error Threads worker."""

    code = "THREADS_ERROR"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class ThreadsSessionExpiredError(ThreadsError):
    """Session tidak valid - halaman meminta login ulang.

    JANGAN retry publish; user harus re-authenticate (login.py /
    import_cookies.py).
    """

    code = "THREADS_SESSION_EXPIRED"


class ThreadsAuthRequiredError(ThreadsError):
    """Autentikasi belum tersedia (belum ada session sama sekali)."""

    code = "THREADS_AUTH_REQUIRED"


class ThreadsAuthUnverifiedError(ThreadsError):
    """Session tersimpan ada tetapi autentikasi tidak bisa diverifikasi.

    Misalnya storage state tidak terbaca / tidak berisi session yang
    bisa dikonfirmasi live. Bukan berarti akun salah - jalankan ulang
    threads/login.py untuk memastikan.
    """

    code = "THREADS_AUTH_UNVERIFIED"


class ThreadsPublishFailedError(ThreadsError):
    """Publish gagal setelah dikonfirmasi gagal oleh UI."""

    code = "THREADS_PUBLISH_FAILED"


class ThreadsMediaUploadFailedError(ThreadsPublishFailedError):
    """Upload media (gambar) gagal di composer."""

    code = "THREADS_MEDIA_UPLOAD_FAILED"


class ThreadsTimeoutError(ThreadsError):
    """Timeout menunggu konfirmasi UI (bukan berarti publish gagal).

    Hasil publish TIDAK bisa dikonfirmasi - cek manual sebelum mencoba
    ulang agar tidak duplicate post.
    """

    code = "THREADS_TIMEOUT"


class ThreadsRateLimitedError(ThreadsError):
    """Threads menolak karena aktivitas terlalu cepat / batas sementara."""

    code = "THREADS_RATE_LIMITED"


class ThreadsSelectorChangedError(ThreadsError):
    """Struktur UI Threads berubah - selector di selectors.py perlu update."""

    code = "THREADS_SELECTOR_CHANGED"


class ThreadsBrowserError(ThreadsError):
    """Browser gagal launch/navigasi (Playwright error)."""

    code = "THREADS_BROWSER_ERROR"


class ThreadsCookieError(ThreadsError):
    """Error terkait file cookie (bukan kredensial, hanya status)."""

    code = "THREADS_COOKIE_ERROR"


class ThreadsCookieFileMissing(ThreadsCookieError):
    """File cookie Netscape tidak ditemukan."""


class ThreadsCookieExpired(ThreadsCookieError):
    """Cookie sesi sudah kedaluwarsa - ekspor ulang dari browser."""


class ThreadsSessionInvalid(ThreadsCookieError):
    """File cookie tidak memuat penanda sesi login Threads."""


class ThreadsNotImplementedError(ThreadsError):
    """Fitur belum diimplementasikan (mis. video post - MVP)."""

    code = "THREADS_NOT_IMPLEMENTED"
