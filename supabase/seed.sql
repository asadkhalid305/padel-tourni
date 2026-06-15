insert into public.players (id, name, rating, is_active)
values
  ('10000000-0000-0000-0000-000000000001', 'Maya Fischer', 7.5, true),
  ('10000000-0000-0000-0000-000000000002', 'Noah Becker', 6.0, true),
  ('10000000-0000-0000-0000-000000000003', 'Sofia Keller', 8.0, true),
  ('10000000-0000-0000-0000-000000000004', 'Leon Weber', 5.5, true),
  ('10000000-0000-0000-0000-000000000005', 'Amira Wagner', 7.0, true),
  ('10000000-0000-0000-0000-000000000006', 'Elias Hoffmann', 6.5, true),
  ('10000000-0000-0000-0000-000000000007', 'Nina Bauer', 5.0, true),
  ('10000000-0000-0000-0000-000000000008', 'Jonas Richter', 8.5, true),
  ('10000000-0000-0000-0000-000000000009', 'Lina Schmitt', 6.0, true)
on conflict (id) do update
set
  name = excluded.name,
  rating = excluded.rating,
  is_active = excluded.is_active;
