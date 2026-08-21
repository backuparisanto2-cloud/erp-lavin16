CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  floor INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.room_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'Baik',
  location TEXT,
  notes TEXT,
  vendor TEXT,
  purchase_price NUMERIC,
  purchase_date DATE,
  warranty_until DATE,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  receipts JSONB NOT NULL DEFAULT '[]'::jsonb,
  brand TEXT,
  serial_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX room_items_room_id_idx ON public.room_items(room_id);

CREATE TABLE public.shared_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Umum',
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'Baik',
  location TEXT,
  notes TEXT,
  vendor TEXT,
  purchase_price NUMERIC,
  purchase_date DATE,
  warranty_until DATE,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  receipts JSONB NOT NULL DEFAULT '[]'::jsonb,
  brand TEXT,
  serial_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.conditions (
  name TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_locations (
  name text PRIMARY KEY,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'Belanja',
  name text NOT NULL,
  expense_date date NOT NULL DEFAULT current_date,
  amount numeric NOT NULL DEFAULT 0,
  invoice_no text,
  notes text,
  location text,
  vendor text,
  dues_name text,
  dues_contact text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expenses_date_idx ON public.expenses (expense_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conditions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_locations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT ALL ON public.room_items TO service_role;
GRANT ALL ON public.shared_items TO service_role;
GRANT ALL ON public.conditions TO service_role;
GRANT ALL ON public.expense_locations TO service_role;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access to rooms" ON public.rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to room_items" ON public.room_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to shared_items" ON public.shared_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to conditions" ON public.conditions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to expense_locations" ON public.expense_locations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to expenses" ON public.expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER room_items_updated_at BEFORE UPDATE ON public.room_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER shared_items_updated_at BEFORE UPDATE ON public.shared_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.conditions (name, sort_order) VALUES
  ('Baik', 1), ('Perlu Perbaikan', 2), ('Rusak', 3);

INSERT INTO public.expense_locations (name, sort_order) VALUES
  ('Kost Putra', 10),
  ('Kost Putri', 20),
  ('Area Umum', 30);

INSERT INTO public.rooms (number, floor)
SELECT lpad(n::text, 3, '0'),
       CASE WHEN n <= 10 THEN 1 WHEN n <= 21 THEN 2 ELSE 3 END
FROM generate_series(1, 32) AS n;

INSERT INTO public.room_items (room_id, name, quantity)
SELECT r.id, i.name, i.qty
FROM public.rooms r
CROSS JOIN (VALUES
  ('TV', 1), ('AC', 1), ('Dipan', 1), ('Meja Belajar', 1), ('Kursi Pendek', 1),
  ('Kursi Panjang', 1), ('MCB Listrik', 1), ('Kasur', 1), ('Bantal Guling', 2)
) AS i(name, qty);

INSERT INTO public.shared_items (name, category, quantity, location) VALUES
  ('Pompa Air', 'Air', 1, 'Area belakang'),
  ('Torent Air', 'Air', 1, 'Atap'),
  ('Pagar', 'Bangunan', 1, 'Depan'),
  ('Trafo Listrik Utama', 'Listrik', 1, 'Depan'),
  ('Kompor Gas', 'Dapur', 1, 'Dapur 1'),
  ('Dapur 1', 'Dapur', 1, 'Lantai 1'),
  ('Dapur 2', 'Dapur', 1, 'Lantai 2'),
  ('Dapur 3', 'Dapur', 1, 'Lantai 3'),
  ('Lampu Halaman 1', 'Penerangan', 1, 'Halaman depan'),
  ('Lampu Halaman 2', 'Penerangan', 1, 'Halaman samping'),
  ('Access Point 1', 'Jaringan', 1, 'Lantai 1'),
  ('IP Camera 1', 'Keamanan', 1, 'Depan'),
  ('IP Camera 2', 'Keamanan', 1, 'Lorong lantai 1');

CREATE POLICY "Public read inventory photos" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'inventory-photos');
CREATE POLICY "Public upload inventory photos" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'inventory-photos');
CREATE POLICY "Public update inventory photos" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'inventory-photos') WITH CHECK (bucket_id = 'inventory-photos');
CREATE POLICY "Public delete inventory photos" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'inventory-photos');