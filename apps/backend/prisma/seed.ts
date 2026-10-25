import { PrismaClient, WorkspaceRole, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const defaultPrisma = new PrismaClient();

export async function seedDatabase(prisma: PrismaClient = defaultPrisma, forceClean = false) {
  console.log('🌱 Starting TeamFlow database seeding (idempotent)...');

  // Optional: only clean existing test data if explicitly requested
  if (forceClean) {
    console.log('🧹 Clean mode requested. Purging existing database data...');
    await prisma.activityLog.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.fileObject.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.membership.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.refreshSession.deleteMany({});
    await prisma.user.deleteMany({});
  }

  // Hash default password for all test users: 'Password123!'
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Idempotent Upsert for Standard Test Users
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@teamflow.dev' },
    update: { displayName: 'Alex Morgan (Owner)', passwordHash },
    create: {
      email: 'owner@teamflow.dev',
      displayName: 'Alex Morgan (Owner)',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@teamflow.dev' },
    update: { displayName: 'Sarah Connor (Admin)', passwordHash },
    create: {
      email: 'admin@teamflow.dev',
      displayName: 'Sarah Connor (Admin)',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'member@teamflow.dev' },
    update: { displayName: 'David Chen (Member)', passwordHash },
    create: {
      email: 'member@teamflow.dev',
      displayName: 'David Chen (Member)',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@teamflow.dev' },
    update: { displayName: 'Emma Watson (Viewer)', passwordHash },
    create: {
      email: 'viewer@teamflow.dev',
      displayName: 'Emma Watson (Viewer)',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
  });

  console.log('✅ Ensured 4 standard test accounts exist:');
  console.log('   - owner@teamflow.dev (Owner)');
  console.log('   - admin@teamflow.dev (Admin)');
  console.log('   - member@teamflow.dev (Member)');
  console.log('   - viewer@teamflow.dev (Viewer)');

  // 2. Ensure Default Workspace exists
  let workspace = await prisma.workspace.findUnique({
    where: { slug: 'acme-product-team' },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Acme Product Team',
        slug: 'acme-product-team',
        createdById: ownerUser.id,
      },
    });
  }

  // 3. Ensure Memberships for all 4 accounts
  const membershipsConfig = [
    { userId: ownerUser.id, role: WorkspaceRole.OWNER },
    { userId: adminUser.id, role: WorkspaceRole.ADMIN },
    { userId: memberUser.id, role: WorkspaceRole.MEMBER },
    { userId: viewerUser.id, role: WorkspaceRole.VIEWER },
  ];

  for (const m of membershipsConfig) {
    await prisma.membership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: m.userId,
        },
      },
      update: { role: m.role },
      create: {
        workspaceId: workspace.id,
        userId: m.userId,
        role: m.role,
      },
    });
  }

  console.log(`✅ Ensured Workspace: "${workspace.name}" with 4 scoped memberships`);

  // 4. Ensure Projects exist
  let mobileProject = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, name: 'Mobile App Redesign' },
  });
  if (!mobileProject) {
    mobileProject = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'Mobile App Redesign',
        description: 'Revamping navigation, offline caching, and real-time sync for iOS & Android.',
      },
    });
  }

  let apiProject = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, name: 'Platform Core & Auth' },
  });
  if (!apiProject) {
    apiProject = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'Platform Core & Auth',
        description: 'RBAC authorization guards, tenant isolation, and session rotation.',
      },
    });
  }

  // 5. Ensure Starter Tasks exist
  const existingTaskCount = await prisma.task.count({
    where: { workspaceId: workspace.id },
  });

  if (existingTaskCount === 0) {
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

    await prisma.task.create({
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

    await prisma.comment.create({
      data: {
        workspaceId: workspace.id,
        taskId: task2.id,
        authorId: adminUser.id,
        body: 'Make sure we add negative integration tests for Viewer role attempting writes.',
      },
    });

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

    console.log('✅ Created starter tasks, comments, and audit trail');
  }

  console.log('🌱 Seeding verified successfully!');
}

// Allow direct CLI execution
if (require.main === module) {
  const forceClean = process.argv.includes('--clean');
  seedDatabase(defaultPrisma, forceClean)
    .catch((e) => {
      console.error('❌ Seeding failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await defaultPrisma.$disconnect();
    });
}
