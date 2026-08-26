import {supabase} from '@/lib/supabase';
import {mapProfileRow} from './mappers';
import {err, ok, type Result} from './result';
import type {Profile} from './types';

export async function getProfile(userId: string): Promise<Result<Profile | null>> {
  try {
    const {data, error} = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) return err(error);
    if (!data) return ok(null);
    return ok(mapProfileRow(data));
  } catch (e) {
    return err(e, 'Failed to load profile');
  }
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>,
): Promise<Result<Profile>> {
  try {
    const db: Record<string, unknown> = {};
    if (updates.full_name !== undefined) db.full_name = updates.full_name;
    if (updates.business_name !== undefined) db.business_name = updates.business_name;
    if (updates.phone !== undefined) db.phone = updates.phone;
    if (updates.address !== undefined) db.address = updates.address;
    if (updates.hourly_rate !== undefined) db.hourly_rate = updates.hourly_rate;
    if (updates.logo_url !== undefined) db.logo_url = updates.logo_url;
    if (updates.stripe_account_id !== undefined) {
      db.stripe_account_id = updates.stripe_account_id;
    }

    const {data, error} = await supabase
      .from('profiles')
      .update(db)
      .eq('id', userId)
      .select()
      .single();

    if (error) return err(error);
    return ok(mapProfileRow(data));
  } catch (e) {
    return err(e, 'Failed to update profile');
  }
}
