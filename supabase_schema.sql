-- Run this SQL in your Supabase project → SQL Editor → New query

-- 1. Accounts table (extends Supabase auth.users)
create table public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  credits integer not null default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.accounts enable row level security;

-- Users can only read/update their own account
create policy "Users can view own account"
  on public.accounts for select using (auth.uid() = id);
create policy "Users can update own account"
  on public.accounts for update using (auth.uid() = id);

-- 2. Usage log
create table public.usage_log (
  id bigserial primary key,
  user_id uuid references public.accounts(id) on delete cascade,
  agent_id text not null,
  agent_name text,
  dept text,
  credits_used integer not null default 1,
  created_at timestamptz default now()
);

alter table public.usage_log enable row level security;
create policy "Users can view own usage"
  on public.usage_log for select using (auth.uid() = user_id);

-- 3. Payments table
create table public.payments (
  id bigserial primary key,
  user_id uuid references public.accounts(id) on delete cascade,
  razorpay_payment_id text unique,
  razorpay_order_id text,
  pack_id text,
  credits_added integer not null,
  amount_inr numeric(10,2),
  created_at timestamptz default now()
);

alter table public.payments enable row level security;
create policy "Users can view own payments"
  on public.payments for select using (auth.uid() = user_id);

-- 4. Auto-create account row when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.accounts (id, email, full_name, credits)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    5
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Service role bypass (for server-side credit deductions)
-- The supabaseAdmin client (service role key) bypasses RLS automatically.
-- No extra policies needed for admin writes.
