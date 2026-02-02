import asyncio
import logging
from uuid import UUID
from typing import List

from app.db import async_session
from app.models import Document, KnowledgeBase
from app.services.chunker import split_text
from app.services.embedding import get_embeddings
from app.services.retriever import store_chunks

logger = logging.getLogger(__name__)


async def crawl_url(url: str) -> dict:
    """Crawl a URL and return cleaned content."""
    try:
        from crawl4ai import AsyncWebCrawler
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=url)
            return {
                "title": result.metadata.get("title", "") if result.metadata else "",
                "content": result.markdown or "",
                "url": url,
            }
    except ImportError:
        # Fallback to basic crawling
        import aiohttp
        from bs4 import BeautifulSoup

        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                html = await resp.text()

        soup = BeautifulSoup(html, "html.parser")

        # Remove scripts and styles
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        title = soup.title.string if soup.title else ""
        content = soup.get_text(separator="\n", strip=True)

        return {"title": title, "content": content, "url": url}


async def process_urls(kb_id: UUID, doc_ids: List[UUID]):
    """Process a list of document URLs: crawl, chunk, embed, store."""
    async with async_session() as db:
        for doc_id in doc_ids:
            doc = await db.get(Document, doc_id)
            if not doc:
                continue

            try:
                doc.status = "processing"
                await db.commit()

                # Crawl
                result = await crawl_url(doc.url)
                doc.title = result["title"] or doc.url

                if not result["content"].strip():
                    doc.status = "failed"
                    doc.error_message = "No content extracted from URL"
                    await db.commit()
                    continue

                # Chunk
                chunks = split_text(result["content"], result["title"])

                # Embed
                texts = [c["text"] for c in chunks]
                embeddings = await get_embeddings(texts)

                # Store in vector DB
                await store_chunks(
                    collection_name=str(kb_id),
                    chunks=chunks,
                    embeddings=embeddings,
                    doc_id=str(doc_id),
                    url=doc.url,
                    title=doc.title,
                )

                doc.status = "completed"
                doc.chunk_count = len(chunks)

                # Update KB document count
                kb = await db.get(KnowledgeBase, kb_id)
                if kb:
                    kb.document_count = (kb.document_count or 0) + 1

                await db.commit()

            except Exception as e:
                logger.exception(f"Failed to process document {doc_id}")
                doc.status = "failed"
                doc.error_message = str(e)[:500]
                await db.commit()
