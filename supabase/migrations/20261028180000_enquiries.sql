-- Relay: messages from the website. The Help page's contact form and the
-- out-of-area waitlist both land here, through the contact Edge Function.
-- Nobody reads or writes the table directly: the function uses the service role.

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('help', 'waitlist')),
  name text check (char_length(name) <= 120),
  email text not null check (char_length(email) between 3 and 254),
  postcode text check (char_length(postcode) <= 10),
  topic text check (char_length(topic) <= 80),
  message text check (char_length(message) <= 4000),
  user_id uuid references auth.users (id) on delete set null,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index enquiries_email_recent on public.enquiries (email, created_at desc);

alter table public.enquiries enable row level security;
