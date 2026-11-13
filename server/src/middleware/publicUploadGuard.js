const path = require('path');

module.exports = (req, res, next) => {
  try {
    // Static serving decodes URLs and normalizes separators. Apply the same
    // normalization so encoded /kyc paths cannot bypass the private router.
    const decoded = decodeURIComponent(req.path).replace(/\\/g, '/');
    const normalized = path.posix.normalize('/' + decoded).replace(/^\/+/, '');
    if (normalized.split('/')[0].toLowerCase() === 'kyc' || /^cvFile-/i.test(path.posix.basename(normalized))) {
      return res.status(404).end();
    }
    next();
  } catch { res.status(400).end(); }
};
