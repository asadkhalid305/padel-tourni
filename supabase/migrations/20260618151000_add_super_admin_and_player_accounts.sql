alter table public.players
add column account_email text;

alter table public.players
add constraint players_account_email_normalized
check (account_email is null or (account_email = lower(btrim(account_email)) and account_email <> ''));

create unique index players_account_email_unique
on public.players(account_email)
where account_email is not null;

alter table public.app_users
drop constraint app_users_role_check;

alter table public.app_users
add constraint app_users_role_check
check (role in ('member', 'admin', 'super_admin'));

update public.app_users
set role = 'super_admin'
where email = 'asadkhalid305@gmail.com';
