-- Reference schema (Sequelize creates these tables automatically on first run).
CREATE TABLE Organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  defaultLowStockThreshold INTEGER NOT NULL DEFAULT 5,
  createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL
);
CREATE TABLE Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  OrganizationId INTEGER REFERENCES Organizations(id),
  createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL
);
CREATE TABLE Products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  OrganizationId INTEGER NOT NULL REFERENCES Organizations(id),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  costPrice FLOAT, sellingPrice FLOAT,
  lowStockThreshold INTEGER,
  lastUpdatedBy VARCHAR(255), lastNote VARCHAR(255),
  createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL
);
CREATE UNIQUE INDEX products_org_sku ON Products (OrganizationId, sku);
