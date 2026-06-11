# 🎬 Reels in 360 — Production CRM & Operations Platform

Reels in 360 is a high-fidelity, professional Customer Relationship Management (CRM) and operations pipeline built for creative production studios. It facilitates end-to-end management of clients, lead pipelines, shooting schedules, editing stages, and automated client delivery (including professional invoice generation and high-fidelity PDF exports).

---

## 🚀 Key Features

* **Pipeline Dashboard:** High-level analytics of shoots, pending edits, monthly revenue, outstanding payments, and editor performance.
* **Lead Management:** Dynamic pipeline to track clients from initial contact to closed-won deals.
* **Shooter Operations:** Schedule camera crews, track locations, and coordinate shoot logistics.
* **Editing Pipeline:** Manage editor tasks, tracking rough cuts, client review feedback, and final edits.
* **Client Delivery & Invoice Generation:** Secure delivery system offering polished invoice previewing and optimized PDF/print exports.
* **Advanced Print/PDF Optimization:**
  * Auto-suppressed browser headers/footers (dates and URLs) using margin-zero page CSS.
  * Selection-clearing properties to prevent highlighted text from printing as dark blocks.
  * Precise logo size scaling preventing aspect-ratio distortion or cropping.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express, Cors, Helmet, express-rate-limit, Nodemailer.
* **Database:** `sql.js` (WebAssembly version of SQLite) with automatic periodic and shutdown persistence to `data/reelsin360.db`.
* **Frontend:** Vanilla HTML5 Single-Page Application (SPA), CSS3 variable-driven design, Modular ES Javascript.

---

## 📋 Prerequisites

Ensure you have **Node.js** (v16.x or newer) installed.

---

## 🔧 Installation & Setup

1. **Clone the repository** and navigate to the root directory:
   ```bash
   cd reelsin360
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (or modify the existing one):
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=super-secret-jwt-key
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your-smtp-user
   SMTP_PASS=your-smtp-password
   EMAIL_FROM=contact@reels360.in
   ```

4. **Seed the Database**:
   Populate the SQLite database with mock operational data and administrative accounts:
   ```bash
   npm run seed
   ```

---

## 🔑 Default Login Credentials

After seeding the database, the following accounts are created for testing and role-specific operations:

| Name | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin@reelsin360.com` | `admin123` |
| **Sales Team** | `sales` | `sales@reelsin360.com` | `sales123` |
| **Arun** | `shooter` | `arun@reelsin360.com` | `shooter123` |
| **Rahul** | `shooter` | `rahul@reelsin360.com` | `shooter123` |
| **Ameen** | `shooter` | `ameen@reelsin360.com` | `shooter123` |
| **Niyas** | `editor` | `niyas@reelsin360.com` | `editor123` |
| **Rizwan** | `editor` | `rizwan@reelsin360.com` | `editor123` |
| **Ashiq** | `editor` | `ashiq@reelsin360.com` | `editor123` |
| **Operations** | `operations` | `ops@reelsin360.com` | `ops123` |

---

## 🏃 Running the Application

* **Development Mode** (auto-reloads on file changes):
  ```bash
  npm run dev
  ```

* **Production Mode**:
  ```bash
  npm start
  ```

Once running, access the dashboard at **`http://localhost:3000`**.

---

## 📂 Project Structure

```text
reelsin360/
├── data/                    # Local SQLite database persistence
│   └── reelsin360.db
├── public/                  # Frontend SPA client assets
│   ├── css/
│   │   └── main.css         # Styling, themes, buttons, forms, and sidebar layout
│   ├── images/              # Branding assets (logo-text.png, logo-card.png)
│   ├── js/                  # SPA modules (leads, projects, shooter/editing, delivery)
│   ├── index.html           # Main SPA login and dashboard container
│   └── invoice.html         # High-fidelity printable invoice template
├── src/                     # Express REST backend
│   ├── config/              # DB init, auto-seeding scripts, and environment load
│   ├── controllers/         # Request handling logic
│   ├── middleware/          # JWT Auth and error handling
│   ├── routes/              # Express routing modules
│   └── utils/               # Common helper scripts
├── server.js                # App entry point
├── package.json
└── .env
```

---

## 🛡️ API Endpoints Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/login` | `POST` | User login (returns JWT token and user metadata) |
| `/api/dashboard/stats` | `GET` | Retrieve operations stats & revenue figures |
| `/api/leads` | `GET`/`POST` | Fetch all leads / Create a new pipeline entry |
| `/api/projects` | `GET`/`POST` | Fetch current projects / Create a new project |
| `/api/shooter` | `GET`/`POST` | List and edit shooter team task schedules |
| `/api/editing` | `GET`/`PUT` | Track production post-processing steps |
| `/api/delivery/invoices/:id`| `GET` | Retrieve high-fidelity invoice content |

---

## 📄 License

This project is proprietary software belonging to **Reels in 360**. All rights reserved.
