# TeamFlow — Collaborative Multi-Workspace Project & Task Platform

> A production-grade, multi-workspace collaborative project management platform built with NestJS, React, PostgreSQL, Prisma, Redis BullMQ, MinIO S3 storage, and authenticated Socket.IO real-time collaboration.

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [System Architecture Diagram](#system-architecture-diagram)
- [Tech Stack](#tech-stack)
- [Database Schema & ER Diagram](#database-schema--er-diagram)
- [Granular RBAC Permission Matrix](#granular-rbac-permission-matrix)
- [Security & Zero-IDOR Architecture](#security--zero-idor-architecture)
- [Pre-Seeded Demo Accounts](#pre-seeded-demo-accounts)
- [Quick Start Guide](#quick-start-guide)
  - [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
  - [Option B: Local Development](#option-b-local-development)
- [Environment Variables Reference](#environment-variables-reference)
- [Key Feature Modules](#key-feature-modules)
  - [1. Workspaces & Tenant Isolation](#1-workspaces--tenant-isolation)
  - [2. Projects & Interactive Kanban Board](#2-projects--interactive-kanban-board)
  - [3. MinIO S3 File Storage & Streaming](#3-minio-s3-file-storage--streaming)
  - [4. Redis & BullMQ Background Queue](#4-redis--bullmq-background-queue)
  - [5. Authenticated Socket.IO Real-Time Updates](#5-authenticated-socketio-real-time-updates)
  - [6. Transaction-Based Activity Audit Trail](#6-transaction-based-activity-audit-trail)
- [Troubleshooting & Reset Guide](#troubleshooting--reset-guide)
- [Known Limitations & Architectural Trade-offs](#known-limitations--architectural-trade-offs)

---

## Architecture Overview

TeamFlow is architected as a secure multi-tenant platform designed to eliminate IDOR (Insecure Direct Object Reference) and privilege escalation vulnerabilities while providing real-time team collaboration:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     React 18 + TypeScript Web App                      │
│      (Vite, Tailwind CSS, Lucide Icons, Socket.IO Client, Axios)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / WebSocket (Port 5173 / 3000)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NestJS Backend API                              │
│  (JWT Guards, WorkspaceRoleGuard, Throttler, DTO Validation, Swagger)  │
└───────┬───────────────────┬───────────────────┬────────────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────────┐ ┌───────────────┐ ┌───────────────────┐
│   PostgreSQL 16  │ │ Redis 7 +     │ │   MinIO Object    │
│  (Prisma ORM,    │ │ BullMQ Queue  │ │      Storage      │
│ Tenant Isolation)│ │(Rate Limiting)│ │(Presigned S3 URLs)│
└──────────────────┘ └───────────────┘ └───────────────────┘
```

---

## Tech Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Socket.IO Client, Axios | Single-page application with responsive Kanban board, slide-over task drawers, and real-time state synchronization. |
| **Backend** | NestJS 11, TypeScript, Socket.IO Gateway, Swagger / OpenAPI, Class-Validator | Modular enterprise architecture with global validation pipes, RBAC guards, and transaction-based audit logging. |
| **Database** | PostgreSQL 16 with Prisma ORM 6 | Relational schema with foreign key constraints, composite indexes, and ACID transactions. |
| **Object Storage** | MinIO (AWS S3-compatible) | Private bucket storage with pre-signed PUT/GET URLs and streaming local disk fallback. |
| **Background Jobs** | BullMQ 5 + Redis 7 | Asynchronous job processing queue with exponential backoff retry strategy for uploaded attachments. |
| **Realtime** | Socket.IO (WebSockets) | Authenticated gateway with workspace-scoped rooms (`workspace_{id}`) for instant task, comment, and activity sync. |
| **Security & Auth** | JWT Access Tokens + HttpOnly Refresh Cookies | Rotating refresh token family with cryptographically hashed storage, reuse detection, and automatic revocation. |
| **DevOps / Infra** | Docker Compose | Multi-stage Dockerfiles, non-root application users, healthchecks, and one-command launch. |

---

## Database Schema & ER Diagram

The database schema enforces strict relational boundaries with composite unique constraints (`[workspaceId, userId]`) and foreign key cascading.

```mermaid
erDiagram
    USER ||--o{ MEMBERSHIP : "holds role in"
    USER ||--o{ TASK : "assigned to / creates"
    USER ||--o{ COMMENT : "authors"
    USER ||--o{ FILE_OBJECT : "uploads"
    USER ||--o{ ACTIVITY_LOG : "triggers"
    USER ||--o{ REFRESH_SESSION : "maintains"

    WORKSPACE ||--o{ MEMBERSHIP : "has members"
    WORKSPACE ||--o{ PROJECT : "contains"
    WORKSPACE ||--o{ TASK : "tracks"
    WORKSPACE ||--o{ FILE_OBJECT : "stores"
    WORKSPACE ||--o{ ACTIVITY_LOG : "audits"

    PROJECT ||--o{ TASK : "organizes"
    PROJECT ||--o{ FILE_OBJECT : "references"

    TASK ||--o{ COMMENT : "discusses"
    TASK ||--o{ FILE_OBJECT : "attaches"

    USER {
        string id PK
        string email UK
        string passwordHash
        string displayName
        string avatarUrl
        enum status
        datetime createdAt
    }

    WORKSPACE {
        string id PK
        string name
        string slug UK
        string createdById FK
        datetime createdAt
    }

    MEMBERSHIP {
        string id PK
        string workspaceId FK
        string userId FK
        enum role "OWNER, ADMIN, MEMBER, VIEWER"
        datetime joinedAt
    }

    PROJECT {
        string id PK
        string workspaceId FK
        string name
        string description
        datetime archivedAt
    }

    TASK {
        string id PK
        string workspaceId FK
        string projectId FK
        string title
        string description
        enum status "TODO, IN_PROGRESS, IN_REVIEW, DONE"
        enum priority "LOW, MEDIUM, HIGH, URGENT"
        string assigneeId FK
        string createdById FK
        datetime dueAt
    }

    FILE_OBJECT {
        string id PK
        string workspaceId FK
        string taskId FK
        string objectKey UK
        string originalName
        string mimeType
        int sizeBytes
    }

    ACTIVITY_LOG {
        string id PK
        string workspaceId FK
        string actorId FK
        string action
        string targetType
        string targetId
        json metadata
        datetime createdAt
    }

    REFRESH_SESSION {
        string id PK
        string userId FK
        string tokenHash UK
        datetime expiresAt
        datetime revokedAt
    }
```

---

## Granular RBAC Permission Matrix

TeamFlow enforces role-based access control with privilege escalation safeguards at both the guard layer and the database transaction layer:

| Operation / Capability | Workspace Owner | Workspace Admin | Workspace Member | Workspace Viewer |
| :--- | :---: | :---: | :---: | :---: |
| **Create Workspace** | Yes | Yes | Yes | Yes |
| **Delete Workspace** | **Yes** | No (403) | No (403) | No (403) |
| **Invite New Members** | **Yes** | **Yes** | No (403) | No (403) |
| **Remove Member** | **Yes** | **Yes** (except Owner) | No (403) | No (403) |
| **Change Member Role** | **Yes** | **Yes** (except Owner) | No (403) | No (403) |
| **Grant OWNER Role** | **Yes** | **No (Safeguard 403)** | No (403) | No (403) |
| **Create / Edit Projects** | **Yes** | **Yes** | **Yes** | No (403) |
| **Create / Edit Tasks** | **Yes** | **Yes** | **Yes** | No (403) |
| **Delete Tasks** | **Yes** | **Yes** | No (403) | No (403) |
| **Post Comments** | **Yes** | **Yes** | **Yes** | No (403) |
| **Upload File Attachment** | **Yes** | **Yes** | **Yes** | No (403) |
| **Download File Attachment** | **Yes** | **Yes** | **Yes** | **Yes** |
| **Delete File Attachment** | **Yes** | **Yes** | Uploader Only | No (403) |
| **View Audit Activity Feed** | **Yes** | **Yes** | **Yes** | **Yes** |

---

## Security & Zero-IDOR Architecture

1. **Zero-IDOR Tenant Isolation:**
   - Every API request, database query, and mutation strictly requires and verifies the `workspaceId`.
   - `WorkspaceRoleGuard` validates user membership and active role against the database before executing any controller handler. Attempting to query or mutate a foreign workspace returns `403 Forbidden`.
2. **Rotating Refresh Tokens with Reuse Detection:**
   - Refresh tokens are stored as cryptographic SHA-256 hashes in PostgreSQL and transmitted via `HttpOnly`, `SameSite=Lax` cookies.
   - Every token refresh rotates the token family. If an already-used token is received (indicating token theft), the backend revokes the **entire token lineage**, instantly logging out all compromised sessions.
3. **Privilege Escalation Protection:**
   - Admins cannot grant the `OWNER` role.
   - Members and Viewers cannot alter membership roles, invite users, or promote themselves via crafted request payloads.
4. **Dangerous File Extension Blocking:**
   - File upload validation inspects MIME types and extensions, strictly blocking executable scripts (`.exe`, `.bat`, `.sh`, `.cmd`, `.msi`, `.vbs`, `.scr`).

---

## Pre-Seeded Demo Accounts

All test accounts share the default development password: `Password123!`

| Role | Email | Password | Primary Scope |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@teamflow.dev` | `Password123!` | Full workspace administration, role changes, project/task deletion |
| **Admin** | `admin@teamflow.dev` | `Password123!` | Project & task management, member management (cannot grant Owner) |
| **Member** | `member@teamflow.dev` | `Password123!` | Task creation/updates, status transitions, comments, file attachments |
| **Viewer** | `viewer@teamflow.dev` | `Password123!` | Read-only access to projects, tasks, comments, and audit logs |

---

## Quick Start Guide

### Option A: Docker Compose (Recommended)

Start the entire full-stack platform with a single command (requires Docker Desktop):

```bash
# 1. Clone the repository
git clone https://github.com/Ayushh005/TeamFlow.git
cd TeamFlow

# 2. Start all services (auto-builds, auto-pushes DB schema, auto-seeds demo data)
docker compose up --build -d
```

> **Zero-Config Startup:** The backend container runs `prisma db push` on boot to initialize all PostgreSQL tables automatically, and seeds demo accounts if the database is blank.

#### Service Access URLs:
- **Frontend Web Application:** [http://localhost:5173](http://localhost:5173)
- **Backend REST API:** [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- **Swagger OpenAPI Documentation:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **MinIO S3 Web Console:** [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`)

---

### Option B: Local Development

If you prefer to run services individually on your host machine:

1. **Start Infrastructure Services:**
   ```bash
   docker compose up -d postgres redis minio
   ```

2. **Initialize Backend API:**
   ```bash
   cd apps/backend
   npm install
   npx prisma db push
   npm run prisma:seed
   npm run start:dev
   ```

3. **Initialize Frontend Application:**
   ```bash
   cd apps/frontend
   npm install
   npm run dev
   ```

---

## Environment Variables Reference

All environment variables have built-in development defaults configured in [docker-compose.yml](docker-compose.yml) and [.env.example](.env.example):

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` / `production` | Application execution environment |
| `PORT` | `3000` | Backend API listen port |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin and redirect target |
| `DATABASE_URL` | `postgresql://teamflow:teamflow_password@postgres:5432/teamflow?schema=public` | Prisma PostgreSQL connection string |
| `POSTGRES_USER` | `teamflow` | PostgreSQL database superuser |
| `POSTGRES_PASSWORD`| `teamflow_password` | PostgreSQL database password |
| `POSTGRES_DB` | `teamflow` | Primary database name |
| `REDIS_HOST` | `redis` / `localhost` | Redis instance hostname |
| `REDIS_PORT` | `6379` | Redis service port |
| `MINIO_ENDPOINT` | `minio` / `localhost` | MinIO S3 API hostname |
| `MINIO_PORT` | `9000` | MinIO S3 API port |
| `MINIO_ROOT_USER` | `minioadmin` | MinIO access key |
| `MINIO_ROOT_PASSWORD`| `minioadmin` | MinIO secret key |
| `MINIO_BUCKET_NAME`| `teamflow-attachments` | Dedicated private storage bucket |
| `JWT_ACCESS_SECRET`| `super_secret_teamflow_access_key` | Secret key for signing access tokens |
| `JWT_REFRESH_SECRET`| `super_secret_teamflow_refresh_key`| Secret key for rotating refresh tokens |
| `COOKIE_SECRET` | `teamflow_secure_cookie_secret_key`| Secret for signing HttpOnly session cookies |

---

## Key Feature Modules

### 1. Workspaces & Tenant Isolation
- Instant workspace switching via organization dropdown in top navbar.
- Create new workspaces with automatic Owner assignment.
- Team member invitation modal with live role updates (`Owner`, `Admin`, `Member`, `Viewer`).

### 2. Projects & Interactive Kanban Board
- **Kanban Board Columns:** Grouped by status (`To Do`, `In Progress`, `In Review`, `Completed`).
- **Interactive Filtering:** Filter tasks by project, status, priority, or search query.
- **Slide-over Task Details Drawer:** Portalled overlay inspecting task descriptions, assignees, due dates, comments, and attachments.
- **Project Progress:** Overview of active workspace projects with completion metrics.

### 3. MinIO S3 File Storage & Streaming
- Direct client-to-storage upload via presigned S3 `PUT` URLs (300s expiry).
- Expiring presigned `GET` URLs for authorized file downloads.
- Dual storage engine with automatic local disk streaming fallback if MinIO container is unreachable.
- Supports file uploads up to 50MB with Nginx proxy buffering configuration.

### 4. Redis & BullMQ Background Queue
- Enqueues background jobs upon file upload confirmation (`file-processing-queue`).
- Exponential backoff retry strategy (`2s, 4s, 8s`).
- Worker processor simulates thumbnail generation, metadata extraction, and updates audit trail asynchronously.

### 5. Authenticated Socket.IO Real-Time Updates
- WebSocket Gateway with JWT connection handshake authentication.
- Scoped workspace room subscription (`workspace_{workspaceId}`) with database membership validation.
- Live event broadcasts for `task.created`, `task.updated`, `task.deleted`, and `comment.created`.

### 6. Transaction-Based Activity Audit Trail
- Every state mutation (task created, status changed, member role updated, file uploaded) writes an immutable record to the `activity_logs` table within a Prisma database transaction.
- Activity feed page with actor details, timestamps, and action metadata.

---

## Troubleshooting & Reset Guide

### Check Service Health
```bash
docker compose ps
```

### View Live Backend Logs
```bash
docker compose logs -f api
```

### Clean Database Reset (Purge Persistent Volumes)
To reset the database, Redis cache, and MinIO storage back to a pristine initial state:
```bash
docker compose down -v
docker compose up --build -d
```

### Rebuilding After Frontend or Backend Code Edits
```bash
docker compose up -d --build
```

---

## Known Limitations & Architectural Trade-offs

1. **Single-Node Socket.IO Adapter vs. Redis Pub/Sub Adapter:**
   - *Current Implementation:* The WebSocket gateway uses the in-memory Socket.IO adapter suited for single-container development and preview deployments.
   - *Trade-off:* Fast, lightweight, and zero configuration overhead.
   - *Production Path:* For multi-instance horizontal scaling, the `@socket.io/redis-adapter` can be activated to broadcast events across multiple backend pods.

2. **Asynchronous Background Processing Window:**
   - *Current Implementation:* Task creations and status transitions commit synchronously to PostgreSQL to guarantee ACID consistency and immediate UI feedback, while file processing runs asynchronously through BullMQ.
   - *Trade-off:* Avoids blocking user HTTP requests on heavy file operations.
   - *Production Path:* Implemented exponential retry backoff (up to 3 attempts) to handle transient Redis disconnections.

3. **Dual-Engine S3 Object Storage Fallback:**
   - *Current Implementation:* The file service checks for MinIO availability on startup. If MinIO is running, it generates S3 presigned URLs. If running in constrained local development without MinIO, it seamlessly routes through API stream endpoints on local disk (`/storage/uploads`).
   - *Trade-off:* Guarantees the application runs in any environment without crashing if storage containers are delayed.
