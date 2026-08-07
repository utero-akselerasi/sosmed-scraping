"""
Worker Lock - Cross-process lock via PostgreSQL advisory locks

Workers dapat dijalankan dari beberapa entry point:
1. Terminal manual (instagram/worker.py, website/scraper.py)
2. Orchestrator (run_all.py)
3. Backend trigger (POST /scraping/run -> spawn website/scraper.py)

Tanpa lock, dua instance untuk platform yang SAMA bisa berjalan bersamaan
(race) - menyebabkan duplikat insert, hitungan posts_collected/errors yang
salah, dan rate-limit antar instance.

Solusi: pg_try_advisory_lock per platform (non-blocking). Key berbasis nama
platform yang stabil (BUKAN UUID platform_id, karena UUID berubah setiap
kali seed ulang). Lock session-scoped: otomatis lepas saat koneksi/pid
mati, tidak ada lock basi.
"""

import zlib
from typing import Optional
from loguru import logger


class WorkerLock:
    """Lock advisory PostgreSQL per platform (session-scoped)."""

    def __init__(self, platform_type: str):
        self.platform_type = platform_type
        # Key integer stabil per platform (crc32 -> 31-bit positif)
        self.key = zlib.crc32(platform_type.encode('utf-8')) & 0x7FFFFFFF
        self.db = None
        self.conn = None
        self.acquired = False

    async def acquire(self, db) -> bool:
        """Ambil dedicated connection lalu coba lock non-blocking.

        Mengembalikan True jika lock berhasil / False jika platform yang
        sama sedang dijalankan instance lain.
        """
        try:
            self.db = db
            self.conn = await db.pool.acquire()
            ok = await self.conn.fetchval(
                'SELECT pg_try_advisory_lock($1)', self.key
            )
            self.acquired = bool(ok)
            if not self.acquired:
                logger.warning(
                    f"[LOCK] Platform '{self.platform_type}' sedang "
                    f"dijalankan instance lain - run ini DILEWATI"
                )
            else:
                logger.info(
                    f"[LOCK] Platform '{self.platform_type}' lock aktif "
                    f"(key={self.key})"
                )
            return self.acquired
        except Exception as e:
            logger.error(f"[LOCK] Gagal acquire advisory lock: {e}")
            return False

    async def release(self):
        """Lepas lock dan kembalikan koneksi ke pool."""
        if not self.conn:
            return
        try:
            if self.acquired:
                await self.conn.execute(
                    'SELECT pg_advisory_unlock($1)', self.key
                )
                logger.info(
                    f"[LOCK] Platform '{self.platform_type}' lock dilepas"
                )
        except Exception as e:
            logger.error(f"[LOCK] Gagal release advisory lock: {e}")
        try:
            await self.db.pool.release(self.conn)
        except Exception:
            pass
        self.conn = None
        self.acquired = False
