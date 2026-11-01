const fail = message => Object.assign(new Error(message), { status: 400 });
function profileFields(body) {
  const limits = { fullName: 100, phone: 20, companyName: 200, companyLogoUrl: 500, website: 255, companySize: 50, address: 2000, description: 10000 };
  const labels = { fullName: 'Họ tên', phone: 'Số điện thoại', companyName: 'Tên doanh nghiệp', companyLogoUrl: 'Liên kết logo', website: 'Website', companySize: 'Quy mô nhân sự', address: 'Địa chỉ', description: 'Giới thiệu doanh nghiệp' };
  const values = {};
  for (const [key, limit] of Object.entries(limits)) {
    if (body[key] === undefined) { values[key] = null; continue; }
    if (body[key] !== null && typeof body[key] !== 'string') throw fail('Thông tin hồ sơ phải ở dạng văn bản.');
    const value = (body[key] || '').trim();
    if (value.length > limit) throw fail(`${labels[key]} vượt quá ${limit} ký tự.`);
    if (['fullName', 'companyName'].includes(key) && !value) throw fail(key === 'fullName' ? 'Nhập họ tên người liên hệ.' : 'Nhập tên doanh nghiệp.');
    values[key] = value;
  }
  for (const key of ['website', 'companyLogoUrl']) {
    if (!values[key]) continue;
    if (key === 'companyLogoUrl' && /^\/uploads\/[\w./-]+$/.test(values[key]) && !values[key].includes('..')) continue;
    try {
      const url = new URL(values[key]);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
    } catch { throw fail(key === 'website' ? 'Website phải là địa chỉ http hoặc https hợp lệ.' : 'Liên kết logo không hợp lệ.'); }
  }
  if (values.phone && (!/^[+\d\s().-]+$/.test(values.phone) || values.phone.replace(/\D/g, '').length < 7 || values.phone.replace(/\D/g, '').length > 15)) throw fail('Số điện thoại không hợp lệ.');
  return values;
}
module.exports = { profileFields };
