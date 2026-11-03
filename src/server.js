require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op, fn, col, where } = require('sequelize');
const { sequelize, Organization, User, Product } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PORT = process.env.PORT || 5000;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const app = express();
app.use(cors()); // lets the frontend run from VS Code Live Server (another port)
app.use(express.json());

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const fail = (res, msg, code = 400) => res.status(code).json({ error: msg });
const sign = (u) => jwt.sign({ uid: u.id, oid: u.OrganizationId }, JWT_SECRET, { expiresIn: '7d' });
const orgOut = (o) => ({ id: o.id, name: o.name, defaultLowStockThreshold: o.defaultLowStockThreshold });

// ---- auth middleware: every protected route knows the caller's organization ----
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return fail(res, 'Please log in.', 401);
  try {
    const p = jwt.verify(token, JWT_SECRET);
    req.uid = p.uid;
    req.oid = p.oid; // organization id: used in EVERY product query (tenant isolation)
    next();
  } catch (e) {
    fail(res, 'Session expired. Please log in again.', 401);
  }
}

// ---------------- FR-1 / FR-2: signup & login ----------------
app.post('/api/auth/signup', wrap(async (req, res) => {
  const { organizationName, email, password } = req.body || {};
  const orgName = String(organizationName || '').trim();
  const em = String(email || '').trim().toLowerCase();
  if (!orgName) return fail(res, 'Enter an organization name.');
  if (!EMAIL_RE.test(em)) return fail(res, 'Enter a valid email address.');
  if (String(password || '').length < 8) return fail(res, 'Use a password with at least 8 characters.');
  if (await User.findOne({ where: { email: em } })) return fail(res, 'An account with this email already exists.', 409);

  const t = await sequelize.transaction();
  try {
    const org = await Organization.create({ name: orgName }, { transaction: t });
    const user = await User.create(
      { email: em, passwordHash: await bcrypt.hash(String(password), 10), OrganizationId: org.id },
      { transaction: t }
    );
    await t.commit();
    res.status(201).json({ token: sign(user), user: { id: user.id, email: user.email }, organization: orgOut(org) });
  } catch (e) {
    await t.rollback();
    throw e;
  }
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const em = String(req.body?.email || '').trim().toLowerCase();
  const pw = String(req.body?.password || '');
  if (!em || !pw) return fail(res, 'Enter your email and password.');
  const user = await User.findOne({ where: { email: em } });
  if (!user || !(await bcrypt.compare(pw, user.passwordHash))) return fail(res, 'Email or password is incorrect.', 401);
  const org = await Organization.findByPk(user.OrganizationId);
  res.json({ token: sign(user), user: { id: user.id, email: user.email }, organization: orgOut(org) });
}));

app.get('/api/me', auth, wrap(async (req, res) => {
  const user = await User.findByPk(req.uid);
  const org = await Organization.findByPk(req.oid);
  if (!user || !org) return fail(res, 'Account not found.', 401);
  res.json({ user: { id: user.id, email: user.email }, organization: orgOut(org) });
}));

// ---------------- helpers for products ----------------
const effectiveThreshold = (p, org) => (p.lowStockThreshold ?? org.defaultLowStockThreshold);
const productOut = (p, org) => ({
  id: p.id, name: p.name, sku: p.sku, description: p.description || '', quantity: p.quantity,
  costPrice: p.costPrice, sellingPrice: p.sellingPrice, lowStockThreshold: p.lowStockThreshold,
  effectiveThreshold: effectiveThreshold(p, org), isLowStock: p.quantity <= effectiveThreshold(p, org),
  lastUpdatedBy: p.lastUpdatedBy, createdAt: p.createdAt, updatedAt: p.updatedAt,
});

function parseProduct(b = {}) {
  const name = String(b.name ?? '').trim();
  const sku = String(b.sku ?? '').trim();
  if (!name) return { error: 'Enter a product name.' };
  if (!sku) return { error: 'Enter a SKU.' };
  const opt = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : Number(v));
  const quantity = b.quantity === undefined || String(b.quantity).trim() === '' ? 0 : Number(b.quantity);
  const costPrice = opt(b.costPrice), sellingPrice = opt(b.sellingPrice), lowStockThreshold = opt(b.lowStockThreshold);
  if (!Number.isInteger(quantity) || quantity < 0) return { error: 'Quantity must be a whole number, 0 or more.' };
  for (const [v, label] of [[costPrice, 'Cost price'], [sellingPrice, 'Selling price']])
    if (v !== null && (Number.isNaN(v) || v < 0)) return { error: `${label} must be a number, 0 or more.` };
  if (lowStockThreshold !== null && (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0))
    return { error: 'Low stock threshold must be a whole number, 0 or more.' };
  return { data: { name, sku, description: String(b.description ?? '').trim() || null, quantity, costPrice, sellingPrice, lowStockThreshold } };
}

const skuTaken = async (oid, sku, exceptId) => {
  const rows = await Product.findAll({ where: { OrganizationId: oid, [Op.and]: [where(fn('lower', col('sku')), sku.toLowerCase())] } });
  return rows.some((r) => r.id !== exceptId);
};

// ---------------- FR-4 / FR-5: product CRUD + stock adjust ----------------
app.get('/api/products', auth, wrap(async (req, res) => {
  const org = await Organization.findByPk(req.oid);
  const q = String(req.query.search || '').trim();
  const cond = { OrganizationId: req.oid };
  if (q) cond[Op.or] = [{ name: { [Op.like]: `%${q}%` } }, { sku: { [Op.like]: `%${q}%` } }];
  const rows = await Product.findAll({ where: cond, order: [['name', 'ASC']] });
  res.json(rows.map((p) => productOut(p, org)));
}));

app.post('/api/products', auth, wrap(async (req, res) => {
  const { data, error } = parseProduct(req.body);
  if (error) return fail(res, error);
  if (await skuTaken(req.oid, data.sku)) return fail(res, 'Another product already uses this SKU.', 409);
  const user = await User.findByPk(req.uid);
  const org = await Organization.findByPk(req.oid);
  const p = await Product.create({ ...data, OrganizationId: req.oid, lastUpdatedBy: user.email });
  res.status(201).json(productOut(p, org));
}));

app.put('/api/products/:id', auth, wrap(async (req, res) => {
  const p = await Product.findOne({ where: { id: req.params.id, OrganizationId: req.oid } });
  if (!p) return fail(res, 'Product not found.', 404);
  const { data, error } = parseProduct(req.body);
  if (error) return fail(res, error);
  if (await skuTaken(req.oid, data.sku, p.id)) return fail(res, 'Another product already uses this SKU.', 409);
  const user = await User.findByPk(req.uid);
  const org = await Organization.findByPk(req.oid);
  await p.update({ ...data, lastUpdatedBy: user.email });
  res.json(productOut(p, org));
}));

app.delete('/api/products/:id', auth, wrap(async (req, res) => {
  const n = await Product.destroy({ where: { id: req.params.id, OrganizationId: req.oid } });
  if (!n) return fail(res, 'Product not found.', 404);
  res.json({ ok: true });
}));

app.post('/api/products/:id/adjust', auth, wrap(async (req, res) => {
  const p = await Product.findOne({ where: { id: req.params.id, OrganizationId: req.oid } });
  if (!p) return fail(res, 'Product not found.', 404);
  const delta = Number(req.body?.delta);
  if (!Number.isInteger(delta) || delta === 0) return fail(res, 'Enter a whole number such as 10 or -3.');
  if (p.quantity + delta < 0) return fail(res, `Stock can't go below zero. You have ${p.quantity} units.`);
  const user = await User.findByPk(req.uid);
  const org = await Organization.findByPk(req.oid);
  await p.update({ quantity: p.quantity + delta, lastUpdatedBy: user.email, lastNote: String(req.body?.note || '').trim() || null });
  res.json(productOut(p, org));
}));

// ---------------- FR-6: dashboard ----------------
app.get('/api/dashboard', auth, wrap(async (req, res) => {
  const org = await Organization.findByPk(req.oid);
  const rows = await Product.findAll({ where: { OrganizationId: req.oid } });
  const all = rows.map((p) => productOut(p, org));
  res.json({
    totalProducts: all.length,
    totalUnits: all.reduce((s, p) => s + p.quantity, 0),
    lowStock: all.filter((p) => p.isLowStock).sort((a, b) => a.quantity - b.quantity),
  });
}));

// ---------------- FR-7: settings ----------------
app.get('/api/settings', auth, wrap(async (req, res) => {
  res.json({ defaultLowStockThreshold: (await Organization.findByPk(req.oid)).defaultLowStockThreshold });
}));
app.put('/api/settings', auth, wrap(async (req, res) => {
  const n = Number(req.body?.defaultLowStockThreshold);
  if (!Number.isInteger(n) || n < 0) return fail(res, 'Enter a whole number, 0 or more.');
  const org = await Organization.findByPk(req.oid);
  await org.update({ defaultLowStockThreshold: n });
  res.json({ defaultLowStockThreshold: n });
}));

// Serve the frontend too, so http://localhost:5000 works with no extra step.
   app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api', (req, res) => fail(res, 'Not found.', 404));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`StockFlow running:  http://localhost:${PORT}`);
    console.log('Tip: run "npm run seed" once to load a demo account with sample products.');
  });
});
