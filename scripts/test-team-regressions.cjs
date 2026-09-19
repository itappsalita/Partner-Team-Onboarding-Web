const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadRoute(path, { role = 'PARTNER', owner = 'other', missing = false, authenticated = true } = {}) {
  let writes = 0;
  const team = { status: 'SOURCING', dataTeamPartner: { partnerId: owner, requestId: 'request' } };
  const chain = { set() { writes++; return this; }, where: async () => {} };
  const db = {
    query: {
      teams: { findFirst: async () => missing ? undefined : team },
      teamMembers: { findFirst: async () => ({ team, position: 'Member' }) },
      dataTeamPartners: { findFirst: async () => ({}) },
    },
    update: () => chain,
    transaction: async fn => fn({ ...db, delete: () => chain }),
  };
  const modules = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    'next-auth/next': { getServerSession: async () => authenticated ? { user: { role, id: 'self' } } : null },
    'drizzle-orm': { eq() {}, and() {} },
    'fs/promises': { mkdir: async () => {} },
    'fs-extra': { ensureDir: async () => {}, writeFile: async () => { throw Error('Unexpected upload'); } },
    path: require('node:path'),
    '@/lib/errors': { getErrorMessage: e => e.message },
    '@google/generative-ai': {},
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, process, console,
    require: id => modules[id] || (id.endsWith('/db') ? { db } : id.endsWith('/schema') ? { teams: {}, teamMembers: {}, dataTeamPartners: {} } : id.endsWith('/status-utils') ? { recalculateRequestStatus: async () => {}, recalculateTeamStatus: async () => {}, recalculateAssignmentStatus: async () => {} } : {}),
  });
  return { route: module.exports, writes: () => writes };
}
const request = values => ({ formData: async () => ({ get: key => values[key] ?? null }) });
(async () => {
  const teamPath = 'app/api/data-team/teams/route.ts';
  for (const method of ['POST', 'PUT']) {
    for (const field of ['tkpk1Number', 'firstAidNumber', 'electricalNumber']) {
      const test = loadRoute(teamPath);
      const response = await test.route[method](request({ id: 'team', dataTeamPartnerId: 'assignment', tkpk1Number: 'valid', [field]: 'x'.repeat(256) }));
      assert.equal(response.status, 400);
      assert.equal(test.writes(), 0);
    }
  }
  for (const [options, status] of [[{}, 403], [{ missing: true }, 404], [{ owner: 'self' }, 200], [{ role: 'SUPERADMIN' }, 200]]) {
    const test = loadRoute(teamPath, options);
    assert.equal((await test.route.PUT(request({ id: 'team', tkpk1Number: 'x'.repeat(255), firstAidNumber: 'x'.repeat(101) }))).status, status);
    assert.equal(test.writes(), status === 200 ? 1 : 0);
  }
  for (const method of ['PUT', 'DELETE']) {
    const test = loadRoute('app/api/data-team/members/[id]/route.ts');
    assert.equal((await test.route[method](request({}), { params: Promise.resolve({ id: 'member' }) })).status, 403);
    assert.equal(test.writes(), 0);
  }
  const ocr = loadRoute('app/api/ocr/ktp-ai/route.ts', { authenticated: false });
  assert.equal((await ocr.route.POST(request({}))).status, 401);
  console.log('13 regression cases passed: certificate limits, team ownership, member ownership, OCR authentication.');
})().catch(error => { console.error(error); process.exitCode = 1; });
