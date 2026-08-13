"""
Phase 12 - Audit & cleanup relevansi post Threads.

Membandingkan SETIAP post Threads di database dengan active keyword
dari Keyword Management (source of truth) menggunakan matcher strict
yang sama dengan worker (shared/relevance.py).

Mode:
- default (audit): hanya menghitung & menampilkan sample - TIDAK menghapus.
- --execute: hapus post Threads yang TIDAK relevan dalam satu transaction.

Aturan:
- Hanya post dengan platform.type='threads' yang diproses.
- Post dipertahankan jika strict_keyword_match(kw, content) untuk
  minimal satu active keyword.
- Post dengan content kosong -> irrelevant (candidate delete), tapi
  ditampilkan terpisah agar bisa diverifikasi sebelum dihapus.
- Influencer TIDAK dihapus (hanya dilaporkan jika menjadi orphan).

Usage:
    python threads/cleanup_relevance.py            # audit saja
    python threads/cleanup_relevance.py --execute  # hapus (perlu audit dulu)
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import asyncpg
from dotenv import load_dotenv
from loguru import logger

WORKERS_DIR = Path(__file__).resolve().parent.parent
if str(WORKERS_DIR) not in sys.path:
    sys.path.insert(0, str(WORKERS_DIR))

load_dotenv()

from shared.relevance import match_keywords

SAMPLE_LIMIT = 10


def db_config() -> Dict[str, Any]:
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", 5432)),
        "database": os.getenv("DB_NAME", "festival_mbois"),
        "user": os.getenv("DB_USER", "mbois_user"),
        "password": os.getenv("DB_PASSWORD", "mbois_password_2026"),
    }


async def get_active_keywords(pool) -> List[str]:
    rows = await pool.fetch(
        "SELECT keyword FROM keywords WHERE is_active = true "
        "ORDER BY priority DESC"
    )
    return [row["keyword"] for row in rows]


async def get_threads_platform(pool) -> str:
    row = await pool.fetchrow(
        "SELECT id FROM platforms WHERE type = 'threads' AND is_active = true"
    )
    if not row:
        raise RuntimeError(
            "Platform Threads tidak ditemukan di database "
            "(type='threads', is_active=true)"
        )
    return row["id"]


async def fetch_threads_posts(pool, platform_id: str) -> List[Dict[str, Any]]:
    rows = await pool.fetch(
        """
        SELECT p.id, p.platform_post_id, p.content, p.posted_at,
               p.metadata, i.username
        FROM posts p
        LEFT JOIN influencers i ON p.influencer_id = i.id
        WHERE p.platform_id = $1
        ORDER BY p.posted_at DESC
        """,
        platform_id,
    )
    return [dict(row) for row in rows]


def classify(posts: List[Dict[str, Any]], keywords: List[str]) -> Tuple:
    """Return (relevant, irrelevant, empty_content) lists."""
    relevant, irrelevant, empty = [], [], []
    for post in posts:
        content = (post.get("content") or "").strip()
        if not content:
            empty.append(post)
            continue
        matched = match_keywords(keywords, content)
        if matched:
            post["matched_keywords"] = matched
            relevant.append(post)
        else:
            irrelevant.append(post)
    return relevant, irrelevant, empty


def print_sample(posts: List[Dict[str, Any]], title: str, keywords: List[str]):
    print(f"\n  {title} (sample max {SAMPLE_LIMIT}):")
    if not posts:
        print("    (tidak ada)")
        return
    for post in posts[:SAMPLE_LIMIT]:
        content = (post.get("content") or "").strip().replace("\n", " ")
        snippet = content[:120] + ("..." if len(content) > 120 else "")
        print(
            f"    - post_id={post['id']} "
            f"platform_post_id={post.get('platform_post_id')} "
            f"@{post.get('username') or '?'}\n"
            f"      content: {snippet or '(KOSONG)'}"
        )
        if "matched_keywords" in post:
            print(f"      matched keywords: {post['matched_keywords']}")


async def count_orphan_influencers(pool, platform_id: str) -> int:
    row = await pool.fetchrow(
        """
        SELECT COUNT(*)::int AS count
        FROM influencers inf
        WHERE inf.platform_id = $1
          AND NOT EXISTS (
              SELECT 1 FROM posts p WHERE p.influencer_id = inf.id
          )
        """,
        platform_id,
    )
    return row["count"]


async def audit(pool, keywords: List[str], platform_id: str) -> None:
    posts = await fetch_threads_posts(pool, platform_id)
    relevant, irrelevant, empty = classify(posts, keywords)
    orphans = await count_orphan_influencers(pool, platform_id)

    print("=" * 70)
    print("PHASE 12 - AUDIT RELEVANSI POST THREADS")
    print("=" * 70)
    print(f"Active keywords dari DB ({len(keywords)}): {keywords}")
    print(f"Total post Threads di database      : {len(posts)}")
    print(f"  Relevan      (keep)                : {len(relevant)}")
    print(f"  Tidak relevan (candidate delete)   : {len(irrelevant)}")
    print(
        f"  Content kosong (candidate delete)   : {len(empty)} "
        "(relevansi tidak bisa ditentukan dari konten)"
    )

    print_sample(relevant, "Contoh post RELEVAN", keywords)
    print_sample(irrelevant, "Contoh post TIDAK RELEVAN", keywords)
    print_sample(empty, "Contoh post CONTENT KOSONG", keywords)

    print(f"\nInfluencer Threads yang jadi orphan (jika post dihapus): {orphans}")
    print("  (influencer TIDAK dihapus oleh script ini - hanya dilaporkan)")
    print("=" * 70)


async def cleanup(pool, keywords: List[str], platform_id: str) -> None:
    posts = await fetch_threads_posts(pool, platform_id)
    relevant, irrelevant, empty = classify(posts, keywords)
    to_delete = [p for p in (irrelevant + empty) if p["id"]]

    print(f"Akan menghapus {len(to_delete)} post Threads "
          f"({len(irrelevant)} tidak relevan + {len(empty)} content kosong)")

    deleted = 0
    async with pool.acquire() as conn:
        async with conn.transaction():
            for post in to_delete:
                await conn.execute(
                    "DELETE FROM posts WHERE id = $1", post["id"]
                )
                deleted += 1

    orphans = await count_orphan_influencers(pool, platform_id)
    print(f"Terhapus: {deleted} post")
    print(f"Orphan influencer Threads setelah delete: {orphans} "
          "(TIDAK dihapus - verifikasi manual jika perlu)")
    print("Cleanup selesai (satu transaction, atomic).")


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Hapus post Threads tidak relevan (default: audit saja)",
    )
    args = parser.parse_args()

    pool = await asyncpg.create_pool(**db_config(), min_size=1, max_size=2)
    try:
        keywords = await get_active_keywords(pool)
        platform_id = await get_threads_platform(pool)
        if not keywords:
            print("TIDAK ADA active keyword di database - abort.")
            return
        await audit(pool, keywords, platform_id)
        if args.execute:
            await cleanup(pool, keywords, platform_id)
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
