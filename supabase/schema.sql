create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.agents (
  id text primary key,
  slug text unique not null,
  name text not null,
  description text not null default '',
  instructions text not null default '',
  provider text not null default 'auto' check (provider in ('auto', 'gemini', 'openai')),
  model text not null default 'gemini-3.5-flash-lite',
  color text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete set null,
  name text not null,
  description text not null default '',
  image_url text,
  status text not null default 'active',
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_agents (
  project_id uuid not null references public.projects(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  primary key (project_id, agent_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  agent_id text references public.agents(id) on delete set null,
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  assigned_agent_id text references public.agents(id) on delete set null,
  title text not null,
  description text not null default '',
  priority text not null default 'medium',
  status text not null default 'todo',
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  name text not null,
  mime_type text not null,
  size bigint not null default 0,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  agent_id text references public.agents(id) on delete set null,
  type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.agents(id) on delete restrict,
  conversation_id uuid references public.conversations(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.agent_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete restrict,
  type text not null,
  tool_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.tasks enable row level security;
alter table public.files enable row level security;
alter table public.activities enable row level security;
alter table public.pending_actions enable row level security;

create policy "users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users manage own spaces" on public.spaces for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own projects" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own conversations" on public.conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own tasks" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own files" on public.files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own activities" on public.activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own pending actions" on public.pending_actions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users access own messages" on public.messages for all using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())) with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
