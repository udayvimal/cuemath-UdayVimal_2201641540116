"""
PDF Service — extracts clean, structured text from PDFs using PyMuPDF.
Splits text by paragraphs/sections rather than arbitrary character counts.
"""

import fitz  # PyMuPDF
import re
from typing import List, Tuple


def extract_text_from_pdf(file_bytes: bytes) -> Tuple[List[str], dict]:
    """
    Extract text from PDF bytes, returning a list of meaningful text chunks
    and extraction metadata.

    Strategy:
    - Extract text page by page
    - Split by double newlines (paragraph boundaries)
    - Filter out very short chunks (headers, page numbers)
    - Merge very short adjacent chunks to maintain context

    Returns:
        chunks: List of text chunks ready for AI processing
        metadata: dict with pages_processed, words_extracted, raw_text_length
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages_processed = 0
    all_text = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")

        if not text or len(text.strip()) < 20:
            # Skip nearly empty pages (scanned images, cover pages)
            continue

        all_text.append(text)
        pages_processed += 1

    doc.close()

    if pages_processed == 0:
        raise ValueError(
            "No readable text found in PDF. The file may be scanned or image-based. "
            "Please upload a text-based PDF."
        )

    full_text = "\n\n".join(all_text)
    words_extracted = len(full_text.split())

    # Intelligent chunking: split by paragraph, not arbitrary character count
    chunks = _chunk_by_paragraphs(full_text)

    metadata = {
        "pages_processed": pages_processed,
        "words_extracted": words_extracted,
        "raw_text_length": len(full_text),
        "chunks_created": len(chunks),
    }

    return chunks, metadata


def _chunk_by_paragraphs(text: str, max_chunk_size: int = 2500, min_chunk_size: int = 150) -> List[str]:
    """
    Split text into meaningful chunks based on paragraph structure.

    Algorithm:
    1. Split on double newlines (paragraph breaks)
    2. Clean each paragraph (remove excessive whitespace)
    3. Filter out noise (page numbers, single words, headers only)
    4. Merge small adjacent paragraphs until they hit max_chunk_size
    5. Split oversized single paragraphs at sentence boundaries

    This produces chunks that represent complete thoughts/sections,
    which leads to far better flashcard quality than fixed-size splits.
    """
    # Normalize line endings and split into paragraphs
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)  # Collapse excessive blank lines

    raw_paragraphs = text.split('\n\n')

    cleaned = []
    for para in raw_paragraphs:
        # Clean up internal whitespace
        para = re.sub(r'\n', ' ', para)
        para = re.sub(r'\s+', ' ', para).strip()

        # Skip noise: too short, looks like page number, lone number
        if len(para) < min_chunk_size:
            continue
        if re.match(r'^\d+$', para):  # Pure page number
            continue
        if re.match(r'^(page|figure|table|chapter)\s+\d+', para, re.IGNORECASE):
            continue

        cleaned.append(para)

    if not cleaned:
        # Fallback: if aggressive filtering removed everything, use sentence splitting
        return _chunk_by_sentences(text, max_chunk_size)

    # Merge small adjacent paragraphs
    merged = []
    current = ""
    for para in cleaned:
        if len(current) + len(para) + 2 < max_chunk_size:
            current = (current + "  " + para).strip() if current else para
        else:
            if current:
                merged.append(current)
            # Handle oversized single paragraphs
            if len(para) > max_chunk_size:
                merged.extend(_chunk_by_sentences(para, max_chunk_size))
                current = ""
            else:
                current = para

    if current:
        merged.append(current)

    return merged if merged else [text[:max_chunk_size]]


def _chunk_by_sentences(text: str, max_size: int) -> List[str]:
    """Fallback: split at sentence boundaries for very long paragraphs."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current = ""
    for sent in sentences:
        if len(current) + len(sent) < max_size:
            current = (current + " " + sent).strip()
        else:
            if current:
                chunks.append(current)
            current = sent
    if current:
        chunks.append(current)
    return chunks if chunks else [text[:max_size]]
