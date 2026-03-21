-- ============================================
-- PLM DATABASE SCHEMA
-- Run this entire file in pgAdmin Query Tool
-- on database: plm_db
-- ============================================

-- Drop existing tables if re-running (safe order)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS eco_approvals CASCADE;
DROP TABLE IF EXISTS eco_draft_product CASCADE;
DROP TABLE IF EXISTS eco_draft_operations CASCADE;
DROP TABLE IF EXISTS eco_draft_components CASCADE;
DROP TABLE IF EXISTS ecos CASCADE;
DROP TABLE IF EXISTS bom_operations CASCADE;
DROP TABLE IF EXISTS bom_components CASCADE;
DROP TABLE IF EXISTS boms CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS eco_stages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- USERS TABLE
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  role          VARCHAR(30) NOT NULL CHECK (role IN ('admin','engineering_user','approver','operations_user')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ECO STAGES TABLE (configurable via Settings)
CREATE TABLE eco_stages (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(80) NOT NULL,
  order_index       INT NOT NULL,
  requires_approval BOOLEAN DEFAULT FALSE,
  is_final          BOOLEAN DEFAULT FALSE,
  description       TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUCTS TABLE (versioned)
CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  sale_price    NUMERIC(12,2),
  cost_price    NUMERIC(12,2),
  version       INT NOT NULL DEFAULT 1,
  status        VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  parent_id     INT REFERENCES products(id) ON DELETE SET NULL,
  attachment    VARCHAR(500),
  notes         TEXT,
  created_by    INT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_parent_id ON products(parent_id);

-- BILLS OF MATERIALS TABLE (versioned)
CREATE TABLE boms (
  id            SERIAL PRIMARY KEY,
  product_id    INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version       INT NOT NULL DEFAULT 1,
  status        VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  parent_id     INT REFERENCES boms(id) ON DELETE SET NULL,
  notes         TEXT,
  created_by    INT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_boms_product_id ON boms(product_id);
CREATE INDEX idx_boms_status ON boms(status);

-- BOM COMPONENTS TABLE
CREATE TABLE bom_components (
  id                SERIAL PRIMARY KEY,
  bom_id            INT NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
  component_name    VARCHAR(200) NOT NULL,
  quantity          NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  unit              VARCHAR(50) DEFAULT 'pcs',
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_bom_components_bom_id ON bom_components(bom_id);

-- BOM OPERATIONS TABLE
CREATE TABLE bom_operations (
  id              SERIAL PRIMARY KEY,
  bom_id          INT NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  time_minutes    NUMERIC(8,2) NOT NULL CHECK (time_minutes >= 0),
  work_center     VARCHAR(200),
  sequence        INT DEFAULT 1,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_bom_operations_bom_id ON bom_operations(bom_id);

-- ENGINEERING CHANGE ORDERS TABLE
CREATE TABLE ecos (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(300) NOT NULL,
  eco_type        VARCHAR(20) NOT NULL CHECK (eco_type IN ('product','bom')),
  product_id      INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  bom_id          INT REFERENCES boms(id) ON DELETE SET NULL,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  effective_date  DATE,
  version_update  BOOLEAN DEFAULT TRUE,
  stage_id        INT NOT NULL REFERENCES eco_stages(id) ON DELETE RESTRICT,
  status          VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open','applied','cancelled')),
  description     TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_ecos_product_id ON ecos(product_id);
CREATE INDEX idx_ecos_stage_id ON ecos(stage_id);
CREATE INDEX idx_ecos_status ON ecos(status);
CREATE INDEX idx_ecos_user_id ON ecos(user_id);

-- ECO DRAFT COMPONENTS (proposed BoM changes — isolated from master)
CREATE TABLE eco_draft_components (
  id                SERIAL PRIMARY KEY,
  eco_id            INT NOT NULL REFERENCES ecos(id) ON DELETE CASCADE,
  component_name    VARCHAR(200) NOT NULL,
  old_quantity      NUMERIC(10,3),
  new_quantity      NUMERIC(10,3),
  unit              VARCHAR(50) DEFAULT 'pcs',
  change_type       VARCHAR(20) NOT NULL CHECK (change_type IN ('added','removed','modified','unchanged'))
);
CREATE INDEX idx_eco_draft_components_eco_id ON eco_draft_components(eco_id);

-- ECO DRAFT OPERATIONS (proposed BoM operation changes)
CREATE TABLE eco_draft_operations (
  id                SERIAL PRIMARY KEY,
  eco_id            INT NOT NULL REFERENCES ecos(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  old_time_minutes  NUMERIC(8,2),
  new_time_minutes  NUMERIC(8,2),
  work_center       VARCHAR(200),
  sequence          INT DEFAULT 1,
  change_type       VARCHAR(20) NOT NULL CHECK (change_type IN ('added','removed','modified','unchanged'))
);
CREATE INDEX idx_eco_draft_operations_eco_id ON eco_draft_operations(eco_id);

-- ECO DRAFT PRODUCT (proposed product field changes)
CREATE TABLE eco_draft_product (
  id                SERIAL PRIMARY KEY,
  eco_id            INT NOT NULL REFERENCES ecos(id) ON DELETE CASCADE,
  old_name          VARCHAR(200),
  new_name          VARCHAR(200),
  old_sale_price    NUMERIC(12,2),
  new_sale_price    NUMERIC(12,2),
  old_cost_price    NUMERIC(12,2),
  new_cost_price    NUMERIC(12,2),
  old_attachment    VARCHAR(500),
  new_attachment    VARCHAR(500),
  old_notes         TEXT,
  new_notes         TEXT,
  CONSTRAINT eco_draft_product_eco_id_unique UNIQUE (eco_id)
);

-- ECO APPROVALS (tracks who approved at which stage)
CREATE TABLE eco_approvals (
  id            SERIAL PRIMARY KEY,
  eco_id        INT NOT NULL REFERENCES ecos(id) ON DELETE CASCADE,
  stage_id      INT NOT NULL REFERENCES eco_stages(id) ON DELETE RESTRICT,
  approver_id   INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action        VARCHAR(20) NOT NULL CHECK (action IN ('approved','rejected')),
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_eco_approvals_eco_id ON eco_approvals(eco_id);

-- AUDIT LOGS TABLE
CREATE TABLE audit_logs (
  id              SERIAL PRIMARY KEY,
  action          VARCHAR(100) NOT NULL,
  record_type     VARCHAR(50),
  record_id       INT,
  old_value       JSONB,
  new_value       JSONB,
  user_id         INT REFERENCES users(id) ON DELETE SET NULL,
  ip_address      VARCHAR(45),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_type, record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Default ECO Stages (required for system to work)
INSERT INTO eco_stages (name, order_index, requires_approval, is_final, description) VALUES
  ('New',       1, FALSE, FALSE, 'ECO created, draft changes being prepared'),
  ('Approval',  2, TRUE,  FALSE, 'Awaiting review and approval from authorized approver'),
  ('Done',      3, FALSE, TRUE,  'ECO approved and changes applied to master data');

-- Verify
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
