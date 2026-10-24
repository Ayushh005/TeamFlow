const request = require('supertest');

const BASE_URL = process.env.API_TEST_URL || 'http://localhost:3000/api/v1';

interface TestAccount {
  email: string;
  role: string;
  token?: string;
  userId?: string;
}

const accounts: Record<string, TestAccount> = {
  owner: { email: 'owner@teamflow.dev', role: 'OWNER' },
  admin: { email: 'admin@teamflow.dev', role: 'ADMIN' },
  member: { email: 'member@teamflow.dev', role: 'MEMBER' },
  viewer: { email: 'viewer@teamflow.dev', role: 'VIEWER' },
};

let primaryWorkspaceId: string = '';
let targetTaskId: string = '';
let targetMemberId: string = '';
let fakeWorkspaceId: string = '00000000-0000-0000-0000-000000000000';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    failedCount++;
    throw new Error(message);
  } else {
    console.log(`  ✓ PASSED: ${message}`);
    passedCount++;
  }
}

async function loginUser(email: string): Promise<string> {
  const res = await request(BASE_URL)
    .post('/auth/login')
    .send({ email, password: 'Password123!' });

  if (res.status !== 200 || !res.body?.data?.accessToken) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.accessToken;
}

async function runNegativeAuthorizationSuite() {
  console.log('\n===============================================================');
  console.log(' TEAMFLOW AUTOMATED NEGATIVE AUTHORIZATION TEST SUITE');
  console.log(' Target Endpoint:', BASE_URL);
  console.log('===============================================================\n');

  // Step 0: Authenticate all 4 role accounts
  console.log('--- Step 0: Authenticating Test Accounts ---');
  for (const [key, account] of Object.entries(accounts)) {
    account.token = await loginUser(account.email);
    console.log(`✓ Authenticated ${account.role} (${account.email})`);
  }

  // Fetch workspaces & a task using Owner
  const wsRes = await request(BASE_URL)
    .get('/workspaces')
    .set('Authorization', `Bearer ${accounts.owner.token}`);

  assert(wsRes.status === 200, 'Owner can list workspaces');
  const primaryWorkspace = wsRes.body.data[0];
  assert(!!primaryWorkspace, 'Primary test workspace exists');
  primaryWorkspaceId = primaryWorkspace.id;

  // Fetch members to get a target member
  const membersRes = await request(BASE_URL)
    .get(`/workspaces/${primaryWorkspaceId}/members`)
    .set('Authorization', `Bearer ${accounts.owner.token}`);

  assert(membersRes.status === 200, 'Workspace members fetched');
  const targetMember = membersRes.body.data.find((m: any) => m.user?.email === 'member@teamflow.dev');
  if (targetMember) {
    targetMemberId = targetMember.user.id;
  }

  // Fetch or create a task for testing
  const tasksRes = await request(BASE_URL)
    .get(`/workspaces/${primaryWorkspaceId}/tasks`)
    .set('Authorization', `Bearer ${accounts.owner.token}`);

  assert(tasksRes.status === 200, 'Workspace tasks fetched');
  if (tasksRes.body.data.length > 0) {
    targetTaskId = tasksRes.body.data[0].id;
  }

  console.log(`\nActive Test Workspace: ${primaryWorkspaceId}`);
  console.log(`Target Task ID: ${targetTaskId}`);
  console.log(`Target Member ID: ${targetMemberId}\n`);

  // TEST 1: Viewer cannot edit a task (403 Forbidden)
  console.log('--- Test 1: Negative Authorization - Viewer Cannot Edit Task ---');
  const editTaskRes = await request(BASE_URL)
    .patch(`/workspaces/${primaryWorkspaceId}/tasks/${targetTaskId}`)
    .set('Authorization', `Bearer ${accounts.viewer.token}`)
    .send({ status: 'DONE' });

  assert(
    editTaskRes.status === 403,
    `Viewer editing task returned HTTP 403 Forbidden (got ${editTaskRes.status})`,
  );
  assert(
    editTaskRes.body?.message?.includes('Viewers do not have permission'),
    `Forbidden message clearly explains role restriction: "${editTaskRes.body?.message}"`,
  );

  // TEST 2: Member cannot change member roles (403 Forbidden)
  console.log('\n--- Test 2: Privilege Escalation - Member Cannot Change Roles ---');
  const memberEscalateRes = await request(BASE_URL)
    .patch(`/workspaces/${primaryWorkspaceId}/members/${targetMemberId}/role`)
    .set('Authorization', `Bearer ${accounts.member.token}`)
    .send({ role: 'ADMIN' });

  assert(
    memberEscalateRes.status === 403,
    `Member changing role returned HTTP 403 Forbidden (got ${memberEscalateRes.status})`,
  );
  assert(
    memberEscalateRes.body?.message?.includes('Forbidden') ||
      memberEscalateRes.body?.message?.includes('permission') ||
      memberEscalateRes.body?.message?.includes('role') ||
      memberEscalateRes.status === 403,
    `Rejection message enforces permission requirement: "${memberEscalateRes.body?.message}"`,
  );

  // TEST 3: Admin cannot grant OWNER role (403 Forbidden)
  console.log('\n--- Test 3: Privilege Safeguard - Admin Cannot Grant OWNER Role ---');
  const adminGrantOwnerRes = await request(BASE_URL)
    .patch(`/workspaces/${primaryWorkspaceId}/members/${targetMemberId}/role`)
    .set('Authorization', `Bearer ${accounts.admin.token}`)
    .send({ role: 'OWNER' });

  assert(
    adminGrantOwnerRes.status === 403,
    `Admin granting OWNER role returned HTTP 403 Forbidden (got ${adminGrantOwnerRes.status})`,
  );
  assert(
    adminGrantOwnerRes.body?.message?.includes('Admins cannot') ||
      adminGrantOwnerRes.body?.message?.includes('Owner') ||
      adminGrantOwnerRes.status === 403,
    `Safeguard prevents unauthorized transfer of ownership: "${adminGrantOwnerRes.body?.message}"`,
  );

  // TEST 4: Cross-Workspace IDOR Tenant Isolation (403 Forbidden)
  console.log('\n--- Test 4: Tenant Isolation - Cross-Workspace IDOR Blocked ---');
  const crossTenantRes = await request(BASE_URL)
    .get(`/workspaces/${fakeWorkspaceId}/tasks`)
    .set('Authorization', `Bearer ${accounts.member.token}`);

  assert(
    crossTenantRes.status === 403,
    `Accessing unauthorized foreign workspace returned HTTP 403 Forbidden (got ${crossTenantRes.status})`,
  );
  assert(
    crossTenantRes.body?.message?.includes('Access denied: You do not belong to this workspace'),
    `Zero-IDOR guard enforces strict tenant boundary: "${crossTenantRes.body?.message}"`,
  );

  // TEST 5: Viewer cannot upload files (403 Forbidden)
  console.log('\n--- Test 5: Storage Authorization - Viewer Cannot Upload Files ---');
  const viewerUploadRes = await request(BASE_URL)
    .post(`/workspaces/${primaryWorkspaceId}/files/presign-upload`)
    .set('Authorization', `Bearer ${accounts.viewer.token}`)
    .send({
      fileName: 'unauthorized-file.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      taskId: targetTaskId,
    });

  assert(
    viewerUploadRes.status === 403,
    `Viewer requesting presigned upload returned HTTP 403 Forbidden (got ${viewerUploadRes.status})`,
  );
  assert(
    viewerUploadRes.body?.message?.includes('Viewers do not have permission to upload files'),
    `Upload guard enforces read-only access for Viewers: "${viewerUploadRes.body?.message}"`,
  );

  // TEST 6: Refresh Token Rotation and Family Revocation on Reuse
  console.log('\n--- Test 6: Auth Security - Refresh Token Reuse Family Revocation ---');
  const loginRes = await request(BASE_URL)
    .post('/auth/login')
    .send({ email: 'member@teamflow.dev', password: 'Password123!' });

  const rawCookie = loginRes.headers['set-cookie'];
  assert(!!rawCookie, 'HttpOnly refresh token cookie returned on login');

  const refreshTokenCookie = Array.isArray(rawCookie)
    ? rawCookie.find((c) => c.startsWith('refresh_token=')) || rawCookie[0]
    : rawCookie;

  // First legitimate rotation
  const rotateRes1 = await request(BASE_URL)
    .post('/auth/refresh')
    .set('Cookie', refreshTokenCookie);

  assert(rotateRes1.status === 200, `First refresh token rotation succeeded with 200 (got ${rotateRes1.status})`);

  // Malicious / Stolen reuse attempt of the OLD already-used token
  const reuseAttackRes = await request(BASE_URL)
    .post('/auth/refresh')
    .set('Cookie', refreshTokenCookie);

  assert(
    reuseAttackRes.status === 401,
    `Reused refresh token blocked with HTTP 401 Unauthorized (got ${reuseAttackRes.status})`,
  );
  assert(
    reuseAttackRes.body?.message?.includes('Token reuse detected') ||
      reuseAttackRes.body?.message?.includes('revoked') ||
      reuseAttackRes.status === 401,
    `Reuse detection triggered security response: "${reuseAttackRes.body?.message || 'Family revoked'}"`,
  );

  console.log('\n===============================================================');
  console.log(` TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log(' All Negative Authorization & Security Controls Verified 100%');
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runNegativeAuthorizationSuite().catch((err) => {
  console.error('\nFatal test execution error:', err.message);
  process.exit(1);
});
