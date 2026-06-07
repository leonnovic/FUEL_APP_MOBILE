-- FuelPro PostgreSQL Database Schema
-- Version 1.0.0
-- Compatible with Supabase and self-hosted PostgreSQL

-- ─── Extensions ───
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search

-- ─── Enums ───
CREATE TYPE user_role AS ENUM ('attendant', 'manager', 'admin', 'founder');
CREATE TYPE station_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'failed');

-- ─── Users Table ───
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'attendant',
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created ON users(created_at DESC);

-- ─── Stations Table ───
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status station_status DEFAULT 'active',
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_stations_status ON stations(status);
CREATE INDEX idx_stations_location ON stations(latitude, longitude);
CREATE INDEX idx_stations_name_trgm ON stations USING gin(name gin_trgm_ops);

-- ─── Station Users (Many-to-Many) ───
CREATE TABLE station_users (
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (station_id, user_id)
);

-- ─── Fuel Products ───
CREATE TABLE fuel_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'diesel', 'petrol', 'kerosene'
    price_per_liter DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_station ON fuel_products(station_id);

-- ─── Sales Transactions ───
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    product_id UUID REFERENCES fuel_products(id),
    quantity DECIMAL(10, 3) NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50), -- 'cash', 'mpesa', 'card'
    mpesa_receipt VARCHAR(100),
    customer_name VARCHAR(255),
    vehicle_plate VARCHAR(50),
    notes TEXT,
    sync_status sync_status DEFAULT 'pending',
    device_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_sales_station ON sales(station_id);
CREATE INDEX idx_sales_date ON sales(created_at DESC);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sales_mpesa ON sales(mpesa_receipt) WHERE mpesa_receipt IS NOT NULL;

-- ─── Inventory / Stock ───
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES fuel_products(id),
    current_stock DECIMAL(12, 3) NOT NULL,
    min_stock_level DECIMAL(12, 3) DEFAULT 0,
    max_stock_level DECIMAL(12, 3),
    unit VARCHAR(20) DEFAULT 'liters',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_inventory_station ON inventory(station_id);

-- ─── M-PESA Transactions ───
CREATE TABLE mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id),
    mpesa_receipt VARCHAR(100) UNIQUE,
    transaction_id VARCHAR(100),
    transaction_time TIMESTAMP WITH TIME ZONE,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50),
    phone VARCHAR(20),
    full_name VARCHAR(255),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mpesa_station ON mpesa_transactions(station_id);
CREATE INDEX idx_mpesa_receipt ON mpesa_transactions(mpesa_receipt);
CREATE INDEX idx_mpesa_time ON mpesa_transactions(created_at DESC);

-- ─── Expenses ───
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    date DATE NOT NULL,
    receipt_url TEXT,
    sync_status sync_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_expenses_station ON expenses(station_id);
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);

-- ─── Coupons ───
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase DECIMAL(10, 2) DEFAULT 0,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_station ON coupons(station_id);

-- ─── Webhooks ───
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(255),
    events TEXT[] NOT NULL, -- Array of event types
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_triggered TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0
);

CREATE INDEX idx_webhooks_station ON webhooks(station_id);

-- ─── Webhook Deliveries (Audit Log) ───
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_code INTEGER,
    response_body TEXT,
    success BOOLEAN DEFAULT false,
    attempt INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries ON webhook_deliveries(webhook_id, created_at DESC);

-- ─── API Keys ───
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    rate_limit INTEGER DEFAULT 1000,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);

-- ─── Activity Logs ───
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    station_id UUID REFERENCES stations(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_station ON activity_logs(station_id);
CREATE INDEX idx_activity_time ON activity_logs(created_at DESC);

-- ─── Sync Queue ───
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    collection VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    record_id UUID NOT NULL,
    data JSONB NOT NULL,
    status sync_status DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_station ON sync_queue(station_id);

-- ─── Trigger: Update updated_at ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fuel_products_updated_at BEFORE UPDATE ON fuel_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row Level Security (RLS) ───
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see users from their stations
CREATE POLICY users_station_policy ON users
    FOR ALL
    USING (
        id IN (
            SELECT su.user_id FROM station_users su
            WHERE su.station_id IN (
                SELECT station_id FROM station_users WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Users can only see their own data in sales
CREATE POLICY sales_user_policy ON sales
    FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM station_users su
        WHERE su.station_id = sales.station_id
        AND su.user_id = auth.uid()
    ));

-- ─── Realtime Subscriptions ───
-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE fuel_products;
ALTER PUBLICATION supabase_realtime ADD TABLE mpesa_transactions;

-- ─── Comments ───
COMMENT ON TABLE users IS 'Application users with role-based access';
COMMENT ON TABLE stations IS 'Fuel station locations and settings';
COMMENT ON TABLE sales IS 'Sales transactions with payment details';
COMMENT ON TABLE inventory IS 'Current stock levels per product';
COMMENT ON TABLE mpesa_transactions IS 'M-PESA payment confirmations';
COMMENT ON TABLE expenses IS 'Operational expenses tracking';
COMMENT ON TABLE webhooks IS 'Outgoing webhook configurations';
COMMENT ON TABLE sync_queue IS 'Offline-first sync pending operations';