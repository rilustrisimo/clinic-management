-- Migration: Lab Module Seed Data
-- Seeds common lab tests and panels for Philippine clinic

-- =====================================================
-- HEMATOLOGY TESTS
-- =====================================================

INSERT INTO "public"."LabTest" ("id", "code", "name", "section", "specimenType", "container", "defaultUnits", "referenceRange", "turnaroundHours", "requiresFasting", "requiresVerification", "price", "isQuickPick", "sortOrder", "active", "createdAt", "updatedAt") VALUES
-- Complete Blood Count
('lt-cbc', 'CBC', 'Complete Blood Count (CBC)', 'hematology', 'blood', 'EDTA', NULL,
  '{"hemoglobin": {"male": "14-18 g/dL", "female": "12-16 g/dL"}, "hematocrit": {"male": "40-54%", "female": "36-48%"}, "wbc": "4,500-11,000/uL", "platelets": "150,000-400,000/uL"}',
  2, false, false, 250.00, true, 1, true, now(), now()),

('lt-hgb', 'HGB', 'Hemoglobin', 'hematology', 'blood', 'EDTA', 'g/dL',
  '{"male": "14-18", "female": "12-16"}',
  1, false, false, 80.00, false, 2, true, now(), now()),

('lt-hct', 'HCT', 'Hematocrit', 'hematology', 'blood', 'EDTA', '%',
  '{"male": "40-54", "female": "36-48"}',
  1, false, false, 80.00, false, 3, true, now(), now()),

('lt-wbc', 'WBC', 'White Blood Cell Count', 'hematology', 'blood', 'EDTA', '/uL',
  '{"normal": "4,500-11,000"}',
  1, false, false, 80.00, false, 4, true, now(), now()),

('lt-plt', 'PLT', 'Platelet Count', 'hematology', 'blood', 'EDTA', '/uL',
  '{"normal": "150,000-400,000"}',
  1, false, false, 100.00, true, 5, true, now(), now()),

('lt-bt', 'BT', 'Blood Typing (ABO/Rh)', 'hematology', 'blood', 'EDTA', NULL,
  NULL,
  2, false, true, 150.00, true, 6, true, now(), now()),

('lt-esr', 'ESR', 'Erythrocyte Sedimentation Rate', 'hematology', 'blood', 'EDTA', 'mm/hr',
  '{"male": "0-15", "female": "0-20"}',
  2, false, false, 100.00, false, 7, true, now(), now()),

('lt-ct', 'CT', 'Clotting Time', 'hematology', 'blood', 'Plain', 'minutes',
  '{"normal": "5-15"}',
  1, false, false, 80.00, false, 8, true, now(), now()),

('lt-btt', 'BTT', 'Bleeding Time', 'hematology', 'blood', NULL, 'minutes',
  '{"normal": "1-6"}',
  1, false, false, 80.00, false, 9, true, now(), now())
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- CLINICAL CHEMISTRY TESTS
-- =====================================================

INSERT INTO "public"."LabTest" ("id", "code", "name", "section", "specimenType", "container", "defaultUnits", "referenceRange", "turnaroundHours", "requiresFasting", "requiresVerification", "price", "isQuickPick", "sortOrder", "active", "createdAt", "updatedAt") VALUES
-- Blood Sugar
('lt-fbs', 'FBS', 'Fasting Blood Sugar', 'chemistry', 'blood', 'SST', 'mg/dL',
  '{"normal": "70-100", "prediabetes": "100-125", "diabetes": ">126"}',
  2, true, false, 120.00, true, 10, true, now(), now()),

('lt-rbs', 'RBS', 'Random Blood Sugar', 'chemistry', 'blood', 'SST', 'mg/dL',
  '{"normal": "<140", "diabetes": ">200"}',
  1, false, false, 120.00, true, 11, true, now(), now()),

('lt-hba1c', 'HBA1C', 'Glycosylated Hemoglobin (HbA1c)', 'chemistry', 'blood', 'EDTA', '%',
  '{"normal": "<5.7", "prediabetes": "5.7-6.4", "diabetes": ">6.5"}',
  4, false, false, 800.00, true, 12, true, now(), now()),

-- Lipid Profile
('lt-tc', 'TC', 'Total Cholesterol', 'chemistry', 'blood', 'SST', 'mg/dL',
  '{"desirable": "<200", "borderline": "200-239", "high": ">240"}',
  2, true, false, 180.00, false, 13, true, now(), now()),

('lt-tg', 'TG', 'Triglycerides', 'chemistry', 'blood', 'SST', 'mg/dL',
  '{"normal": "<150", "borderline": "150-199", "high": "200-499"}',
  2, true, false, 180.00, false, 14, true, now(), now()),

('lt-hdl', 'HDL', 'HDL Cholesterol', 'chemistry', 'blood', 'SST', 'mg/dL',
  '{"male": ">40", "female": ">50"}',
  2, true, false, 200.00, false, 15, true, now(), now()),

('lt-ldl', 'LDL', 'LDL Cholesterol', 'chemistry', 'blood', 'SST', 'mg/dL',
  '{"optimal": "<100", "near_optimal": "100-129", "borderline": "130-159", "high": ">160"}',
  2, true, false, 200.00, false, 16, true, now(), now()),

-- Kidney Function
('lt-crea', 'CREA', 'Creatinine', 'chemistry', 'blood', 'SST', 'mg/dL',
  '{"male": "0.7-1.3", "female": "0.6-1.1"}',
  2, false, false, 150.00, true, 17, true, now(), now()),

('lt-bun', 'BUN', 'Blood Urea Nitrogen', 'chemistry', 'blood', 'SST', 'mg/dL',
  '{"normal": "7-20"}',
  2, false, false, 150.00, false, 18, true, now(), now()),

('lt-ua', 'URIC', 'Uric Acid', 'chemistry', 'blood', 'SST', 'mg/dL',
  '{"male": "3.4-7.0", "female": "2.4-6.0"}',
  2, false, false, 180.00, true, 19, true, now(), now()),

-- Liver Function
('lt-sgpt', 'SGPT', 'SGPT (ALT)', 'chemistry', 'blood', 'SST', 'U/L',
  '{"normal": "7-56"}',
  2, false, false, 180.00, true, 20, true, now(), now()),

('lt-sgot', 'SGOT', 'SGOT (AST)', 'chemistry', 'blood', 'SST', 'U/L',
  '{"normal": "10-40"}',
  2, false, false, 180.00, false, 21, true, now(), now()),

-- Electrolytes
('lt-na', 'NA', 'Sodium', 'chemistry', 'blood', 'SST', 'mEq/L',
  '{"normal": "136-145"}',
  2, false, false, 200.00, false, 22, true, now(), now()),

('lt-k', 'K', 'Potassium', 'chemistry', 'blood', 'SST', 'mEq/L',
  '{"normal": "3.5-5.0"}',
  2, false, false, 200.00, false, 23, true, now(), now())
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- URINALYSIS TESTS
-- =====================================================

INSERT INTO "public"."LabTest" ("id", "code", "name", "section", "specimenType", "container", "defaultUnits", "referenceRange", "turnaroundHours", "requiresFasting", "requiresVerification", "price", "isQuickPick", "sortOrder", "active", "createdAt", "updatedAt") VALUES
('lt-urinalysis', 'UA', 'Routine Urinalysis', 'urinalysis', 'urine', 'Sterile Cup', NULL,
  '{"color": "yellow to amber", "appearance": "clear", "pH": "4.6-8.0", "specific_gravity": "1.005-1.030"}',
  2, false, false, 100.00, true, 30, true, now(), now()),

('lt-preg', 'PREG', 'Pregnancy Test (Urine)', 'urinalysis', 'urine', 'Sterile Cup', NULL,
  '{"negative": "normal", "positive": "pregnant"}',
  1, false, false, 150.00, true, 31, true, now(), now())
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SEROLOGY TESTS
-- =====================================================

INSERT INTO "public"."LabTest" ("id", "code", "name", "section", "specimenType", "container", "defaultUnits", "referenceRange", "turnaroundHours", "requiresFasting", "requiresVerification", "price", "isQuickPick", "sortOrder", "active", "createdAt", "updatedAt") VALUES
('lt-hbsag', 'HBSAG', 'Hepatitis B Surface Antigen', 'serology', 'blood', 'SST', NULL,
  '{"negative": "non-reactive", "positive": "reactive"}',
  4, false, true, 350.00, true, 40, true, now(), now()),

('lt-antihcv', 'AHCV', 'Anti-HCV (Hepatitis C)', 'serology', 'blood', 'SST', NULL,
  '{"negative": "non-reactive", "positive": "reactive"}',
  4, false, true, 500.00, true, 41, true, now(), now()),

('lt-hiv', 'HIV', 'HIV Screening', 'serology', 'blood', 'SST', NULL,
  '{"negative": "non-reactive", "positive": "reactive - confirmatory needed"}',
  4, false, true, 350.00, false, 42, true, now(), now()),

('lt-vdrl', 'VDRL', 'VDRL (Syphilis Screening)', 'serology', 'blood', 'SST', NULL,
  '{"negative": "non-reactive", "positive": "reactive"}',
  4, false, true, 200.00, false, 43, true, now(), now()),

('lt-dengue', 'DNS1', 'Dengue NS1 Antigen', 'serology', 'blood', 'SST', NULL,
  '{"negative": "non-reactive", "positive": "reactive"}',
  2, false, false, 800.00, true, 44, true, now(), now()),

('lt-typhidot', 'TYPH', 'Typhidot (Typhoid)', 'serology', 'blood', 'SST', NULL,
  '{"IgM": "negative/positive", "IgG": "negative/positive"}',
  2, false, false, 500.00, false, 45, true, now(), now())
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- FECALYSIS TESTS
-- =====================================================

INSERT INTO "public"."LabTest" ("id", "code", "name", "section", "specimenType", "container", "defaultUnits", "referenceRange", "turnaroundHours", "requiresFasting", "requiresVerification", "price", "isQuickPick", "sortOrder", "active", "createdAt", "updatedAt") VALUES
('lt-stool', 'STOOL', 'Routine Fecalysis', 'fecalysis', 'stool', 'Stool Container', NULL,
  '{"color": "brown", "consistency": "formed", "occult_blood": "negative", "parasites": "none seen"}',
  2, false, false, 100.00, true, 50, true, now(), now()),

('lt-fobt', 'FOBT', 'Fecal Occult Blood Test', 'fecalysis', 'stool', 'Stool Container', NULL,
  '{"negative": "normal", "positive": "blood present"}',
  2, false, false, 150.00, true, 51, true, now(), now())
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- DRUG TESTING
-- =====================================================

INSERT INTO "public"."LabTest" ("id", "code", "name", "section", "specimenType", "container", "defaultUnits", "referenceRange", "turnaroundHours", "requiresFasting", "requiresVerification", "price", "isQuickPick", "sortOrder", "active", "createdAt", "updatedAt") VALUES
('lt-drug5', 'DRUG5', 'Drug Test 5-Panel', 'drug_testing', 'urine', 'Sterile Cup', NULL,
  '{"panels": "THC, COC, MET, AMP, OPI", "normal": "all negative"}',
  2, false, true, 500.00, true, 60, true, now(), now()),

('lt-drug10', 'DRUG10', 'Drug Test 10-Panel', 'drug_testing', 'urine', 'Sterile Cup', NULL,
  '{"panels": "THC, COC, MET, AMP, OPI, BZO, BAR, PCP, MTD, PPX", "normal": "all negative"}',
  2, false, true, 800.00, false, 61, true, now(), now())
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- LAB PANELS
-- =====================================================

INSERT INTO "public"."LabPanel" ("id", "code", "name", "section", "description", "price", "isQuickPick", "sortOrder", "active", "createdAt", "updatedAt") VALUES
('lp-cbc', 'CBC-PANEL', 'Complete Blood Count', 'hematology',
  'Complete blood count with differential',
  250.00, true, 1, true, now(), now()),

('lp-lipid', 'LIPID', 'Lipid Profile', 'chemistry',
  'Comprehensive lipid panel including TC, TG, HDL, LDL',
  650.00, true, 2, true, now(), now()),

('lp-kidney', 'KIDNEY', 'Kidney Function Panel', 'chemistry',
  'BUN, Creatinine, Uric Acid',
  400.00, false, 3, true, now(), now()),

('lp-liver', 'LIVER', 'Liver Function Panel', 'chemistry',
  'SGPT, SGOT',
  320.00, false, 4, true, now(), now()),

('lp-diabetes', 'DM-SCREEN', 'Diabetes Screening', 'chemistry',
  'FBS and HbA1c',
  850.00, true, 5, true, now(), now()),

('lp-hepatitis', 'HEP-SCREEN', 'Hepatitis Screening', 'serology',
  'HBsAg and Anti-HCV',
  800.00, true, 6, true, now(), now()),

('lp-preemployment', 'PRE-EMP', 'Pre-Employment Panel', 'other',
  'CBC, UA, Stool, Chest X-ray referral',
  500.00, true, 7, true, now(), now()),

('lp-executive', 'EXEC', 'Executive Check-up Panel', 'other',
  'CBC, FBS, Lipid Profile, Creatinine, Uric Acid, SGPT, UA',
  1800.00, false, 8, true, now(), now())
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- PANEL ITEMS (Tests in each panel)
-- =====================================================

-- CBC Panel (single test, but structured as panel)
INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-cbc', 'lt-cbc', true, 1)
ON CONFLICT ("panelId", "testId") DO NOTHING;

-- Lipid Profile
INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-lipid', 'lt-tc', true, 1)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-lipid', 'lt-tg', true, 2)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-lipid', 'lt-hdl', true, 3)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-lipid', 'lt-ldl', true, 4)
ON CONFLICT ("panelId", "testId") DO NOTHING;

-- Kidney Function
INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-kidney', 'lt-bun', true, 1)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-kidney', 'lt-crea', true, 2)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-kidney', 'lt-ua', true, 3)
ON CONFLICT ("panelId", "testId") DO NOTHING;

-- Liver Function
INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-liver', 'lt-sgpt', true, 1)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-liver', 'lt-sgot', true, 2)
ON CONFLICT ("panelId", "testId") DO NOTHING;

-- Diabetes Screening
INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-diabetes', 'lt-fbs', true, 1)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-diabetes', 'lt-hba1c', true, 2)
ON CONFLICT ("panelId", "testId") DO NOTHING;

-- Hepatitis Screening
INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-hepatitis', 'lt-hbsag', true, 1)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-hepatitis', 'lt-antihcv', true, 2)
ON CONFLICT ("panelId", "testId") DO NOTHING;

-- Pre-Employment Panel
INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-preemployment', 'lt-cbc', true, 1)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-preemployment', 'lt-urinalysis', true, 2)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-preemployment', 'lt-stool', true, 3)
ON CONFLICT ("panelId", "testId") DO NOTHING;

-- Executive Check-up Panel
INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-executive', 'lt-cbc', true, 1)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-executive', 'lt-fbs', true, 2)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-executive', 'lt-tc', true, 3)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-executive', 'lt-tg', true, 4)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-executive', 'lt-hdl', true, 5)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-executive', 'lt-ldl', true, 6)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-executive', 'lt-crea', true, 7)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-executive', 'lt-ua', true, 8)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-executive', 'lt-sgpt', true, 9)
ON CONFLICT ("panelId", "testId") DO NOTHING;

INSERT INTO "public"."LabPanelItem" ("id", "panelId", "testId", "required", "sortOrder") VALUES
(gen_random_uuid()::text, 'lp-executive', 'lt-urinalysis', true, 10)
ON CONFLICT ("panelId", "testId") DO NOTHING;
