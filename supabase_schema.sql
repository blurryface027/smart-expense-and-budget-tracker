-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Tables
create table public.categories (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    name text not null,
    icon text default 'HelpCircle',
    color text default '#64748b',
    type text check (type in ('income', 'expense')) not null,
    is_default boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.transactions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    type text check (type in ('income', 'expense')) not null,
    amount numeric(10,2) not null,
    category_id uuid references public.categories on delete set null,
    date timestamp with time zone not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.budgets (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    category_id uuid references public.categories on delete cascade not null,
    limit_amount numeric(10,2) not null,
    period text check (period in ('monthly', 'weekly')) default 'monthly',
    start_date timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, category_id)
);

create table public.goals (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    title text not null,
    target_amount numeric(10,2) not null,
    current_amount numeric(10,2) default 0.00,
    deadline timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;

-- 3. Create RLS Policies
-- Categories policies
create policy "Users can view their own categories" on public.categories for select using (auth.uid() = user_id);
create policy "Users can insert their own categories" on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can update their own categories" on public.categories for update using (auth.uid() = user_id);
create policy "Users can delete their own categories" on public.categories for delete using (auth.uid() = user_id);

-- Transactions policies
create policy "Users can view their own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert their own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update their own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete their own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- Budgets policies
create policy "Users can view their own budgets" on public.budgets for select using (auth.uid() = user_id);
create policy "Users can insert their own budgets" on public.budgets for insert with check (auth.uid() = user_id);
create policy "Users can update their own budgets" on public.budgets for update using (auth.uid() = user_id);
create policy "Users can delete their own budgets" on public.budgets for delete using (auth.uid() = user_id);

-- Goals policies
create policy "Users can view their own goals" on public.goals for select using (auth.uid() = user_id);
create policy "Users can insert their own goals" on public.goals for insert with check (auth.uid() = user_id);
create policy "Users can update their own goals" on public.goals for update using (auth.uid() = user_id);
create policy "Users can delete their own goals" on public.goals for delete using (auth.uid() = user_id);

-- 4. Setup default categories trigger (Optional but useful)
-- Trigger to insert default categories for new users on auth.users insert
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.categories (user_id, name, type, icon, color, is_default)
  values 
    (new.id, 'Salary', 'income', 'briefcase', '#10b981', true),
    (new.id, 'Food & Dining', 'expense', 'utensils', '#f43f5e', true),
    (new.id, 'Transportation', 'expense', 'car', '#3b82f6', true),
    (new.id, 'Entertainment', 'expense', 'film', '#8b5cf6', true),
    (new.id, 'Shopping', 'expense', 'shopping-bag', '#ec4899', true),
    (new.id, 'Housing', 'expense', 'home', '#eab308', true),
    (new.id, 'Utilities', 'expense', 'zap', '#f97316', true);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
