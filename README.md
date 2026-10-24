# TeamFlow — Collaborative Project & Task Workspace

> Production-grade, multi-workspace project management platform with strictly scoped RBAC, real-time collaboration, file attachments, and asynchronous queue processing.

---

## Architecture Overview

TeamFlow is architected as a secure multi-tenant platform designed to eliminate IDOR and privilege escalation vulnerabilities.

```
                    ┌──────────────────────────────────────────────┐
                    │               React 18 + Vite                │
                    │        (Tailwind CSS, TanStack Query)        │
                    └──────────────────────┬───────────────────────┘
                                           │ HTTP / WebSocket (Socket.IO)
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │              NestJS Backend API              │
                    │     (Guards, DTO Validation, Swagger)        │
                    └───┬──────────────────┬───────────────────┬───┘
                        │                  │                   │
                        ▼                  ▼                   ▼
            ┌────────────────────┐ ┌───────────────┐ ┌────────────────────┐
            │     PostgreSQL     │ │ Redis 7 +     │ │    MinIO Object    │
            │   (Prisma ORM,     │ │ BullMQ Queue  │ │      Storage       │
            │  Tenant Isolation) │ │(Rate Limiting)│ │(Presigned S3 URLs) │
            └────────────────────┘ └───────────────┘ └────────────────────┘
```

---

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, Socket.IO Client.
- **Backend:** NestJS, TypeScript, REST API, DTO Validation, Swagger/OpenAPI, Socket.IO Gateway.
- **Database:** PostgreSQL with Prisma ORM, migrations, foreign key constraints, and relational transactions.
- **Cache & Jobs:** Redis with BullMQ background queue and Redis-backed rate limiting.
- **Storage:** MinIO (S3-compatible object storage) with short-lived presigned upload/download URLs.
- **Infrastructure:** Docker Compose with health checks, persistent volumes, and one-command launch.

---

## Quick Start (Local Docker Compose)

1. Clone the repository:
   ```bash
   git clone https://github.com/Ayushh005/TeamFlow.git
   cd TeamFlow
   ```

2. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```

3. Launch all services:
   ```bash
   docker compose up --build -d
   ```

4. Service Endpoints:
   - **Frontend App:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:3000](http://localhost:3000)
   - **Swagger Docs:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
   - **MinIO Console:** [http://localhost:9001](http://localhost:9001) (User: `minioadmin` / Pass: `minioadmin`)

---

## Pre-Seeded Demo Accounts

All pre-seeded demo accounts share the password: `Password123!`

| Role | Email | Permissions Scope |
| :--- | :--- | :--- |
| **Owner** | `owner@teamflow.dev` | Full management, invite/remove members, assign roles, workspace settings |
| **Admin** | `admin@teamflow.dev` | Manage projects & tasks, invite members, assign Member/Viewer roles |
| **Member** | `member@teamflow.dev` | Create/edit tasks within workspace, post comments, upload attachments |
| **Viewer** | `viewer@teamflow.dev` | Read-only access to projects and tasks |
