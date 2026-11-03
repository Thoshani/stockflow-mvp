// Loads a demo account + sample products. Safe to run more than once.
const bcrypt = require('bcryptjs');
const { sequelize, Organization, User, Product } = require('./db');

const DEMO = { email: 'demo@stockflow.test', password: 'Demo@1234', org: 'Demo Store' };
const PRODUCTS = [
  ['Wireless Mouse', 'WM-001', 42, 8.5, 19.99, 10, 'Compact 2.4 GHz wireless mouse'],
  ['Mechanical Keyboard', 'KB-204', 7, 32, 69.0, 10, 'Blue-switch full-size keyboard'],
  ['USB-C Cable 1m', 'UC-100', 150, 1.2, 6.99, 25, 'Braided fast-charge cable'],
  ['27" Monitor', 'MN-270', 3, 120, 189.0, 5, '1080p IPS monitor'],
  ['Laptop Stand', 'LS-310', 18, 9, 24.5, null, 'Adjustable aluminium stand'],
  ['Webcam 1080p', 'WC-108', 5, 14, 39.99, null, 'USB webcam with microphone'],
  ['Notebook A5', 'NB-A5', 80, 0.9, 3.5, 20, 'Ruled 120-page notebook'],
  ['Gel Pen Black', 'GP-BLK', 4, 0.2, 1.25, 30, 'Pack of 10 gel pens'],
  ['Desk Lamp LED', 'DL-550', 12, 11, 29.0, 5, 'Dimmable LED desk lamp'],
  ['HDMI Cable 2m', 'HD-200', 0, 2.1, 8.99, 10, 'High-speed HDMI 2.0'],
  ['Phone Stand', 'PS-020', 60, 1.5, 7.5, null, 'Foldable phone holder'],
  ['Power Bank 10000mAh', 'PB-100', 9, 10, 25.0, 10, 'Dual-port fast-charge power bank'],
];

(async () => {
  await sequelize.sync();
  let user = await User.findOne({ where: { email: DEMO.email } });
  let org;
  if (!user) {
    org = await Organization.create({ name: DEMO.org });
    user = await User.create({ email: DEMO.email, passwordHash: await bcrypt.hash(DEMO.password, 10), OrganizationId: org.id });
  } else org = await Organization.findByPk(user.OrganizationId);

  let added = 0;
  for (const [name, sku, quantity, costPrice, sellingPrice, lowStockThreshold, description] of PRODUCTS) {
    const [, created] = await Product.findOrCreate({
      where: { OrganizationId: org.id, sku },
      defaults: { name, quantity, costPrice, sellingPrice, lowStockThreshold, description, lastUpdatedBy: DEMO.email },
    });
    if (created) added++;
  }
  console.log(`Seed done. Added ${added} product(s).`);
  console.log(`Log in with  ${DEMO.email}  /  ${DEMO.password}`);
  process.exit(0);
})();
