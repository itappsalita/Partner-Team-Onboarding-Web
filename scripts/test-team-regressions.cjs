const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const uploadRoot = fs.mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'certificate-upload-test-'));
process.on('exit', () => fs.rmSync(uploadRoot, { recursive: true, force: true }));
const uploadModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/certificate-upload.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: uploadModule.exports });

function loadRoute(path, { role = 'PARTNER', owner = 'other', missing = false, authenticated = true } = {}) {
  let writes = 0;
  const uploads = [];
  let updateData;
  const team = { status: 'SOURCING', dataTeamPartner: { partnerId: owner, requestId: 'request' } };
  const chain = { set(data) { writes++; updateData = data; return this; }, where: async () => {} };
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
    'fs/promises': { mkdir: fs.promises.mkdir },
    'fs-extra': { ensureDir: path => fs.promises.mkdir(path, { recursive: true }), writeFile: async (path, bytes) => { await fs.promises.writeFile(path, bytes); uploads.push({ path, bytes }); } },
    path: require('node:path'),
    crypto: require('node:crypto'),
    '@/lib/certificate-upload': uploadModule.exports,
    '@/lib/errors': { getErrorMessage: e => e.message },
    '@google/generative-ai': {},
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, process: { ...process, cwd: () => uploadRoot }, console, Buffer,
    require: id => modules[id] || (id.endsWith('/db') ? { db } : id.endsWith('/schema') ? { teams: {}, teamMembers: {}, dataTeamPartners: {} } : id.endsWith('/status-utils') ? { recalculateRequestStatus: async () => {}, recalculateTeamStatus: async () => {}, recalculateAssignmentStatus: async () => {} } : {}),
  });
  return { route: module.exports, writes: () => writes, uploads, updateData: () => updateData };
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

  for (const [type, extension] of [['application/pdf', 'pdf'], ['image/jpeg', 'jpg'], ['image/png', 'png']]) {
    const test = loadRoute(teamPath, { owner: 'self' });
    const bytes = Buffer.from('certificate test content');
    const file = { name: '../../unsafe.' + extension, type, size: bytes.length, arrayBuffer: async () => bytes };
    const response = await test.route.PUT(request({ id: 'team', tkpk1Number: 'cert', tkpk1File: file, firstAidFile: file, electricalFile: file }));
    assert.equal(response.status, 200);
    assert.equal(test.uploads.length, 3);
    assert.equal(new Set(test.uploads.map(f => f.path)).size, 3);
    for (const upload of test.uploads) {
      assert.match(upload.path, new RegExp('/uploads/(tkpk|firstaid|elec)_[a-f0-9-]+\\.' + extension + '$'));
      assert.deepEqual(upload.bytes, bytes);
      assert.deepEqual(fs.readFileSync(upload.path), bytes);
    }
    assert.ok(test.updateData().tkpk1FilePath.endsWith('.' + extension));
  }
  for (const file of [
    { name: 'bad.exe', type: 'application/octet-stream', size: 10 },
    { name: 'empty.pdf', type: 'application/pdf', size: 0 },
    { name: 'large.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 },
    'not a file',
  ]) {
    const test = loadRoute(teamPath, { owner: 'self' });
    assert.equal((await test.route.PUT(request({ id: 'team', tkpk1Number: 'cert', tkpk1File: file }))).status, 400);
    assert.equal(test.uploads.length, 0);
    assert.equal(test.writes(), 0);
  }
  const retained = loadRoute(teamPath, { owner: 'self' });
  assert.equal((await retained.route.PUT(request({ id: 'team', tkpk1Number: 'cert' }))).status, 200);
  assert.equal(Object.hasOwn(retained.updateData(), 'tkpk1FilePath'), false);
  const medium = { name: 'file.pdf', type: 'application/pdf', size: 5 * 1024 * 1024 };
  assert.match(uploadModule.exports.validateCertificateUploads([medium, medium]), /9 MB/);
  console.log('22 regression cases passed, including certificate upload formats, content, filenames, limits and retained files.');
})().catch(error => { console.error(error); process.exitCode = 1; });
