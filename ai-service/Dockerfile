# ── Stage 1: Install dependencies ──
FROM python:3.12-slim AS deps

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --target=/app/dependencies -r requirements.txt


# ── Stage 2: Production image ──
FROM python:3.12-slim AS production

# Security: run as non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Copy installed packages from deps stage
COPY --from=deps /app/dependencies /app/dependencies
ENV PYTHONPATH="/app/dependencies"

# Copy application source
COPY . .

# Remove dev files that shouldn't be in production
RUN rm -f .env .env.local

# Switch to non-root user
USER appuser

# Expose the AI service port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Start FastAPI via Uvicorn
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
