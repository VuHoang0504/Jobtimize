const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');
const crypto = require('crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../../..');
const privateRoot = path.join(root, 'server/private/cv-avatars');
const shared = name => import(pathToFileURL(path.join(root, 'shared/cv', name)).href);
const AVATAR_PATTERN = /^\/api\/candidate\/cv\/avatar\/([1-9]\d*)\/([a-f0-9-]{36}\.webp)$/;

async function avatarPath(url, userId) {
  const match = AVATAR_PATTERN.exec(url || '');
  if (!match || match[1] !== String(userId)) throw Object.assign(new Error('Ảnh CV không thuộc tài khoản của bạn.'), { status: 400 });
  const file = path.join(privateRoot, match[1], match[2]);
  try { await fs.access(file); } catch { throw Object.assign(new Error('Không tìm thấy ảnh CV. Vui lòng tải lại ảnh.'), { status: 400 }); }
  return file;
}
async function normalizePayload(body, userId) {
  const { validateCV, normalizeCV, TEMPLATES } = await shared('model.mjs');
  let data = body.cvData;
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch { throw Object.assign(new Error('Dữ liệu CV không hợp lệ.'), { status: 400 }); } }
  try { validateCV(data); } catch (error) { error.status = 400; throw error; }
  const template = body.template || 'modern';
  if (!Object.hasOwn(TEMPLATES, template)) throw Object.assign(new Error('Mẫu CV không hợp lệ.'), { status: 400 });
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) throw Object.assign(new Error('Tên CV cần có từ 1 đến 200 ký tự.'), { status: 400 });
  if (body.isPrimary !== undefined && typeof body.isPrimary !== 'boolean') throw Object.assign(new Error('Trạng thái CV chính không hợp lệ.'), { status: 400 });
  const cvData = normalizeCV(data, template);
  if (cvData.avatar) await avatarPath(cvData.avatar, userId);
  return { ...body, title: body.title.trim(), template, cvData };
}
async function saveAvatar(buffer, userId) {
  let image;
  try {
    const pipeline = sharp(buffer, { limitInputPixels: 24000000, failOn: 'error' });
    const meta = await pipeline.metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format) || (meta.pages || 1) > 1) throw new Error();
    image = await pipeline.rotate().resize(640, 640, { fit: 'cover' }).webp({ quality: 88 }).toBuffer();
  } catch { throw Object.assign(new Error('Ảnh không hợp lệ. Chọn ảnh JPG, PNG hoặc WebP tĩnh.'), { status: 400 }); }
  const directory = path.join(privateRoot, String(userId));
  await fs.mkdir(directory, { recursive: true });
  const filename = `${crypto.randomUUID()}.webp`;
  await fs.writeFile(path.join(directory, filename), image);
  return `/api/candidate/cv/avatar/${userId}/${filename}`;
}

let browserPromise;
let activeExports = 0;
async function getBrowser() {
  if (!browserPromise) {
    process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, '.cache/ms-playwright');
    browserPromise = require('playwright').chromium.launch({ headless: true }).catch(error => { browserPromise = null; throw error; });
    browserPromise.then(browser => browser.on('disconnected', () => { browserPromise = null; }), () => {});
  }
  return browserPromise;
}
async function createPDF(payload, userId) {
  if (activeExports >= 2) throw Object.assign(new Error('Hệ thống đang tạo nhiều CV. Vui lòng thử lại sau ít giây.'), { status: 429 });
  activeExports++;
  let context;
  try {
    const [{ renderCV }, { fontStyles, fontFiles }, css] = await Promise.all([
      shared('render.mjs'), shared('fonts.mjs'), fs.readFile(path.join(root, 'shared/cv/document.css'), 'utf8')
    ]);
    const fontBuffers = await Promise.all(fontFiles().map(async ({ file }) => [file, (await fs.readFile(path.join(root, 'client/public/cv-fonts', file))).toString('base64')]));
    const fonts = Object.fromEntries(fontBuffers);
    const fontCSS = fontStyles(file => `data:font/woff2;base64,${fonts[file]}`);
    const avatarData = payload.cvData.avatar ? `data:image/webp;base64,${(await fs.readFile(await avatarPath(payload.cvData.avatar, userId))).toString('base64')}` : '';
    const html = renderCV(payload.cvData, { template: payload.template, css, fontCSS, avatarData });
    const browser = await getBrowser();
    context = await browser.newContext({ javaScriptEnabled: true, viewport: { width: 1000, height: 1200 } });
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.emulateMedia({ media: 'screen' });
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    // The layout was measured at CSS A4 dimensions. Use the same dimensions at print time.
    return await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true, timeout: 20000 });
  } finally {
    try { if (context) await context.close(); } finally { activeExports--; }
  }
}
async function closeBrowser() { if (browserPromise) { const browser = await browserPromise; await browser.close(); browserPromise = null; } }
module.exports = { normalizePayload, saveAvatar, avatarPath, createPDF, closeBrowser };
