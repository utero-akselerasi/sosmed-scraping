"""
Retry Helper - async retry dengan exponential backoff.

Dipakai bersama oleh worker (Facebook, Website, dst.) untuk operasi yang
rawan gagal sementara (navigasi, request jaringan) tanpa menduplikasi
logika retry di tiap worker.
"""

from __future__ import annotations

import asyncio
from typing import Awaitable, Callable, Optional, Tuple, Type, Union

from loguru import logger


async def retry_async(
    fn: Callable[[], Awaitable],
    retries: int = 3,
    base_delay: float = 2.0,
    max_delay: float = 60.0,
    exceptions: Union[Type[BaseException], Tuple[Type[BaseException], ...]] = Exception,
    description: str = "operation",
) -> object:
    """Jalankan fn dengan retry + exponential backoff.

    Retry hanya untuk exception yang termasuk `exceptions` (default: semua).
    Delay = base_delay * 2^(attempt-1), dibatasi max_delay.

    Mengembalikan hasil fn, atau melempar exception terakhir setelah
    semua percobaan habis.
    """
    last_error: Optional[BaseException] = None

    for attempt in range(1, retries + 1):
        try:
            return await fn()
        except exceptions as e:  # type: ignore[misc]
            last_error = e
            if attempt >= retries:
                break
            delay = min(max_delay, base_delay * (2 ** (attempt - 1)))
            logger.warning(
                f"Retry {description} ({attempt}/{retries}) gagal: "
                f"{type(e).__name__}: {str(e)[:120]} - coba lagi dalam {delay:.1f}s"
            )
            await asyncio.sleep(delay)

    if last_error is not None:
        raise last_error
    raise RuntimeError(f"retry_async({description}): tidak ada percobaan dilakukan")
