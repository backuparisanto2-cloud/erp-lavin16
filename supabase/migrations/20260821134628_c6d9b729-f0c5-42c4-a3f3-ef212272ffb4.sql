ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS nik TEXT,
  ADD COLUMN IF NOT EXISTS student_card TEXT,
  ADD COLUMN IF NOT EXISTS home_address TEXT,
  ADD COLUMN IF NOT EXISTS current_address TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS school_work_address TEXT,
  ADD COLUMN IF NOT EXISTS maps_home_url TEXT,
  ADD COLUMN IF NOT EXISTS maps_school_url TEXT,
  ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rules_agreed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rules_agreed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS check_in_date DATE,
  ADD COLUMN IF NOT EXISTS rent_period TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE;

CREATE TABLE IF NOT EXISTS public.tenant_phones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  label TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenant_phones_tenant_idx ON public.tenant_phones(tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenant_emergency_tenant_idx ON public.tenant_emergency_contacts(tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  brand_model TEXT,
  plate_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenant_vehicles_tenant_idx ON public.tenant_vehicles(tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_type TEXT NOT NULL DEFAULT '1 Bulan',
  period_start DATE,
  period_end DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Transfer Bank',
  notes TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenant_payments_tenant_idx ON public.tenant_payments(tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_name TEXT,
  old_status TEXT,
  new_status TEXT NOT NULL,
  old_room TEXT,
  new_room TEXT,
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenant_status_history_tenant_idx ON public.tenant_status_history(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_phones TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_emergency_contacts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_vehicles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_payments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_status_history TO anon, authenticated;
GRANT ALL ON public.tenant_phones TO service_role;
GRANT ALL ON public.tenant_emergency_contacts TO service_role;
GRANT ALL ON public.tenant_vehicles TO service_role;
GRANT ALL ON public.tenant_payments TO service_role;
GRANT ALL ON public.tenant_status_history TO service_role;

ALTER TABLE public.tenant_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access to tenant_phones" ON public.tenant_phones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to tenant_emergency_contacts" ON public.tenant_emergency_contacts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to tenant_vehicles" ON public.tenant_vehicles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to tenant_payments" ON public.tenant_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to tenant_status_history" ON public.tenant_status_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER tenant_payments_updated_at BEFORE UPDATE ON public.tenant_payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.log_tenant_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.tenant_status_history (tenant_id, tenant_name, old_status, new_status, old_room, new_room, note)
    VALUES (NEW.id, NEW.name, NULL, NEW.status, NULL, NEW.room_number, 'Tenant ditambahkan');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.room_number IS DISTINCT FROM OLD.room_number
       OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
      INSERT INTO public.tenant_status_history (tenant_id, tenant_name, old_status, new_status, old_room, new_room, note)
      VALUES (
        NEW.id, NEW.name, OLD.status, NEW.status, OLD.room_number, NEW.room_number,
        CASE
          WHEN NEW.room_number IS DISTINCT FROM OLD.room_number THEN 'Perubahan kamar'
          WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'Perubahan status'
          ELSE 'Perubahan jatuh tempo'
        END
      );
    END IF;
    RETURN NEW;
  ELSE
    INSERT INTO public.tenant_status_history (tenant_id, tenant_name, old_status, new_status, old_room, new_room, note)
    VALUES (NULL, OLD.name, OLD.status, OLD.status, OLD.room_number, NULL, 'Tenant dihapus');
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS tenants_log_change ON public.tenants;
CREATE TRIGGER tenants_log_change
AFTER INSERT OR UPDATE OR DELETE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.log_tenant_change();

CREATE OR REPLACE FUNCTION public.inventory_code(_name text, _date date, _seq int)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT rpad(upper(substring(regexp_replace(coalesce(_name,''), '[^A-Za-z]', '', 'g') from 1 for 3)), 3, 'X')
      || '-' || to_char(_date, 'DDMMYY') || '-' || lpad(_seq::text, 2, '0')
$$;

CREATE OR REPLACE FUNCTION public.generate_inventory_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_abbr TEXT;
  v_date DATE;
  v_seq INTEGER;
  v_code TEXT;
  v_table TEXT;
BEGIN
  v_table := TG_TABLE_NAME;
  v_abbr := upper(substr(regexp_replace(NEW.name, '[^A-Za-z]', '', 'g'), 1, 3));
  IF v_abbr IS NULL OR v_abbr = '' THEN
    v_abbr := 'ITM';
  END IF;

  v_date := COALESCE(NEW.purchase_date, CURRENT_DATE);

  IF v_table = 'room_items' THEN
    SELECT COALESCE(MAX(
      CAST(SPLIT_PART(code, '-', 3) AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM public.room_items
    WHERE code LIKE v_abbr || '-' || to_char(v_date, 'DDMMYY') || '-%';
  ELSIF v_table = 'shared_items' THEN
    SELECT COALESCE(MAX(
      CAST(SPLIT_PART(code, '-', 3) AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM public.shared_items
    WHERE code LIKE v_abbr || '-' || to_char(v_date, 'DDMMYY') || '-%';
  ELSE
    v_seq := 1;
  END IF;

  v_code := v_abbr || '-' || to_char(v_date, 'DDMMYY') || '-' || lpad(v_seq::text, 2, '0');
  NEW.code := v_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_items_generate_code ON public.room_items;
CREATE TRIGGER room_items_generate_code
BEFORE INSERT ON public.room_items
FOR EACH ROW
WHEN (NEW.code IS NULL OR NEW.code = '')
EXECUTE FUNCTION public.generate_inventory_code();

DROP TRIGGER IF EXISTS shared_items_generate_code ON public.shared_items;
CREATE TRIGGER shared_items_generate_code
BEFORE INSERT ON public.shared_items
FOR EACH ROW
WHEN (NEW.code IS NULL OR NEW.code = '')
EXECUTE FUNCTION public.generate_inventory_code();

CREATE UNIQUE INDEX IF NOT EXISTS room_items_code_key ON public.room_items (code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS shared_items_code_key ON public.shared_items (code) WHERE code IS NOT NULL;

ALTER TABLE public.room_items ADD CONSTRAINT room_items_code_unique UNIQUE (code);
ALTER TABLE public.shared_items ADD CONSTRAINT shared_items_code_unique UNIQUE (code);

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS ktp_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS id_card_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photo_path text;