-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    company TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'manager', 'operator', 'viewer')) DEFAULT 'operator',
    
    -- Profile
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'America/Los_Angeles',
    avatar_url TEXT,
    
    -- Subscription
    subscription_plan TEXT CHECK (subscription_plan IN ('trial', 'starter', 'professional', 'enterprise')) DEFAULT 'trial',
    subscription_status TEXT CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'expired')) DEFAULT 'active',
    shipment_limit INTEGER DEFAULT 500,
    user_limit INTEGER DEFAULT 3,
    warehouse_limit INTEGER DEFAULT 1,
    integration_limit INTEGER DEFAULT 2,
    current_shipments INTEGER DEFAULT 0,
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',
    next_billing_date TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    
    -- Activity
    last_login TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    total_logins INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags table
CREATE TABLE public.tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    category TEXT CHECK (category IN ('priority', 'shipping', 'order', 'customer', 'product', 'custom')) NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    icon TEXT,
    
    -- Metadata
    created_by UUID REFERENCES public.profiles(id),
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMPTZ,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Settings
    auto_apply BOOLEAN DEFAULT FALSE,
    auto_apply_conditions JSONB,
    exclusive BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,
    
    -- Stats
    orders_tagged INTEGER DEFAULT 0,
    products_tagged INTEGER DEFAULT 0,
    customers_tagged INTEGER DEFAULT 0,
    automation_rules INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tag collections table
CREATE TABLE public.tag_collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('exclusive', 'non-exclusive')) DEFAULT 'non-exclusive',
    
    -- Metadata
    created_by UUID REFERENCES public.profiles(id),
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Rules
    max_tags INTEGER,
    min_tags INTEGER,
    required BOOLEAN DEFAULT FALSE,
    
    -- Stats
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tag collection members
CREATE TABLE public.tag_collection_members (
    collection_id UUID REFERENCES public.tag_collections(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (collection_id, tag_id)
);

-- Orders table
CREATE TABLE public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    order_number TEXT UNIQUE NOT NULL,
    external_order_id TEXT,
    source TEXT CHECK (source IN ('shopify', 'woocommerce', 'amazon', 'ebay', 'manual', 'api', 'csv')) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'on_hold')) DEFAULT 'pending',
    
    -- Customer
    customer JSONB NOT NULL,
    
    -- Addresses
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    
    -- Items
    items JSONB NOT NULL,
    
    -- Shipping
    shipping JSONB,
    
    -- Totals
    totals JSONB NOT NULL,
    
    -- Additional fields
    notes TEXT,
    internal_notes TEXT,
    gift_message TEXT,
    
    -- Automation
    automation JSONB DEFAULT '{"processed": false, "rules": [], "actions": []}'::jsonb,
    
    -- Fulfillment
    fulfillment JSONB,
    
    -- Tracking
    tracking JSONB DEFAULT '{"events": [], "delivered": false, "exception": false}'::jsonb,
    
    -- Timestamps
    ordered_at TIMESTAMPTZ NOT NULL,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order tags junction table
CREATE TABLE public.order_tags (
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (order_id, tag_id)
);

-- API integrations table
CREATE TABLE public.api_integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('shopify', 'quickbooks', 'bill.com', 'aftership', 'custom', 'woocommerce', 'amazon', 'ebay')) NOT NULL,
    
    -- Configuration (encrypted)
    config JSONB NOT NULL,
    
    -- Status
    status JSONB DEFAULT '{"connected": false, "errorCount": 0, "consecutiveErrors": 0}'::jsonb,
    
    -- Sync settings
    sync_settings JSONB DEFAULT '{"enabled": true, "frequency": 15, "autoSync": true, "syncDirection": "import", "batchSize": 100}'::jsonb,
    
    -- Field mapping
    field_mapping JSONB,
    
    -- Webhooks
    webhooks JSONB DEFAULT '{"enabled": false}'::jsonb,
    
    -- Rate limits
    rate_limits JSONB DEFAULT '{"requestsPerMinute": 60, "requestsPerHour": 3600, "burstLimit": 10}'::jsonb,
    
    -- Statistics
    stats JSONB DEFAULT '{"totalRequests": 0, "successfulRequests": 0, "failedRequests": 0, "avgResponseTime": 0, "dataTransferred": 0}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API logs table
CREATE TABLE public.api_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    integration_id UUID REFERENCES public.api_integrations(id) ON DELETE CASCADE,
    endpoint TEXT,
    method TEXT,
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    response_time INTEGER,
    error TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Automation rules table
CREATE TABLE public.automation_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    
    -- Trigger
    trigger JSONB NOT NULL,
    
    -- Actions
    actions JSONB NOT NULL,
    
    -- Schedule
    schedule JSONB DEFAULT '{"enabled": false, "frequency": "immediate"}'::jsonb,
    
    -- Limits
    limits JSONB DEFAULT '{}'::jsonb,
    
    -- Statistics
    stats JSONB DEFAULT '{"totalExecutions": 0, "successfulExecutions": 0, "failedExecutions": 0, "ordersAffected": 0}'::jsonb,
    
    -- History (limited)
    history JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX idx_orders_external ON public.orders(external_order_id, source);
CREATE INDEX idx_orders_customer_email ON public.orders((customer->>'email'));
CREATE INDEX idx_orders_ordered_at ON public.orders(ordered_at DESC);

CREATE INDEX idx_tags_category ON public.tags(category);
CREATE INDEX idx_tags_usage ON public.tags(usage_count DESC);
CREATE INDEX idx_tags_active ON public.tags(is_active);

CREATE INDEX idx_api_logs_integration ON public.api_logs(integration_id, timestamp DESC);
CREATE INDEX idx_api_logs_error ON public.api_logs(integration_id, error) WHERE error IS NOT NULL;

CREATE INDEX idx_automation_rules_user ON public.automation_rules(user_id, enabled);
CREATE INDEX idx_automation_rules_trigger ON public.automation_rules((trigger->>'event'));

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Orders: Users can only see/edit their own orders
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own orders" ON public.orders FOR DELETE USING (auth.uid() = user_id);

-- Tags: Users can see all active tags, but only edit their own
CREATE POLICY "Users can view active tags" ON public.tags FOR SELECT USING (is_active = true);
CREATE POLICY "Users can create tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own tags" ON public.tags FOR UPDATE USING (auth.uid() = created_by AND is_system = false);
CREATE POLICY "Users can delete own tags" ON public.tags FOR DELETE USING (auth.uid() = created_by AND is_system = false);

-- API Integrations: Users can only see/edit their own
CREATE POLICY "Users can view own integrations" ON public.api_integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own integrations" ON public.api_integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own integrations" ON public.api_integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own integrations" ON public.api_integrations FOR DELETE USING (auth.uid() = user_id);

-- API Logs: Users can only see logs for their integrations
CREATE POLICY "Users can view own integration logs" ON public.api_logs FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.api_integrations 
    WHERE api_integrations.id = api_logs.integration_id 
    AND api_integrations.user_id = auth.uid()
));

-- Automation Rules: Users can only see/edit their own
CREATE POLICY "Users can view own automation rules" ON public.automation_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own automation rules" ON public.automation_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own automation rules" ON public.automation_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own automation rules" ON public.automation_rules FOR DELETE USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, company)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'company', 'My Company'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tag_collections_updated_at BEFORE UPDATE ON public.tag_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_integrations_updated_at BEFORE UPDATE ON public.api_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();