const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const React = require('react');
const renderer = require('react-test-renderer');
const { MemoryRouter, useLocation, useNavigate } = require('react-router-dom');
const esbuild = require('esbuild');

async function component(name, mockAuth = true) {
  const result = await esbuild.build({ entryPoints: [path.resolve(__dirname, '../src', name)], write: false,
    bundle: true, platform: 'node', format: 'cjs', external: ['react', 'react-router-dom'], define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'isolated-services', setup(build) {
      build.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'test-mocks' }));
      if (mockAuth) build.onResolve({ filter: /context\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'test-mocks' }));
      build.onLoad({ filter: /.*/, namespace: 'test-mocks' }, args => ({ loader: 'js', contents: args.path === 'api'
        ? 'module.exports = globalThis.notificationTestApi;'
        : "import React from 'react'; export const useAuth = () => React.useContext(globalThis.notificationTestAuth);" }));
    } }] });
  const mod = new Module(path.resolve(__dirname, '.compiled-notifications.cjs'), module);
  mod.filename = path.resolve(__dirname, '.compiled-notifications.cjs');
  mod.paths = Module._nodeModulePaths(path.resolve(__dirname, '..'));
  mod._compile(result.outputFiles[0].text, mod.filename); return mod.exports;
}
function text(node) {
  if (typeof node === 'string') return node;
  return (node.children || []).map(text).join('');
}
const button = (root, part) => root.findAllByType('button').find(node => text(node).includes(part) || node.props['aria-label']?.includes(part));
function globals() {
  global.document = Object.assign(new EventTarget(), { hidden: false });
  global.window = new EventTarget();
  global.notificationTestAuth = React.createContext(null);
  const realSet = global.setInterval, realClear = global.clearInterval;
  const timers = new Map(); let id = 0;
  global.setInterval = fn => { timers.set(++id, fn); return id; };
  global.clearInterval = key => timers.delete(key);
  return { timers, restore() { global.setInterval = realSet; global.clearInterval = realClear; } };
}
function Probe() { const location = useLocation(); return React.createElement('output', { id: 'route' }, location.pathname + location.search); }
function tree(Inbox, user) {
  return React.createElement(notificationTestAuth.Provider, { value: { user } }, React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(Inbox), React.createElement(Probe)));
}
const candidate = { userId: 1, role: 'Candidate' };
const notice = { id: 17, type: 'invitation', title: 'Lời mời thật', body: 'Công ty mời bạn ứng tuyển', href: '/candidate/dashboard?tab=invitations&invitationId=2', createdAt: '2026-10-28T03:00:00Z', readAt: null };

test('admin period form supports exact day, month, year and inclusive range, only applies on submit', async () => {
  const Period = (await component('components/common/AdminReportPeriod.jsx')).default;
  let mounted, applied = [];
  try {
    renderer.act(() => { mounted = renderer.create(React.createElement(Period, { onApply: value => applied.push(value) })); });
    const change = async (mode, values) => {
      renderer.act(() => mounted.root.findByType('select').props.onChange({ target: { value: mode } }));
      for (const [label, value] of values) renderer.act(() => mounted.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }));
      const before = applied.length;
      assert.equal(applied.length, before);
      renderer.act(() => mounted.root.findByType('form').props.onSubmit({ preventDefault() {} }));
      assert.equal(applied.at(-1).timeRange, mode);
    };
    await change('day', [['Ngày', '2024-02-29']]); assert.equal(applied.at(-1).date, '2024-02-29');
    await change('month', [['Tháng', '2024-02']]); assert.equal(applied.at(-1).month, '2024-02');
    await change('year', [['Năm', '2024']]); assert.equal(applied.at(-1).year, '2024');
    await change('custom', [['Từ ngày', '2024-02-01'], ['Đến hết ngày', '2024-02-29']]); assert.equal(applied.at(-1).toDate, '2024-02-29');
    assert.deepEqual(applied.at(-1), { timeRange: 'custom', fromDate: '2024-02-01', toDate: '2024-02-29' }, 'Only active filter fields are sent');
    const beforeInvalid = applied.length;
    renderer.act(() => mounted.root.findByProps({ 'aria-label': 'Từ ngày' }).props.onChange({ target: { value: '2024-03-01' } }));
    renderer.act(() => mounted.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.equal(applied.length, beforeInvalid, 'Invalid ranges must not fetch a report');
    assert.ok(text(mounted.root.findByProps({ role: 'alert' })).includes('Ngày kết thúc'));
    renderer.act(() => mounted.root.findByProps({ 'aria-label': 'Đến hết ngày' }).props.onChange({ target: { value: '2024-03-02' } }));
    assert.equal(mounted.root.findAllByProps({ role: 'alert' }).length, 0);
    renderer.act(() => mounted.update(React.createElement(Period, { disabled: true, onApply: value => applied.push(value) })));
    renderer.act(() => mounted.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.equal(applied.length, beforeInvalid, 'A loading report cannot be submitted twice');
  } finally { mounted?.unmount(); }
});

test('admin analytics renders empty periods and uses same server filters for full exports and pagination', async () => {
  const env = globals(); let mounted; const calls = [], exports = [], clicks = [], revoked = [];
  const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:isolated-admin-test'; URL.revokeObjectURL = url => revoked.push(url);
  document.createElement = () => ({ click() { clicks.push(this.download); }, remove() {} });
  document.body = { appendChild() {} };
  notificationTestApi = { get: async (url, options) => {
    calls.push(url);
    if (url.includes('/export?')) { exports.push(url); return { data: new Blob(['csv']), headers: { 'content-disposition': 'attachment; filename="test-full.csv"' } }; }
    if (url.startsWith('/admin/transactions')) return { data: { data: { transactions: [], pagination: { total: 25, totalPages: 2 } } } };
    return { data: { data: { demoAvailable: { count: 8, amount: 30920000 }, period: { fromDate: '2024-02-01', toDate: '2024-02-29' }, kpi: { periodOrders: 0, totalUsers: 99, periodNewUsers: 0, totalApplications: 100, periodApplications: 0, revenueGrowthRate: null }, timeline: [{ key: '2024-02', label: '02/2024', revenue: 0, orders: 0, newUsers: 0, newCandidates: 0, newEmployers: 0, jobs: 0, applications: 0 }], packagesBreakdown: [], paymentMethodsBreakdown: [], jobsByCategory: [], jobsByLocation: [] } } };
  } };
  try {
    const Dashboard = (await component('pages/admin/AdminAnalyticsDashboard.jsx')).default;
    await renderer.act(async () => { mounted = renderer.create(React.createElement(MemoryRouter, null, React.createElement(Dashboard))); });
    assert.ok(text(mounted.toJSON()).includes('Chưa có kỳ gốc'));
    assert.ok(text(mounted.toJSON()).includes('Chưa có dữ liệu'));
    assert.ok(!text(mounted.toJSON()).includes('85%'), 'Empty periods cannot invent an average match score');
    renderer.act(() => mounted.root.findByProps({ 'aria-label': 'Kiểu thời gian báo cáo' }).props.onChange({ target: { value: 'month' } }));
    renderer.act(() => mounted.root.findByProps({ 'aria-label': 'Tháng' }).props.onChange({ target: { value: '2024-02' } }));
    await renderer.act(async () => mounted.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.ok(calls.some(url => url.includes('/admin/analytics?') && url.includes('timeRange=month') && url.includes('month=2024-02')));
    await renderer.act(async () => button(mounted.root, 'Sau').props.onClick());
    assert.ok(calls.some(url => url.includes('/admin/transactions?') && url.includes('page=2')));
    await renderer.act(async () => button(mounted.root, 'Xuất Báo Cáo').props.onClick());
    await renderer.act(async () => button(mounted.root, 'Xuất file').props.onClick());
    assert.ok(exports[0].includes('kind=summary')); assert.ok(exports[1].includes('kind=transactions'));
    assert.ok(exports.every(url => url.includes('timeRange=month') && url.includes('month=2024-02') && !url.includes('page=')));
    assert.equal(clicks.length, 2);
    assert.ok(text(mounted.toJSON()).includes('Chưa có giao dịch thanh toán đã xác nhận'));
    await renderer.act(async () => button(mounted.root, 'Xem dữ liệu mẫu').props.onClick());
    assert.equal(mounted.root.findByProps({ 'aria-label': 'Nguồn doanh thu' }).props.value, 'demo');
    assert.ok(calls.some(url => url.includes('/admin/analytics?') && url.includes('dataSource=demo')));
    assert.ok(text(mounted.toJSON()).includes('DỮ LIỆU MẪU:'));
    await new Promise(resolve => setTimeout(resolve, 1050)); assert.equal(revoked.length, 2);
  } finally { mounted?.unmount(); URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke; env.restore(); }
});

test('admin removes manual premium review, preserves KYC and clearly confirms automatic ban', async () => {
  const env = globals(); let mounted; const calls = [];
  const report = { ReportID: 7, Status: 'Pending', TargetType: 'JobPosting', TargetName: 'Test Job', Reason: 'Evidence to verify', CreatedAt: '2024-02-01' };
  notificationTestApi = { get: async url => { calls.push(url); return { data: { success: true, data: url.startsWith('/admin/reports') ? [report] : url.startsWith('/admin/stats') ? {} : [], pagination: { totalCount: 1, totalPages: 1 } } }; } };
  try {
    const Admin = (await component('pages/admin/AdminUserManagementPage.jsx')).default;
    await renderer.act(async () => { mounted = renderer.create(React.createElement(MemoryRouter, null, React.createElement(Admin))); });
    assert.ok(button(mounted.root, 'Doanh Nghiệp & Giấy Phép KD')); assert.equal(button(mounted.root, 'Duyệt Thanh Toán Gói'), undefined);
    assert.ok(!calls.some(url => url.includes('/payments/pending')));
    await renderer.act(async () => button(mounted.root, 'Báo Cáo Vi Phạm').props.onClick());
    renderer.act(() => button(mounted.root, 'Xử lý').props.onClick());
    assert.ok(button(mounted.root, 'Xác nhận vi phạm và khóa tài khoản'));
    assert.ok(text(mounted.toJSON()).includes('tài khoản nhà tuyển dụng sở hữu tin'));
    const note = mounted.root.findAllByType('textarea').find(node => node.props.minLength === 10); assert.ok(note.props.required);
    assert.ok(!mounted.root.findAllByType('option').some(node => node.props.value === 'none' || node.props.value === 'lock_target'));
  } finally { mounted?.unmount(); env.restore(); }
});

test('inbox renders real counts, unread filter, read-all and paused background polling', async () => {
  const env = globals(); let mounted, calls = 0, patches = [], read = false;
  notificationTestApi = { get: async () => { calls++; return { data: { data: [notice], total: 1, unread: read ? 0 : 1 } }; }, patch: async url => { patches.push(url); read = true; } };
  try {
    const Inbox = (await component('components/common/NotificationInbox.jsx')).default;
    await renderer.act(async () => { mounted = renderer.create(tree(Inbox, candidate)); });
    assert.equal(env.timers.size, 1);
    assert.ok(button(mounted.root, 'Thông báo').props['aria-label'].includes('1 chưa đọc'));
    await renderer.act(async () => { button(mounted.root, 'Thông báo').props.onClick(); });
    assert.ok(button(mounted.root, 'Lời mời thật'));
    await renderer.act(async () => { button(mounted.root, 'Đánh dấu tất cả').props.onClick(); });
    assert.deepEqual(patches, ['/notifications/read-all']); assert.ok(button(mounted.root, 'Chưa đọc (0)'));
    const before = calls; document.hidden = true;
    await renderer.act(async () => { for (const tick of env.timers.values()) await tick(); }); assert.equal(calls, before);
    document.hidden = false; await renderer.act(async () => { document.dispatchEvent(new Event('visibilitychange')); }); assert.equal(calls, before + 1);
    renderer.act(() => mounted.unmount()); assert.equal(env.timers.size, 0);
  } finally { if (mounted) renderer.act(() => mounted.unmount()); env.restore(); }
});

test('clicking a notification saves read state before navigating to the real invitation route', async () => {
  const env = globals(); let mounted, saved = false;
  notificationTestApi = { get: async () => ({ data: { data: [{ ...notice, readAt: saved ? new Date().toISOString() : null }], total: 1, unread: saved ? 0 : 1 } }), patch: async url => { assert.equal(url, '/notifications/17/read'); saved = true; } };
  try {
    const Inbox = (await component('components/common/NotificationInbox.jsx')).default;
    await renderer.act(async () => { mounted = renderer.create(tree(Inbox, candidate)); });
    await renderer.act(async () => { button(mounted.root, 'Thông báo').props.onClick(); });
    await renderer.act(async () => { button(mounted.root, 'Lời mời thật').props.onClick(); });
    assert.equal(saved, true); assert.equal(text(mounted.root.findByType('output')), notice.href);
  } finally { if (mounted) renderer.act(() => mounted.unmount()); env.restore(); }
});

test('old account responses are discarded after switching account; failed requests remain retryable', async () => {
  const env = globals(); let mounted, firstResolve, calls = 0;
  notificationTestApi = { get: () => { calls++; return calls === 1 ? new Promise(resolve => { firstResolve = resolve; }) : Promise.resolve({ data: { data: [], total: 0, unread: 0 } }); }, patch: async () => {} };
  try {
    const Inbox = (await component('components/common/NotificationInbox.jsx')).default;
    await renderer.act(async () => { mounted = renderer.create(tree(Inbox, candidate)); });
    await renderer.act(async () => { mounted.update(tree(Inbox, { userId: 2, role: 'Employer' })); });
    await renderer.act(async () => { firstResolve({ data: { data: [notice], total: 1, unread: 1 } }); });
    await renderer.act(async () => { button(mounted.root, 'Thông báo').props.onClick(); });
    assert.equal(button(mounted.root, 'Lời mời thật'), undefined);
    assert.ok(button(mounted.root, 'Tất cả (0)'));
    notificationTestApi.get = async () => { throw new Error('offline'); };
    await renderer.act(async () => { button(mounted.root, 'Tải lại thông báo').props.onClick(); });
    assert.ok(mounted.root.findByProps({ role: 'alert' }));
    notificationTestApi.get = async () => ({ data: { data: [], total: 0, unread: 0 } });
    await renderer.act(async () => { button(mounted.root, 'Tải lại thông báo').props.onClick(); });
    assert.equal(mounted.root.findAllByProps({ role: 'alert' }).length, 0);
  } finally { if (mounted) renderer.act(() => mounted.unmount()); env.restore(); }
});

test('login/logout notices survive navigation and notification retries do not break authentication', async () => {
  const env = globals(); let mounted, auth, deliveries = 0;
  const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
  };
  global.localStorage = storage(); global.sessionStorage = storage(); window.location = { href: '/login' };
  notificationTestApi = {
    get: async () => ({ data: { success: true, data: candidate } }),
    post: async url => {
      if (url === '/notifications/session') { deliveries++; if (deliveries === 1) throw new Error('Inbox temporarily offline'); return { data: { success: true } }; }
      return { data: { success: true, data: { user: candidate, token: 'test-token' } } };
    }
  };
  try {
    const { AuthProvider, useAuth } = await component('context/AuthContext.jsx', false);
    function Capture() { auth = useAuth(); return null; }
    const create = () => React.createElement(AuthProvider, null, React.createElement(Capture));
    await renderer.act(async () => { mounted = renderer.create(create()); });
    await renderer.act(async () => { await auth.login('candidate@example.org', 'test'); });
    assert.equal(auth.user.userId, 1); assert.equal(auth.authNotice, 'Đăng nhập thành công!');
    assert.equal(sessionStorage.getItem('jobtimize_pending_login_notice'), '1');
    await renderer.act(async () => { for (const tick of env.timers.values()) await tick(); });
    assert.equal(deliveries, 2); assert.equal(sessionStorage.getItem('jobtimize_pending_login_notice'), null);
    renderer.act(() => auth.logout()); assert.equal(window.location.href, '/'); assert.equal(localStorage.getItem('jobtimize_token'), null);
    assert.equal(sessionStorage.getItem('jobtimize_auth_notice'), 'Đăng xuất thành công!');
    renderer.act(() => mounted.unmount());
    await renderer.act(async () => { mounted = renderer.create(create()); });
    assert.equal(auth.authNotice, 'Đăng xuất thành công!'); assert.equal(auth.user, null);
  } finally { if (mounted) renderer.act(() => mounted.unmount()); env.restore(); }
});

test('a failed mark-read request keeps the user on the current route with unread state intact', async () => {
  const env = globals(); let mounted;
  notificationTestApi = { get: async () => ({ data: { data: [notice], total: 1, unread: 1 } }), patch: async () => { throw new Error('offline'); } };
  try {
    const Inbox = (await component('components/common/NotificationInbox.jsx')).default;
    await renderer.act(async () => { mounted = renderer.create(tree(Inbox, candidate)); });
    await renderer.act(async () => { button(mounted.root, 'Thông báo').props.onClick(); });
    await renderer.act(async () => { button(mounted.root, 'Lời mời thật').props.onClick(); });
    assert.equal(text(mounted.root.findByType('output')), '/');
    assert.ok(button(mounted.root, 'Thông báo').props['aria-label'].includes('1 chưa đọc'));
    assert.ok(mounted.root.findByProps({ role: 'alert' }));
  } finally { if (mounted) renderer.act(() => mounted.unmount()); env.restore(); }
});

test('an expired response from an old session cannot log out a newly signed-in account', async () => {
  const env = globals();
  window.location = { href: 'http://test.local/' }; document.cookie = '';
  const values = new Map([['jobtimize_token', 'old-token']]);
  global.localStorage = { getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key), setItem: (key, value) => values.set(key, value) };
  let rejectRequest, changed = 0;
  window.addEventListener('auth-change', () => changed++);
  try {
    const api = (await component('services/api.js')).default;
    const request = api.get('/test', { adapter: config => new Promise((resolve, reject) => { rejectRequest = () => reject({ config, response: { status: 401 } }); }) });
    await new Promise(resolve => setImmediate(resolve));
    localStorage.setItem('jobtimize_token', 'new-token');
    rejectRequest(); await assert.rejects(request);
    assert.equal(localStorage.getItem('jobtimize_token'), 'new-token'); assert.equal(changed, 0);
    await assert.rejects(api.get('/test', { adapter: async config => { throw { config, response: { status: 401 } }; } }));
    assert.equal(localStorage.getItem('jobtimize_token'), null); assert.equal(changed, 1);
  } finally { env.restore(); }
});

test('reopening another notification for the same invitation reloads its latest message', async () => {
  const env = globals(); let mounted, calls = 0;
  const href = '/candidate/dashboard?tab=invitations&invitationId=2';
  notificationTestApi = { get: async () => ({ data: { data: [{ InvitationID: 2, JobID: 1, Title: 'Developer', CompanyName: 'Company', SentAt: notice.createdAt, Status: 'Sent', Message: `Lời mời lần ${++calls}` }], hasMore: false } }) };
  try {
    const Invitations = (await component('components/candidate/CandidateInvitations.jsx')).default;
    function Reopen() { const navigate = useNavigate(); return React.createElement('button', { onClick: () => navigate(href) }, 'Mở lại lời mời'); }
    await renderer.act(async () => { mounted = renderer.create(React.createElement(MemoryRouter, { initialEntries: [href], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(Invitations), React.createElement(Reopen))); });
    assert.equal(calls, 1);
    await renderer.act(async () => { button(mounted.root, 'Mở lại lời mời').props.onClick(); });
    assert.equal(calls, 2); assert.ok(text(mounted.root).includes('Lời mời lần 2'));
  } finally { if (mounted) renderer.act(() => mounted.unmount()); env.restore(); }
});

test('opening a read notification does not wait for a slow inbox refresh', async () => {
  const env = globals(); let mounted, calls = 0, completeRefresh;
  notificationTestApi = {
    get: () => {
      calls++;
      if (calls === 3) return new Promise(resolve => { completeRefresh = resolve; });
      return Promise.resolve({ data: { data: [notice], total: 1, unread: 1 } });
    }, patch: async () => ({ data: { success: true } })
  };
  try {
    const Inbox = (await component('components/common/NotificationInbox.jsx')).default;
    await renderer.act(async () => { mounted = renderer.create(tree(Inbox, candidate)); });
    await renderer.act(async () => { button(mounted.root, 'Thông báo').props.onClick(); });
    await renderer.act(async () => { button(mounted.root, 'Lời mời thật').props.onClick(); });
    assert.equal(text(mounted.root.findByType('output')), notice.href, 'A saved read action must navigate before the next GET completes');
  } finally {
    if (completeRefresh) await renderer.act(async () => { completeRefresh({ data: { data: [notice], total: 1, unread: 0 } }); });
    if (mounted) renderer.act(() => mounted.unmount()); env.restore();
  }
});
