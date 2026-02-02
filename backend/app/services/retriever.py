import logging
from typing import List, Dict
from uuid import uuid4

from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, PointStruct, Filter, FieldCondition, MatchValue
)

from app.config import settings
from app.services.embedding import get_embeddings

logger = logging.getLogger(__name__)

VECTOR_DIM = 1024  # BGE-M3 default dimension


def _get_client() -> QdrantClient:
    return QdrantClient(url=settings.qdrant_url)


def _collection_name(kb_id: str) -> str:
    return f"{settings.qdrant_collection_prefix}{kb_id.replace('-', '_')}"


async def _ensure_collection(client: QdrantClient, name: str):
    """Create collection if not exists."""
    collections = client.get_collections().collections
    exists = any(c.name == name for c in collections)
    if not exists:
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )


async def store_chunks(
    collection_name: str,
    chunks: List[Dict],
    embeddings: List[List[float]],
    doc_id: str,
    url: str,
    title: str,
):
    """Store chunks with embeddings in Qdrant."""
    client = _get_client()
    col_name = _collection_name(collection_name)
    await _ensure_collection(client, col_name)

    points = [
        PointStruct(
            id=str(uuid4()),
            vector=emb,
            payload={
                "text": chunk["text"],
                "title": title,
                "url": url,
                "doc_id": doc_id,
                "chunk_index": chunk["index"],
            },
        )
        for chunk, emb in zip(chunks, embeddings)
    ]

    client.upsert(collection_name=col_name, points=points)


async def retrieve_relevant_chunks(kb_id: str, query: str, top_k: int = None) -> List[Dict]:
    """Retrieve relevant chunks for a query from the knowledge base."""
    if top_k is None:
        top_k = settings.top_k

    client = _get_client()
    col_name = _collection_name(kb_id)

    # Check if collection exists
    collections = client.get_collections().collections
    if not any(c.name == col_name for c in collections):
        return []

    # Embed the query
    query_embedding = (await get_embeddings([query]))[0]

    # Search
    results = client.query_points(
        collection_name=col_name,
        query=query_embedding,
        limit=top_k,
    )

    return [
        {
            "text": point.payload["text"],
            "title": point.payload.get("title", ""),
            "url": point.payload.get("url", ""),
            "score": point.score,
        }
        for point in results.points
    ]


async def delete_doc_chunks(kb_id: str, doc_id: str):
    """Delete all chunks for a document."""
    client = _get_client()
    col_name = _collection_name(kb_id)

    collections = client.get_collections().collections
    if not any(c.name == col_name for c in collections):
        return

    client.delete(
        collection_name=col_name,
        points_selector=Filter(
            must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))]
        ),
    )
