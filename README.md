# PLM Control — Engineering Changes Executed with Control

> A full-stack **Product Lifecycle Management (PLM)** system built for the Hackathon, enabling structured management of products, Bills of Materials (BoMs), and Engineering Change Orders (ECOs) with a complete approval workflow, audit trail, and analytics.

---

## 🚀 Live Demo

| Service | URL |
|---|---|
| Frontend | https://plm-engineering-changes-executed-wi.vercel.app |
| Backend API | Deployed on Render (PostgreSQL via cloud DB) |

---

## ✨ Features

### 🔐 Authentication & Role-Based Access Control
- JWT-based authentication with secure login/signup
- 4 distinct roles with different permissions:
  | Role | Permissions |
  |---|---|
  | **Admin** | Full access — manage stages, view audit log, approve ECOs |
  | **Engineering User** | Create & manage Products, BoMs, ECOs; propose changes |
  | **Approver** | Review and approve/reject ECOs in the workflow stages |
  | **Operations User** | Read-only access to Products and BoMs |
- Per-tab session isolation using `sessionStorage` (multiple users can be logged in simultaneously across tabs)

### 📦 Products Management
- Create, view, and archive products with version tracking
- Each product stores: name, category, sale price, cost price, attachment, status, version
- Full version history — every change is recorded with timestamps
- Role-gated create/edit (Engineering + Admin only)

### 🗂️ Bills of Materials (BoM)
- Create and manage BoMs linked to products
- Nested **components** (parts list with quantities and units)
- Nested **operations** (manufacturing steps with time and work center)
- BoM versioning — archived on ECO application, new version created automatically

### 📋 Engineering Change Orders (ECO)
- Two ECO types: **BoM Change** and **Product Change**
- Full draft system — propose component/operation/product changes before submitting
- **Stage Pipeline** — configurable multi-stage approval workflow
- Visual diff view showing Added / Modified / Removed changes with color-coded rows
- Approve and Validate actions with role-gating
- Automatic versioning on ECO application (archives old version, creates new one)

### 📊 Reports & Analytics
Five built-in report tabs:
- **ECO Report** — all ECOs with status, stage, dates; inline diff modal; PDF & CSV export
- **Product History** — version history across all products
- **BoM History** — BoM versioning trail
- **Archived Products** — products retired by ECO application
- **Active Matrix** — products paired with their current active BoM

### 🔒 Audit Log
- Immutable system-wide event log for every action
- Filterable by record type (Product / BoM / ECO / Stage) and entry count
- Columns: Time · Action badge · Record · Description · User+Role · Old → New value
- Inline ECO audit timeline inside ECO detail view (last 20 actions)

### ⚙️ Settings (Admin only)
- Configure ECO workflow stages: name, order, approval requirement, final flag
- Live preview of the stage pipeline as you edit
- Add / inline-edit / delete stages with safety confirmations

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **PostgreSQL** | Relational database |
| **pg** | Database driver with connection pooling |
| **jsonwebtoken** | JWT authentication |
| **bcryptjs** | Password hashing |
| **helmet** | Security headers |
| **cors** | Cross-origin resource sharing |
| **morgan** | HTTP request logging |
| **nodemon** | Development auto-restart |

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI library |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **React Router v6** | Client-side routing |
| **Axios** | HTTP client with JWT interceptors |
| **Lucide React** | Icon library |
| **react-hot-toast** | Toast notifications |
| **jsPDF + autotable** | PDF report generation |
| **PapaParse** | CSV export |

---

## 📁 Project Structure

```
PLM_System/
├── backend/
│   ├── server.js                  # Entry point
│   ├── src/
│   │   ├── app.js                 # Express app, middleware, routes
│   │   ├── config/
│   │   │   └── db.js              # PostgreSQL pool (supports DATABASE_URL for cloud)
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification
│   │   │   └── rbac.js            # Role-based access control
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── products.controller.js
│   │   │   ├── boms.controller.js
│   │   │   ├── ecos.controller.js
│   │   │   ├── stages.controller.js
│   │   │   └── reports.controller.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── products.routes.js
│   │   │   ├── boms.routes.js
│   │   │   ├── ecos.routes.js
│   │   │   ├── stages.routes.js
│   │   │   ├── reports.routes.js
│   │   │   └── audit.routes.js
│   │   └── utils/
│   │       └── auditLogger.js     # Centralized audit trail writer
│   └── sql/
│       ├── schema.sql             # Full DB schema (12 tables)
│       └── seed.sql               # Demo data (users, products, BoMs, ECOs)
│
└── frontend/
    └── src/
        ├── api/axios.js           # Axios instance with JWT interceptor
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── layout/            # AppLayout, Sidebar, ProtectedRoute
        │   └── ui/                # StagePipeline, DiffTable, EcoAuditTimeline
        ├── pages/
        │   ├── auth/              # Login, Signup
        │   ├── Dashboard.jsx
        │   ├── products/          # ProductsList, ProductDetail
        │   ├── boms/              # BomsList, BomDetail
        │   ├── ecos/              # EcosList, EcoDetail, EcoDiff
        │   ├── reports/           # Reports (5 tabs + export)
        │   ├── settings/          # Settings (admin stage management)
        │   └── audit/             # AuditLog
        └── utils/
            ├── exportPDF.js       # jsPDF branded export
            └── exportCSV.js       # PapaParse CSV export
```

---

## ⚡ Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone the repo
```bash
git clone https://github.com/shreyraveshia/PLM---Engineering-Changes-Executed-with-Control_Shrey_Hackathon.git
cd PLM---Engineering-Changes-Executed-with-Control_Shrey_Hackathon
```

### 2. Setup the database
```sql
-- In psql, create the database then run:
\i backend/sql/schema.sql
\i backend/sql/seed.sql
```

### 3. Configure backend environment
Create `backend/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=plm_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

### 4. Start backend
```bash
cd backend
npm install
npm run dev
# → Server running at http://localhost:5000
```

### 5. Start frontend
```bash
cd frontend
npm install
npm run dev
# → App running at http://localhost:5173
```

---

## 🌐 Production Deployment

### Backend (Render)
Set the following environment variables on Render:
```
DATABASE_URL=<your_postgres_connection_string>
JWT_SECRET=<strong_secret>
NODE_ENV=production
```
The `db.js` automatically uses `DATABASE_URL` with SSL when present.

### Frontend (Vercel)
Set:
```
VITE_API_URL=https://your-render-backend.onrender.com/api
```
The Vite proxy is bypassed in production; Axios uses `VITE_API_URL` directly.

---

## 🔑 Demo Accounts (from seed data)

| Role | Email | Password |
|---|---|---|
| Admin | admin@plm.com | admin123 |
| Engineering User | engineer@plm.com | engineer123 |
| Approver | approver@plm.com | approver123 |
| Operations User | carol@plm.com | carol123 |

---

## 🗄️ Database Schema (Key Tables)

```
users            → auth + roles
products         → product catalogue with versioning
product_history  → immutable version trail
boms             → bill of materials header
bom_components   → parts with quantities
bom_operations   → manufacturing steps
ecos             → engineering change orders
eco_draft_*      → proposed changes before approval
eco_approvals    → approval records per stage
stages           → configurable workflow stages
audit_log        → immutable system event log
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/signup` | Register |
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| GET | `/api/boms` | List BoMs |
| POST | `/api/boms` | Create BoM |
| GET | `/api/ecos` | List ECOs |
| POST | `/api/ecos` | Create ECO |
| PUT | `/api/ecos/:id/draft-bom` | Save draft changes |
| POST | `/api/ecos/:id/approve` | Approve ECO |
| POST | `/api/ecos/:id/validate` | Validate & advance stage |
| GET | `/api/ecos/:id/diff` | Get proposed diff |
| GET | `/api/reports/ecos` | ECO report |
| GET | `/api/audit` | Audit log |
| GET | `/api/stages` | List workflow stages |

---

## 👨‍💻 Author

**Shrey Raveshia** — Hackathon Project  
GitHub: [@shreyraveshia](https://github.com/shreyraveshia)

---

*Built with ❤️ for engineering excellence and change control.*
