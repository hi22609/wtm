-- ═══════════════════════════════════════════════════════════════════════════
-- 020  ADMIN BAN / UNBAN
-- ═══════════════════════════════════════════════════════════════════════════
-- is_banned (011) already drives every enforcement path that exists: banned
-- creators drop out of nearby_moves (011, 016), banned members disappear from
-- public_profiles (019), and banning someone auto-flags whoever invited them
-- for review (011's on_user_banned trigger). None of that was reachable,
-- though -- nothing in the schema could ever set is_banned to true. Column-
-- level privileges (015) block members from doing it to themselves or anyone
-- else, and there was no other path in. This is that path.
--
-- Same shape as promote_from_waitlist (018): SECURITY DEFINER, PUBLIC's
-- default EXECUTE grant revoked, so only the service-role key can call it.
-- That means it can never ship inside the app bundle -- it's meant to be
-- called from wherever the person holding that key administers the app (a
-- Supabase SQL console, an admin script, an internal tool), not the client.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists banned_at     timestamptz,
  add column if not exists banned_reason text;

create or replace function public.admin_ban_user(target uuid, reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if reason is null or length(trim(reason)) = 0 then
    raise exception 'ban_reason_required'
      using hint = 'admin_ban_user requires a non-empty reason.';
  end if;

  update public.profiles
     set is_banned     = true,
         banned_at     = now(),
         banned_reason = reason
   where id = target;

  if not found then
    raise exception 'profile_not_found';
  end if;
end;
$$;

create or replace function public.admin_unban_user(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles
     set is_banned     = false,
         banned_at     = null,
         banned_reason = null
   where id = target;

  if not found then
    raise exception 'profile_not_found';
  end if;
end;
$$;

revoke execute on function public.admin_ban_user(uuid, text) from public;
revoke execute on function public.admin_unban_user(uuid)     from public;
