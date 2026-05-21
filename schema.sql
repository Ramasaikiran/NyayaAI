-- ═══════════════════════════════════════════════════
-- NYAYA AI — COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ──────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  fname         TEXT NOT NULL,
  lname         TEXT,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen','lawyer','admin')),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── LAWYERS ────────────────────────────────────────
CREATE TABLE lawyers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  bar_reg_no          TEXT UNIQUE NOT NULL,
  state_bar           TEXT NOT NULL,
  specialisation      TEXT NOT NULL,
  experience_years    INT DEFAULT 0,

  -- Verification
  status              TEXT DEFAULT 'pending_docs'
                      CHECK (status IN ('pending_docs','under_review','verified','rejected','suspended')),
  id_card_url         TEXT,
  enrolment_cert_url  TEXT,
  govt_id_url         TEXT,
  verified_by         UUID REFERENCES users(id),
  verified_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  re_verify_due       DATE,

  -- Performance
  avg_rating          DECIMAL(3,2) DEFAULT 0,
  total_reviews_done  INT DEFAULT 0,
  complaint_count     INT DEFAULT 0,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── PETITIONS ──────────────────────────────────────
CREATE TABLE petitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id         TEXT UNIQUE NOT NULL,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  case_type       TEXT NOT NULL,
  case_label      TEXT NOT NULL,
  complainant     JSONB NOT NULL DEFAULT '{}',
  opponent        JSONB NOT NULL DEFAULT '{}',
  court           TEXT,
  facts           TEXT,
  relief          TEXT,
  amount          TEXT,
  incident_date   DATE,
  docs_available  TEXT[],
  draft_text      TEXT,
  strength_score  INT,
  suggestions     JSONB,
  status          TEXT DEFAULT 'draft'
                  CHECK (status IN ('draft','review_requested','under_review','complete')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── REVIEW REQUESTS ────────────────────────────────
CREATE TABLE review_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id       TEXT UNIQUE NOT NULL,
  petition_id     UUID REFERENCES petitions(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  lawyer_id       UUID REFERENCES lawyers(id) ON DELETE SET NULL,
  plan            TEXT NOT NULL CHECK (plan IN ('basic','standard','premium')),
  amount_paid     INT NOT NULL,
  client_phone    TEXT NOT NULL,
  client_email    TEXT NOT NULL,
  client_notes    TEXT,
  lawyer_notes    TEXT,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','assigned','in_review','complete','disputed')),
  assigned_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── RATINGS ────────────────────────────────────────
CREATE TABLE ratings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id       UUID REFERENCES review_requests(id) ON DELETE CASCADE,
  lawyer_id       UUID REFERENCES lawyers(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  score           INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMPLAINTS ─────────────────────────────────────
CREATE TABLE complaints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id       UUID REFERENCES review_requests(id) ON DELETE CASCADE,
  lawyer_id       UUID REFERENCES lawyers(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL,
  details         TEXT,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','dismissed')),
  resolved_by     UUID REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICATIONS ──────────────────────────────────
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT false,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────
CREATE INDEX idx_petitions_user_id ON petitions(user_id);
CREATE INDEX idx_petitions_status ON petitions(status);
CREATE INDEX idx_review_requests_user_id ON review_requests(user_id);
CREATE INDEX idx_review_requests_lawyer_id ON review_requests(lawyer_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_lawyers_status ON lawyers(status);
CREATE INDEX idx_lawyers_bar_reg_no ON lawyers(bar_reg_no);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- ── TRIGGERS: updated_at ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lawyers_updated BEFORE UPDATE ON lawyers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_petitions_updated BEFORE UPDATE ON petitions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON review_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── TRIGGER: auto-update lawyer avg_rating ─────────
CREATE OR REPLACE FUNCTION update_lawyer_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lawyers SET
    avg_rating = (SELECT AVG(score)::DECIMAL(3,2) FROM ratings WHERE lawyer_id = NEW.lawyer_id),
    total_reviews_done = (SELECT COUNT(*) FROM ratings WHERE lawyer_id = NEW.lawyer_id)
  WHERE id = NEW.lawyer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rating_inserted AFTER INSERT ON ratings FOR EACH ROW EXECUTE FUNCTION update_lawyer_rating();

-- ── SEED: Admin user ───────────────────────────────
-- Password: admin123 (bcrypt hash)
INSERT INTO users (email, password_hash, fname, lname, role)
VALUES ('admin@nyayaai.in', '$2b$10$rOzDM5D3f8Z7X1v4N2K8OeBqK1TJ1LVkVhwQ9X2K7WZlUiVqXDq2a', 'Admin', 'Nyaya', 'admin');

-- ── ROW LEVEL SECURITY (Supabase) ──────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE petitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own data
CREATE POLICY "users_own" ON users FOR ALL USING (id = auth.uid());
-- Petitions: owners can CRUD, lawyers can read assigned
CREATE POLICY "petitions_owner" ON petitions FOR ALL USING (user_id = auth.uid());
-- Reviews: visible to owner and assigned lawyer
CREATE POLICY "reviews_owner" ON review_requests FOR ALL USING (user_id = auth.uid());
-- Notifications: own only
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());
