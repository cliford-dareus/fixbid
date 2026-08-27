-- Store Expo push tokens so edge functions can notify the handyman offline.
alter table public.profiles
  add column if not exists expo_push_token text;

comment on column public.profiles.expo_push_token is
  'Expo push token (ExponentPushToken[...]) for the handyman device';
