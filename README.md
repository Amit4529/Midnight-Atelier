# 🌙 Midnight Atelier — Website

**Premium Stay. Smart Price.** — Greater Noida

A full-stack website for Midnight Atelier luxury stay rooms, with a public-facing site and an admin panel for room management.

---

## 🚀 Quick Start

### 1. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Start the server

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Open the website

- **Public Site**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin/
- **API Docs**: http://localhost:8000/docs

---

## 📁 Project Structure

```
MIdnight Atelier/
├── backend/
│   ├── main.py          # FastAPI app
│   ├── database.py      # SQLite DB setup + seeding
│   ├── models.py        # Pydantic models
│   ├── auth.py          # JWT authentication
│   ├── routes/
│   │   ├── auth.py      # POST /api/admin/login
│   │   └── rooms.py     # CRUD /api/rooms
│   ├── uploads/         # Uploaded room images (auto-created)
│   └── requirements.txt
│
└── frontend/
    ├── index.html       # Public website
    ├── css/
    │   ├── style.css    # Public site styles
    │   └── admin.css    # Admin panel styles
    ├── js/
    │   ├── main.js      # Public site logic
    │   └── admin.js     # Admin panel logic
    └── admin/
        ├── index.html   # Admin login page
        └── dashboard.html # Admin dashboard
```

## 🛠️ Tech Stack

| Layer     | Tech                         |
|-----------|------------------------------|
| Frontend  | Vanilla HTML + CSS + JS      |
| Backend   | FastAPI (Python)             |
| Database  | SQLite (via aiosqlite)       |
| Auth      | JWT (python-jose + bcrypt)   |
| Server    | Uvicorn                      |

---

## 🌐 Hosting Notes

The FastAPI server serves both the API and the frontend static files.
Deploy by running `uvicorn main:app --host 0.0.0.0 --port 8000` on any VPS.
