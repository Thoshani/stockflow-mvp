# StockFlow MVP – Inventory Management System

A simple multi-tenant SaaS inventory app. Users sign up with an organization, manage products, and see a dashboard with low-stock items. Each organization only ever sees its own data.

**Live demo:** https://YOUR-APP-NAME.onrender.com
**Demo login:** `demo@stockflow.test` / `Demo@1234`

> The demo runs on a free server, so the first load can take up to a minute to wake up.

## Features
- **Auth:** sign up (email, password, organization name) and log in; JWT sessions
- **Multi-tenant:** every product query is scoped to the signed-in organization
- **Products:** add, edit, delete (with confirmation), search by name or SKU; SKU is unique per organization
- **Stock adjustment:** add or remove units with a note; records who updated last
- **Dashboard:** total products, total units on hand, and a low-stock table
- **Settings:** default low-stock threshold, used when a product has none of its own

## Tech stack
| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| Database | SQLite |
| ORM | Sequelize |
| Auth | JWT, bcryptjs |
| Frontend | React, Tailwind CSS (CDN, no build step) |

## Project structure
```
stockflow-mvp/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── data/               SQLite database file is created here
│   └── src/
│       ├── server.js       API routes, auth, tenant scoping
│       ├── db.js           Models: Organization, User, Product
│       └── seed.js         Demo account and 12 sample products
├── frontend/
│   ├── index.html
│   └── app.jsx             Login, signup, dashboard, products, settings
├── docs/schema.sql         Reference database schema
└── README.md
```

## Run locally
Requires Node.js 18 or newer (Node 22 LTS recommended).

```bash
cd backend
npm install
npm run seed     # optional: demo account and sample products
npm start
```
Open **http://localhost:5000**. Express serves both the API and the frontend.

### Run the frontend with VS Code Live Server
1. Start the backend as above and keep it running.
2. Right-click `frontend/index.html` and choose **Open with Live Server**.
3. The page connects to the backend at `http://localhost:5000` (CORS is enabled).

Do not open `index.html` by double-clicking it; use `http://`.

## Demo data
`npm run seed` creates the account above and these products:

| Name | SKU | Qty | Cost | Price | Threshold |
|---|---|---|---|---|---|
| Wireless Mouse | WM-001 | 42 | 8.50 | 19.99 | 10 |
| Mechanical Keyboard | KB-204 | 7 | 32.00 | 69.00 | 10 |
| USB-C Cable 1m | UC-100 | 150 | 1.20 | 6.99 | 25 |
| 27" Monitor | MN-270 | 3 | 120.00 | 189.00 | 5 |
| Laptop Stand | LS-310 | 18 | 9.00 | 24.50 | default |
| Webcam 1080p | WC-108 | 5 | 14.00 | 39.99 | default |
| Notebook A5 | NB-A5 | 80 | 0.90 | 3.50 | 20 |
| Gel Pen Black | GP-BLK | 4 | 0.20 | 1.25 | 30 |
| Desk Lamp LED | DL-550 | 12 | 11.00 | 29.00 | 5 |
| HDMI Cable 2m | HD-200 | 0 | 2.10 | 8.99 | 10 |
| Phone Stand | PS-020 | 60 | 1.50 | 7.50 | default |
| Power Bank 10000mAh | PB-100 | 9 | 10.00 | 25.00 | 10 |

## Deploy on Render (free)
1. Push this repo to GitHub (`backend` and `frontend` at the top level).
2. On https://render.com choose **New → Web Service** and connect the repo.
3. Settings:
   - Build command: `cd backend && npm install`
   - Start command: `cd backend && npm run seed && npm start`
   - Environment variables: `NODE_VERSION=22`, `JWT_SECRET=<long random text>`
4. Deploy, then open the URL Render gives you.

On free hosting the database file resets on restart; the start command re-seeds the demo account each time.

## API
| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/signup | Create organization and user |
| POST | /api/auth/login | Log in, returns JWT |
| GET | /api/me | Current user and organization |
| GET | /api/dashboard | Totals and low-stock list |
| GET, POST | /api/products | List (`?search=`) / create |
| PUT, DELETE | /api/products/:id | Update / delete |
| POST | /api/products/:id/adjust | Change stock by +/- N |
| GET, PUT | /api/settings | Default low-stock threshold |

## Verify tenant isolation
1. Sign up as `a@test.com` with organization "Store A" and add a product.
2. Log out and sign up as `b@test.com` with organization "Store B".
3. Store B sees no products from Store A.

## Troubleshooting
- **`npm` not recognized (Windows):** install Node.js, then restart VS Code. If PowerShell blocks scripts, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` or use Command Prompt.
- **`sqlite3` fails to install:** use Node 22 LTS and run `npm install` again.
- **"Cannot reach the server":** start the backend with `npm start` inside `backend/`.
- **Port 5000 in use:** create `backend/.env` with `PORT=5001` and open that port instead.
- **Reset data:** stop the server, delete `backend/data/stockflow.sqlite`, start again.

## Scope
Built to the 6-hour MVP PRD. Out of scope: multi-warehouse, variants, integrations, orders, purchase orders, email alerts, CSV import, external API, roles, audit logs, billing.

## Limitations
- One user per organization, no password reset, hard delete only, no stock movement history.
- JSX is compiled in the browser for a zero-setup demo; a production build would use Vite or Next.js.
- SQLite suits a demo; switch to PostgreSQL in `db.js` for production.
