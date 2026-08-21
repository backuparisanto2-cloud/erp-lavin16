-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','owner','finance','employee');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.can_delete(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','owner','finance')
  )
$$;

CREATE POLICY "profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "roles readable by authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

-- AUDIT LOG
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  changed_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit readable by authenticated" ON public.audit_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit deletable by admin" ON public.audit_logs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_changed jsonb := '[]'::jsonb;
  v_key text;
  v_id text;
  v_email text;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW); END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_new -> v_key IS DISTINCT FROM v_old -> v_key
         AND v_key NOT IN ('updated_at','created_at') THEN
        v_changed := v_changed || to_jsonb(v_key);
      END IF;
    END LOOP;
    IF jsonb_array_length(v_changed) = 0 THEN RETURN NEW; END IF;
  END IF;

  v_id := COALESCE(v_new ->> 'id', v_old ->> 'id');
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.audit_logs (user_id, user_email, table_name, record_id, action, changed_fields, old_data, new_data)
  VALUES (auth.uid(), v_email, TG_TABLE_NAME, v_id, TG_OP, v_changed, v_old, v_new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'rooms','room_items','shared_items','tenants','tenant_phones','tenant_vehicles',
    'tenant_emergency_contacts','tenant_payments','incomes','other_incomes','expenses',
    'user_roles','profiles','conditions','expense_locations'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_audit()',
      t || '_audit', t);
  END LOOP;
END $$;

-- RLS REWRITE: authenticated only, delete restricted
DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'rooms','room_items','shared_items','tenants','tenant_phones','tenant_vehicles',
    'tenant_emergency_contacts','tenant_payments','tenant_status_history','incomes',
    'other_incomes','expenses','conditions','expense_locations'
  ] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('CREATE POLICY "read authenticated" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "insert authenticated" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "update authenticated" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "delete privileged" ON public.%I FOR DELETE TO authenticated USING (public.can_delete(auth.uid()))', t);
  END LOOP;
END $$;

-- STORAGE
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
           AND policyname ILIKE '%inventory%' LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "inventory photos read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'inventory-photos');
CREATE POLICY "inventory photos insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'inventory-photos');
CREATE POLICY "inventory photos update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'inventory-photos') WITH CHECK (bucket_id = 'inventory-photos');
CREATE POLICY "inventory photos delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'inventory-photos' AND public.can_delete(auth.uid()));