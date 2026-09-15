-- BH Store schema — run in Neon SQL Editor (idempotent: safe to re-run)
CREATE SEQUENCE IF NOT EXISTS order_seq START 1;

CREATE TABLE IF NOT EXISTS products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name_fr     text NOT NULL,
  name_ar     text NOT NULL,
  tagline_fr  text,
  tagline_ar  text,
  desc_fr     text,
  desc_ar     text,
  features    jsonb NOT NULL DEFAULT '[]',  -- [{"fr":"...","ar":"..."}]
  price       integer NOT NULL,             -- DA
  images      jsonb NOT NULL DEFAULT '[]',  -- [{"url":"...","alt_fr":"...","alt_ar":"...","position":0}]
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wilayas (
  code          integer PRIMARY KEY,        -- 1..58
  name_fr       text NOT NULL,
  name_ar       text NOT NULL,
  fee_domicile  integer NOT NULL,           -- DA
  fee_stopdesk  integer                     -- NULL = stopdesk indisponible
);

CREATE TABLE IF NOT EXISTS orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  text UNIQUE NOT NULL
                DEFAULT 'BH-' || lpad(nextval('order_seq')::text, 5, '0'),
  product_id    uuid REFERENCES products(id),
  quantity      integer NOT NULL DEFAULT 1,
  unit_price    integer NOT NULL,           -- snapshot at purchase time
  customer_name text NOT NULL,
  phone         text NOT NULL,
  wilaya_code   integer NOT NULL REFERENCES wilayas(code),
  commune       text NOT NULL,
  delivery_type text NOT NULL CHECK (delivery_type IN ('domicile','stopdesk')),
  delivery_fee  integer NOT NULL,
  total         integer NOT NULL,
  note          text,
  status        text NOT NULL DEFAULT 'nouveau'
                CHECK (status IN ('nouveau','confirmee','expediee','livree','annulee')),
  source        text NOT NULL DEFAULT 'site',  -- site | whatsapp | phone
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);