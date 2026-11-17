CREATE TABLE neighborhoods (
  name text PRIMARY KEY CHECK (btrim(name) <> '')
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  email text NOT NULL CHECK (btrim(email) <> ''),
  password_hash text NOT NULL CHECK (btrim(password_hash) <> ''),
  neighborhood text NOT NULL REFERENCES neighborhoods(name),
  bio text NOT NULL DEFAULT '',
  phone text,
  email_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(btrim(email)));

CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (btrim(title) <> ''),
  description text NOT NULL CHECK (btrim(description) <> ''),
  photo_url text NOT NULL CHECK (btrim(photo_url) <> ''),
  category text NOT NULL CHECK (category IN ('Tools', 'Garden & Yard', 'Outdoor & Camping', 'Sports & Fitness', 'Electronics', 'Kitchen & Appliances', 'Party & Events', 'Other')),
  condition text NOT NULL CHECK (condition IN ('New', 'Like new', 'Good', 'Fair')),
  neighborhood text NOT NULL REFERENCES neighborhoods(name),
  available_from date NOT NULL,
  available_to date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (available_from <= available_to)
);
CREATE INDEX listings_owner_idx ON listings(owner_id);
CREATE INDEX listings_browse_idx ON listings(neighborhood, category) WHERE status = 'active';

CREATE TABLE borrow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  borrower_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  message text NOT NULL CHECK (btrim(message) <> ''),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_date <= end_date)
);
CREATE INDEX borrow_requests_listing_status_idx ON borrow_requests(listing_id, status);
CREATE INDEX borrow_requests_borrower_idx ON borrow_requests(borrower_id);
