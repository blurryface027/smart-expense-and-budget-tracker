-- ============================================================
-- Migration: Add regret_feedback table
-- Run this in your Supabase SQL Editor
-- ============================================================

create table if not exists public.regret_feedback (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    transaction_id uuid references public.transactions on delete cascade not null unique,
    regretted boolean not null,
    responded_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.regret_feedback enable row level security;

-- RLS Policies
create policy "Users can view their own regret feedback"
    on public.regret_feedback for select
    using (auth.uid() = user_id);

create policy "Users can insert their own regret feedback"
    on public.regret_feedback for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own regret feedback"
    on public.regret_feedback for update
    using (auth.uid() = user_id);

-- Index for fast lookups
create index if not exists regret_feedback_transaction_id_idx
    on public.regret_feedback (transaction_id);

create index if not exists regret_feedback_user_id_idx
    on public.regret_feedback (user_id);
