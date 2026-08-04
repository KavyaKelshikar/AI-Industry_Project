from fastapi import FastAPI
from src.config import settings

app = FastAPI(title="Industrial Intelligence AI Service")


@app.get("/health")
def health_check():
    return {
        "status": "AI Service Running",
        "environment": settings.ENV,
    }
