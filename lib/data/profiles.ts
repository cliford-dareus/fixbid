import {supabase} from '@/lib/supabase';
import {mapProfileRow, profileUpdatesToDb} from './mappers';
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

/**
 * Update (or insert) the handyman profile row.
 * Uses upsert so first-time setup works when no row exists yet.
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Profile>,
): Promise<Result<Profile>> {
  try {
    const db = profileUpdatesToDb(updates);
    db.id = userId;

    const {data, error} = await supabase
      .from('profiles')
      .upsert(db, {onConflict: 'id'})
      .select()
      .single();

    if (error) return err(error);
    return ok(mapProfileRow(data));
  } catch (e) {
    return err(e, 'Failed to update profile');
  }
}
