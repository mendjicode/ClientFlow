-- ClientFlow: run once in Supabase SQL Editor. Browser uses only publishable/anon key.
begin;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default 'Моё пространство', email text default '', currency text not null default 'RUB',
 timezone text not null default 'Europe/Moscow', theme text not null default 'dark' check (theme in ('dark','light'))
);
create table if not exists public.clients (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name))>0),email text default '',contact text default '',links text default '',description text default '',notes text default '',created_at timestamptz not null default now(),unique(id,user_id)
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 client_id uuid not null,title text not null check(length(trim(title))>0),description text default '',type text default '',
 created_at timestamptz not null default now(),deadline date,status integer not null default 0 check(status between 0 and 8),
 priority text default 'Обычный',complexity text default 'Средняя',cost numeric(14,2) not null default 0 check(cost>=0),
 prepayment numeric(14,2) not null default 0 check(prepayment>=0 and prepayment<=cost),spec text default '',
 unique(id,user_id), foreign key(client_id,user_id) references public.clients(id,user_id)
);
create table if not exists public.order_requirements (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 order_id uuid not null,text text not null,done boolean not null default false,
 foreign key(order_id,user_id) references public.orders(id,user_id) on delete cascade
);
create table if not exists public.revisions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 order_id uuid not null,text text not null,priority text default 'Обычный',status text default 'Новая' check(status in ('Новая','В работе','Выполнена')),
 round integer not null default 1 check(round>0),created_at timestamptz not null default now(),
 foreign key(order_id,user_id) references public.orders(id,user_id) on delete cascade
);
create table if not exists public.notes (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 order_id uuid not null,text text not null,created_at timestamptz not null default now(),
 foreign key(order_id,user_id) references public.orders(id,user_id) on delete cascade
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 order_id uuid not null,amount numeric(14,2) not null check(amount>0),date date not null default current_date,description text default '',
 foreign key(order_id,user_id) references public.orders(id,user_id) on delete cascade
);
create table if not exists public.time_entries (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 order_id uuid not null,minutes integer not null check(minutes>0),date date not null default current_date,description text default '',
 foreign key(order_id,user_id) references public.orders(id,user_id) on delete cascade
);
create table if not exists public.task_templates (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null,body text not null default '',unique(id,user_id)
);
create table if not exists public.task_template_items (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 template_id uuid not null,text text not null,position integer not null default 0,
 foreign key(template_id,user_id) references public.task_templates(id,user_id) on delete cascade
);
create table if not exists public.attachments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 order_id uuid not null,name text not null,path text,url text,size integer,
 check(url is null or url ~ '^https?://'),check(path is null or split_part(path,'/',1)=user_id::text),
 foreign key(order_id,user_id) references public.orders(id,user_id) on delete cascade
);
create table if not exists public.activity_logs (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 order_id uuid,text text not null,created_at timestamptz not null default now(),
 foreign key(order_id,user_id) references public.orders(id,user_id) on delete cascade
);
-- RLS applies to every table, including child records. Composite foreign keys prevent cross-owner links.
alter table public.profiles enable row level security;
create policy profile_owner on public.profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
do $$ declare t text; begin
 foreach t in array array['clients','orders','order_requirements','revisions','notes','payments','time_entries','task_templates','task_template_items','attachments','activity_logs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_access on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',t);
 execute format('create index on public.%I(user_id)',t);
 end loop;
end $$;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.profiles,public.clients,public.orders,public.order_requirements,public.revisions,public.notes,public.payments,public.time_entries,public.task_templates,public.task_template_items,public.attachments,public.activity_logs to authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('attachments','attachments',false,10485760) on conflict(id) do nothing;
create policy attachment_owner on storage.objects for all to authenticated
 using(bucket_id='attachments' and (storage.foldername(name))[1]=auth.uid()::text)
 with check(bucket_id='attachments' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
