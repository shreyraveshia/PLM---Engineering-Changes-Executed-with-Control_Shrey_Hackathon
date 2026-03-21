-- ============================================
-- PLM SEED DATA
-- Run AFTER schema.sql
-- Passwords are bcrypt hash of 'password123'
-- ============================================

-- STEP 1: Generate real bcrypt hashes by running this in your terminal:
-- cd backend
-- node -e "const b=require('bcryptjs'); Promise.all(['password123'].map(p=>b.hash(p,12))).then(h=>console.log(h[0]))"
-- Copy the output hash and use it below for ALL users

-- STEP 2: Replace HASH_PLACEHOLDER below with your generated hash

DO $$
DECLARE
  hash_val TEXT := '$2a$12$SK4oTZ0C30txZjCOzxFNCuq/qxiipZSJ9bFQV49Lz75IUECFd4vdu';
  admin_id INT;
  eng_id INT;
  approver_id INT;
  ops_id INT;
  prod1_id INT;
  prod2_id INT;
  prod3_id INT;
  bom1_id INT;
  bom2_id INT;
  stage_new_id INT;
  stage_approval_id INT;
BEGIN

-- USERS
INSERT INTO users (name, email, password, role)
VALUES ('Admin User', 'admin@plm.com', hash_val, 'admin')
RETURNING id INTO admin_id;

INSERT INTO users (name, email, password, role)
VALUES ('Alice Engineer', 'alice@plm.com', hash_val, 'engineering_user')
RETURNING id INTO eng_id;

INSERT INTO users (name, email, password, role)
VALUES ('Bob Approver', 'bob@plm.com', hash_val, 'approver')
RETURNING id INTO approver_id;

INSERT INTO users (name, email, password, role)
VALUES ('Carol Operations', 'carol@plm.com', hash_val, 'operations_user')
RETURNING id INTO ops_id;

-- PRODUCTS
INSERT INTO products (name, sale_price, cost_price, version, status, created_by, notes)
VALUES ('Wooden Table', 299.99, 89.50, 1, 'active', admin_id, 'Standard 4-leg wooden dining table')
RETURNING id INTO prod1_id;

INSERT INTO products (name, sale_price, cost_price, version, status, created_by, notes)
VALUES ('iPhone 17', 999.00, 420.00, 1, 'active', admin_id, 'Flagship smartphone model 2025')
RETURNING id INTO prod2_id;

INSERT INTO products (name, sale_price, cost_price, version, status, created_by, notes)
VALUES ('Office Chair', 449.00, 180.00, 1, 'active', admin_id, 'Ergonomic mesh office chair')
RETURNING id INTO prod3_id;

-- BILL OF MATERIALS: Wooden Table
INSERT INTO boms (product_id, version, status, created_by, notes)
VALUES (prod1_id, 1, 'active', admin_id, 'Standard BoM for Wooden Table v1')
RETURNING id INTO bom1_id;

INSERT INTO bom_components (bom_id, component_name, quantity, unit) VALUES
  (bom1_id, 'Wooden Legs',    4,    'pcs'),
  (bom1_id, 'Wooden Top',     1,    'pcs'),
  (bom1_id, 'Screws',         12,   'pcs'),
  (bom1_id, 'Varnish Bottle', 1,    'bottle'),
  (bom1_id, 'Sandpaper Sheet',3,    'pcs');

INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence) VALUES
  (bom1_id, 'Assembly',  60, 'Assembly Line',   1),
  (bom1_id, 'Painting',  30, 'Paint Floor',     2),
  (bom1_id, 'Packing',   20, 'Packaging Line',  3);

-- BILL OF MATERIALS: iPhone 17
INSERT INTO boms (product_id, version, status, created_by, notes)
VALUES (prod2_id, 1, 'active', admin_id, 'Standard BoM for iPhone 17 v1')
RETURNING id INTO bom2_id;

INSERT INTO bom_components (bom_id, component_name, quantity, unit) VALUES
  (bom2_id, 'Display Panel',   1,    'pcs'),
  (bom2_id, 'Battery',         1,    'pcs'),
  (bom2_id, 'Processor Chip',  1,    'pcs'),
  (bom2_id, 'Camera Module',   3,    'pcs'),
  (bom2_id, 'Aluminum Frame',  1,    'pcs');

INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence) VALUES
  (bom2_id, 'PCB Assembly',   45, 'Electronics Line', 1),
  (bom2_id, 'Screen Bonding', 20, 'Display Lab',      2),
  (bom2_id, 'QA Testing',     30, 'QA Station',       3);

-- ECO STAGES IDs
SELECT id INTO stage_new_id FROM eco_stages WHERE name = 'New' LIMIT 1;
SELECT id INTO stage_approval_id FROM eco_stages WHERE name = 'Approval' LIMIT 1;

-- ECO 1: BoM change for Wooden Table (in New stage)
INSERT INTO ecos (title, eco_type, product_id, bom_id, user_id, effective_date, version_update, stage_id, status, description)
VALUES (
  'Increase screw count for structural integrity',
  'bom', prod1_id, bom1_id, eng_id,
  CURRENT_DATE + INTERVAL '7 days',
  TRUE, stage_new_id, 'open',
  'Structural analysis shows 12 screws insufficient. Increasing to 16 and adding quality inspection step.'
);

INSERT INTO eco_draft_components (eco_id, component_name, old_quantity, new_quantity, unit, change_type)
SELECT id, 'Wooden Legs',    4,    4,    'pcs',    'unchanged' FROM ecos WHERE title LIKE 'Increase screw%' LIMIT 1;
INSERT INTO eco_draft_components (eco_id, component_name, old_quantity, new_quantity, unit, change_type)
SELECT id, 'Wooden Top',     1,    1,    'pcs',    'unchanged' FROM ecos WHERE title LIKE 'Increase screw%' LIMIT 1;
INSERT INTO eco_draft_components (eco_id, component_name, old_quantity, new_quantity, unit, change_type)
SELECT id, 'Screws',         12,   16,   'pcs',    'modified'  FROM ecos WHERE title LIKE 'Increase screw%' LIMIT 1;
INSERT INTO eco_draft_components (eco_id, component_name, old_quantity, new_quantity, unit, change_type)
SELECT id, 'Varnish Bottle', 1,    1,    'bottle', 'unchanged' FROM ecos WHERE title LIKE 'Increase screw%' LIMIT 1;
INSERT INTO eco_draft_components (eco_id, component_name, old_quantity, new_quantity, unit, change_type)
SELECT id, 'Corner Bracket', NULL, 4,    'pcs',    'added'     FROM ecos WHERE title LIKE 'Increase screw%' LIMIT 1;

INSERT INTO eco_draft_operations (eco_id, name, old_time_minutes, new_time_minutes, work_center, sequence, change_type)
SELECT id, 'Assembly',           60, 60, 'Assembly Line',  1, 'unchanged' FROM ecos WHERE title LIKE 'Increase screw%' LIMIT 1;
INSERT INTO eco_draft_operations (eco_id, name, old_time_minutes, new_time_minutes, work_center, sequence, change_type)
SELECT id, 'Quality Inspection', NULL, 10, 'QC Station',   2, 'added'     FROM ecos WHERE title LIKE 'Increase screw%' LIMIT 1;
INSERT INTO eco_draft_operations (eco_id, name, old_time_minutes, new_time_minutes, work_center, sequence, change_type)
SELECT id, 'Painting',           30, 30, 'Paint Floor',    3, 'unchanged' FROM ecos WHERE title LIKE 'Increase screw%' LIMIT 1;
INSERT INTO eco_draft_operations (eco_id, name, old_time_minutes, new_time_minutes, work_center, sequence, change_type)
SELECT id, 'Packing',            20, 15, 'Packaging Line', 4, 'modified'  FROM ecos WHERE title LIKE 'Increase screw%' LIMIT 1;

-- ECO 2: Product price change for iPhone 17 (in Approval stage)
INSERT INTO ecos (title, eco_type, product_id, bom_id, user_id, effective_date, version_update, stage_id, status, description)
VALUES (
  'iPhone 17 Q2 price adjustment',
  'product', prod2_id, NULL, eng_id,
  CURRENT_DATE + INTERVAL '14 days',
  TRUE, stage_approval_id, 'open',
  'Market analysis supports price increase. Premium finish upgrade also increases cost price.'
);

INSERT INTO eco_draft_product (eco_id, old_name, new_name, old_sale_price, new_sale_price, old_cost_price, new_cost_price, old_notes, new_notes)
SELECT id, 'iPhone 17', 'iPhone 17 Pro', 999.00, 1099.00, 420.00, 465.00,
  'Flagship smartphone model 2025', 'Flagship smartphone model 2025 - Premium Edition'
FROM ecos WHERE title LIKE 'iPhone 17 Q2%' LIMIT 1;

-- AUDIT LOGS for seed data
INSERT INTO audit_logs (action, record_type, record_id, old_value, new_value, user_id)
SELECT 'eco_created', 'eco', id, NULL,
  jsonb_build_object('title', title, 'eco_type', eco_type),
  user_id FROM ecos;

RAISE NOTICE 'Seed data inserted successfully';
END $$;

-- Verify
SELECT 'Users:' as table_name, count(*) as rows FROM users
UNION ALL SELECT 'Products:', count(*) FROM products
UNION ALL SELECT 'BoMs:', count(*) FROM boms
UNION ALL SELECT 'ECOs:', count(*) FROM ecos
UNION ALL SELECT 'ECO Stages:', count(*) FROM eco_stages;
