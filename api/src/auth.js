import crypto from 'node:crypto';

// Stateless signed token: "<expiryMs>.<hmac(expiryMs)>".
// Key is derived from ADMIN_PASSWORD, so rotating the password
// automatically invalidates every existing session. TTL: 12h.
const TTL_MS = 12 * 60 * 60 * 1000;

const sha256 = (s) => crypto.createHash('sha256').update(s).digest();
const hmac = (payload) =>
  crypto.createHmac('sha256', sha256(process.env.ADMIN_PASSWORD || '')).update(payload).digest('hex');

export function createToken() {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${hmac(exp)}`;
}

export function verifyToken(token) {
  if (!process.env.ADMIN_PASSWORD) return false;
  if (typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(hmac(exp), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function checkPassword(candidate) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const a = sha256(String(candidate ?? ''));
  const b = sha256(process.env.ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}