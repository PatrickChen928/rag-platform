from typing import List, Dict
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import settings


def split_text(content: str, title: str = "") -> List[Dict]:
    """Split text into chunks with metadata."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", "。", ".", " ", ""],
    )

    chunks = splitter.split_text(content)

    return [
        {
            "text": chunk,
            "title": title,
            "index": i,
        }
        for i, chunk in enumerate(chunks)
    ]
