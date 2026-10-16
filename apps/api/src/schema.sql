-- Sebei Province Football schema (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS permissions (
  id serial PRIMARY KEY, code text UNIQUE NOT NULL, description text
);
CREATE TABLE IF NOT EXISTS roles (
  id serial PRIMARY KEY, name text UNIQUE NOT NULL, description text
);
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id int REFERENCES roles(id) ON DELETE CASCADE,
  permission_id int REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  role_id int REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL, original_name text, mime_type text NOT NULL, size_bytes int NOT NULL,
  category text NOT NULL DEFAULT 'general',
  alt_text text, caption text,
  uploaded_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news_categories (
  id serial PRIMARY KEY, name text UNIQUE NOT NULL, slug text UNIQUE NOT NULL, sort_order int DEFAULT 0
);
CREATE TABLE IF NOT EXISTS news_tags (
  id serial PRIMARY KEY, name text UNIQUE NOT NULL, slug text UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, slug text UNIQUE NOT NULL,
  summary text, body text NOT NULL DEFAULT '',
  featured_image text, author_name text,
  category_id int REFERENCES news_categories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','approved','scheduled','published','archived')),
  is_featured boolean NOT NULL DEFAULT false,
  is_breaking boolean NOT NULL DEFAULT false,
  publish_at timestamptz, published_at timestamptz,
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  published_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_articles_pub ON news_articles(status, published_at DESC);
CREATE TABLE IF NOT EXISTS article_tags (
  article_id uuid REFERENCES news_articles(id) ON DELETE CASCADE,
  tag_id int REFERENCES news_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, slug text UNIQUE NOT NULL,
  short_name text, abbreviation text, logo text, description text, history text,
  home_ground text, location text, founded_year int CHECK (founded_year IS NULL OR founded_year BETWEEN 1850 AND 2100),
  colors text, coach text, contact text, social_links text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL, slug text UNIQUE NOT NULL,
  photo text, position text, squad_number int CHECK (squad_number IS NULL OR squad_number BETWEEN 1 AND 99),
  nationality text, date_of_birth date, biography text,
  current_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','retired','archived')),
  appearances int NOT NULL DEFAULT 0, goals int NOT NULL DEFAULT 0, assists int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(current_team_id);
CREATE TABLE IF NOT EXISTS player_team_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  start_date date NOT NULL DEFAULT current_date, end_date date,
  is_loan boolean NOT NULL DEFAULT false,
  transfer_id uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_history ON player_team_history(player_id) WHERE end_date IS NULL;

CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  from_team_id uuid REFERENCES teams(id) ON DELETE RESTRICT,
  to_team_id uuid REFERENCES teams(id) ON DELETE RESTRICT,
  transfer_type text NOT NULL CHECK (transfer_type IN
    ('permanent_signing','departure','loan_signing','loan_departure','loan_return','free_agent_signing','contract_renewal','trial')),
  announced_on date NOT NULL DEFAULT current_date, effective_date date,
  window_label text, fee_terms text, announcement_text text, image text, source_note text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','confirmed','published','rejected','cancelled')),
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  verified_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  published_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_team_id IS NULL OR to_team_id IS NULL OR from_team_id <> to_team_id)
);
CREATE INDEX IF NOT EXISTS idx_transfers_pub ON transfers(status, announced_on DESC);

CREATE TABLE IF NOT EXISTS competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, slug text UNIQUE NOT NULL,
  competition_type text NOT NULL DEFAULT 'league' CHECK (competition_type IN ('league','knockout','group_knockout','friendly')),
  banner text, description text, organizer text, venue_info text, rules text,
  timezone text NOT NULL DEFAULT 'Africa/Kampala',
  points_win int NOT NULL DEFAULT 3, points_draw int NOT NULL DEFAULT 1, points_loss int NOT NULL DEFAULT 0,
  tie_breaks text NOT NULL DEFAULT 'goal_difference,goals_for',
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','completed','cancelled','archived')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS competition_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
  label text NOT NULL, start_date date, end_date date,
  champion_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  runner_up_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  is_current boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','completed','cancelled','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, label)
);
CREATE TABLE IF NOT EXISTS competition_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES competition_seasons(id) ON DELETE CASCADE,
  name text NOT NULL, UNIQUE (season_id, name)
);
CREATE TABLE IF NOT EXISTS competition_teams (
  season_id uuid NOT NULL REFERENCES competition_seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  group_id uuid REFERENCES competition_groups(id) ON DELETE SET NULL,
  PRIMARY KEY (season_id, team_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  season_id uuid NOT NULL REFERENCES competition_seasons(id) ON DELETE RESTRICT,
  group_id uuid REFERENCES competition_groups(id) ON DELETE SET NULL,
  round_label text,
  home_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  kickoff_at timestamptz NOT NULL, venue text,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','live','half_time','completed','postponed','abandoned','cancelled')),
  home_score int CHECK (home_score IS NULL OR home_score BETWEEN 0 AND 99),
  away_score int CHECK (away_score IS NULL OR away_score BETWEEN 0 AND 99),
  ht_home_score int CHECK (ht_home_score IS NULL OR ht_home_score BETWEEN 0 AND 99),
  ht_away_score int CHECK (ht_away_score IS NULL OR ht_away_score BETWEEN 0 AND 99),
  result_state text NOT NULL DEFAULT 'none' CHECK (result_state IN ('none','entered','reviewed','published')),
  report text,
  result_entered_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  result_published_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (home_team_id <> away_team_id),
  UNIQUE (season_id, home_team_id, away_team_id, kickoff_at)
);
CREATE INDEX IF NOT EXISTS idx_matches_kick ON matches(kickoff_at);
CREATE TABLE IF NOT EXISTS match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  minute int CHECK (minute BETWEEN 0 AND 130),
  event_type text NOT NULL CHECK (event_type IN ('goal','own_goal','penalty','yellow_card','red_card','substitution')),
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  note text
);

-- Calculated standings are derived from published matches; this table only stores audited manual adjustments.
CREATE TABLE IF NOT EXISTS standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES competition_seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  points_adjustment int NOT NULL DEFAULT 0,
  reason text NOT NULL,
  adjusted_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, slug text UNIQUE NOT NULL, body text NOT NULL DEFAULT '',
  is_urgent boolean NOT NULL DEFAULT false, is_featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
  publish_at timestamptz, published_at timestamptz,
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY, value text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  user_email text, action text NOT NULL, entity text, entity_id text,
  details jsonb, ip text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
