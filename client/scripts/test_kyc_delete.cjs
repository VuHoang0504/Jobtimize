const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const React = require('react');
const renderer = require('react-test-renderer');
const esbuild = require('esbuild');
const { MemoryRouter } = require('react-router-dom');

async function component(name) {
  const output = await esbuild.build({ entryPoints: [path.resolve(__dirname, '../src/components', name)], bundle: true,
    write: false, platform: 'node', format: 'cjs', external: ['react', 'react-router-dom'], loader: { '.css': 'empty' }, plugins: [{ name: 'mock-api', setup(build) {
      build.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'kyc-test' }));
      build.onLoad({ filter: /.*/, namespace: 'kyc-test' }, () => ({ loader: 'js', contents: 'module.exports = { delete(...a) { return globalThis.kycDeleteApi.delete(...a); }, get(...a) { return globalThis.kycDeleteApi.get(...a); } };' }));
    } }] });
  const mod = new Module(path.join(__dirname, '.compiled-kyc.cjs'), module);
  mod.filename = path.join(__dirname, '.compiled-kyc.cjs'); mod.paths = Module._nodeModulePaths(path.resolve(__dirname, '..'));
  mod._compile(output.outputFiles[0].text, mod.filename); return mod.exports.default;
}
function setupDialog() {
  global.document = { body: { style: { overflow: '' } }, activeElement: { isConnected: true, focus() {} } };
  return { createNodeMock: element => element.type === 'dialog' ? { showModal() {}, close() {}, addEventListener() {}, removeEventListener() {}, querySelectorAll() { return []; } } : null };
}
const employer = { EmployerID: 17, CompanyName: 'Synthetic company', LatestKycDocumentID: 32, KycDocumentCount: 2 };

test('KYC cancel does not submit a destructive request', async () => {
  const Modal = await component('admin/DeleteKYCModal.jsx'); let calls = 0, cancelled = 0, mounted;
  global.kycDeleteApi = { delete() { calls++; } };
  try {
    renderer.act(() => { mounted = renderer.create(React.createElement(Modal, { employer, onCancel() { cancelled++; }, onDeleted() {} }), setupDialog()); });
    assert.equal(calls, 0);
    renderer.act(() => mounted.root.findAllByType('button').find(x => x.props.type === 'button').props.onClick());
    assert.equal(cancelled, 1); assert.equal(calls, 0);
    assert.ok(mounted.root.findByType('dialog').props['aria-describedby']);
  } finally { renderer.act(() => mounted?.unmount()); }
});
test('KYC confirmation sends the expected submission id once and waits for completion', async () => {
  const Modal = await component('admin/DeleteKYCModal.jsx'); let mounted, calls = [], done = [], cancelled = 0, resolve;
  global.kycDeleteApi = { delete(...args) { calls.push(args); return new Promise(r => { resolve = r; }); } };
  try {
    renderer.act(() => { mounted = renderer.create(React.createElement(Modal, { employer, onCancel() { cancelled++; }, onDeleted(message) { done.push(message); } }), setupDialog()); });
    let pending;
    renderer.act(() => {
      const submit = mounted.root.findByType('form').props.onSubmit;
      pending = submit({ preventDefault() {} }); submit({ preventDefault() {} });
    });
    assert.equal(calls.length, 1); assert.deepEqual(calls[0], ['/admin/employers/17/kyc', { data: { expectedDocumentId: 32 } }]);
    assert.ok(mounted.root.findAllByType('button').every(x => x.props.disabled)); assert.equal(done.length, 0);
    renderer.act(() => mounted.root.findByType('dialog').props.onCancel({ preventDefault() {} })); assert.equal(cancelled, 0);
    await renderer.act(async () => { resolve({ data: { success: true, message: 'Deleted KYC' } }); await pending; });
    assert.deepEqual(done, ['Deleted KYC']);
  } finally { renderer.act(() => mounted?.unmount()); }
});
test('stale KYC errors stay visible and do not falsely close as successful', async () => {
  const Modal = await component('admin/DeleteKYCModal.jsx'); let mounted, done = 0;
  global.kycDeleteApi = { delete() { return Promise.reject({ response: { status: 409, data: { message: 'Doanh nghiệp vừa nộp hồ sơ mới.' } } }); } };
  try {
    renderer.act(() => { mounted = renderer.create(React.createElement(Modal, { employer, onCancel() {}, onDeleted() { done++; } }), setupDialog()); });
    await renderer.act(async () => { await mounted.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
    assert.equal(done, 0); assert.ok(mounted.root.findByProps({ role: 'alert' }).children.join('').includes('vừa nộp hồ sơ mới'));
    assert.ok(mounted.root.findAllByType('button').every(x => !x.props.disabled));
  } finally { renderer.act(() => mounted?.unmount()); }
});
test('legacy verification shows revocation rather than claiming to delete nonexistent files', async () => {
  const Modal = await component('admin/DeleteKYCModal.jsx'); let mounted, request;
  global.kycDeleteApi = { delete(...args) { request = args; return Promise.resolve({ data: { success: true, message: 'Deleted verification' } }); } };
  try {
    renderer.act(() => { mounted = renderer.create(React.createElement(Modal, { employer: { ...employer, LatestKycDocumentID: null, KycDocumentCount: 0 }, onCancel() {}, onDeleted() {} }), setupDialog()); });
    assert.ok(JSON.stringify(mounted.toJSON()).includes('chưa có giấy tờ KYC'));
    await renderer.act(async () => { await mounted.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
    assert.deepEqual(request[1], { data: { expectedDocumentId: null } });
  } finally { renderer.act(() => mounted?.unmount()); }
});
test('reopening employer KYC after deletion clears stale files and does not show pending review', async () => {
  const Modal = await component('employer/KYCModal.jsx'); let mounted;
  let current = { kycStatus: 'Approved', document: { DocumentID: 32, TaxCode: '0123456789', BusinessLicenseUrl: '/uploads/kyc/test.pdf' } };
  global.kycDeleteApi = { get: async () => ({ data: { success: true, data: current } }) };
  const props = { isOpen: true, onClose() {}, initialStatus: 'Pending' };
  try {
    await renderer.act(async () => { mounted = renderer.create(React.createElement(Modal, props)); });
    renderer.act(() => mounted.root.findAllByType('input').find(x => x.props.type === 'file').props.onChange({ target: { files: [{ name: 'stale.pdf' }] } }));
    renderer.act(() => mounted.update(React.createElement(Modal, { ...props, isOpen: false })));
    current = { kycStatus: 'Pending', document: null };
    await renderer.act(async () => { mounted.update(React.createElement(Modal, props)); });
    const allText = JSON.stringify(mounted.toJSON()); assert.ok(allText.includes('Chưa nộp hồ sơ KYC')); assert.ok(!allText.includes('Hồ sơ KYC đang chờ kiểm duyệt'));
    const tax = mounted.root.findAllByType('input').find(x => x.props.type === 'text');
    assert.equal(tax.props.value, '');
    renderer.act(() => tax.props.onChange({ target: { value: '0123456789' } }));
    await renderer.act(async () => { await mounted.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
    assert.ok(JSON.stringify(mounted.toJSON()).includes('Vui lòng tải lên file Giấy phép'));
  } finally { renderer.act(() => mounted?.unmount()); }
});
test('Admin can open and cancel KYC deletion for a legacy approval from the real employer list', async () => {
  const Admin = await component('../pages/admin/AdminUserManagementPage.jsx'); let mounted, calls = 0;
  const companies = [
    { EmployerID: 17, CompanyName: 'Approved legacy', KYCStatus: 'Approved', KycDocumentCount: 0, LatestKycDocumentID: null, Status: 'Active' },
    { EmployerID: 18, CompanyName: 'Not submitted', KYCStatus: 'Pending', KycDocumentCount: 0, LatestKycDocumentID: null, Status: 'Active' }
  ];
  global.kycDeleteApi = {
    get: async url => ({ data: { success: true, data: url === '/admin/stats' ? {} : url === '/admin/employers' ? companies : [], pagination: { totalCount: 2, totalPages: 1 } } }),
    delete() { calls++; }
  };
  try {
    await renderer.act(async () => { mounted = renderer.create(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(Admin)), setupDialog()); });
    const buttons = mounted.root.findAllByType('button').filter(x => x.props['aria-label']?.startsWith('Xóa hồ sơ KYC'));
    assert.equal(buttons.length, 1); assert.ok(buttons[0].props['aria-label'].includes('Approved legacy'));
    renderer.act(() => buttons[0].props.onClick()); assert.equal(mounted.root.findAllByType('dialog').length, 1);
    renderer.act(() => mounted.root.findAllByType('button').find(x => x.children.includes('Giữ hồ sơ')).props.onClick());
    assert.equal(mounted.root.findAllByType('dialog').length, 0); assert.equal(calls, 0);
  } finally { renderer.act(() => mounted?.unmount()); }
});
