from .knowledge import router as knowledge_router
from .chat import router as chat_router
from .settings import router as settings_router

__all__ = ["knowledge_router", "chat_router", "settings_router"]
