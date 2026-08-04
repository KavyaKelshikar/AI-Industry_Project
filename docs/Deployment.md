# Deployment Guide

The platform is designed to be fully containerized, meaning it can be deployed anywhere Docker is supported.

## Docker Setup

The system relies on 5 core containers defined in `docker-compose.yml`:
1. **frontend**: React Vite server
2. **backend**: Node.js Express server
3. **ai-service**: Python FastAPI server
4. **mongodb**: Operational database
5. **chromadb**: Vector database

## Local Development

For local development, we use `docker-compose.dev.yml`, which mounts local volumes for hot-reloading.

1. Copy `.env.example` to `.env` and fill in the secrets (JWT keys, Gemini API key).
2. Run `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`
3. The services will be available at:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5000`
   - AI Service API: `http://localhost:8000`

## Production Deployment Notes

1. **Environment Variables**: Ensure all production secrets are securely managed. Change default JWT secrets.
2. **Volumes**: The `mongo-data`, `chroma-data`, and `storage` named volumes must be backed up regularly.
3. **Storage Provider**: While `local` is used for v1, production environments should configure `STORAGE_PROVIDER=s3` (or similar) to decouple file storage from the container host.
4. **Network**: Only port `5173` (Frontend) needs to be exposed publicly if using a reverse proxy. Port `5000` and `8000` are purely for internal communication or API access behind the proxy.
5. **Restart Policies**: All containers have `restart: unless-stopped` to ensure high availability. Health checks are configured to auto-restart unhealthy containers.
