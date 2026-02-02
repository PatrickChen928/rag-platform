from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from typing import List
from uuid import UUID

from app.db import get_db
from app.models import KnowledgeBase, Document
from app.schemas import KnowledgeBaseCreate, KnowledgeBaseResponse, DocumentAddRequest, DocumentResponse
from app.services.crawler import process_urls

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/bases", response_model=List[KnowledgeBaseResponse])
async def list_knowledge_bases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgeBase).order_by(KnowledgeBase.created_at.desc()))
    return result.scalars().all()


@router.post("/bases", response_model=KnowledgeBaseResponse)
async def create_knowledge_base(data: KnowledgeBaseCreate, db: AsyncSession = Depends(get_db)):
    kb = KnowledgeBase(name=data.name, description=data.description)
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return kb


@router.get("/bases/{kb_id}", response_model=KnowledgeBaseResponse)
async def get_knowledge_base(kb_id: UUID, db: AsyncSession = Depends(get_db)):
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb


@router.delete("/bases/{kb_id}")
async def delete_knowledge_base(kb_id: UUID, db: AsyncSession = Depends(get_db)):
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    await db.delete(kb)
    await db.commit()
    return {"ok": True}


@router.get("/bases/{kb_id}/documents", response_model=List[DocumentResponse])
async def list_documents(kb_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Document).where(Document.knowledge_base_id == kb_id).order_by(Document.created_at.desc())
    )
    return result.scalars().all()


@router.post("/bases/{kb_id}/documents", response_model=List[DocumentResponse])
async def add_documents(kb_id: UUID, data: DocumentAddRequest, db: AsyncSession = Depends(get_db)):
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    docs = []
    for url in data.urls:
        doc = Document(knowledge_base_id=kb_id, url=url, status="pending")
        db.add(doc)
        docs.append(doc)

    await db.commit()
    for doc in docs:
        await db.refresh(doc)

    # Trigger async processing
    import asyncio
    asyncio.create_task(process_urls(kb_id, [doc.id for doc in docs]))

    return docs


@router.delete("/bases/{kb_id}/documents/{doc_id}")
async def delete_document(kb_id: UUID, doc_id: UUID, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc or doc.knowledge_base_id != kb_id:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)

    # Update document count
    count_result = await db.execute(
        select(sa_func.count()).where(Document.knowledge_base_id == kb_id, Document.id != doc_id)
    )
    kb = await db.get(KnowledgeBase, kb_id)
    kb.document_count = count_result.scalar()

    await db.commit()
    return {"ok": True}
