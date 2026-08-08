"""
Data models Facebook worker.

- RawPost: satu postingan seperti yang diekstrak dari DOM halaman Facebook.
- NormalizedPost: struktur normalisasi yang SAMA dengan kontrak Instagram
  worker (platform, platform_post_id, author, text, url, posted_at, likes,
  comments, shares, hashtags, images, videos) - backend tidak perlu berubah.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class RawPost(BaseModel):
    """Postingan mentah hasil ekstraksi DOM (sebelum normalisasi)."""

    url: str = ""
    post_id: str = ""
    author: str = ""
    text: str = ""
    posted_at: Optional[datetime] = None
    likes: int = 0
    comments: int = 0
    shares: int = 0
    images: List[str] = Field(default_factory=list)
    videos: List[str] = Field(default_factory=list)
    links: List[str] = Field(default_factory=list)
    page_username: str = ""
    page_name: str = ""


class NormalizedPost(BaseModel):
    """Postingan ternormalisasi - struktur sama dengan Instagram worker."""

    platform: str = "facebook"
    platform_post_id: str
    author: str
    text: str
    url: str
    posted_at: Optional[datetime] = None
    likes: int = 0
    comments: int = 0
    shares: int = 0
    hashtags: List[str] = Field(default_factory=list)
    images: List[str] = Field(default_factory=list)
    videos: List[str] = Field(default_factory=list)
