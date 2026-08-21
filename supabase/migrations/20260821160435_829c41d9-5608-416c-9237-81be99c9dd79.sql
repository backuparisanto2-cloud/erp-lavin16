-- 1. Role permissions
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions read authenticated" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions insert admin" ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "role_permissions update admin" ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "role_permissions delete admin" ON public.role_permissions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER role_permissions_updated_at BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER role_permissions_audit AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- Seed defaults
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_update, can_delete)
SELECT r.role, m.module,
  true,
  CASE WHEN r.role IN ('admin','owner') THEN true
       WHEN r.role = 'finance' THEN m.module <> 'akses'
       ELSE m.module IN ('kamar','fasilitas','tenant') END,
  CASE WHEN r.role IN ('admin','owner') THEN true
       WHEN r.role = 'finance' THEN m.module <> 'akses'
       ELSE m.module IN ('kamar','fasilitas','tenant') END,
  CASE WHEN r.role IN ('admin','owner') THEN true
       WHEN r.role = 'finance' THEN m.module <> 'akses'
       ELSE false END
FROM (VALUES ('admin'::public.app_role),('owner'),('finance'),('employee')) AS r(role)
CROSS JOIN (VALUES ('dashboard'),('denah'),('kamar'),('fasilitas'),('tenant'),('pendapatan'),('pengeluaran'),('jurnal'),('laporan'),('kelola'),('notifikasi'),('pengguna'),('audit'),('akses')) AS m(module);

-- Employee tidak boleh melihat modul administratif
UPDATE public.role_permissions
SET can_view = false
WHERE role = 'employee' AND module IN ('pengguna','audit','akses');

-- 2. has_permission + can_delete berbasis izin
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role AND rp.module = _module
    WHERE ur.user_id = _user_id
      AND CASE _action
        WHEN 'view' THEN rp.can_view
        WHEN 'create' THEN rp.can_create
        WHEN 'update' THEN rp.can_update
        WHEN 'delete' THEN rp.can_delete
        ELSE false
      END
  )
$$;

REVOKE ALL ON FUNCTION public.has_permission(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_delete(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND rp.can_delete
  )
$$;

-- 3. Audit log: kategori peristiwa + ringkasan
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'data';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS summary text;
CREATE INDEX IF NOT EXISTS audit_logs_event_type_idx ON public.audit_logs (event_type, created_at DESC);

-- 4. Notifikasi
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.notifications TO authenticated;
GRANT DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications read own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "notifications insert authenticated" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications delete privileged" ON public.notifications
  FOR DELETE TO authenticated USING (public.can_delete(auth.uid()));

CREATE INDEX notifications_created_idx ON public.notifications (created_at DESC);

CREATE TABLE public.notification_reads (
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.notification_reads TO authenticated;
GRANT ALL ON public.notification_reads TO service_role;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_reads own select" ON public.notification_reads
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notification_reads own insert" ON public.notification_reads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "notification_reads own delete" ON public.notification_reads
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 5. Trigger notifikasi
CREATE OR REPLACE FUNCTION public.notify_tenant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (title, message, type, link)
    VALUES ('Tenant baru', NEW.name || ' ditambahkan pada kamar ' || COALESCE(NEW.room_number, '-'), 'tenant', '/tenant');
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.notifications (title, message, type, link)
      VALUES ('Status tenant berubah', NEW.name || ': ' || COALESCE(OLD.status,'-') || ' → ' || NEW.status, 'tenant', '/tenant');
    END IF;
    IF NEW.room_number IS DISTINCT FROM OLD.room_number THEN
      INSERT INTO public.notifications (title, message, type, link)
      VALUES ('Perpindahan kamar', NEW.name || ': kamar ' || COALESCE(OLD.room_number,'-') || ' → ' || COALESCE(NEW.room_number,'-'), 'tenant', '/tenant');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_tenant_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tenants_notify AFTER INSERT OR UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.notify_tenant_change();

CREATE OR REPLACE FUNCTION public.notify_item_condition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room text;
BEGIN
  IF NEW.condition IS DISTINCT FROM OLD.condition AND NEW.condition IN ('Rusak','Perbaikan','Perlu Perbaikan') THEN
    IF TG_TABLE_NAME = 'room_items' THEN
      SELECT number INTO v_room FROM public.rooms WHERE id = NEW.room_id;
      INSERT INTO public.notifications (title, message, type, link)
      VALUES ('Barang perlu perhatian', 'Kamar ' || COALESCE(v_room,'-') || ': ' || NEW.name || ' → ' || NEW.condition, 'inventaris', '/kamar');
    ELSE
      INSERT INTO public.notifications (title, message, type, link)
      VALUES ('Fasilitas perlu perhatian', NEW.name || ' → ' || NEW.condition, 'inventaris', '/fasilitas');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_item_condition() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER room_items_notify AFTER UPDATE ON public.room_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_item_condition();
CREATE TRIGGER shared_items_notify AFTER UPDATE ON public.shared_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_item_condition();