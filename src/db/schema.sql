CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (Linked from Clerk)
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organizations (Linked from Clerk)
CREATE TABLE IF NOT EXISTS organizations (
    org_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Addresses
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    zip TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    assigned_to TEXT REFERENCES users(user_id) ON DELETE SET NULL, -- The Foreign Key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_id UUID NOT NULL UNIQUE REFERENCES addresses(id) ON DELETE CASCADE,
    day_of_week INTEGER, -- 0 for Sunday, 1 for Monday, etc.
    frequency TEXT NOT NULL, -- 'weekly', 'bi-weekly', 'monthly'
    first_cut_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- One-Time Services
CREATE TABLE IF NOT EXISTS one_time_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service_type TEXT NOT NULL, -- 'grass', 'snow', 'other'
    service_date DATE NOT NULL,
    notes TEXT,
    assigned_member_ids TEXT[] DEFAULT '{}',
    completed_job_id UUID, -- linked to completed_jobs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON clients(org_id);
CREATE INDEX IF NOT EXISTS idx_addresses_client_id ON addresses(client_id);
CREATE INDEX IF NOT EXISTS idx_schedules_address_id ON schedules(address_id);
CREATE INDEX IF NOT EXISTS idx_one_time_services_address_id ON one_time_services(address_id);
CREATE INDEX IF NOT EXISTS idx_one_time_services_org_date ON one_time_services(org_id, service_date);

-- Route Orders
CREATE TABLE IF NOT EXISTS route_orders (
    address_id UUID PRIMARY KEY REFERENCES addresses(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    sort_order FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_route_orders_org_sort ON route_orders(org_id, sort_order);

-- Completed Jobs
CREATE TABLE IF NOT EXISTS completed_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    assigned_to TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    completed_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scheduled_date DATE,
    captured_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    one_time_service_id UUID REFERENCES one_time_services(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_completed_jobs_address_id ON completed_jobs(address_id);
CREATE INDEX IF NOT EXISTS idx_completed_jobs_org_id ON completed_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_completed_jobs_date ON completed_jobs(completed_at);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Clerk user_id
    scheduled_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_assignments_org_date ON assignments(org_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_assignments_address_id ON assignments(address_id);

-- Site Maps
CREATE TABLE IF NOT EXISTS site_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    name TEXT,
    notes TEXT,
    blob_path TEXT,
    map_data JSONB, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_maps_address_id ON site_maps(address_id);

-- Completion Photos
CREATE TABLE IF NOT EXISTS completion_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    completed_job_id UUID NOT NULL REFERENCES completed_jobs(id) ON DELETE CASCADE,
    blob_path TEXT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE, -- The time the photo was taken on the client device
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_completion_photos_job_id ON completion_photos(completed_job_id);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid'
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(org_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL, -- e.g., 'grass', 'snow', 'other'
    address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
    description TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

