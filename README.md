# Nyaya AI — Full Stack Legal Platform

## Architecture

```
nyaya-fullstack/
├── backend/           # Node.js + Express API
│   ├── routes/        # auth, petitions, reviews, admin, lawyers
│   ├── middleware/    # JWT auth, role guards
│   ├── utils/         # Supabase client, email
│   └── server.js      # Main entry point
├── frontend/
│   └── index.html     # Complete single-file frontend
└── database/
    └── schema.sql     # Full Supabase schema
```

## Setup (20 minutes)

### Step 1 — Supabase
1. Create project at https://supabase.com
2. Go to SQL Editor → paste contents of `database/schema.sql` → Run
3. Go to Storage → Create bucket named `lawyer-documents` → set to **Private**
4. Go to Settings → API → copy `URL`, `anon key`, `service_role key`

### Step 2 — Backend
```bash
cd backend
cp .env.example .env
# Fill in your Supabase keys, JWT secret, email credentials, Anthropic API key
npm install
npm run dev
```

### Step 3 — Frontend
Open `frontend/index.html` in browser OR deploy to any static host.

For production, set the API URL:
```html
<!-- In index.html, change this line: -->
<script>window.NYAYA_API_URL = "https://your-backend.railway.app/api";</script>
```

### Step 4 — Deploy backend (free options)
- **Railway**: Connect GitHub repo → auto-deploys → free tier available
- **Render**: Similar to Railway
- **Fly.io**: More control, generous free tier

### Step 5 — Admin access
Default admin: `admin@nyayaai.in` / `admin123`
⚠️ Change this password immediately after first login.

---

## API Endpoints

### Auth
- `POST /api/auth/register` — Citizen or lawyer registration (multipart/form-data for lawyers)
- `POST /api/auth/login` — Login, returns JWT
- `GET /api/auth/me` — Get current user (requires auth)
- `PUT /api/auth/change-password` — Change password

### Petitions
- `POST /api/petitions/generate` — Generate AI petition + save to DB
- `GET /api/petitions` — Get user's petitions
- `GET /api/petitions/:id` — Get single petition
- `DELETE /api/petitions/:id` — Delete petition

### Reviews
- `POST /api/reviews` — Submit lawyer review request
- `GET /api/reviews/my` — User's review requests
- `GET /api/reviews/assigned` — Lawyer's assigned reviews
- `PUT /api/reviews/:id/notes` — Lawyer saves notes
- `PUT /api/reviews/:id/complete` — Lawyer marks complete
- `POST /api/reviews/:id/rate` — Rate a review (1-5)
- `POST /api/reviews/:id/complaint` — File complaint

### Lawyer
- `GET /api/lawyer/profile` — Lawyer profile + stats
- `PUT /api/lawyer/profile` — Update profile
- `GET /api/lawyer/notifications` — Notifications

### Admin (admin role required)
- `GET /api/admin/stats` — Dashboard stats
- `GET /api/admin/lawyers` — All lawyers (filter by status)
- `GET /api/admin/lawyers/:id` — Single lawyer + signed doc URLs
- `POST /api/admin/lawyers/:id/approve` — Approve + email lawyer
- `POST /api/admin/lawyers/:id/reject` — Reject with reason
- `POST /api/admin/lawyers/:id/suspend` — Suspend lawyer
- `GET /api/admin/reviews` — All review requests
- `POST /api/admin/reviews/:id/assign` — Assign to lawyer
- `GET /api/admin/petitions` — All petitions
- `GET /api/admin/complaints` — All complaints
- `POST /api/admin/complaints/:id/resolve` — Resolve complaint
- `GET /api/admin/users` — All users
- `POST /api/admin/users/:id/toggle` — Suspend/reactivate user

---

## Lawyer Verification Flow

1. Lawyer registers with Bar Council reg no + 3 documents
2. System validates reg number format (STATE/YEAR/NUMBER)
3. Checks for duplicate registration in DB
4. Documents uploaded to private Supabase storage bucket
5. Admin receives email alert + in-app notification
6. Admin views lawyer docs via signed URLs (valid 1 hour)
7. Admin manually verifies on https://www.barcouncilofindia.org
8. Admin clicks Approve or Reject with reason
9. Lawyer receives email notification
10. If approved: status → "verified", eligible for case assignments
11. Annual re-verification: re_verify_due set to +365 days

---

## Environment Variables

```
SUPABASE_URL=           # From Supabase Settings > API
SUPABASE_SERVICE_KEY=   # Service role key (keep secret)
SUPABASE_ANON_KEY=      # Anon key
JWT_SECRET=             # Random 32+ char string
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=             # Gmail address
EMAIL_PASS=             # Gmail App Password (not account password)
EMAIL_FROM=Nyaya AI <noreply@nyayaai.in>
ADMIN_EMAIL=admin@nyayaai.in
ANTHROPIC_API_KEY=      # From console.anthropic.com
STORAGE_BUCKET=lawyer-documents
```

---

## Tech Stack
- **Backend**: Node.js, Express, JWT, bcryptjs, multer, nodemailer
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (private bucket)
- **AI**: Anthropic Claude API
- **Frontend**: Vanilla JS, single HTML file, no build step needed
- **Email**: Gmail SMTP via nodemailer

---

## What's NOT built yet (next steps)
1. Payment gateway (Razorpay) — currently simulated
2. WhatsApp notifications (Twilio / Meta API)
3. PDF generation for downloaded petitions
4. Automated Bar Council portal scraping
5. Two-factor authentication
6. Annual re-verification reminder emails (cron job)
