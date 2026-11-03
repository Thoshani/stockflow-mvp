# StockFlow MVP – SaaS Inventory Management System

A multi-tenant inventory app built from the "Phase 1 – 6-Hour MVP PRD".
Users sign up with an organization, manage products, and see a dashboard with low-stock items.
Each organization only ever sees its own data.

## Tech stack (as suggested in the PRD)
| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | SQLite (file-based, zero setup) |
| ORM | Sequelize |
| Auth | JWT + bcrypt-compatible hashing (`bcryptjs`) |
| Frontend | React SPA + Tailwind CSS (loaded from CDN, no build step) |

## Folder structure
```
stockflow-mvp/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── data/                  <- SQLite database file is created here
│   └── src/
│       ├── server.js          <- API routes, auth, tenant scoping
│       ├── db.js              <- Sequelize models (Organization, User, Product)
│       └── seed.js            <- demo account + 12 sample products
├── frontend/
│   ├── index.html
│   └── app.jsx                <- all pages (login, signup, dashboard, products, settings)
├── docs/schema.sql            <- reference database schema
└── README.md
```

## Requirements
- Node.js 18 or newer (check with `node -v`) – https://nodejs.org
- Internet connection (for `npm install` and the React/Tailwind CDN scripts)

## Run it (Method 1 – one command, recommended)
```bash
cd backend
npm install
npm run seed      # optional: loads the demo account and sample products
npm start
```
Open **http://localhost:5000** – Express serves both the API and the frontend.

## Run it (Method 2 – VS Code Live Server)
1. Start the backend as above (`npm install`, then `npm start`) and keep it running.
2. In VS Code install the **Live Server** extension.
3. Right-click `frontend/index.html` → **Open with Live Server**
   (opens at http://127.0.0.1:5500/frontend/index.html or similar).
4. The frontend automatically talks to the backend at http://localhost:5000 (CORS is enabled).

> Do not open `index.html` by double-clicking it (`file://`); the browser blocks the script. Use Method 1 or 2.

## Demo login (after `npm run seed`)
- Email: `demo@stockflow.test`
- Password: `Demo@1234`

Or just sign up with your own email and organization name.

## Sample products to add manually (to test the app)
| Name | SKU | Qty | Cost | Selling | Low-stock threshold |
|---|---|---|---|---|---|
| Wireless Mouse | WM-001 | 42 | 8.50 | 19.99 | 10 |
| Mechanical Keyboard | KB-204 | 7 | 32.00 | 69.00 | 10 |
| USB-C Cable 1m | UC-100 | 150 | 1.20 | 6.99 | 25 |
| 27" Monitor | MN-270 | 3 | 120.00 | 189.00 | 5 |
| Laptop Stand | LS-310 | 18 | 9.00 | 24.50 | (blank = default 5) |
| Gel Pen Black | GP-BLK | 4 | 0.20 | 1.25 | 30 |

Keyboard, monitor and pens are at or below their thresholds, so they show up under **Low stock items** on the dashboard.

## PRD feature checklist
| PRD item | Where |
|---|---|
| FR-1 Signup/login with email, password, organization name | `AuthPage` in `app.jsx`; `/api/auth/*` in `server.js` |
| FR-2 Organization per signup, all data scoped by org | `Organization` model; every product query filters by `OrganizationId` from the JWT |
| FR-3 Product model (name, SKU unique per org, qty, prices, threshold, timestamps) | `db.js` |
| FR-4 Product CRUD, search by name/SKU, confirm before delete | Products page; `/api/products` |
| FR-5 Stock updates via edit form and +/- adjust with note; last updated by | Adjust dialog; `/api/products/:id/adjust` |
| FR-6 Dashboard: total products, total units, low-stock table | Dashboard page; `/api/dashboard` |
| FR-7 Settings: default low-stock threshold | Settings page; `/api/settings` |
| Out of scope (not built) | multi-warehouse, variants, integrations, orders, POs, emails, CSV import, external API, roles, audit logs, billing |

## API summary
| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/signup | create org + user |
| POST | /api/auth/login | log in, returns JWT |
| GET | /api/me | current user and org |
| GET | /api/dashboard | totals + low-stock list |
| GET/POST | /api/products | list (with `?search=`) / create |
| PUT/DELETE | /api/products/:id | update / delete |
| POST | /api/products/:id/adjust | change stock by +/- N |
| GET/PUT | /api/settings | default low-stock threshold |

## Check tenant isolation (success criterion)
1. Sign up as `a@test.com` with org "Store A" and add a product.
2. Log out, sign up as `b@test.com` with org "Store B".
3. Store B's product list and dashboard are empty – Store A's data is never visible.

## Reset the database
Stop the server, delete `backend/data/stockflow.sqlite`, then start again (and `npm run seed` if you want the demo data).

## Troubleshooting
- **`npm install` fails on `sqlite3`**: use Node 18 or 20 LTS and run `npm install` again with internet on. On Windows, if it still fails, install "Desktop development with C++" from Visual Studio Build Tools.
- **"Cannot reach the server"**: the backend isn't running. Run `npm start` in `backend/`.
- **Port 5000 in use** (common on macOS): create `backend/.env` with `PORT=5001`, and use http://localhost:5001. If you use Live Server, change the `API` line at the top of `frontend/app.jsx` to `http://localhost:5001`.
- **Blank page**: open it through `http://` (Method 1 or 2), not `file://`, and check the browser console.

## Push to GitHub / GitLab
```bash
cd stockflow-mvp
git init
git add .
git commit -m "StockFlow MVP: inventory management app"
git branch -M main
git remote add origin https://github.com/<your-username>/stockflow-mvp.git
git push -u origin main
```

## Known MVP limitations
- Single user per organization, no password reset, no roles (per PRD).
- Hard delete, no stock movement history (per PRD).
- Frontend compiles JSX in the browser for zero-setup demo; a production build would use Vite or Next.js.
- SQLite suits the demo; swap to PostgreSQL by changing the Sequelize connection in `db.js`.
