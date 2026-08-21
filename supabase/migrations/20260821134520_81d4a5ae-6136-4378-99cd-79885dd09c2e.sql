CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact text,
  room_number text,
  status text NOT NULL DEFAULT 'Aktif',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO anon, authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access to tenants" ON public.tenants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.incomes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_name text NOT NULL,
  room_number text,
  period_type text NOT NULL DEFAULT '1 Bulan',
  period_months integer NOT NULL DEFAULT 1,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'Transfer Bank',
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incomes TO anon, authenticated;
GRANT ALL ON public.incomes TO service_role;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access to incomes" ON public.incomes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER incomes_updated_at BEFORE UPDATE ON public.incomes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.other_incomes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  income_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  payer text,
  payment_method text NOT NULL DEFAULT 'Transfer Bank',
  amount numeric NOT NULL DEFAULT 0,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.other_incomes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.other_incomes TO anon;
GRANT ALL ON public.other_incomes TO service_role;

ALTER TABLE public.other_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access to other_incomes" ON public.other_incomes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER other_incomes_updated_at BEFORE UPDATE ON public.other_incomes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.room_items ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.shared_items ADD COLUMN IF NOT EXISTS code text;

WITH numbered AS (
  SELECT id,
         upper(regexp_replace(substr(regexp_replace(name, '[^A-Za-z]', '', 'g'), 1, 3), '\s', '', 'g')) AS abbr,
         to_char(purchase_date, 'DDMMYY') AS d,
         row_number() OVER (
           PARTITION BY upper(substr(regexp_replace(name, '[^A-Za-z]', '', 'g'), 1, 3)), purchase_date
           ORDER BY created_at, id
         ) AS seq
  FROM public.room_items
  WHERE purchase_date IS NOT NULL AND code IS NULL
)
UPDATE public.room_items r
SET code = n.abbr || '-' || n.d || '-' || lpad(n.seq::text, 2, '0')
FROM numbered n
WHERE r.id = n.id AND n.abbr <> '';

WITH numbered AS (
  SELECT id,
         upper(substr(regexp_replace(name, '[^A-Za-z]', '', 'g'), 1, 3)) AS abbr,
         to_char(purchase_date, 'DDMMYY') AS d,
         row_number() OVER (
           PARTITION BY upper(substr(regexp_replace(name, '[^A-Za-z]', '', 'g'), 1, 3)), purchase_date
           ORDER BY created_at, id
         ) AS seq
  FROM public.shared_items
  WHERE purchase_date IS NOT NULL AND code IS NULL
)
UPDATE public.shared_items s
SET code = n.abbr || '-' || n.d || '-' || lpad(n.seq::text, 2, '0')
FROM numbered n
WHERE s.id = n.id AND n.abbr <> '';