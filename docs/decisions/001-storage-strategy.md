# Architecture Decision Record: 001 Storage Strategy

## Context
The platform needs to store user-uploaded documents (PDFs, Word docs, etc.). Storing these locally inside the container's file system is fragile, does not scale horizontally, and makes backups difficult. However, for a v1 college project, requiring an AWS account and S3 bucket adds unnecessary friction to local development.

## Decision
We implemented a **Strategy Pattern** for storage through a `StorageService` interface.
- Version 1 implements `LocalStorageProvider`, saving files to a Docker-managed named volume.
- The interface enforces standard methods (`upload`, `delete`, `download`).

## Consequences
- **Positive**: Local development is seamless with Docker volumes. 
- **Positive**: Migrating to AWS S3, Google Cloud Storage, or Azure Blob Storage in the future requires zero changes to the controllers, services, or repositories. We only need to write a new Provider class and flip an environment variable.
- **Negative**: Adds a slight abstraction overhead compared to calling `fs.writeFileSync` directly.
