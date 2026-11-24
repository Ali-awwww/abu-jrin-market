create or replace function public.guard_shop_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if not public.has_role(auth.uid(),'admin') then new.status := 'pending'; end if;
  elsif new.status is distinct from old.status and not public.has_role(auth.uid(),'admin') then
    new.status := old.status;
  end if;
  return new;
end $$;
update public.shops set status = 'approved' where id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');