"""
Strict keyword relevance matching (Phase 12).

Aturan deterministik & aman untuk mencocokkan post dengan active
keyword dari Keyword Management (source of truth).

Aturan:
- Case insensitive: "Festival Mbois" == "festival mbois" == "FESTIVAL MBOIS".
- Whitespace & punctuation dinormalisasi: "Festival, Mbois!" ->
  "festival mbois" (pemisah non-alphanumeric menjadi satu spasi).
- Token boundary: keyword "festival" TIDAK match "festivalvibe"
  (satu token utuh, bukan substring mentah).
- Keyword multi-token dianggap match hanya jika token-keyword muncul
  BERURUTAN (contiguous phrase) di token-content.
  "festival mbois" -> match "Festival Mbois 2026", "festival mbois
  malang", "Festival Mbois!"; TIDAK match "mbois banget festivalnya".
- Empty content / empty keyword -> tidak pernah match (deterministic).
"""

import re
from typing import List, Optional

_NON_WORD_RE = re.compile(r"[\W_]+", re.UNICODE)


def normalize_text(text: Optional[str]) -> str:
    """Normalisasi teks: lowercase + punctuation/whitespace -> spasi
    tunggal + strip. Mengembalikan string kosong untuk input kosong."""
    if not text:
        return ""
    normalized = _NON_WORD_RE.sub(" ", str(text).lower())
    return " ".join(normalized.split())


def tokenize(text: Optional[str]) -> List[str]:
    """Token kata dari teks (hasil normalize_text)."""
    normalized = normalize_text(text)
    return normalized.split() if normalized else []


def keyword_tokens(keyword: Optional[str]) -> List[str]:
    """Token keyword. Keyword yang tidak punya token sama sekali
    (mis. hanya tanda baca) -> [] (tidak pernah match)."""
    return tokenize(keyword)


def is_relevant(keyword: Optional[str], content: Optional[str]) -> bool:
    """True jika content mengandung keyword sebagai phrase token yang
    berurutan (strict, deterministic).

    Contoh:
        is_relevant("festival mbois", "Festival Mbois 2026") -> True
        is_relevant("festival mbois", "Festival Mbois!") -> True
        is_relevant("festival", "festivalvibe") -> False
        is_relevant("festival mbois", "mbois banget festivalnya") -> False
    """
    kw = keyword_tokens(keyword)
    if not kw:
        return False
    ct = tokenize(content)
    if len(ct) < len(kw):
        return False
    width = len(kw)
    for i in range(len(ct) - width + 1):
        if ct[i:i + width] == kw:
            return True
    return False


def match_keywords(keywords: List[str], content: Optional[str]) -> List[str]:
    """Keyword aktif (dari DB) yang match dengan content.

    Urutan mengikuti input; keyword yang SAMA setelah normalisasi
    ("FESTIVAL MBOIS" vs "festival, mbois") hanya muncul sekali.
    Kosong jika tidak ada keyword yang match.
    """
    matched: List[str] = []
    seen: set = set()
    for keyword in keywords or []:
        norm = normalize_text(keyword)
        if not norm or norm in seen:
            continue
        if is_relevant(keyword, content):
            seen.add(norm)
            matched.append(keyword)
    return matched
