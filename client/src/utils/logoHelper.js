// Danh sách bộ màu gradient đa dạng cho avatar/logo tự động
const BRAND_PALETTES = [
  ['#0A66C2', '#004182'], // LinkedIn Blue
  ['#059669', '#047857'], // Emerald Green
  ['#4F46E5', '#312E81'], // Royal Indigo
  ['#EA580C', '#C2410C'], // Vibrant Orange
  ['#E11D48', '#9F1239'], // Crimson Rose
  ['#0284C7', '#0369A1'], // Sky Blue
  ['#7C3AED', '#5B21B6'], // Deep Purple
  ['#D97706', '#B45309'], // Warm Amber
  ['#0D9488', '#115E59'], // Teal
  ['#DB2777', '#9D174D'], // Magenta Pink
  ['#2563EB', '#1E40AF'], // Cobalt Blue
  ['#1E293B', '#0F172A'], // Slate Dark
];

// Ánh xạ tên doanh nghiệp sang bộ logo SVG chuẩn đã thiết kế sẵn
const COMPANY_LOGO_MAP = [
  { keywords: ['fpt software đà nẵng', 'fpt software da nang', 'fpt complex'], logo: '/logos/fpt-danang.svg' },
  { keywords: ['fpt software', 'fpt'], logo: '/logos/fpt-software.svg' },
  { keywords: ['viettel'], logo: '/logos/viettel.svg' },
  { keywords: ['vinai', 'vingroup'], logo: '/logos/vinai.svg' },
  { keywords: ['one mount', 'onemount'], logo: '/logos/onemount.svg' },
  { keywords: ['giao hàng tiết kiệm', 'ghtk'], logo: '/logos/ghtk.svg' },
  { keywords: ['vng'], logo: '/logos/vng.svg' },
  { keywords: ['shopee', 'sea group'], logo: '/logos/shopee.svg' },
  { keywords: ['momo', 'm-service'], logo: '/logos/momo.svg' },
  { keywords: ['chợ tốt', 'cho tot', 'carousell'], logo: '/logos/chotot.svg' },
  { keywords: ['kms technology', 'kms'], logo: '/logos/kms.svg' },
  { keywords: ['bap it', 'bap software', 'bap'], logo: '/logos/bap.svg' },
  { keywords: ['enclave'], logo: '/logos/enclave.svg' },
];

// Các URL ảnh mẫu Unsplash cũ cần được thay thế bằng logo thương hiệu đa dạng
const LEGACY_UNSPLASH_PATTERNS = [
  'photo-1549923746-c502d488b3ea',
  'photo-1516321318423-f06f85e504b3',
  'photo-1507679799987-c73779587ccf',
  'photo-1486406146926-c627a92ad1ab',
  'photo-1526374965328-7f61d4dc18c5',
  'photo-1551434678-e076c223a692',
  'photo-1556742049-0a67e5572293',
  'photo-1559526324-4b87b5e36e44',
  'photo-1560179707-f14e90ef3623',
  'photo-1572021335469-31706a17aaef',
  'photo-1570126128802-99f57d6067b5',
  'photo-1542744173-8e7e53415bb0',
];

function hashString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function extractInitials(name = 'JT', maxChars = 3) {
  const cleaned = String(name || 'Jobtimize')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-zA-ZÀ-ỹ0-9\s]/g, ' ')
    .trim();

  if (!cleaned) return 'JT';

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, maxChars).toUpperCase();
  }

  // Nếu từ đầu tiên đã viết hoa toàn bộ và ngắn (VD: FPT, VNG, KMS, BAP)
  if (words[0].length >= 2 && words[0].length <= 4 && words[0] === words[0].toUpperCase()) {
    return words[0];
  }

  return words
    .slice(0, maxChars)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

/**
 * Tạo SVG Data URI sắc nét theo tên công ty hoặc người dùng (không bao giờ lỗi mạng)
 */
export function generateAvatarSvgDataUri(name = 'Jobtimize', rounded = false) {
  const safeName = String(name || 'Jobtimize').trim();
  const initials = extractInitials(safeName, rounded ? 2 : 3);
  const paletteIdx = hashString(safeName) % BRAND_PALETTES.length;
  const [colorStart, colorEnd] = BRAND_PALETTES[paletteIdx];
  const rx = rounded ? 60 : 26;
  const fontSize = initials.length >= 3 ? 32 : 38;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 120 120" fill="none">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop stop-color="${colorStart}"/>
        <stop offset="1" stop-color="${colorEnd}"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="${rx}" fill="url(#g)"/>
    <circle cx="96" cy="24" r="28" fill="#FFFFFF" fill-opacity="0.12"/>
    <text x="60" y="62" dominant-baseline="central" text-anchor="middle" font-family="'Be Vietnam Pro', Inter, Arial, sans-serif" font-weight="800" font-size="${fontSize}" fill="#FFFFFF" letter-spacing="1">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Lấy đường dẫn logo công ty đa dạng & ổn định
 */
export function getCompanyLogo(logoUrl, companyName = '') {
  const lowerName = String(companyName || '').toLowerCase().trim();

  // Kiểm tra nếu logoUrl hiện tại là trống hoặc là link Unsplash mẫu cũ
  const isLegacyOrEmpty =
    !logoUrl ||
    typeof logoUrl !== 'string' ||
    !logoUrl.trim() ||
    LEGACY_UNSPLASH_PATTERNS.some((pattern) => logoUrl.includes(pattern));

  if (!isLegacyOrEmpty) {
    return logoUrl;
  }

  // Tìm trong danh sách logo thương hiệu thiết kế riêng
  for (const item of COMPANY_LOGO_MAP) {
    if (item.keywords.some((kw) => lowerName.includes(kw))) {
      return item.logo;
    }
  }

  // Tạo SVG tự động đa dạng màu sắc theo tên công ty
  return generateAvatarSvgDataUri(companyName || 'Company', false);
}

/**
 * Xử lý sự kiện onError cho thẻ <img> hiển thị logo công ty
 */
export function handleCompanyLogoError(e, companyName = 'Company') {
  if (!e || !e.currentTarget) return;
  e.currentTarget.onerror = null;
  e.currentTarget.src = generateAvatarSvgDataUri(companyName || 'Company', false);
}

/**
 * Lấy avatar cho User (Hỗ trợ cả Candidate, Employer và Admin)
 */
export function getUserAvatar(userOrUrl, fallbackName = 'User', role = '', companyName = '') {
  if (userOrUrl && typeof userOrUrl === 'object') {
    const u = userOrUrl;
    const name = u.profile?.CompanyName || u.fullName || u.FullName || fallbackName;
    const userRole = u.role || u.RoleName || role;
    const rawAvatar = u.avatarUrl || u.AvatarUrl;
    const empLogo = u.profile?.CompanyLogoUrl || u.CompanyLogoUrl;

    if (userRole === 'Employer') {
      if (rawAvatar && !LEGACY_UNSPLASH_PATTERNS.some((p) => rawAvatar.includes(p))) {
        return rawAvatar;
      }
      return getCompanyLogo(empLogo, name);
    }

    if (rawAvatar) return rawAvatar;
    return generateAvatarSvgDataUri(name, true);
  }

  const url = typeof userOrUrl === 'string' ? userOrUrl.trim() : '';
  if (role === 'Employer') {
    return getCompanyLogo(url, companyName || fallbackName);
  }
  if (url && !LEGACY_UNSPLASH_PATTERNS.some((p) => url.includes(p))) {
    return url;
  }
  return generateAvatarSvgDataUri(fallbackName || 'User', true);
}

/**
 * Xử lý sự kiện onError cho thẻ <img> hiển thị Avatar người dùng
 */
export function handleUserAvatarError(e, fullName = 'User') {
  if (!e || !e.currentTarget) return;
  e.currentTarget.onerror = null;
  e.currentTarget.src = generateAvatarSvgDataUri(fullName || 'User', true);
}

