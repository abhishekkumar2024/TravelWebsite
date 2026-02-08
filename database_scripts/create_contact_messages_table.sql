-- Create contact_messages table if handling contact form submissions
create table if not exists public.contact_messages (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    email text not null,
    subject text not null,
    message text not null,
    status text default 'new', -- e.g., new, read, replied
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.contact_messages enable row level security;

-- Policy: Allow anyone (anon) to insert contact messages
create policy "Allow public insert to contact_messages"
    on public.contact_messages
    for insert
    to anon, authenticated
    with check (true);

-- Policy: Allow only admins/service_role to select/read messages (optional but good practice)
-- Assuming you rely on dashboard or admin interface
create policy "Allow only service role to select contact_messages"
    on public.contact_messages
    for select
    to service_role
    using (true);

-- Be permissive for now if needed for admin dashboard (or create admin policies)
-- create policy "Allow admins to select" ...
