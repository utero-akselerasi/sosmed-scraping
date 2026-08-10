"""
X (Twitter) API Provider - Official X API v2 (Recent Search).

Provider koleksi data X via Official X API v2 endpoint
GET /2/tweets/search/recent dengan autentikasi Bearer Token (app-only).

Logika di modul ini dipindahkan VERBATIM dari worker.py sebelumnya agar
perilaku API tidak berubah - hanya dibungkus dalam kelas XAPIProvider
sehingga worker bisa memilih provider lewat environment TWITTER_PROVIDER
(api / playwright).

Credential dibaca dari environment TWITTER_BEARER_TOKEN dan TIDAK PERNAH
dicetak ke log / error message.
"""

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from loguru import logger

try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    logger.warning("aiohttp not available. Install with: pip install aiohttp")

X_API_BASE = "https://api.x.com/2"
SEARCH_RECENT_URL = f"{X_API_BASE}/tweets/search/recent"


class TwitterAPIError(Exception):
    """Error dari X API dengan kategori yang jelas (tanpa credential)."""


class XAPIProvider:
    """Provider koleksi X via Official X API v2 (Recent Search).

    Antarmuka: prepare() / initialize() / search_keyword(keyword) / close().
    search_keyword mengembalikan list post data dengan struktur yang sama
    dengan provider lain (lihat normalize_tweet).
    """

    def __init__(self, worker):
        self.worker = worker
        self.bearer_token = worker.bearer_token
        self.exclude_retweets = worker.exclude_retweets
        self.lang_filter = worker.lang_filter
        self.max_posts_per_keyword = worker.max_posts_per_keyword
        self.timeout_seconds = worker.timeout_seconds
        self.max_retries = worker.max_retries
        self._session: Optional[Any] = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def prepare(self) -> Optional[str]:
        """Cek prasyarat (token + aiohttp). None jika siap.

        Urutan dan pesan sama persis dengan worker lama.
        """
        if not self.bearer_token:
            return (
                "X worker dihentikan: TWITTER_BEARER_TOKEN tidak diatur "
                "di environment"
            )
        if not AIOHTTP_AVAILABLE:
            return (
                "X worker dihentikan: aiohttp tidak tersedia "
                "(pip install aiohttp)"
            )
        return None

    async def initialize(self) -> None:
        """Buka session HTTP untuk semua permintaan pada run ini."""
        self._session = aiohttp.ClientSession()

    async def close(self) -> None:
        """Tutup session HTTP."""
        if self._session is not None:
            try:
                await self._session.close()
            except Exception:
                pass
            self._session = None

    # ------------------------------------------------------------------
    # Query & Normalisasi
    # ------------------------------------------------------------------

    def build_query(self, keyword: str) -> str:
        """Bangun query X search dari keyword.

        - Keyword dengan spasi dibungkus tanda kutip agar cocok sebagai
          frasa eksak (mis. "festival mbois"), token tunggal apa adanya.
        - Opsional mengecualikan retweet murni agar konten tidak duplikat.
        """
        keyword = keyword.strip()
        if not keyword:
            return ''

        query = keyword
        if ' ' in keyword:
            query = f'"{keyword}"'

        if self.exclude_retweets:
            query = f"{query} -is:retweet"

        if self.lang_filter:
            query = f"{query} lang:{self.lang_filter}"

        return query

    def normalize_tweet(
        self,
        tweet: Dict[str, Any],
        users: Dict[str, Dict[str, Any]],
        media: Dict[str, Dict[str, Any]],
        keyword: str,
    ) -> Optional[Dict[str, Any]]:
        """Map tweet X API v2 ke worker post data (format internal)."""
        tweet_id = str(tweet.get('id') or '')
        if not tweet_id:
            return None

        author = users.get(tweet.get('author_id') or '') or {}
        username = (author.get('username') or '').lower()
        full_name = author.get('name') or username or ''
        profile_picture_url = author.get('profile_image_url') or ''
        is_verified = bool(author.get('verified'))
        user_metrics = author.get('public_metrics') or {}
        followers_count = int(user_metrics.get('followers_count') or 0)

        metrics = tweet.get('public_metrics') or {}
        like_count = int(metrics.get('like_count') or 0)
        reply_count = int(metrics.get('reply_count') or 0)
        retweet_count = int(metrics.get('retweet_count') or 0)
        quote_count = int(metrics.get('quote_count') or 0)
        impression_count = int(metrics.get('impression_count') or 0)

        # Resolve media dari expansions attachments.media_keys
        media_urls: List[str] = []
        media_types: List[str] = []
        attachments = tweet.get('attachments') or {}
        for key in attachments.get('media_keys') or []:
            media_obj = media.get(key) or {}
            media_type = media_obj.get('type') or ''
            media_types.append(media_type)
            url = ''
            if media_type == 'photo':
                url = media_obj.get('url') or ''
            elif media_type in ('video', 'animated_gif'):
                url = media_obj.get('preview_image_url') or ''
            if url and url.startswith(('http://', 'https://')):
                media_urls.append(url)

        content = tweet.get('text') or ''
        created_at_raw = tweet.get('created_at')
        posted_at = None
        if created_at_raw:
            try:
                parsed = datetime.fromisoformat(
                    created_at_raw.replace('Z', '+00:00')
                )
                posted_at = parsed.astimezone(timezone.utc).replace(tzinfo=None)
            except (ValueError, TypeError) as e:
                logger.warning(
                    f"Tweet {tweet_id} created_at tidak valid "
                    f"({created_at_raw}): {e}"
                )

        referenced = tweet.get('referenced_tweets') or []
        referenced_type = ''
        if referenced:
            referenced_type = referenced[0].get('type') or ''

        if not posted_at:
            return None

        # URL kanonik post X
        if username:
            post_url = f"https://x.com/{username}/status/{tweet_id}"
        else:
            post_url = f"https://x.com/i/web/status/{tweet_id}"

        return {
            'platform_user_id': tweet.get('author_id') or '',
            'username': username,
            'full_name': full_name,
            'profile_picture_url': profile_picture_url,
            'followers_count': followers_count,
            'is_verified': is_verified,

            'platform_post_id': tweet_id,
            'post_type': 'post',
            'content': content,
            'media_urls': media_urls,
            'post_url': post_url,

            'likes_count': like_count,
            'comments_count': reply_count,
            'shares_count': retweet_count,
            'views_count': impression_count,

            'location': '',
            'posted_at': posted_at,

            'metadata': {
                'quote_count': quote_count,
                'impression_count': impression_count,
                'retweet_count': retweet_count,
                'reply_count': reply_count,
                'source': 'x-api-v2',
                'keyword': keyword,
                'lang': tweet.get('lang'),
                'media_types': media_types,
                'referenced_type': referenced_type,
                'is_retweet': referenced_type == 'retweeted',
                'is_quote': referenced_type == 'quoted',
                'is_reply': referenced_type == 'replied_to',
            }
        }

    # ------------------------------------------------------------------
    # X API
    # ------------------------------------------------------------------

    async def _request_with_retry(
        self, session: aiohttp.ClientSession, url: str, params: Dict[str, str]
    ) -> Dict[str, Any]:
        """Request X API dengan retry + backoff dan penanganan rate limit.

        Tidak pernah menyertakan credential pada log/error.
        """
        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                async with session.get(
                    url,
                    params=params,
                    headers={
                        'Authorization': f'Bearer {self.bearer_token}',
                        'User-Agent': (
                            'FestivalMboisIntelligencePlatform/1.0 '
                            '(compatible; +https://festivalmbois.example)'
                        ),
                    },
                    timeout=aiohttp.ClientTimeout(total=self.timeout_seconds),
                ) as response:
                    status = response.status

                    if status == 200:
                        return await response.json()

                    body = ''
                    try:
                        body = (await response.text())[:300]
                    except Exception:
                        pass

                    if status == 429:
                        reset_ts = response.headers.get('x-rate-limit-reset')
                        wait = 60.0
                        if reset_ts:
                            try:
                                wait = max(
                                    5.0,
                                    int(reset_ts) - datetime.now(timezone.utc).timestamp() + 2,
                                )
                            except ValueError:
                                pass
                        if attempt < self.max_retries:
                            logger.warning(
                                f"X API rate limit (429) - menunggu "
                                f"{wait:.0f}s (percobaan {attempt}/{self.max_retries})"
                            )
                            await asyncio.sleep(wait)
                            continue
                        raise TwitterAPIError(
                            "X API rate limit tercapai (429) - coba lagi nanti"
                        )

                    if status in (401, 403):
                        raise TwitterAPIError(
                            "Autentikasi X API gagal "
                            f"(HTTP {status}) - periksa TWITTER_BEARER_TOKEN"
                        )

                    if status == 402:
                        if 'credits depleted' in body.lower():
                            raise TwitterAPIError(
                                "Kuota/kredit X API habis (HTTP 402 credits "
                                "depleted) - tunggu siklus billing atau "
                                "tambah kredit di X Developer Portal"
                            )
                        raise TwitterAPIError(
                            f"X API payment required (HTTP 402): {body}"
                        )

                    if status in (400, 422):
                        raise TwitterAPIError(
                            f"Query X API ditolak (HTTP {status}): {body}"
                        )

                    if status >= 500:
                        if attempt < self.max_retries:
                            await asyncio.sleep(2 ** (attempt - 1) * 2)
                            continue
                        raise TwitterAPIError(
                            f"X API error server (HTTP {status})"
                        )

                    raise TwitterAPIError(
                        f"X API unexpected response (HTTP {status})"
                    )
            except asyncio.TimeoutError as e:
                last_error = e
                if attempt < self.max_retries:
                    await asyncio.sleep(2 ** (attempt - 1) * 2)
                    continue
                raise TwitterAPIError("X API timeout (network)") from e
            except aiohttp.ClientError as e:
                last_error = e
                if attempt < self.max_retries:
                    logger.warning(
                        f"Network error saat memanggil X API (percobaan "
                        f"{attempt}/{self.max_retries}): {type(e).__name__}"
                    )
                    await asyncio.sleep(2 ** (attempt - 1) * 2)
                    continue
                raise TwitterAPIError(
                    f"Gagal terhubung ke X API: {type(e).__name__}"
                ) from e
            except TwitterAPIError:
                raise
            except Exception as e:
                raise TwitterAPIError(f"Error X API tak terduga: {type(e).__name__}") from e

        if last_error is not None:
            raise TwitterAPIError(
                f"X API request gagal setelah {self.max_retries} percobaan"
            )
        raise TwitterAPIError("X API request gagal tanpa detail")

    async def search_keyword(self, keyword: str) -> List[Dict[str, Any]]:
        """Scrape tweet terbaru yang cocok dengan keyword via Recent Search."""
        query = self.build_query(keyword)
        if not query:
            logger.error(f"Keyword '{keyword}' menghasilkan query X kosong")
            return []

        max_results = min(
            100, max(10, self.max_posts_per_keyword)
        )

        params = {
            'query': query,
            'max_results': str(max_results),
            'tweet.fields': (
                'created_at,author_id,public_metrics,attachments,lang,'
                'referenced_tweets'
            ),
            'user.fields': (
                'username,name,profile_image_url,verified,public_metrics'
            ),
            'media.fields': 'url,preview_image_url,type',
            'expansions': (
                'author_id,attachments.media_keys,referenced_tweets.id'
            ),
        }

        logger.info(
            f"Scraping X keyword: {keyword} "
            f"(query: {query}, max_results: {max_results})"
        )

        try:
            payload = await self._request_with_retry(
                self._session, SEARCH_RECENT_URL, params
            )
        except TwitterAPIError as e:
            logger.error(f"Gagal mengambil tweet untuk '{keyword}': {e}")
            self.worker.failures.append(str(e))
            return []

        data = payload.get('data') or []
        includes = payload.get('includes') or {}

        users = {
            u.get('id'): u for u in (includes.get('users') or [])
            if u.get('id')
        }
        media = {
            m.get('media_key'): m for m in (includes.get('media') or [])
            if m.get('media_key')
        }

        logger.info(
            f"X API mengembalikan {len(data)} tweet untuk '{keyword}'"
        )

        posts_data = []
        for tweet in data:
            if not isinstance(tweet, dict):
                continue
            tweet_id = str(tweet.get('id') or '')
            if tweet_id in self.worker.seen_post_ids:
                logger.debug(f"Tweet {tweet_id} sudah diproses - dilewati")
                continue
            try:
                post_data = self.normalize_tweet(tweet, users, media, keyword)
            except Exception as e:
                logger.warning(f"Tweet {tweet_id} gagal dinormalisasi: {e}")
                continue
            if post_data is None:
                continue
            posts_data.append(post_data)
            self.worker.seen_post_ids.add(tweet_id)

        logger.info(f"Scraped {len(posts_data)} post baru untuk '{keyword}'")
        return posts_data
