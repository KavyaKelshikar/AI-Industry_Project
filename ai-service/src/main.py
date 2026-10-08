from fastapi import FastAPI
from src.config import settings
from src.api.ingestion_routes import router as ingestion_router
from src.api.rag_routes import router as rag_router

app = FastAPI(title="Industrial Intelligence AI Service")

# Mount API routers
app.include_router(ingestion_router)
app.include_router(rag_router)


@app.get("/health")
def health_check():
    return {
        "status": "AI Service Running",
        "environment": settings.ENV,
    }
