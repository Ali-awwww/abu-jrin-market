create type public.app_role as enum ('admin','user');
create type public.shop_status as enum ('pending','approved');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  full_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.admin_phones (phone text primary key);
grant all on public.admin_phones to service_role;
alter table public.admin_phones enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare p text := new.raw_user_meta_data->>'phone';
begin
  insert into public.profiles (id, phone, full_name) values (new.id, p, new.raw_user_meta_data->>'full_name');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if p is not null and exists (select 1 from public.admin_phones where phone = p) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- admin phones added later also grant admin to existing users
create or replace function public.handle_admin_phone()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role)
  select id, 'admin' from public.profiles where phone = new.phone
  on conflict do nothing;
  return new;
end $$;
create trigger on_admin_phone after insert on public.admin_phones for each row execute function public.handle_admin_phone();

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  name text not null,
  owner_name text not null,
  phone text not null,
  address text not null default '',
  lat double precision,
  lng double precision,
  open_time time not null default '08:00',
  close_time time not null default '21:00',
  status shop_status not null default 'pending',
  created_at timestamptz not null default now()
);
grant select on public.shops to anon;
grant select, insert, update on public.shops to authenticated;
grant all on public.shops to service_role;
alter table public.shops enable row level security;
create policy "approved shops public" on public.shops for select to anon, authenticated using (status = 'approved');
create policy "owner reads own shop" on public.shops for select to authenticated using (owner_id = auth.uid());
create policy "admin reads all shops" on public.shops for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "owner creates shop" on public.shops for insert to authenticated with check (owner_id = auth.uid());
create policy "owner updates shop" on public.shops for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "admin updates shop" on public.shops for update to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.guard_shop_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.has_role(auth.uid(),'admin') then new.status := 'pending'; end if;
  elsif new.status is distinct from old.status and not public.has_role(auth.uid(),'admin') then
    new.status := old.status;
  end if;
  return new;
end $$;
create trigger shops_guard_status before insert or update on public.shops for each row execute function public.guard_shop_status();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  category text not null default 'أخرى',
  unit text not null default 'كغ',
  price_syp numeric not null default 0,
  price_usd numeric not null default 0,
  stock numeric not null default 0,
  photo_url text,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);
create index on public.products (shop_id);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "visible products public" on public.products for select to anon, authenticated
  using (visible and exists (select 1 from public.shops s where s.id = shop_id and s.status = 'approved'));
create policy "owner reads products" on public.products for select to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "owner inserts products" on public.products for insert to authenticated
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid() and s.status = 'approved'));
create policy "owner updates products" on public.products for update to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid() and s.status = 'approved'));
create policy "owner deletes products" on public.products for delete to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));

insert into public.shops (id, name, owner_name, phone, address, lat, lng, open_time, close_time, status) values
('11111111-1111-1111-1111-111111111111','دكان أبو أحمد','أبو أحمد','963944000001','الشارع الرئيسي، قرب الجامع',36.0478,37.4505,'07:00','22:00','approved'),
('22222222-2222-2222-2222-222222222222','دكان أبو خالد','أبو خالد','963944000002','الحارة الشرقية، قرب المدرسة',36.0469,37.4528,'08:00','20:00','approved'),
('33333333-3333-3333-3333-333333333333','دكان أبو محمد','أبو محمد','963944000003','الحارة الغربية، جانب الفرن',36.0486,37.4487,'06:00','14:00','approved');

insert into public.products (shop_id, name, category, unit, price_syp, price_usd, stock) values
('11111111-1111-1111-1111-111111111111','بطاطا','خضار','كغ',8000,0.62,40),
('11111111-1111-1111-1111-111111111111','طماطم','خضار','كغ',9000,0.69,25),
('11111111-1111-1111-1111-111111111111','بصل','خضار','كغ',6000,0.46,30),
('11111111-1111-1111-1111-111111111111','خبز','خبز','ربطة',4000,0.31,50),
('11111111-1111-1111-1111-111111111111','سكر','بقالة','كغ',14000,1.08,20),
('11111111-1111-1111-1111-111111111111','زيت','بقالة','لتر',30000,2.31,12),
('22222222-2222-2222-2222-222222222222','بطاطا','خضار','كغ',7000,0.54,15),
('22222222-2222-2222-2222-222222222222','طماطم','خضار','كغ',10000,0.77,10),
('22222222-2222-2222-2222-222222222222','بصل','خضار','كغ',5500,0.42,20),
('22222222-2222-2222-2222-222222222222','سكر','بقالة','كغ',13000,1.00,8),
('22222222-2222-2222-2222-222222222222','زيت','بقالة','لتر',32000,2.46,6),
('33333333-3333-3333-3333-333333333333','بطاطا','خضار','كغ',7500,0.58,60),
('33333333-3333-3333-3333-333333333333','طماطم','خضار','كغ',8500,0.65,35),
('33333333-3333-3333-3333-333333333333','خبز','خبز','ربطة',3500,0.27,80),
('33333333-3333-3333-3333-333333333333','سكر','بقالة','كغ',15000,1.15,15),
('33333333-3333-3333-3333-333333333333','زيت','بقالة','لتر',29000,2.23,10);