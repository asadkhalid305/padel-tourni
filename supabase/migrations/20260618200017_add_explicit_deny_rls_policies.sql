create policy "Deny direct client access"
on public.players
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny direct client access"
on public.events
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny direct client access"
on public.event_players
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny direct client access"
on public.event_rounds
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny direct client access"
on public.matches
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny direct client access"
on public.app_users
for all
to anon, authenticated
using (false)
with check (false);
