import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.verbs import lookup_index

logger = logging.getLogger(__name__)

app = FastAPI(title="Español Learning App API")

# CORS — allow all origins in dev mode
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router imports — commented out until each module is implemented
from app.auth.router import router as auth_router
from app.verbs.router import router as verbs_router
# from app.vocabulary.router import router as vocabulary_router
# from app.srs.router import router as srs_router

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(verbs_router)
# app.include_router(vocabulary_router, prefix="/vocabulary", tags=["vocabulary"])
# app.include_router(srs_router, prefix="/srs", tags=["srs"])


@app.on_event("startup")
async def startup_event() -> None:
    init_db()
    logger.info("Database initialized")
    # Build verb lookup index in background
    import asyncio
    asyncio.create_task(asyncio.to_thread(lookup_index.build_index))


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
