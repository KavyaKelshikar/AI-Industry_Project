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
For unified local development, run:
```bash
npm run dev
# or
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```
The services are available at:
- **Frontend UI**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000` (Aggregate Health: `http://localhost:5000/api/v1/health`)
- **Python AI Service**: `http://localhost:8002` (Health: `http://localhost:8002/health`)
- **ChromaDB Vector Store**: `http://localhost:8000`
- **MongoDB**: `localhost:27017`

## Production Deployment Notes

1. **Environment Variables**: Ensure all production secrets are securely managed. Change default JWT secrets.
2. **Volumes**: The `mongo-data`, `chroma-data`, and `storage` named volumes must be backed up regularly.
3. **Storage Provider**: While `local` is used for v1, production environments should configure `STORAGE_PROVIDER=s3` (or similar) to decouple file storage from the container host.
4. **Network**: Only port `5173` (Frontend) needs to be exposed publicly if using a reverse proxy. Port `5000` and `8000` are purely for internal communication or API access behind the proxy.
5. **Restart Policies**: All containers have `restart: unless-stopped` to ensure high availability. Health checks are configured to auto-restart unhealthy containers.
