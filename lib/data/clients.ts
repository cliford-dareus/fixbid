import {supabase} from '@/lib/supabase';
import {clientUpdatesToDb, mapClientRow} from './mappers';
import {err, ok, type Result} from './result';
import type {Client, CreateClientInput} from './types';

export async function listClients(handymanId: string): Promise<Result<Client[]>> {
  try {
    const {data, error} = await supabase
      .from('clients')
      .select('*')
      .eq('handyman_id', handymanId)
      .order('created_at', {ascending: false});

    if (error) return err(error);
    return ok((data || []).map(mapClientRow));
  } catch (e) {
    return err(e, 'Failed to load clients');
  }
}

export async function createClient(
  handymanId: string,
  input: CreateClientInput,
): Promise<Result<Client>> {
  try {
    const payload = {
      handyman_id: handymanId,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
    };

    const {data, error} = await supabase
      .from('clients')
      .insert(payload)
      .select()
      .single();

    if (error) return err(error);
    return ok(mapClientRow(data));
  } catch (e) {
    return err(e, 'Failed to create client');
  }
}

export async function updateClient(
  id: string,
  updates: Partial<Client>,
): Promise<Result<void>> {
  try {
    const dbUpdates = clientUpdatesToDb(updates);
    if (Object.keys(dbUpdates).length === 0) return ok(undefined);

    const {error} = await supabase.from('clients').update(dbUpdates).eq('id', id);
    if (error) return err(error);
    return ok(undefined);
  } catch (e) {
    return err(e, 'Failed to update client');
  }
}

export async function deleteClient(id: string): Promise<Result<void>> {
  try {
    const {error} = await supabase.from('clients').delete().eq('id', id);
    if (error) return err(error);
    return ok(undefined);
  } catch (e) {
    return err(e, 'Failed to delete client');
  }
}
