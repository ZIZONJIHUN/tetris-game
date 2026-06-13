-- supabase/migrations/007_set_active_cosmetic.sql
create or replace function public.set_active_cosmetic(
  p_kind text,           -- 'badge' | 'skin'
  p_achievement_id text  -- null to clear
) returns void language plpgsql security definer set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_owned boolean;
begin
  if v_player_id is null then raise exception 'unauthenticated'; end if;
  if p_kind not in ('badge','skin') then raise exception 'invalid kind'; end if;

  if p_achievement_id is not null then
    select true into v_owned
    from public.player_achievements
    where player_id = v_player_id and achievement_id = p_achievement_id;
    if not v_owned then raise exception 'achievement not owned'; end if;
  end if;

  if p_kind = 'badge' then
    update public.player_stats set active_badge_id = p_achievement_id, updated_at = now()
    where player_id = v_player_id;
  else
    update public.player_stats set active_skin_id = p_achievement_id, updated_at = now()
    where player_id = v_player_id;
  end if;
end;
$$;

grant execute on function public.set_active_cosmetic(text, text) to authenticated;
