// Database setup: Sequelize ORM on SQLite (file is created automatically).
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dir, { recursive: true });

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(dir, 'stockflow.sqlite'),
  logging: false,
});

// FR-2: Organization (tenant). One user per org in the MVP.
const Organization = sequelize.define('Organization', {
  name: { type: DataTypes.STRING, allowNull: false },
  // FR-7: global default used when a product has no threshold of its own
  defaultLowStockThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
});

const User = sequelize.define('User', {
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
});

// FR-3: Product model
const Product = sequelize.define(
  'Product',
  {
    name: { type: DataTypes.STRING, allowNull: false },
    sku: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    costPrice: { type: DataTypes.FLOAT, allowNull: true },
    sellingPrice: { type: DataTypes.FLOAT, allowNull: true },
    lowStockThreshold: { type: DataTypes.INTEGER, allowNull: true },
    lastUpdatedBy: { type: DataTypes.STRING, allowNull: true },
    lastNote: { type: DataTypes.STRING, allowNull: true },
  },
  { indexes: [{ unique: true, fields: ['OrganizationId', 'sku'] }] } // SKU unique per org
);

Organization.hasMany(User, { foreignKey: 'OrganizationId' });
User.belongsTo(Organization, { foreignKey: 'OrganizationId' });
Organization.hasMany(Product, { foreignKey: 'OrganizationId' });
Product.belongsTo(Organization, { foreignKey: 'OrganizationId' });

module.exports = { sequelize, Organization, User, Product };
