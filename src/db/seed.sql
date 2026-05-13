-- Dummy User Insert
INSERT INTO users (user_id, full_name, email)
VALUES ('user_3DY6r8XH2E5MO4ZguNt1syeg9pf', 'Patrick MacDonald', 'pmacdonald15@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

-- Dummy Organization Insert
INSERT INTO organizations (org_id, name)
VALUES ('org_3DeTMGxDlYOssvHgmZR4b3ZcPv7', 'Patricks Organization')
ON CONFLICT (org_id) DO NOTHING;

-- Dummy Client Insert
INSERT INTO clients (id, org_id, name, email, phone)
VALUES ('11111111-1111-1111-1111-111111111111', 'org_dummy_456', 'Jane Smith', 'jane.smith@example.com', '555-1234')
ON CONFLICT (id) DO NOTHING;

-- Dummy Address Insert
INSERT INTO addresses (id, client_id, street, city, state, zip)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '123 Main St', 'Anytown', 'CA', '12345')
ON CONFLICT (id) DO NOTHING;

-- Dummy Schedule Insert
INSERT INTO schedules (id, address_id, day_of_week, frequency, next_cut_date)
VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 1, 'bi-weekly', '2026-05-18')
ON CONFLICT (id) DO NOTHING;
