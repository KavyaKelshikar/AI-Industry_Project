# Enterprise AI Knowledge Management Platform

An enterprise-grade, multi-tenant AI Document Intelligence and Knowledge Management platform built for organizational data privacy.

## Project Overview
The platform allows organizations to create their own secure AI-powered knowledge workspaces. Employees can ask questions in natural language, and the AI responds ONLY using information retrieved from authorized company documents through Retrieval-Augmented Generation (RAG).

The system ensures complete data isolation between companies and enforces strict role-based access control (RBAC) and document classification security.

## Core Features
- **Multi-Tenant Architecture**: Strict physical and logical data isolation between companies.
- **AI Document Intelligence**: Automated document categorization, department prediction, classification suggestion, and summarization.
- **RAG Pipeline**: Hallucination-resistant question answering with source citations.
- **Dynamic RBAC**: Customizable roles and granular permissions.
- **Storage Abstraction**: Provider-agnostic storage layer ready for S3/Azure migration.
- **Audit Logging**: Comprehensive enterprise compliance tracking.

## Technology Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js, Mongoose
- **AI Service**: Python, FastAPI, LangChain, SentenceTransformers
- **Databases**: MongoDB (Operational), ChromaDB (Vector)
- **Deployment**: Docker Compose

## Documentation Guide
Please refer to the specific documentation files for detailed information:
- [Architecture](Architecture.md)
- [Database Schema](Database.md)
- [API Design](API.md)
- [Security Model](Security.md)
- [AI Architecture](AI-Architecture.md)
- [Deployment](Deployment.md)
- [Development Guide](Development-Guide.md)
- [Development Roadmap](Roadmap.md)
- [Architectural Decisions](decisions/)
