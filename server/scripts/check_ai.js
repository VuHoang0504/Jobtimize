require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getProvider, generateJSON } = require('../src/services/openaiService');
const { getGeminiModel, checkGeminiConnection } = require('../src/services/aiService');

const hints = {
  OPENAI_BILLING_REQUIRED: 'Tài khoản API chưa có credit khả dụng hoặc chưa kích hoạt thanh toán. Kiểm tra Billing trên OpenAI Platform.',
  OPENAI_SPEND_LIMIT: 'Đã chạm hạn mức chi tiêu hoặc sử dụng của project/tổ chức. Kiểm tra Limits trên OpenAI Platform.',
  OPENAI_RATE_LIMITED: 'Đang vượt giới hạn tốc độ yêu cầu hoặc token. Chờ một lúc rồi thử lại.',
  OPENAI_INVALID_KEY: 'Khóa API không hợp lệ hoặc đã bị thu hồi. Cập nhật OPENAI_API_KEY.',
  OPENAI_ACCESS_DENIED: 'Tài khoản chưa có quyền truy cập dịch vụ/model này.',
  GEMINI_NOT_CONFIGURED: 'Chưa cấu hình GEMINI_API_KEY.',
  GEMINI_RATE_LIMITED: 'Đã chạm quota hoặc giới hạn tốc độ Gemini. Kiểm tra hạn mức của project và thử lại sau.',
  GEMINI_ACCESS_DENIED: 'Khóa hoặc project Gemini chưa có quyền truy cập. Kiểm tra cấu hình khóa.',
  GEMINI_INVALID_REQUEST: 'Yêu cầu hoặc khóa Gemini không hợp lệ. Kiểm tra khóa và cấu hình model.',
  GEMINI_MODEL_NOT_FOUND: 'Model Gemini không khả dụng với project này. Kiểm tra GEMINI_MODEL.',
  GEMINI_REQUEST_FAILED: 'Không kiểm tra được kết nối Gemini. Kiểm tra mạng và cấu hình dịch vụ.'
};

async function runChecks({ args = process.argv.slice(2), log = console.log, checks = {} } = {}) {
  const configured = {
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    gemini: Boolean(process.env.GEMINI_API_KEY?.trim())
  };
  log('Content provider: ' + getProvider());
  log('OpenAI key: ' + (configured.openai ? 'configured' : 'missing'));
  log('OpenAI model: ' + (process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini'));
  log('Gemini key: ' + (configured.gemini ? 'configured' : 'missing'));
  log('Gemini model: ' + getGeminiModel());
  if (!args.includes('--live')) return 0;
  const selected = args.find(arg => arg.startsWith('--provider='))?.split('=')[1] || 'all';
  if (!['all', 'openai', 'gemini'].includes(selected)) throw new Error('Use --provider=all|openai|gemini');
  const checkOpenAI = checks.openai || (async () => {
    const result = await generateJSON('Return only this JSON object: {"ok":true}');
    if (result.ok !== true) throw Object.assign(new Error('Unexpected response'), { code: 'OPENAI_INVALID_RESPONSE' });
  });
  const checkGemini = checks.gemini || checkGeminiConnection;
  let exitCode = 0;
  for (const [provider, label, check] of [['openai', 'OpenAI', checkOpenAI], ['gemini', 'Gemini', checkGemini]]) {
    if (selected !== 'all' && selected !== provider) continue;
    if (!configured[provider]) {
      log(label + ' live check: skipped (missing key)');
      if (selected !== 'all') exitCode = 1;
      continue;
    }
    try {
      await check();
      log(label + ' live check: passed');
    } catch (error) {
      log(label + ' live check: failed (' + (error.code || 'REQUEST_FAILED') + ')');
      if (hints[error.code]) log(hints[error.code]);
      exitCode = 1;
    }
  }
  if (!configured.openai && !configured.gemini) exitCode = 1;
  return exitCode;
}

if (require.main === module) runChecks().then(code => { process.exitCode = code; }).catch(() => {
  console.error('Content check failed. Kiểm tra AI_PROVIDER và --provider=all|openai|gemini.');
  process.exitCode = 1;
});
module.exports = { runChecks };
