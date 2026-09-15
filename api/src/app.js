import express from 'express';
import { query } from './db.js';
import { checkPassword, createToken, requireAdmin } from './auth.js';
import { notifyNewOrder } from './notify.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

/* ── tiny in-memory rate limiter ────────────────────────────────────────
   Serverless instances don't share memory, so this is a speed bump,
   not a wall. The honeypot field in POST /api/orders is the real
   anti-bot measure.                                                    */
const hits = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
    const now = Date.now();
    const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    list.push(now);
    hits.set(ip, list);
    if (hits.size > 5000) hits.clear();
    if (list.length > max) return res.status(429).json({ error: 'too_many_requests' });
    next();
  };
}

const STATUSES = new Set(['nouveau', 'confirmee', 'expediee', 'livree', 'annulee']);
const PHONE_RE = /^(?:\+213|0)[5-7]\d{8}$/;

/* ── public ─────────────────────────────────────────────────────────── */

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, service: 'bh-store-api', time: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.get('/api/wilayas', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT code, name_fr, name_ar, fee_domicile, fee_stopdesk
       FROM wilayas ORDER BY code`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

const PRODUCT_COLS = `id, slug, name_fr, name_ar, tagline_fr, tagline_ar,
                      desc_fr, desc_ar, features, images, price`;

app.get('/api/products', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${PRODUCT_COLS} FROM products WHERE active ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/products/:slug', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${PRODUCT_COLS} FROM products WHERE slug = $1 AND active`,
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: 'product_not_found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

/* ── orders ─────────────────────────────────────────────────────────── */

app.post('/api/orders', rateLimit(10, 60 * 60 * 1000), async (req, res, next) => {
  try {
    const b = req.body || {};

    // Honeypot: real users never see this field, bots fill it.
    if (b.website) return res.status(400).json({ error: 'invalid_order' });

    const name = String(b.customer_name || '').trim();
    const phone = String(b.phone || '').replace(/[\s.-]/g, '');
    const commune = String(b.commune || '').trim();
    const note = String(b.note || '').trim().slice(0, 500);
    const quantity = Number(b.quantity);
    const deliveryType = b.delivery_type;

    const bad = [];
    if (name.length < 3 || name.length > 80) bad.push('customer_name');
    if (!PHONE_RE.test(phone)) bad.push('phone');
    if (!commune || commune.length > 80) bad.push('commune');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) bad.push('quantity');
    if (deliveryType !== 'domicile' && deliveryType !== 'stopdesk') bad.push('delivery_type');
    if (bad.length) return res.status(400).json({ error: 'validation_failed', fields: bad });

    // Price and fees come from the DB — the client never dictates totals.
    const product = (await query(
      `SELECT id, name_fr, name_ar, price FROM products WHERE slug = $1 AND active`,
      [String(b.product_slug || '')]
    )).rows[0];
    if (!product) return res.status(400).json({ error: 'product_not_available' });

    const wilaya = (await query(
      `SELECT code, name_fr, name_ar, fee_domicile, fee_stopdesk
       FROM wilayas WHERE code = $1`,
      [Number(b.wilaya_code)]
    )).rows[0];
    if (!wilaya) return res.status(400).json({ error: 'wilaya_not_found' });

    const fee = deliveryType === 'domicile' ? wilaya.fee_domicile : wilaya.fee_stopdesk;
    if (fee == null) return res.status(400).json({ error: 'stopdesk_unavailable' });

    const total = product.price * quantity + fee;

    const order = (await query(
      `INSERT INTO orders
         (product_id, quantity, unit_price, customer_name, phone,
          wilaya_code, commune, delivery_type, delivery_fee, total, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, order_number, total`,
      [product.id, quantity, product.price, name, phone,
       wilaya.code, commune, deliveryType, fee, total, note || null]
    )).rows[0];

    // Telegram + email, awaited but failure-proof (see notify.js).
    await notifyNewOrder({
      ...order,
      quantity, unit_price: product.price, customer_name: name, phone,
      commune, delivery_type: deliveryType, delivery_fee: fee, note,
      product_name: `${product.name_fr} / ${product.name_ar}`,
      wilaya_code: wilaya.code, wilaya_name: `${wilaya.name_fr} / ${wilaya.name_ar}`,
    });

    res.status(201).json({
      ok: true,
      order_number: order.order_number,
      total: order.total,
      breakdown: { unit_price: product.price, quantity, delivery_fee: fee },
    });
  } catch (e) { next(e); }
});

/* ── admin ──────────────────────────────────────────────────────────── */

app.post('/api/admin/session', rateLimit(20, 60 * 60 * 1000), (req, res) => {
  if (!checkPassword(req.body?.password)) {
    return res.status(401).json({ error: 'wrong_password' });
  }
  res.json({ token: createToken() });
});

app.get('/api/admin/orders', requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 25;
    const offset = (page - 1) * limit;
    const status = STATUSES.has(req.query.status) ? req.query.status : null;
    const q = String(req.query.q || '').trim();

    const where = [];
    const params = [];
    if (status) { params.push(status); where.push(`o.status = $${params.length}`); }
    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where.push(`(o.phone ILIKE ${p} OR o.customer_name ILIKE ${p} OR o.commune ILIKE ${p} OR o.order_number ILIKE ${p})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await query(
      `SELECT o.id, o.order_number, o.status, o.source, o.created_at,
              o.quantity, o.unit_price, o.delivery_fee, o.total, o.note,
              o.customer_name, o.phone, o.commune, o.delivery_type,
              w.name_fr AS wilaya_fr, w.name_ar AS wilaya_ar,
              p.name_fr AS product_fr, p.name_ar AS product_ar
       FROM orders o
       JOIN wilayas w ON w.code = o.wilaya_code
       JOIN products p ON p.id = o.product_id
       ${whereSql}
       ORDER BY o.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    const { rows: countRows } = await query(
      `SELECT count(*)::int AS n FROM orders o ${whereSql}`, params
    );

    res.json({ page, total: countRows[0].n, orders: rows });
  } catch (e) { next(e); }
});

app.patch('/api/admin/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!STATUSES.has(status)) return res.status(400).json({ error: 'bad_status' });
    const { rows } = await query(
      `UPDATE orders SET status = $2, updated_at = now()
       WHERE id = $1 RETURNING id, order_number, status`,
      [req.params.id, status]
    );
    if (!rows[0]) return res.status(404).json({ error: 'order_not_found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

app.get('/api/admin/orders/export.csv', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT o.order_number, o.created_at, o.customer_name, o.phone,
              w.name_fr AS wilaya, o.commune, o.delivery_type,
              p.name_fr AS product, o.quantity, o.unit_price,
              o.delivery_fee, o.total, o.status, o.source, o.note
       FROM orders o
       JOIN wilayas w ON w.code = o.wilaya_code
       JOIN products p ON p.id = o.product_id
       ORDER BY o.created_at DESC`
    );
    const cols = ['order_number','created_at','customer_name','phone','wilaya','commune',
                  'delivery_type','product','quantity','unit_price','delivery_fee','total',
                  'status','source','note'];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    // \uFEFF BOM → Excel opens Arabic text correctly.
    const csv = '\uFEFF' + [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bh-orders-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (e) { next(e); }
});

app.get('/api/admin/stats', requireAdmin, async (_req, res, next) => {
  try {
    const [today, byStatus, revenue, week] = await Promise.all([
      query(`SELECT count(*)::int AS n FROM orders WHERE created_at >= date_trunc('day', now())`),
      query(`SELECT status, count(*)::int AS n FROM orders GROUP BY status`),
      query(`SELECT coalesce(sum(total),0)::int AS revenue FROM orders WHERE status = 'livree'`),
      query(`
        SELECT d::date AS day, count(o.id)::int AS n
        FROM generate_series(date_trunc('day', now()) - interval '6 days',
                             date_trunc('day', now()), interval '1 day') d
        LEFT JOIN orders o ON o.created_at >= d AND o.created_at < d + interval '1 day'
        GROUP BY d ORDER BY d`),
    ]);
    res.json({
      today: today.rows[0].n,
      by_status: Object.fromEntries(byStatus.rows.map(r => [r.status, r.n])),
      delivered_revenue: revenue.rows[0].revenue,
      last_7_days: week.rows.map(r => ({ day: r.day, orders: r.n })),
    });
  } catch (e) { next(e); }
});

/* ── fallbacks ──────────────────────────────────────────────────────── */

app.use((req, res) => res.status(404).json({ error: 'not_found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

export default app;