import { PrismaClient, WorkspaceRole, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting TeamFlow deterministic database seeding...');

  // 1. Clean existing test data
  await prisma.activityLog.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.fileObject.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.refreshSession.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Hash default password for all test users: 'Password123!'
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 3. Create Seed Users
  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@teamflow.dev',
      displayName: 'Alex Morgan (Owner)',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@teamflow.dev',
      displayName: 'Sarah Connor (Admin)',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      email: 'member@teamflow.dev',
      displayName: 'David Chen (Member)',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@teamflow.dev',
      displayName: 'Emma Watson (Viewer)',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
  });

  console.log('✅ Created 4 standard test accounts:');
  console.log('   - owner@teamflow.dev (Owner)');
  console.log('   - admin@teamflow.dev (Admin)');
  console.log('   - member@teamflow.dev (Member)');
  console.log('   - viewer@teamflow.dev (Viewer)');

  // 4. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Product Team',
      slug: 'acme-product-team',
      createdById: ownerUser.id,
      memberships: {
        create: [
          { userId: ownerUser.id, role: WorkspaceRole.OWNER },
          { userId: adminUser.id, role: WorkspaceRole.ADMIN },
          { userId: memberUser.id, role: WorkspaceRole.MEMBER },
          { userId: viewerUser.id, role: WorkspaceRole.VIEWER },
        ],
      },
    },
  });

  console.log(`✅ Created Workspace: "${workspace.name}" with 4 scoped memberships`);

  // 5. Create Projects
  const mobileProject = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: 'Mobile App Redesign',
      description: 'Revamping navigation, offline caching, and real-time sync for iOS & Android.',
    },
  });

  const apiProject = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: 'Platform Core & Auth',
      description: 'RBAC authorization guards, tenant isolation, and session rotation.',
    },
  });

  console.log('✅ Created 2 Projects');

  // 6. Create Tasks
  const task1 = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      projectId: apiProject.id,
      title: 'Implement Refresh Token Rotation with Reuse Detection',
      description: 'Store hashed tokens in PostgreSQL and revoke family on token reuse detection.',
      status: TaskStatus.DONE,
      priority: TaskPriority.URGENT,
      assigneeId: adminUser.id,
      createdById: ownerUser.id,
      dueAt: new Date(Date.now() + 86400000 * 2),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      projectId: apiProject.id,
      title: 'Enforce Workspace Tenant Isolation on all REST endpoints',
      description: 'Ensure cross-workspace IDOR is strictly blocked at the guard level.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      assigneeId: memberUser.id,
      createdById: adminUser.id,
      dueAt: new Date(Date.now() + 86400000 * 4),
    },
  });

  const task3 = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      projectId: mobileProject.id,
      title: 'Design interactive Kanban Board and Task slide-over drawer',
      description: 'Light minimal SaaS aesthetics with drag and drop column transitions.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assigneeId: memberUser.id,
      createdById: ownerUser.id,
      dueAt: new Date(Date.now() + 86400000 * 7),
    },
  });

  console.log('✅ Created 3 Tasks across projects');

  // 7. Create Comments
  await prisma.comment.create({
    data: {
      workspaceId: workspace.id,
      taskId: task2.id,
      authorId: adminUser.id,
      body: 'Make sure we add negative integration tests for Viewer role attempting writes.',
    },
  });

  await prisma.comment.create({
    data: {
      workspaceId: workspace.id,
      taskId: task2.id,
      authorId: memberUser.id,
      body: 'Added tests in auth.e2e-spec.ts, all green and passing!',
    },
  });

  // 8. Create Activity Logs
  await prisma.activityLog.create({
    data: {
      workspaceId: workspace.id,
      actorId: ownerUser.id,
      action: 'WORKSPACE_CREATED',
      targetType: 'Workspace',
      targetId: workspace.id,
      metadata: { name: workspace.name },
    },
  });

  await prisma.activityLog.create({
    data: {
      workspaceId: workspace.id,
      actorId: adminUser.id,
      action: 'TASK_STATUS_UPDATED',
      targetType: 'Task',
      targetId: task1.id,
      metadata: { from: 'IN_PROGRESS', to: 'DONE', title: task1.title },
    },
  });

  console.log('🌱 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
