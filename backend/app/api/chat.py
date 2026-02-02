import json
import asyncio
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db import get_db
from app.models import Conversation, Message
from app.schemas import ChatRequest, ChatMessageResponse, ConversationResponse
from app.services.retriever import retrieve_relevant_chunks
from app.services.llm import stream_chat_response

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(knowledge_base_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.knowledge_base_id == knowledge_base_id)
        .order_by(Conversation.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/conversations/{conv_id}/messages", response_model=List[ChatMessageResponse])
async def get_messages(conv_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at.asc())
    )
    return result.scalars().all()


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: UUID, db: AsyncSession = Depends(get_db)):
    conv = await db.get(Conversation, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()
    return {"ok": True}


@router.post("/ask")
async def ask_question(data: ChatRequest, db: AsyncSession = Depends(get_db)):
    # Get or create conversation
    if data.conversation_id:
        conversation = await db.get(Conversation, data.conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(
            knowledge_base_id=data.knowledge_base_id,
            title=data.question[:50]
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

    # Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=data.question,
        sources=[]
    )
    db.add(user_msg)
    await db.commit()

    # Get conversation history
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
    )
    history = history_result.scalars().all()

    # Retrieve relevant chunks
    chunks = await retrieve_relevant_chunks(
        str(data.knowledge_base_id),
        data.question
    )

    # Build sources
    sources = [
        {"url": c["url"], "title": c["title"], "chunk_text": c["text"]}
        for c in chunks
    ]

    # Stream response
    async def event_stream():
        full_response = ""
        # Send conversation_id first
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': str(conversation.id)})}\n\n"

        async for token in stream_chat_response(
            question=data.question,
            context_chunks=chunks,
            history=[(m.role, m.content) for m in history[:-1]]  # exclude current user msg
        ):
            full_response += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        # Send sources
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

        # Save assistant message
        async with async_session_factory() as save_db:
            assistant_msg = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=full_response,
                sources=sources
            )
            save_db.add(assistant_msg)
            await save_db.commit()

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    # Import session factory for saving in stream
    from app.db import async_session as async_session_factory

    return StreamingResponse(event_stream(), media_type="text/event-stream")
