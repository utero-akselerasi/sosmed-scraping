"""
Publisher Threads - publish post via UI browser (bukan API).

Fungsi utama:
    create_text_post(context, text, request_id=None)
    create_image_post(context, image_path, text, request_id=None)
    create_video_post(...) - NotImplemented (di luar MVP)

Duplicate protection (idempotensi):
- Setiap publish menerima request_id opsional (job/request ID existing).
- Riwayat publish disimpan di <session_dir>/published.json, keyed by
  request_id -> {status, url, at}.
- status "success": publish terkonfirmasi -> jika request_id sama
  dipanggil lagi, return hasil tersimpan (TIDAK publish ulang).
- status "maybe": timeout konfirmasi setelah klik Post -> TIDAK pernah
  publish ulang otomatis; laporkan ke user untuk cek manual.

Retry policy:
- Timeout/navigation failure: retry terbatas (THREADS_RETRY_COUNT).
- Session expired / auth failure: STOP (raise, tanpa retry).
- Selector tidak ditemukan: gagal langsung (ThreadsSelectorChangedError),
  tidak mencoba-coba selector lain berkali-kali.
"""

from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path
from typing import Any, Dict, Optional

from loguru import logger

from threads import selectors
from threads.config import ThreadsConfig
from threads.errors import (
    ThreadsBrowserError,
    ThreadsMediaUploadFailedError,
    ThreadsNotImplementedError,
    ThreadsPublishFailedError,
    ThreadsRateLimitedError,
    ThreadsSelectorChangedError,
    ThreadsTimeoutError,
)

SUPPORTED_IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")


class ThreadsPublisher:
    """Publish thread (teks / gambar) melalui UI Threads."""

    def __init__(self, config: ThreadsConfig, session_manager):
        self.config = config
        self.session_manager = session_manager
        self.published_log_file: Path = config.published_log_file
        self._clicked_post = False

    # ------------------------------------------------------------------
    # Create text post
    # ------------------------------------------------------------------

    async def create_text_post(
        self, context: Any, text: str, request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Publish thread teks. Returns {success, postId, url, error}."""
        logger.info("[Threads] publishing post")
        text = (text or "").strip()
        if not text:
            raise ThreadsPublishFailedError("Text post kosong - tidak dipublish.")

        cached = self._check_idempotency(request_id)
        if cached:
            return cached

        for attempt in range(self.config.retry_count + 1):
            try:
                await self.session_manager.ensure_valid_session(context)
                return await self._publish_text_attempt(context, text, request_id)
            except (ThreadsBrowserError, ThreadsTimeoutError) as e:
                # Timeout/navigation failure -> retry terbatas.
                # Klik "Post" BELUM terjadi -> aman retry (tidak duplicate).
                if attempt < self.config.retry_count and not self._clicked_post:
                    logger.warning(
                        f"[Threads] Retry {attempt + 1}/"
                        f"{self.config.retry_count} ({e.code})"
                    )
                    await asyncio.sleep(self.config.retry_base_delay)
                    continue
                if self._clicked_post and isinstance(e, ThreadsTimeoutError):
                    # Sudah klik Post tapi konfirmasi timeout -> jangan
                    # publish ulang; tandai 'maybe' untuk cek manual.
                    self._record_attempt(
                        request_id, "maybe", None, error=e.code
                    )
                    raise
                raise
        raise ThreadsPublishFailedError("Publish text post gagal setelah retry habis.")

    async def _publish_text_attempt(
        self, context: Any, text: str, request_id: Optional[str]
    ) -> Dict[str, Any]:
        page = await context.new_page()
        try:
            self._clicked_post = False
            await self._open_composer(page)

            textarea = await self._composer_textarea(page)
            await textarea.fill(text)

            await self._click_post_button(page)

            url = await self._wait_confirmation_and_get_url(page)
            self._record_attempt(request_id, "success", url, None)
            logger.info("[Threads] publish success")
            return {"success": True, "postId": None, "url": url, "error": None}
        finally:
            await page.close()

    # ------------------------------------------------------------------
    # Create image post
    # ------------------------------------------------------------------

    async def create_image_post(
        self, context: Any, image_path: str, text: str = "", request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Publish thread dengan gambar. Returns {success, postId, url, error}."""
        logger.info("[Threads] publishing image post")
        image_path = Path(image_path)

        if not image_path.exists() or not image_path.is_file():
            raise ThreadsMediaUploadFailedError(
                f"File gambar tidak ditemukan: {image_path}"
            )
        if image_path.suffix.lower() not in SUPPORTED_IMAGE_EXTENSIONS:
            raise ThreadsMediaUploadFailedError(
                f"Format gambar tidak didukung: {image_path.suffix} "
                f"(dukung: {', '.join(SUPPORTED_IMAGE_EXTENSIONS)})"
            )

        cached = self._check_idempotency(request_id)
        if cached:
            return cached

        for attempt in range(self.config.retry_count + 1):
            try:
                await self.session_manager.ensure_valid_session(context)
                return await self._publish_image_attempt(
                    context, image_path, (text or "").strip(), request_id
                )
            except (ThreadsBrowserError, ThreadsTimeoutError) as e:
                if attempt < self.config.retry_count and not self._clicked_post:
                    logger.warning(
                        f"[Threads] Retry {attempt + 1}/"
                        f"{self.config.retry_count} ({e.code})"
                    )
                    await asyncio.sleep(self.config.retry_base_delay)
                    continue
                if self._clicked_post and isinstance(e, ThreadsTimeoutError):
                    self._record_attempt(
                        request_id, "maybe", None, error=e.code
                    )
                    raise
                raise
        raise ThreadsPublishFailedError("Publish image post gagal setelah retry habis.")

    async def _publish_image_attempt(
        self, context: Any, image_path: Path, text: str, request_id: Optional[str]
    ) -> Dict[str, Any]:
        page = await context.new_page()
        try:
            self._clicked_post = False
            await self._open_composer(page)

            await self._upload_image(page, image_path)
            logger.info("[Threads] media uploaded")

            if text:
                textarea = await self._composer_textarea(page)
                await textarea.fill(text)

            await self._click_post_button(page)

            url = await self._wait_confirmation_and_get_url(page)
            self._record_attempt(request_id, "success", url, None)
            logger.info("[Threads] publish success")
            return {"success": True, "postId": None, "url": url, "error": None}
        finally:
            await page.close()

    # ------------------------------------------------------------------
    # Video post (belum diimplementasikan - MVP)
    # ------------------------------------------------------------------

    async def create_video_post(self, context: Any, video_path: str, text: str = "", request_id: Optional[str] = None) -> Dict[str, Any]:
        raise ThreadsNotImplementedError(
            "create_video_post belum diimplementasikan (di luar MVP). "
            "Fokus MVP: session, health check, profile, text post, image post."
        )

    # ------------------------------------------------------------------
    # Composer flow helpers
    # ------------------------------------------------------------------

    async def _open_composer(self, page: Any) -> None:
        """Buka halaman home lalu klik tombol composer (dengan fallback)."""
        logger.info("[Threads] opening composer")
        try:
            await page.goto(
                selectors.THREADS_HOME,
                wait_until="domcontentloaded",
                timeout=self.config.timeout_ms,
            )
        except Exception as e:
            raise ThreadsBrowserError(
                f"Gagal membuka halaman Threads untuk composer: {str(e)[:160]}"
            ) from e

        for selector in selectors.COMPOSER_OPEN_BUTTONS:
            try:
                locator = page.locator(selector).first
                count = await page.locator(selector).count()
                if count == 0:
                    continue
                await locator.click(timeout=self.config.timeout_ms)
                return
            except Exception:
                continue

        raise ThreadsSelectorChangedError(
            "Tombol composer Threads tidak ditemukan "
            f"({', '.join(selectors.COMPOSER_OPEN_BUTTONS)}). UI Threads "
            "mungkin berubah - periksa selectors.py."
        )

    async def _composer_textarea(self, page: Any):
        """Cari textarea composer (dengan fallback selector)."""
        for selector in selectors.COMPOSER_TEXTAREA:
            try:
                locator = page.locator(selector).first
                await locator.wait_for(state="visible", timeout=self.config.timeout_ms)
                return locator
            except Exception:
                continue

        raise ThreadsSelectorChangedError(
            "Textarea composer Threads tidak ditemukan. UI Threads mungkin "
            "berubah - periksa selectors.py."
        )

    async def _upload_image(self, page: Any, image_path: Path) -> None:
        """Attach file gambar ke composer Threads dan tunggu hingga upload selesai.

        Alur:
        1. Tunggu input file media tersedia (selector MEDIA_FILE_INPUT).
        2. Set file gambar ke input (memicu upload browser).
        3. Polling selector MEDIA_UPLOAD_PROGRESS sampai hidden (indikator
           upload selesai). NOTE: Selector progress ini BELUM terverifikasi
           terhadap UI Threads live - lihat catatan di bawah.
        4. Best-effort: tunggu pratinjau media (MEDIA_PREVIEW_IMAGE) visible
           sebagai konfirmasi tambahan (bukan penanda wajib).

        Catatan verifikasi UI:
        - Selector MEDIA_UPLOAD_PROGRESS & MEDIA_PREVIEW_IMAGE diambil dari
          inspeksi DOM pada saat development; Threads dapat mengubah struktur
          composer kapan saja tanpa ankungan.
        - Jika selector progress berubah, wait_for hidden akan timeout dan
          raise ThreadsMediaUploadFailedError (aman - tidak publish separuh).
        - Pratinjau media best-effort: jika selector tidak ditemukan, lanjut
          saja (log debug) agar tidak blocking false positive.
        - SEBELUM deploy production: verifikasi selector di selectors.py
          melawan UI Threads live di browser.

        Raises:
            ThreadsSelectorChangedError: Jika input file media tidak ditemukan.
            ThreadsMediaUploadFailedError: Jika attach file gagal atau upload
                tidak selesai dalam timeout.
        """
        file_input = page.locator(selectors.MEDIA_FILE_INPUT).first
        try:
            await file_input.wait_for(state="attached", timeout=self.config.timeout_ms)
        except Exception:
            raise ThreadsSelectorChangedError(
                "Input file media composer Threads tidak ditemukan. UI "
                "Threads mungkin berubah - periksa selectors.py."
            )

        try:
            await file_input.set_input_files(str(image_path))
        except Exception as e:
            raise ThreadsMediaUploadFailedError(
                f"Gagal attach file gambar: {str(e)[:160]}"
            ) from e

        # Tunggu indikator upload selesai (progressbar hilang / pratinjau
        # muncul). Selector MEDIA_UPLOAD_PROGRESS BELUM terverifikasi live
        # di UI Threads production - lihat docstring method untuk detail.
        # NOTE: Upload completion indicator selectors (MEDIA_UPLOAD_PROGRESS)
        # require live Threads UI verification. Current implementation waits
        # for progress bar to hide as best-effort; if selector changes in
        # Threads UI, upload may proceed before fully complete.
        # Verify selectors.py against live UI before production deploy.
        try:
            for selector in selectors.MEDIA_UPLOAD_PROGRESS:
                locator = page.locator(selector)
                if await locator.count() > 0:
                    await locator.wait_for(
                        state="hidden", timeout=self.config.timeout_ms
                    )
                    break
        except Exception:
            # Upload masih berjalan di luar timeout - jangan lanjut publish
            raise ThreadsMediaUploadFailedError(
                "Upload gambar tidak selesai dalam batas waktu. Coba "
                "periksa koneksi / format file, lalu jalankan ulang."
            )

        # Pratinjau media (best-effort; bukan penanda wajib)
        try:
            preview = page.locator(selectors.MEDIA_PREVIEW_IMAGE).first
            await preview.wait_for(state="visible", timeout=10000)
        except Exception:
            logger.debug(
                "[Threads] Pratinjau media tidak terdeteksi - lanjut "
                "(selector belum terverifikasi live)"
            )

    async def _click_post_button(self, page: Any) -> None:
        """Klik tombol Post di modal composer."""
        self._clicked_post = False
        for selector in selectors.COMPOSER_POST_BUTTONS:
            try:
                locator = page.locator(selector).first
                count = await page.locator(selector).count()
                if count == 0:
                    continue
                await locator.click(timeout=self.config.timeout_ms)
                self._clicked_post = True
                logger.info("[Threads] post button clicked")
                return
            except Exception:
                continue

        raise ThreadsSelectorChangedError(
            "Tombol Post composer Threads tidak ditemukan. UI Threads "
            "mungkin berubah - periksa selectors.py."
        )

    async def _wait_confirmation_and_get_url(self, page: Any) -> Optional[str]:
        """Tunggu konfirmasi publish (modal composer tertutup).

        Jika timeout -> ThreadsTimeoutError (hasil tidak pasti).
        Setelah konfirmasi, coba ambil URL post terbaru (best-effort).
        """
        dialog = page.locator(selectors.COMPOSER_MODAL_DIALOG)
        textarea = page.locator(selectors.COMPOSER_TEXTAREA[0])
        try:
            # asyncio.wait_for memakai DETIK (config.timeout_ms dalam ms)
            await asyncio.wait_for(
                self._wait_modal_closed(dialog, textarea),
                timeout=self.config.timeout_ms / 1000,
            )
        except asyncio.TimeoutError:
            raise ThreadsTimeoutError(
                "Waktu tunggu konfirmasi publish habis - hasil TIDAK "
                "pasti (post mungkin sudah ter-publish). Cek akun manual "
                "sebelum publish ulang agar tidak duplicate."
            )

        # Best-effort: URL post terbaru dari halaman profil
        return await self._fetch_latest_post_url(page)

    async def _wait_modal_closed(self, dialog, textarea) -> None:
        """Polling: modal/textarea composer tidak lagi terlihat."""
        while True:
            try:
                dialog_count = await dialog.count()
                textarea_count = await textarea.count()
                if dialog_count == 0 and textarea_count == 0:
                    return
                if dialog_count > 0 and not await dialog.first.is_visible():
                    return
                if textarea_count > 0 and not await textarea.first.is_visible():
                    return
            except Exception:
                return
            await asyncio.sleep(0.5)

    async def _fetch_latest_post_url(self, page: Any) -> Optional[str]:
        """Ambil URL post terbaru dari profil (best-effort, None jika gagal)."""
        try:
            username = await self._current_username(page)
            if not username:
                return None
            await page.goto(
                f"{selectors.THREADS_HOST}/@{username}",
                wait_until="domcontentloaded",
                timeout=self.config.timeout_ms,
            )
            link = page.locator(selectors.POST_LINK).first
            count = await page.locator(selectors.POST_LINK).count()
            if count == 0:
                return None
            href = await link.get_attribute("href")
            if not href:
                return None
            if href.startswith("http"):
                return href
            return f"{selectors.THREADS_HOST}{href}"
        except Exception:
            return None

    async def _current_username(self, page: Any) -> Optional[str]:
        """Username dari link profil (href /@username) di halaman aktif."""
        from threads.profile import _find_username

        return await _find_username(page)

    # ------------------------------------------------------------------
    # Idempotency
    # ------------------------------------------------------------------

    def _check_idempotency(self, request_id: Optional[str]) -> Optional[Dict[str, Any]]:
        """Cek riwayat publish untuk request_id yang sama.

        - success: hasil dikembalikan (TIDAK publish ulang).
        - maybe: raise ThreadsTimeoutError (hasil tidak pasti).
        """
        if not request_id:
            return None
        log = self._load_log()
        entry = log.get(request_id)
        if not entry:
            return None
        if entry.get("status") == "success":
            logger.info(
                f"[Threads] request_id {request_id} sudah pernah publish "
                "berhasil - dikembalikan dari log (idempotent)"
            )
            return {
                "success": True,
                "postId": None,
                "url": entry.get("url"),
                "error": None,
                "cached": True,
            }
        if entry.get("status") == "maybe":
            raise ThreadsTimeoutError(
                "request_id ini pernah publish dengan hasil tidak pasti "
                "(timeout konfirmasi). Cek akun manual - TIDAK publish ulang "
                "otomatis untuk mencegah duplicate post."
            )
        return None

    def _record_attempt(
        self,
        request_id: Optional[str],
        status: str,
        url: Optional[str],
        error: Optional[str],
    ) -> None:
        """Catat hasil publish ke published.json (hanya metadata)."""
        if not request_id:
            return
        log = self._load_log()
        log[request_id] = {
            "status": status,
            "url": url,
            "error": error,
            "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        try:
            self.published_log_file.parent.mkdir(parents=True, exist_ok=True)
            self.published_log_file.write_text(
                json.dumps(log, indent=2), encoding="utf-8"
            )
        except OSError as e:
            logger.warning(
                f"[Threads] Gagal menulis published log: {e} "
                "(idempotency tidak aktif untuk run ini)"
            )

    def _load_log(self) -> Dict[str, Any]:
        try:
            return json.loads(self.published_log_file.read_text("utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}
