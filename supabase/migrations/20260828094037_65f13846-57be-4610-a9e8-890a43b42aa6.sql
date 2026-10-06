create or replace function public.public_recent_payouts(_limit integer default 6)
returns table(username text, amount numeric, released_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(left(pr.username, 2) || repeat('*', greatest(length(pr.username) - 3, 1)) || right(pr.username, 1), 'clipper') as username,
    p.amount,
    p.released_at
  from public.payouts p
  left join public.profiles pr on pr.id = p.clipper_user_id
  where p.status = 'paid' and p.released_at is not null
  order by p.released_at desc
  limit least(coalesce(_limit, 6), 20)
$$;

grant execute on function public.public_recent_payouts(integer) to anon, authenticated;