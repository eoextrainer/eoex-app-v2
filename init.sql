-- EOEX Database Initialization
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- CORE TABLES - Multi-tenancy Foundation
-- =============================================

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_name VARCHAR(255) NOT NULL UNIQUE,
    tenant_domain VARCHAR(255) NOT NULL UNIQUE,
    tier VARCHAR(50) DEFAULT 'standard',
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    user_tier VARCHAR(50) DEFAULT 'user',
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_username UNIQUE(tenant_id, username)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================
-- MODULAR SYSTEM TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS modules (
    module_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name VARCHAR(100) NOT NULL UNIQUE,
    module_version VARCHAR(20) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_pluggable BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS components (
    component_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES modules(module_id) ON DELETE CASCADE,
    component_name VARCHAR(100) NOT NULL,
    component_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_module_component UNIQUE(module_id, component_name)
);

CREATE TABLE IF NOT EXISTS features (
    feature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID REFERENCES components(component_id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,
    feature_key VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_single_feature BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TENANT MODULE CONFIGURATION
-- =============================================

CREATE TABLE IF NOT EXISTS tenant_modules (
    tenant_module_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(module_id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}',
    activated_at TIMESTAMP WITH TIME ZONE,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, module_id)
);

-- =============================================
-- CRM MODULE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS crm_contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    title VARCHAR(100),
    department VARCHAR(100),
    lead_source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new',
    assigned_to UUID REFERENCES users(user_id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_opportunities (
    opportunity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_id UUID REFERENCES crm_contacts(contact_id),
    amount DECIMAL(15,2),
    stage VARCHAR(50) DEFAULT 'prospecting',
    probability INTEGER DEFAULT 0,
    close_date DATE,
    owner_id UUID REFERENCES users(user_id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    annual_revenue DECIMAL(15,2),
    employees INTEGER,
    billing_address TEXT,
    shipping_address TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ERP MODULE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS erp_products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_sku UNIQUE(tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS erp_orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES crm_contacts(contact_id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(15,2) DEFAULT 0.00,
    shipping_address TEXT,
    billing_address TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erp_order_items (
    order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES erp_orders(order_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES erp_products(product_id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erp_inventory_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    product_id UUID REFERENCES erp_products(product_id),
    transaction_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- STUDIO (Marketing) MODULE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS studio_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    budget DECIMAL(15,2),
    target_audience JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS studio_content (
    content_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES studio_campaigns(campaign_id),
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_body TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS studio_analytics (
    analytic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES studio_campaigns(campaign_id),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4),
    dimension JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SUPPORT MODULE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    assigned_to UUID REFERENCES users(user_id),
    contact_id UUID REFERENCES crm_contacts(contact_id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_knowledge_base (
    kb_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags VARCHAR(255)[] DEFAULT '{}',
    view_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- UI/UX CONFIGURATION TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS ui_skins (
    skin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skin_name VARCHAR(100) NOT NULL UNIQUE,
    skin_type VARCHAR(50) NOT NULL,
    css_variables JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ui_themes (
    theme_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_name VARCHAR(100) NOT NULL UNIQUE,
    base_skin_id UUID REFERENCES ui_skins(skin_id),
    color_scheme JSONB DEFAULT '{}',
    typography JSONB DEFAULT '{}',
    spacing JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_ui_preferences (
    preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    theme_id UUID REFERENCES ui_themes(theme_id),
    skin_id UUID REFERENCES ui_skins(skin_id),
    layout_config JSONB DEFAULT '{}',
    shortcuts JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- =============================================
-- API & INTEGRATION TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS api_integrations (
    integration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    integration_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    api_key VARCHAR(255),
    api_secret TEXT,
    base_url VARCHAR(255),
    configuration JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES api_integrations(integration_id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    request_body TEXT,
    response_body TEXT,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- AUDIT & LOGGING TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_level VARCHAR(20) NOT NULL,
    module VARCHAR(100),
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DATA ARCHIVING & SCHEDULING
-- =============================================

CREATE TABLE IF NOT EXISTS archive_schedules (
    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_name VARCHAR(100) NOT NULL UNIQUE,
    table_name VARCHAR(100) NOT NULL,
    archive_condition TEXT,
    retention_days INTEGER NOT NULL,
    schedule_cron VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS archived_data (
    archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_table VARCHAR(100) NOT NULL,
    original_id UUID NOT NULL,
    data JSONB NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delete_after TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant ON crm_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts(status);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_erp_orders_status ON erp_orders(status);
CREATE INDEX IF NOT EXISTS idx_erp_orders_date ON erp_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_studio_campaigns_status ON studio_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);

-- =============================================
-- STORED PROCEDURES & FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON crm_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_opportunities_updated_at BEFORE UPDATE ON crm_opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_erp_products_updated_at BEFORE UPDATE ON erp_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_erp_orders_updated_at BEFORE UPDATE ON erp_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    new_order_number VARCHAR(50);
    year_part VARCHAR(4);
    seq_number INTEGER;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '-(.*)$') AS INTEGER)), 0) + 1
    INTO seq_number
    FROM erp_orders
    WHERE order_number LIKE 'ORD-' || year_part || '-%';

    new_order_number := 'ORD-' || year_part || '-' || LPAD(seq_number::VARCHAR, 6, '0');
    RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE erp_products
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE product_id = NEW.product_id;

        INSERT INTO erp_inventory_transactions (
            tenant_id,
            product_id,
            transaction_type,
            quantity,
            reference_type,
            reference_id
        )
        SELECT
            o.tenant_id,
            NEW.product_id,
            'sale',
            -NEW.quantity,
            'order_item',
            NEW.order_item_id
        FROM erp_orders o
        WHERE o.order_id = NEW.order_id;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE erp_products
        SET stock_quantity = stock_quantity + OLD.quantity
        WHERE product_id = OLD.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inventory_update
    AFTER INSERT OR DELETE ON erp_order_items
    FOR EACH ROW EXECUTE FUNCTION update_inventory_on_order();

CREATE OR REPLACE FUNCTION check_reorder_levels()
RETURNS TABLE(
    product_id UUID,
    product_name VARCHAR,
    sku VARCHAR,
    current_stock INTEGER,
    reorder_level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.product_id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.reorder_level
    FROM erp_products p
    WHERE p.stock_quantity <= p.reorder_level;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS FOR REPORTING
-- =============================================

CREATE OR REPLACE VIEW vw_sales_summary AS
SELECT
    t.tenant_name,
    DATE(o.order_date) as order_date,
    COUNT(DISTINCT o.order_id) as total_orders,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as avg_order_value
FROM erp_orders o
JOIN tenants t ON o.tenant_id = t.tenant_id
WHERE o.status = 'completed'
GROUP BY t.tenant_name, DATE(o.order_date);

CREATE OR REPLACE VIEW vw_customer_360 AS
SELECT
    c.contact_id,
    c.first_name || ' ' || c.last_name as full_name,
    c.email,
    c.company,
    COUNT(DISTINCT o.order_id) as total_orders,
    SUM(o.total_amount) as lifetime_value,
    MAX(o.order_date) as last_order_date,
    COUNT(DISTINCT t.ticket_id) as total_tickets
FROM crm_contacts c
LEFT JOIN erp_orders o ON c.contact_id = o.customer_id
LEFT JOIN support_tickets t ON c.contact_id = t.contact_id
GROUP BY c.contact_id, c.first_name, c.last_name, c.email, c.company;

CREATE OR REPLACE VIEW vw_support_metrics AS
SELECT
    t.tenant_name,
    st.status,
    st.priority,
    COUNT(*) as ticket_count,
    AVG(EXTRACT(EPOCH FROM (st.closed_at - st.created_at))/3600) as avg_resolution_hours
FROM support_tickets st
JOIN tenants t ON st.tenant_id = t.tenant_id
WHERE st.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY t.tenant_name, st.status, st.priority;

-- =============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_metrics AS
SELECT
    tenant_id,
    DATE(created_at) as metric_date,
    COUNT(DISTINCT CASE WHEN entity_type = 'order' THEN entity_id END) as daily_orders,
    COUNT(DISTINCT CASE WHEN entity_type = 'ticket' THEN entity_id END) as daily_tickets,
    COUNT(DISTINCT CASE WHEN entity_type = 'contact' THEN entity_id END) as daily_leads
FROM audit_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY tenant_id, DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_metrics ON mv_daily_metrics(tenant_id, metric_date);

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_metrics;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SCHEDULED JOBS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS scheduled_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(100) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    schedule_cron VARCHAR(50) NOT NULL,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    parameters JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INITIAL DATA SEEDING
-- =============================================

INSERT INTO modules (module_id, module_name, module_version, description, category, is_pluggable)
VALUES
(gen_random_uuid(), 'crm', '1.0.0', 'Customer Relationship Management', 'business', true),
(gen_random_uuid(), 'erp', '1.0.0', 'Enterprise Resource Planning', 'business', true),
(gen_random_uuid(), 'studio', '1.0.0', 'Marketing Studio', 'marketing', true),
(gen_random_uuid(), 'support', '1.0.0', 'Client Support System', 'support', true)
ON CONFLICT DO NOTHING;

INSERT INTO ui_skins (skin_id, skin_name, skin_type, css_variables)
VALUES
(gen_random_uuid(), 'light', 'standard', '{"--primary-color": "#3498db", "--bg-color": "#ffffff", "--text-color": "#333333"}'),
(gen_random_uuid(), 'dark', 'standard', '{"--primary-color": "#3498db", "--bg-color": "#1a1a1a", "--text-color": "#ffffff"}'),
(gen_random_uuid(), 'modern', 'premium', '{"--primary-color": "#9b59b6", "--bg-color": "#f8f9fa", "--text-color": "#2c3e50"}')
ON CONFLICT DO NOTHING;

INSERT INTO ui_themes (theme_id, theme_name, base_skin_id, color_scheme)
SELECT
    gen_random_uuid(),
    'Default Light',
    skin_id,
    '{"primary": "#3498db", "secondary": "#2ecc71", "success": "#27ae60", "danger": "#e74c3c"}'
FROM ui_skins WHERE skin_name = 'light'
ON CONFLICT DO NOTHING;

INSERT INTO archive_schedules (
    schedule_id,
    schedule_name,
    table_name,
    archive_condition,
    retention_days,
    schedule_cron,
    is_active
) VALUES (
    gen_random_uuid(),
    'audit_logs_monthly',
    'audit_logs',
    'created_at < CURRENT_DATE - INTERVAL ''90 days''',
    365,
    '0 2 1 * *',
    true
) ON CONFLICT DO NOTHING;

-- =============================================
-- DATABASE SECURITY & ROLES
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eoe_app') THEN
        CREATE ROLE eoe_app WITH LOGIN PASSWORD 'secure_password_123';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eoe_readonly') THEN
        CREATE ROLE eoe_readonly;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eoe_admin') THEN
        CREATE ROLE eoe_admin;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO eoe_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO eoe_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO eoe_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO eoe_app;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO eoe_readonly;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON tenants
    USING (tenant_id IN (SELECT tenant_id FROM users WHERE user_id = current_setting('app.current_user_id')::UUID));

CREATE POLICY user_tenant_policy ON users
    USING (tenant_id IN (SELECT tenant_id FROM users WHERE user_id = current_setting('app.current_user_id')::UUID));

-- =============================================
-- DATABASE MAINTENANCE FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION vacuum_analyze_tables()
RETURNS void AS $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('VACUUM ANALYZE %I.%I', table_record.schemaname, table_record.tablename);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_database_size()
RETURNS TABLE(
    database_name VARCHAR,
    size_bytes BIGINT,
    size_human VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        datname::VARCHAR,
        pg_database_size(datname) as size_bytes,
        pg_size_pretty(pg_database_size(datname)) as size_human
    FROM pg_database
    WHERE datname = current_database();
END;
$$ LANGUAGE plpgsql;
