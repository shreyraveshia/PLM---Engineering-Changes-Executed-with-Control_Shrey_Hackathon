-- ============================================
-- PLM SEED DATA — ENHANCED (50+ records)
-- Run AFTER schema.sql in pgAdmin Query Tool
-- All passwords = 'password123'
-- ============================================

DO $$
DECLARE
  -- Use YOUR actual bcrypt hash here
  hash_val TEXT := '$2a$12$SK4oTZ0C30txZjCOzxFNCuq/qxiipZSJ9bFQV49Lz75IUECFd4vdu';

  -- User IDs
  admin_id INT;
  eng1_id INT;
  eng2_id INT;
  approver1_id INT;
  approver2_id INT;
  ops_id INT;

  -- Product IDs (active — v1)
  prod_table_id INT;
  prod_iphone_id INT;
  prod_chair_id INT;
  prod_bracket_id INT;
  prod_lamp_id INT;
  prod_desk_id INT;
  prod_monitor_id INT;
  prod_keyboard_id INT;

  -- Archived product IDs (old versions)
  prod_table_v0_id INT;
  prod_iphone_v0_id INT;

  -- BoM IDs
  bom_table_id INT;
  bom_iphone_id INT;
  bom_chair_id INT;
  bom_bracket_id INT;
  bom_lamp_id INT;
  bom_desk_id INT;

  -- Stage IDs
  stage_new_id INT;
  stage_approval_id INT;
  stage_done_id INT;

  -- ECO IDs
  eco1_id INT;
  eco2_id INT;
  eco3_id INT;
  eco4_id INT;
  eco5_id INT;
  eco6_id INT;

BEGIN

-- ============================================
-- USERS (6 users — 2 engineers, 2 approvers)
-- ============================================
INSERT INTO users (name, email, password, role)
VALUES ('Admin User', 'admin@plm.com', hash_val, 'admin')
RETURNING id INTO admin_id;

INSERT INTO users (name, email, password, role)
VALUES ('Alice Engineer', 'alice@plm.com', hash_val, 'engineering_user')
RETURNING id INTO eng1_id;

INSERT INTO users (name, email, password, role)
VALUES ('David Engineer', 'david@plm.com', hash_val, 'engineering_user')
RETURNING id INTO eng2_id;

INSERT INTO users (name, email, password, role)
VALUES ('Bob Approver', 'bob@plm.com', hash_val, 'approver')
RETURNING id INTO approver1_id;

INSERT INTO users (name, email, password, role)
VALUES ('Sarah Approver', 'sarah@plm.com', hash_val, 'approver')
RETURNING id INTO approver2_id;

INSERT INTO users (name, email, password, role)
VALUES ('Carol Operations', 'carol@plm.com', hash_val, 'operations_user')
RETURNING id INTO ops_id;

-- ============================================
-- STAGE IDs
-- ============================================
SELECT id INTO stage_new_id      FROM eco_stages WHERE name = 'New'      LIMIT 1;
SELECT id INTO stage_approval_id FROM eco_stages WHERE name = 'Approval' LIMIT 1;
SELECT id INTO stage_done_id     FROM eco_stages WHERE name = 'Done'     LIMIT 1;

-- ============================================
-- PRODUCTS — ARCHIVED (old versions, v1)
-- These simulate products that already went
-- through an ECO and got a new version
-- ============================================
INSERT INTO products (name, sale_price, cost_price, version, status, created_by, notes)
VALUES ('Wooden Table', 249.99, 79.50, 1, 'archived', admin_id, 'Original version — superseded by ECO-001')
RETURNING id INTO prod_table_v0_id;

INSERT INTO products (name, sale_price, cost_price, version, status, created_by, notes)
VALUES ('iPhone 17', 899.00, 390.00, 1, 'archived', admin_id, 'Original pricing — superseded by ECO-004')
RETURNING id INTO prod_iphone_v0_id;

-- ============================================
-- PRODUCTS — ACTIVE (current versions)
-- ============================================
INSERT INTO products (name, sale_price, cost_price, version, status, parent_id, created_by, notes)
VALUES ('Wooden Table', 299.99, 89.50, 2, 'active', prod_table_v0_id, admin_id, 'Updated version — screw count increased, corner brackets added')
RETURNING id INTO prod_table_id;

INSERT INTO products (name, sale_price, cost_price, version, status, parent_id, created_by, notes)
VALUES ('iPhone 17', 999.00, 420.00, 2, 'active', prod_iphone_v0_id, admin_id, 'Updated pricing after Q2 market review')
RETURNING id INTO prod_iphone_id;

INSERT INTO products (name, sale_price, cost_price, version, status, created_by, notes)
VALUES ('Office Chair', 449.00, 180.00, 1, 'active', admin_id, 'Ergonomic mesh office chair with lumbar support')
RETURNING id INTO prod_chair_id;

INSERT INTO products (name, sale_price, cost_price, version, status, created_by, notes)
VALUES ('Steel Bracket', 12.99, 3.40, 1, 'active', eng1_id, 'Standard L-shaped steel mounting bracket')
RETURNING id INTO prod_bracket_id;

INSERT INTO products (name, sale_price, cost_price, version, status, created_by, notes)
VALUES ('LED Desk Lamp', 79.99, 22.50, 1, 'active', eng1_id, 'Adjustable LED desk lamp with USB charging port')
RETURNING id INTO prod_lamp_id;

INSERT INTO products (name, sale_price, cost_price, version, status, created_by, notes)
VALUES ('Standing Desk', 899.00, 310.00, 1, 'active', eng2_id, 'Electric height-adjustable standing desk 140x70cm')
RETURNING id INTO prod_desk_id;

INSERT INTO products (name, sale_price, cost_price, version, status, created_by, notes)
VALUES ('4K Monitor', 599.00, 240.00, 1, 'active', eng2_id, '27-inch 4K IPS monitor with USB-C connectivity')
RETURNING id INTO prod_monitor_id;

INSERT INTO products (name, sale_price, cost_price, version, status, created_by, notes)
VALUES ('Mechanical Keyboard', 149.00, 48.00, 1, 'active', eng1_id, 'TKL mechanical keyboard with Cherry MX switches')
RETURNING id INTO prod_keyboard_id;

-- ============================================
-- BILLS OF MATERIALS — ARCHIVED (old versions)
-- ============================================
INSERT INTO boms (product_id, version, status, created_by, notes)
VALUES (prod_table_v0_id, 1, 'archived', admin_id, 'Original BoM — superseded after ECO-001 approval');

INSERT INTO bom_components (bom_id, component_name, quantity, unit)
SELECT id, comp, qty, unit FROM
(VALUES
  ('Wooden Legs', 4, 'pcs'),
  ('Wooden Top', 1, 'pcs'),
  ('Screws', 12, 'pcs'),
  ('Varnish Bottle', 1, 'bottle')
) AS t(comp, qty, unit)
CROSS JOIN (SELECT id FROM boms WHERE product_id = prod_table_v0_id LIMIT 1) b;

-- ============================================
-- BILLS OF MATERIALS — ACTIVE
-- ============================================

-- Wooden Table BoM v2 (updated after ECO)
INSERT INTO boms (product_id, version, status, created_by, notes)
VALUES (prod_table_id, 2, 'active', admin_id, 'Updated BoM — 16 screws, corner brackets added, quality inspection added')
RETURNING id INTO bom_table_id;

INSERT INTO bom_components (bom_id, component_name, quantity, unit) VALUES
  (bom_table_id, 'Wooden Legs',    4,  'pcs'),
  (bom_table_id, 'Wooden Top',     1,  'pcs'),
  (bom_table_id, 'Screws',         16, 'pcs'),
  (bom_table_id, 'Varnish Bottle', 1,  'bottle'),
  (bom_table_id, 'Sandpaper Sheet',3,  'pcs'),
  (bom_table_id, 'Corner Bracket', 4,  'pcs');

INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence) VALUES
  (bom_table_id, 'Assembly',          60, 'Assembly Line',  1),
  (bom_table_id, 'Quality Inspection',10, 'QC Station',     2),
  (bom_table_id, 'Painting',          30, 'Paint Floor',    3),
  (bom_table_id, 'Packing',           15, 'Packaging Line', 4);

-- iPhone 17 BoM
INSERT INTO boms (product_id, version, status, created_by, notes)
VALUES (prod_iphone_id, 1, 'active', admin_id, 'Standard BoM for iPhone 17')
RETURNING id INTO bom_iphone_id;

INSERT INTO bom_components (bom_id, component_name, quantity, unit) VALUES
  (bom_iphone_id, 'Display Panel',   1, 'pcs'),
  (bom_iphone_id, 'Battery',         1, 'pcs'),
  (bom_iphone_id, 'Processor Chip',  1, 'pcs'),
  (bom_iphone_id, 'Camera Module',   3, 'pcs'),
  (bom_iphone_id, 'Aluminum Frame',  1, 'pcs'),
  (bom_iphone_id, 'Speaker Unit',    2, 'pcs'),
  (bom_iphone_id, 'Charging Port',   1, 'pcs');

INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence) VALUES
  (bom_iphone_id, 'PCB Assembly',   45, 'Electronics Line', 1),
  (bom_iphone_id, 'Screen Bonding', 20, 'Display Lab',      2),
  (bom_iphone_id, 'Final Assembly', 15, 'Assembly Line',    3),
  (bom_iphone_id, 'QA Testing',     30, 'QA Station',       4),
  (bom_iphone_id, 'Packaging',      10, 'Packaging Line',   5);

-- Office Chair BoM
INSERT INTO boms (product_id, version, status, created_by, notes)
VALUES (prod_chair_id, 1, 'active', eng1_id, 'Standard BoM for Office Chair')
RETURNING id INTO bom_chair_id;

INSERT INTO bom_components (bom_id, component_name, quantity, unit) VALUES
  (bom_chair_id, 'Mesh Back Panel',  1, 'pcs'),
  (bom_chair_id, 'Seat Cushion',     1, 'pcs'),
  (bom_chair_id, 'Armrests',         2, 'pcs'),
  (bom_chair_id, 'Chair Base',       1, 'pcs'),
  (bom_chair_id, 'Wheels',           5, 'pcs'),
  (bom_chair_id, 'Gas Cylinder',     1, 'pcs'),
  (bom_chair_id, 'Lumbar Support',   1, 'pcs'),
  (bom_chair_id, 'Bolts M8',         12,'pcs');

INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence) VALUES
  (bom_chair_id, 'Frame Assembly',   40, 'Assembly Line',  1),
  (bom_chair_id, 'Upholstery',       25, 'Fabric Station', 2),
  (bom_chair_id, 'Final Assembly',   20, 'Assembly Line',  3),
  (bom_chair_id, 'Quality Check',    15, 'QC Station',     4),
  (bom_chair_id, 'Packaging',        10, 'Packaging Line', 5);

-- Steel Bracket BoM
INSERT INTO boms (product_id, version, status, created_by, notes)
VALUES (prod_bracket_id, 1, 'active', eng1_id, 'BoM for Steel Bracket')
RETURNING id INTO bom_bracket_id;

INSERT INTO bom_components (bom_id, component_name, quantity, unit) VALUES
  (bom_bracket_id, 'Steel Sheet',   0.5, 'kg'),
  (bom_bracket_id, 'Zinc Coating',  0.1, 'kg'),
  (bom_bracket_id, 'Mounting Holes',4,   'pcs');

INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence) VALUES
  (bom_bracket_id, 'Cutting',  10, 'Metal Shop',    1),
  (bom_bracket_id, 'Bending',   5, 'Press Station', 2),
  (bom_bracket_id, 'Coating',  15, 'Paint Floor',   3);

-- LED Desk Lamp BoM
INSERT INTO boms (product_id, version, status, created_by, notes)
VALUES (prod_lamp_id, 1, 'active', eng2_id, 'BoM for LED Desk Lamp')
RETURNING id INTO bom_lamp_id;

INSERT INTO bom_components (bom_id, component_name, quantity, unit) VALUES
  (bom_lamp_id, 'LED Strip',        1, 'pcs'),
  (bom_lamp_id, 'Aluminum Arm',     1, 'pcs'),
  (bom_lamp_id, 'Base Weight',      1, 'pcs'),
  (bom_lamp_id, 'Power Adapter',    1, 'pcs'),
  (bom_lamp_id, 'USB-A Port',       1, 'pcs'),
  (bom_lamp_id, 'Touch Dimmer',     1, 'pcs');

INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence) VALUES
  (bom_lamp_id, 'Electronics Assembly', 20, 'Electronics Line', 1),
  (bom_lamp_id, 'Mechanical Assembly',  15, 'Assembly Line',    2),
  (bom_lamp_id, 'Testing',              10, 'QA Station',       3),
  (bom_lamp_id, 'Packaging',             8, 'Packaging Line',   4);

-- Standing Desk BoM
INSERT INTO boms (product_id, version, status, created_by, notes)
VALUES (prod_desk_id, 1, 'active', eng2_id, 'BoM for Standing Desk')
RETURNING id INTO bom_desk_id;

INSERT INTO bom_components (bom_id, component_name, quantity, unit) VALUES
  (bom_desk_id, 'Desktop Surface',  1, 'pcs'),
  (bom_desk_id, 'Electric Motor',   2, 'pcs'),
  (bom_desk_id, 'Steel Legs',       4, 'pcs'),
  (bom_desk_id, 'Control Panel',    1, 'pcs'),
  (bom_desk_id, 'Cable Management', 1, 'set'),
  (bom_desk_id, 'Bolts M10',        16,'pcs'),
  (bom_desk_id, 'Anti-slip Pads',   4, 'pcs');

INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence) VALUES
  (bom_desk_id, 'Frame Welding',    35, 'Metal Shop',    1),
  (bom_desk_id, 'Motor Install',    20, 'Assembly Line', 2),
  (bom_desk_id, 'Electronics',      25, 'Electronics Line', 3),
  (bom_desk_id, 'Surface Mounting', 15, 'Assembly Line', 4),
  (bom_desk_id, 'Load Testing',     20, 'QA Station',    5),
  (bom_desk_id, 'Packaging',        15, 'Packaging Line',6);

-- ============================================
-- ECOs — 6 ECOs IN DIFFERENT STAGES
-- Shows full lifecycle for judges
-- ============================================

-- ECO 1: APPLIED — Wooden Table screw count (already applied, created version history above)
INSERT INTO ecos (title, eco_type, product_id, bom_id, user_id, effective_date, version_update, stage_id, status, description)
VALUES (
  'Increase screw count for structural integrity',
  'bom', prod_table_id, bom_table_id, eng1_id,
  CURRENT_DATE - INTERVAL '10 days',
  TRUE, stage_done_id, 'applied',
  'Structural analysis showed 12 screws insufficient under load. Increased to 16, added corner brackets and quality inspection step.'
) RETURNING id INTO eco1_id;

INSERT INTO eco_draft_components (eco_id, component_name, old_quantity, new_quantity, unit, change_type) VALUES
  (eco1_id, 'Wooden Legs',    4,    4,    'pcs',    'unchanged'),
  (eco1_id, 'Wooden Top',     1,    1,    'pcs',    'unchanged'),
  (eco1_id, 'Screws',         12,   16,   'pcs',    'modified'),
  (eco1_id, 'Varnish Bottle', 1,    1,    'bottle', 'unchanged'),
  (eco1_id, 'Corner Bracket', NULL, 4,    'pcs',    'added');

INSERT INTO eco_draft_operations (eco_id, name, old_time_minutes, new_time_minutes, work_center, sequence, change_type) VALUES
  (eco1_id, 'Assembly',           60,   60,   'Assembly Line',  1, 'unchanged'),
  (eco1_id, 'Quality Inspection', NULL, 10,   'QC Station',     2, 'added'),
  (eco1_id, 'Painting',           30,   30,   'Paint Floor',    3, 'unchanged'),
  (eco1_id, 'Packing',            20,   15,   'Packaging Line', 4, 'modified');

INSERT INTO eco_approvals (eco_id, stage_id, approver_id, action, notes)
VALUES (eco1_id, stage_approval_id, approver1_id, 'approved',
  'Reviewed structural test report. Change is justified. Approved.');

-- ECO 2: APPLIED — iPhone 17 price adjustment
INSERT INTO ecos (title, eco_type, product_id, bom_id, user_id, effective_date, version_update, stage_id, status, description)
VALUES (
  'iPhone 17 Q2 price adjustment',
  'product', prod_iphone_id, NULL, eng1_id,
  CURRENT_DATE - INTERVAL '5 days',
  TRUE, stage_done_id, 'applied',
  'Market analysis supports price increase from $899 to $999. Premium finish upgrade increases cost price.'
) RETURNING id INTO eco2_id;

INSERT INTO eco_draft_product (eco_id, old_name, new_name, old_sale_price, new_sale_price, old_cost_price, new_cost_price, old_notes, new_notes)
VALUES (eco2_id, 'iPhone 17', 'iPhone 17', 899.00, 999.00, 390.00, 420.00,
  'Flagship smartphone model 2025', 'Flagship smartphone model 2025 — updated pricing Q2');

INSERT INTO eco_approvals (eco_id, stage_id, approver_id, action, notes)
VALUES (eco2_id, stage_approval_id, approver2_id, 'approved',
  'Price justified by market analysis report dated last month. Approved.');

-- ECO 3: IN APPROVAL STAGE — Office Chair fabric upgrade
INSERT INTO ecos (title, eco_type, product_id, bom_id, user_id, effective_date, version_update, stage_id, status, description)
VALUES (
  'Office Chair premium fabric upgrade',
  'bom', prod_chair_id, bom_chair_id, eng2_id,
  CURRENT_DATE + INTERVAL '7 days',
  TRUE, stage_approval_id, 'open',
  'Customer feedback indicates mesh quality issues. Upgrading to premium breathable mesh. Adding headrest component.'
) RETURNING id INTO eco3_id;

INSERT INTO eco_draft_components (eco_id, component_name, old_quantity, new_quantity, unit, change_type) VALUES
  (eco3_id, 'Mesh Back Panel',  1,    1,    'pcs', 'unchanged'),
  (eco3_id, 'Seat Cushion',     1,    1,    'pcs', 'unchanged'),
  (eco3_id, 'Armrests',         2,    2,    'pcs', 'unchanged'),
  (eco3_id, 'Chair Base',       1,    1,    'pcs', 'unchanged'),
  (eco3_id, 'Wheels',           5,    5,    'pcs', 'unchanged'),
  (eco3_id, 'Gas Cylinder',     1,    1,    'pcs', 'unchanged'),
  (eco3_id, 'Lumbar Support',   1,    1,    'pcs', 'unchanged'),
  (eco3_id, 'Bolts M8',         12,   16,   'pcs', 'modified'),
  (eco3_id, 'Headrest',         NULL, 1,    'pcs', 'added'),
  (eco3_id, 'Premium Mesh',     NULL, 1,    'pcs', 'added');

INSERT INTO eco_draft_operations (eco_id, name, old_time_minutes, new_time_minutes, work_center, sequence, change_type) VALUES
  (eco3_id, 'Frame Assembly',   40, 40, 'Assembly Line',  1, 'unchanged'),
  (eco3_id, 'Upholstery',       25, 35, 'Fabric Station', 2, 'modified'),
  (eco3_id, 'Headrest Fitting', NULL,10,'Assembly Line',  3, 'added'),
  (eco3_id, 'Final Assembly',   20, 20, 'Assembly Line',  4, 'unchanged'),
  (eco3_id, 'Quality Check',    15, 20, 'QC Station',     5, 'modified'),
  (eco3_id, 'Packaging',        10, 10, 'Packaging Line', 6, 'unchanged');

-- ECO 4: IN NEW STAGE — LED Lamp power adapter change
INSERT INTO ecos (title, eco_type, product_id, bom_id, user_id, effective_date, version_update, stage_id, status, description)
VALUES (
  'LED Lamp power adapter upgrade to GaN technology',
  'bom', prod_lamp_id, bom_lamp_id, eng1_id,
  CURRENT_DATE + INTERVAL '14 days',
  TRUE, stage_new_id, 'open',
  'GaN adapter reduces heat, improves efficiency by 30%. Slight cost increase justified by reliability improvement.'
) RETURNING id INTO eco4_id;

INSERT INTO eco_draft_components (eco_id, component_name, old_quantity, new_quantity, unit, change_type) VALUES
  (eco4_id, 'LED Strip',     1, 1, 'pcs', 'unchanged'),
  (eco4_id, 'Aluminum Arm',  1, 1, 'pcs', 'unchanged'),
  (eco4_id, 'Base Weight',   1, 1, 'pcs', 'unchanged'),
  (eco4_id, 'Power Adapter', 1, 1, 'pcs', 'modified'),
  (eco4_id, 'USB-A Port',    1, 1, 'pcs', 'unchanged'),
  (eco4_id, 'Touch Dimmer',  1, 1, 'pcs', 'unchanged');

INSERT INTO eco_draft_operations (eco_id, name, old_time_minutes, new_time_minutes, work_center, sequence, change_type) VALUES
  (eco4_id, 'Electronics Assembly', 20, 25, 'Electronics Line', 1, 'modified'),
  (eco4_id, 'Mechanical Assembly',  15, 15, 'Assembly Line',    2, 'unchanged'),
  (eco4_id, 'Testing',              10, 15, 'QA Station',       3, 'modified'),
  (eco4_id, 'Packaging',             8,  8, 'Packaging Line',   4, 'unchanged');

-- ECO 5: IN NEW STAGE — Standing Desk motor upgrade
INSERT INTO ecos (title, eco_type, product_id, bom_id, user_id, effective_date, version_update, stage_id, status, description)
VALUES (
  'Standing Desk dual motor upgrade for stability',
  'bom', prod_desk_id, bom_desk_id, eng2_id,
  CURRENT_DATE + INTERVAL '21 days',
  TRUE, stage_new_id, 'open',
  'Single motor causes wobble above 100kg load. Upgrading to dual synchronized motors for stability.'
) RETURNING id INTO eco5_id;

INSERT INTO eco_draft_components (eco_id, component_name, old_quantity, new_quantity, unit, change_type) VALUES
  (eco5_id, 'Desktop Surface',  1, 1, 'pcs', 'unchanged'),
  (eco5_id, 'Electric Motor',   2, 4, 'pcs', 'modified'),
  (eco5_id, 'Steel Legs',       4, 4, 'pcs', 'unchanged'),
  (eco5_id, 'Control Panel',    1, 1, 'pcs', 'unchanged'),
  (eco5_id, 'Cable Management', 1, 1, 'set', 'unchanged'),
  (eco5_id, 'Bolts M10',        16,20,'pcs', 'modified'),
  (eco5_id, 'Anti-slip Pads',   4, 4, 'pcs', 'unchanged'),
  (eco5_id, 'Motor Sync Cable', NULL,1,'pcs','added');

-- ECO 6: IN APPROVAL STAGE — Monitor price update
INSERT INTO ecos (title, eco_type, product_id, bom_id, user_id, effective_date, version_update, stage_id, status, description)
VALUES (
  '4K Monitor price revision due to panel cost increase',
  'product', prod_monitor_id, NULL, eng2_id,
  CURRENT_DATE + INTERVAL '3 days',
  TRUE, stage_approval_id, 'open',
  'Panel supplier increased cost by 18%. Sale price adjustment required to maintain margin.'
) RETURNING id INTO eco6_id;

INSERT INTO eco_draft_product (eco_id, old_name, new_name, old_sale_price, new_sale_price, old_cost_price, new_cost_price, old_notes, new_notes)
VALUES (eco6_id,
  '4K Monitor', '4K Monitor',
  599.00, 649.00,
  240.00, 283.00,
  '27-inch 4K IPS monitor with USB-C connectivity',
  '27-inch 4K IPS monitor with USB-C connectivity — revised pricing Q3');

-- ============================================
-- ECO APPROVALS (for ECOs in approval stage)
-- ============================================
-- ECO 3 is awaiting approval (no approval record yet — that's the point)
-- ECO 6 is awaiting approval (same)

-- ============================================
-- AUDIT LOGS — Realistic history
-- ============================================
INSERT INTO audit_logs (action, record_type, record_id, old_value, new_value, user_id) VALUES
  ('product_created',       'product', prod_table_v0_id,  NULL, '{"name":"Wooden Table","version":1}', admin_id),
  ('product_created',       'product', prod_iphone_v0_id, NULL, '{"name":"iPhone 17","version":1}',    admin_id),
  ('product_created',       'product', prod_chair_id,     NULL, '{"name":"Office Chair","version":1}', admin_id),
  ('product_created',       'product', prod_lamp_id,      NULL, '{"name":"LED Desk Lamp","version":1}',eng1_id),
  ('product_created',       'product', prod_desk_id,      NULL, '{"name":"Standing Desk","version":1}',eng2_id),
  ('product_created',       'product', prod_monitor_id,   NULL, '{"name":"4K Monitor","version":1}',   eng2_id),
  ('product_created',       'product', prod_keyboard_id,  NULL, '{"name":"Mechanical Keyboard","version":1}', eng1_id),
  ('bom_created',           'bom',     bom_table_id,      NULL, '{"product":"Wooden Table","version":2}', admin_id),
  ('bom_created',           'bom',     bom_iphone_id,     NULL, '{"product":"iPhone 17","version":1}', admin_id),
  ('bom_created',           'bom',     bom_chair_id,      NULL, '{"product":"Office Chair","version":1}', eng1_id),
  ('eco_created',           'eco',     eco1_id,           NULL, '{"title":"Increase screw count"}',    eng1_id),
  ('eco_created',           'eco',     eco2_id,           NULL, '{"title":"iPhone 17 Q2 price"}',      eng1_id),
  ('eco_created',           'eco',     eco3_id,           NULL, '{"title":"Office Chair fabric"}',     eng2_id),
  ('eco_created',           'eco',     eco4_id,           NULL, '{"title":"LED Lamp adapter"}',        eng1_id),
  ('eco_created',           'eco',     eco5_id,           NULL, '{"title":"Standing Desk motor"}',     eng2_id),
  ('eco_created',           'eco',     eco6_id,           NULL, '{"title":"4K Monitor price"}',        eng2_id),
  ('eco_stage_moved',       'eco',     eco1_id, '{"stage":"New"}', '{"stage":"Approval"}',             eng1_id),
  ('eco_approved',          'eco',     eco1_id, '{"stage":"Approval"}', '{"approved_by":"Bob Approver"}', approver1_id),
  ('eco_stage_moved',       'eco',     eco1_id, '{"stage":"Approval"}', '{"stage":"Done"}',             approver1_id),
  ('eco_applied',           'eco',     eco1_id, '{"status":"open"}', '{"status":"applied"}',            approver1_id),
  ('product_archived_by_eco','product',prod_table_v0_id, '{"status":"active"}', '{"status":"archived"}', approver1_id),
  ('bom_version_created',   'bom',     bom_table_id, '{"version":1}', '{"version":2}',                 approver1_id),
  ('eco_stage_moved',       'eco',     eco2_id, '{"stage":"New"}', '{"stage":"Approval"}',             eng1_id),
  ('eco_approved',          'eco',     eco2_id, '{"stage":"Approval"}', '{"approved_by":"Sarah Approver"}', approver2_id),
  ('eco_applied',           'eco',     eco2_id, '{"status":"open"}', '{"status":"applied"}',            approver2_id),
  ('product_archived_by_eco','product',prod_iphone_v0_id, '{"status":"active"}', '{"status":"archived"}', approver2_id),
  ('eco_stage_moved',       'eco',     eco3_id, '{"stage":"New"}', '{"stage":"Approval"}',             eng2_id),
  ('eco_stage_moved',       'eco',     eco6_id, '{"stage":"New"}', '{"stage":"Approval"}',             eng2_id);

RAISE NOTICE 'Enhanced seed data inserted successfully!';
END $$;

-- ============================================
-- FINAL VERIFICATION
-- ============================================
SELECT 'Users'            AS table_name, COUNT(*) AS rows FROM users
UNION ALL SELECT 'Products (all)',        COUNT(*) FROM products
UNION ALL SELECT 'Products (active)',     COUNT(*) FROM products WHERE status = 'active'
UNION ALL SELECT 'Products (archived)',   COUNT(*) FROM products WHERE status = 'archived'
UNION ALL SELECT 'BoMs (all)',            COUNT(*) FROM boms
UNION ALL SELECT 'BoM Components',        COUNT(*) FROM bom_components
UNION ALL SELECT 'BoM Operations',        COUNT(*) FROM bom_operations
UNION ALL SELECT 'ECOs (all)',            COUNT(*) FROM ecos
UNION ALL SELECT 'ECOs (open)',           COUNT(*) FROM ecos WHERE status = 'open'
UNION ALL SELECT 'ECOs (applied)',        COUNT(*) FROM ecos WHERE status = 'applied'
UNION ALL SELECT 'ECO Stages',            COUNT(*) FROM eco_stages
UNION ALL SELECT 'Draft Components',      COUNT(*) FROM eco_draft_components
UNION ALL SELECT 'Draft Operations',      COUNT(*) FROM eco_draft_operations
UNION ALL SELECT 'Draft Product Changes', COUNT(*) FROM eco_draft_product
UNION ALL SELECT 'Approvals',             COUNT(*) FROM eco_approvals
UNION ALL SELECT 'Audit Logs',            COUNT(*) FROM audit_logs;