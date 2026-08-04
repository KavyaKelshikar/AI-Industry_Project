# Development Guide

## Project Structure
The repository is a monorepo containing three main applications:
- `frontend/`: React + TypeScript (UI Layer)
- `backend/`: Node.js + Express (API & Business Logic Layer)
- `ai-service/`: Python + FastAPI (AI & Vector Search Layer)

## Coding Standards
- **Backend**: Use `const`/`let`, async/await, and arrow functions. Keep controllers thin; place business logic in `services/`. Always use the `BaseRepository` for database queries to ensure `companyId` isolation.
- **AI Service**: Use Python 3.11+ type hints. Use Pydantic models for request/response validation.
- **Frontend**: Functional components with hooks. Use Tailwind utility classes.

## Naming Conventions
- **Files**: CamelCase for classes/models (e.g., `UserService.js`, `User.js`), kebab-case for utilities (e.g., `token-utils.js`).
- **Variables/Functions**: camelCase.
- **Constants/Enums**: UPPER_SNAKE_CASE.

## How to Add New APIs (Backend)
1. Define the Joi validation schema in `validators/`.
2. Create/Update a service method in `services/`.
3. Create a controller method in `controllers/` to handle the request/response.
4. Add the route in `routes/` and attach middlewares (`authenticate`, `authorize`, `validate`).

## How to Add New AI Extractors
1. Navigate to `ai-service/src/extractors/`.
2. Create a new class extending `BaseExtractor`.
3. Implement the `extract_text(file_path)` method.
4. Register the new extractor in `ExtractorFactory`.

## How to Add New Storage Providers
1. Navigate to `backend/src/providers/`.
2. Create a new class (e.g., `S3StorageProvider.js`) implementing the `StorageService` interface methods (`upload`, `download`, `delete`, `getUrl`).
3. Add the provider to the factory selection logic in `config/storage.js`.
4. Update the `.env` file to set `STORAGE_PROVIDER=s3`.
