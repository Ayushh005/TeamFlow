# TeamFlow — Collaborative Multi-Workspace Project & Task Platform

> A production-grade, multi-workspace collaborative project management platform built with NestJS, React, PostgreSQL, Prisma, Redis BullMQ, MinIO S3 storage, and authenticated Socket.IO real-time collaboration.

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [System Architecture Diagram](#system-architecture-diagram)
- [Tech Stack](#tech-stack)
- [Granular RBAC Permission Matrix](#granular-rbac-permission-matrix)
- [Security & Zero-IDOR Architecture](#security--zero-idor-architecture)
- [Pre-Seeded Demo Accounts](#pre-seeded-demo-accounts)
- [Quick Start Guide](#quick-start-guide)
  - [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
  - [Option B: Local Development](#option-b-local-development)
- [Automated Negative Authorization Tests](#automated-negative-authorization-tests)
- [Key Feature Modules](#key-feature-modules)
  - [1. Workspaces & Tenant Isolation](#1-workspaces--tenant-isolation)
  - [2. Projects & Task Table](#2-projects--task-table)
  - [3. MinIO S3 File Storage (Presigned URLs)](#3-minio-s3-file-storage-presigned-urls)
  - [4. Redis & BullMQ Background Queue](#4-redis--bullmq-background-queue)
  - [5. Authenticated Socket.IO Real-Time Updates](#5-authenticated-socketio-real-time-updates)
  - [6. Transaction-Based Activity Audit Trail](#6-transaction-based-activity-audit-trail)
- [Video Walkthrough & Demo Script](#video-walkthrough--demo-script)

---

## Architecture Overview

TeamFlow is architected as a secure multi-tenant platform designed to eliminate IDOR and privilege escalation vulnerabilities while providing real-time team collaboration:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     React 18 + TypeScript Web App                      │
│      (Vite, Tailwind CSS, TanStack/Axios, Socket.IO Client, UI)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / WebSocket (Port 3000)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NestJS Backend API                              │
│  (JWT Guards, WorkspaceRoleGuard, Throttler, DTO Validation, Swagger)  │
└───────┬───────────────────┬───────────────────┬────────────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────────┐ ┌───────────────┐ ┌───────────────────┐
│   PostgreSQL     │ │ Redis 7 +     │ │   MinIO Object    │
│  (Prisma ORM,    │ │ BullMQ Queue  │ │      Storage      │
│ Tenant Isolation)│ │(Rate Limiting)│ │(Presigned S3 URLs)│
└──────────────────┘ └───────────────┘ └───────────────────┘
```

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Socket.IO Client, Axios |
| **Backend** | NestJS 11, TypeScript, Socket.IO Gateway, Swagger / OpenAPI, Class-Validator |
| **Database** | PostgreSQL 16/18 with Prisma ORM 6 (schema migrations, relational transactions) |
| **Background Jobs** | BullMQ 5 with Redis 7 (exponential backoff retry strategy, worker processors) |
| **Object Storage** | MinIO (AWS S3-compatible client with presigned PUT/GET URLs and streaming) |
| **Security & Auth** | JWT access tokens, HttpOnly rotating refresh tokens with reuse detection family revocation |
| **Infrastructure** | Docker Compose multi-container setup with healthchecks and persistent volumes |

---

## Granular RBAC Permission Matrix

TeamFlow enforces strict role-based access control with privilege escalation safeguards at both the guard layer and service transaction layer:

| Operation / Capability | Workspace Owner | Workspace Admin | Workspace Member | Workspace Viewer |
| :--- | :---: | :---: | :---: | :---: |
| **Create Workspace** | Yes | Yes | Yes | Yes |
| **Delete Workspace** | **Yes** | No (403) | No (403) | No (403) |
| **Invite New Members** | **Yes** | **Yes** | No (403) | No (403) |
| **Remove Member** | **Yes** | **Yes** | No (403) | No (403) |
| **Change Member Role** | **Yes** | **Yes** | No (403) | No (403) |
| **Grant OWNER Role** | **Yes** | **No (Safeguard 403)** | No (403) | No (403) |
| **Create Project** | **Yes** | **Yes** | **Yes** | No (403) |
| **Create Task** | **Yes** | **Yes** | **Yes** | No (403) |
| **Edit Task / Change Status** | **Yes** | **Yes** | **Yes** | No (403) |
| **Delete Task** | **Yes** | **Yes** | No (403) | No (403) |
| **Post Comment** | **Yes** | **Yes** | **Yes** | No (403) |
| **Upload File Attachment** | **Yes** | **Yes** | **Yes** | No (403) |
| **Download File Attachment** | **Yes** | **Yes** | **Yes** | **Yes** |
| **Delete File Attachment** | **Yes** | **Yes** | Uploader Only | No (403) |
| **View Audit Logs Feed** | **Yes** | **Yes** | **Yes** | **Yes** |

---

## Security & Zero-IDOR Architecture

1. **Zero-IDOR Tenant Isolation:**
   - Every single query, mutation, and route strictly requires and verifies the `workspaceId`.
   - `WorkspaceRoleGuard` validates database membership before executing any controller method. Accessing foreign workspace resources returns `403 Forbidden`.
2. **Refresh Token Rotation with Automatic Reuse Detection:**
   - Refresh tokens are stored as cryptographic SHA-256 hashes in PostgreSQL and sent via `HttpOnly`, `SameSite=Lax` cookies.
   - Every refresh request rotates the token. If an already-used token is reused (indicating token theft), the server immediately revokes the **entire token family**, logging out all sessions for that lineage.
3. **Privilege Escalation Protection:**
   - Admins cannot grant the `OWNER` role.
   - Members and Viewers cannot modify membership roles or invite users.
4. **Dangerous Extension Blocking:**
   - Presigned upload endpoint verifies file extensions and blocks scripts/executables (`.exe`, `.bat`, `.sh`, `.cmd`, `.msi`, `.vbs`, `.scr`).

---

## Pre-Seeded Demo Accounts

All accounts share the default development password: `Password123!`

| Role | Email | Password | Primary Scope |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@teamflow.dev` | `Password123!` | Full workspace administration, role changes, project/task deletion |
| **Admin** | `admin@teamflow.dev` | `Password123!` | Project & task management, member management (cannot grant Owner) |
| **Member** | `member@teamflow.dev` | `Password123!` | Task creation/updates, status transitions, comments, file attachments |
| **Viewer** | `viewer@teamflow.dev` | `Password123!` | Read-only access to projects, tasks, comments, and audit logs |

---

## Quick Start Guide

### Option A: Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/Ayushh005/TeamFlow.git
   cd TeamFlow
   ```

2. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```

3. Launch all services with Docker Compose:
   ```bash
   docker compose up --build -d
   ```

4. Service Endpoints:
   - **Frontend Application:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:3000](http://localhost:3000)
   - **Swagger OpenAPI Documentation:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
   - **MinIO Web Console:** [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`)

---

### Option B: Local Development

1. **Install dependencies:**
   ```bash
   # In apps/backend
   cd apps/backend
   npm install

   # In apps/frontend
   cd ../frontend
   npm install
   ```

2. **Initialize Database:**
   ```bash
   cd apps/backend
   npx prisma db push
   npm run prisma:seed
   ```

3. **Start Development Servers:**
   ```bash
   # Terminal 1 (Backend API on :3000)
   cd apps/backend
   npm run start:dev

   # Terminal 2 (Frontend App on :5173)
   cd apps/frontend
   npm run dev
   ```

---

## Automated Negative Authorization Tests

TeamFlow includes automated negative authorization integration tests covering all critical security requirements:

To execute the test suite:
```bash
cd apps/backend
npm test
```

### Verified Test Output:
```text
===============================================================
 TEAMFLOW AUTOMATED NEGATIVE AUTHORIZATION TEST SUITE
 Target Endpoint: http://localhost:3000/api/v1
===============================================================

--- Step 0: Authenticating Test Accounts ---
✓ Authenticated OWNER (owner@teamflow.dev)
✓ Authenticated ADMIN (admin@teamflow.dev)
✓ Authenticated MEMBER (member@teamflow.dev)
✓ Authenticated VIEWER (viewer@teamflow.dev)
  ✓ PASSED: Owner can list workspaces
  ✓ PASSED: Primary test workspace exists
  ✓ PASSED: Workspace members fetched
  ✓ PASSED: Workspace tasks fetched

--- Test 1: Negative Authorization - Viewer Cannot Edit Task ---
  ✓ PASSED: Viewer editing task returned HTTP 403 Forbidden (got 403)
  ✓ PASSED: Forbidden message clearly explains role restriction: "Viewers do not have permission to modify tasks"

--- Test 2: Privilege Escalation - Member Cannot Change Roles ---
  ✓ PASSED: Member changing role returned HTTP 403 Forbidden (got 403)
  ✓ PASSED: Rejection message enforces permission requirement: "Insufficient permissions. Required role: OWNER, ADMIN"

--- Test 3: Privilege Safeguard - Admin Cannot Grant OWNER Role ---
  ✓ PASSED: Admin granting OWNER role returned HTTP 403 Forbidden (got 403)
  ✓ PASSED: Safeguard prevents unauthorized transfer of ownership: "Admins cannot grant the Owner role"

--- Test 4: Tenant Isolation - Cross-Workspace IDOR Blocked ---
  ✓ PASSED: Accessing unauthorized foreign workspace returned HTTP 403 Forbidden (got 403)
  ✓ PASSED: Zero-IDOR guard enforces strict tenant boundary: "Access denied: You do not belong to this workspace"

--- Test 5: Storage Authorization - Viewer Cannot Upload Files ---
  ✓ PASSED: Viewer requesting presigned upload returned HTTP 403 Forbidden (got 403)
  ✓ PASSED: Upload guard enforces read-only access for Viewers: "Viewers do not have permission to upload files"

--- Test 6: Auth Security - Refresh Token Reuse Family Revocation ---
  ✓ PASSED: HttpOnly refresh token cookie returned on login
  ✓ PASSED: First refresh token rotation succeeded with 200 (got 200)
  ✓ PASSED: Reused refresh token blocked with HTTP 401 Unauthorized (got 401)
  ✓ PASSED: Reuse detection triggered security response: "Suspicious session activity detected. Please login again."

===============================================================
 TEST SUMMARY: 18 PASSED, 0 FAILED (100% SUCCESS)
===============================================================
```

---

## Key Feature Modules

### 1. Workspaces & Tenant Isolation
- Multi-workspace switching from left sidebar.
- Members modal with role management (`Owner`, `Admin`, `Member`, `Viewer`).

### 2. Projects & Task Table
- **Clean Task Table View:** Simple, intuitive tabular interface with interactive status selector dropdowns, priority badges, assignees, due dates, and comment indicators.
- **Task Detail Slide-over Drawer:** Inspect task specifications, assignee info, file attachments, and discussion threads.
- **Projects Page:** View active projects, progress percentages, and create new projects with auto-generated project keys (`MAP`).

### 3. MinIO S3 File Storage (Presigned URLs)
- Direct client-to-storage upload via presigned S3 `PUT` URLs (300s expiry).
- Expiring presigned `GET` URLs for authorized file downloads.
- Dual storage engine with automatic local disk streaming fallback for environments where Docker MinIO is offline.
- Safe inline deletion with confirmation UX.

### 4. Redis & BullMQ Background Queue
- Enqueues file processing background jobs upon upload confirmation (`file-processing-queue`).
- Exponential backoff retry strategy (`2s, 4s, 8s`).
- Worker processor simulates metadata extraction and updates audit trail asynchronously.

### 5. Authenticated Socket.IO Real-Time Updates
- WebSocket Gateway with JWT connection handshake authentication.
- Scoped workspace room subscription (`workspace_${workspaceId}`) with database membership validation.
- Live broadcasting for `task.created`, `task.updated`, `task.deleted`, and `comment.created` — updates frontend state instantly with 0 page reloads.

### 6. Transaction-Based Activity Audit Trail
- Every state mutation (task created, status changed, member role updated, file uploaded) writes an immutable record to the `activity_logs` table within a Prisma database transaction.
- Activity feed page with actor details, timestamps, and action metadata.

---

## Video Walkthrough & Demo Script

When recording a 3-5 minute demonstration video for evaluation:

1. **Introduction (0:00 - 0:45):**
   - Present the TeamFlow architecture overview and Swagger UI at `http://localhost:3000/api/docs`.
   - Log in using `owner@teamflow.dev` and highlight the clean light-mode dashboard and fixed left navigation.
2. **Workspace & RBAC Demonstration (0:45 - 1:30):**
   - Open the "Team Members" modal.
   - Show the 4 seeded roles (`Owner`, `Admin`, `Member`, `Viewer`).
   - Demonstrate privilege escalation protection (Admin attempting to grant Owner role is blocked).
3. **Core Workflow - Projects & Task Table (1:30 - 2:30):**
   - Navigate to **Projects** and create a project (`MAP - Mobile App Redesign`).
   - Navigate to **Tasks** and show the intuitive Task Table view.
   - Click a task to open the slide-over drawer; change status from `To Do` to `In Progress`.
   - Post a comment in the discussion thread.
4. **File Attachments & Real-Time Sync (2:30 - 3:30):**
   - In the task drawer, click **Attach File** to upload an attachment.
   - Show the presigned URL generation and instant file listing with formatted size badge.
   - Click **Download** to demonstrate instant binary file download.
   - Demonstrate real-time sync across two browser windows or tabs.
5. **Automated Security Tests Execution (3:30 - 4:00):**
   - Switch to terminal in `apps/backend` and run:
     ```bash
     npm test
     ```
   - Show all 18 assertions passing, demonstrating Viewer negative tests, cross-workspace IDOR blocks, and refresh token family revocation on reuse.
