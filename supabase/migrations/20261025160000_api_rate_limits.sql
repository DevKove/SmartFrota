create table if not exists public.api_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists api_rate_limits_updated_at_idx
  on public.api_rate_limits (updated_at);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
begin
  if p_bucket_key is null or length(p_bucket_key) <> 64
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit arguments';
  end if;

  insert into public.api_rate_limits as current_bucket
    (bucket_key, window_started_at, request_count, updated_at)
  values (p_bucket_key, now(), 1, now())
  on conflict (bucket_key) do update
    set request_count = case
          when current_bucket.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
          else current_bucket.request_count + 1
        end,
        window_started_at = case
          when current_bucket.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
          else current_bucket.window_started_at
        end,
        updated_at = now()
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$function$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;
