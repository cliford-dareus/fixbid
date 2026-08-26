import {supabase} from '@/lib/supabase';
import {jobUpdatesToDb, mapJobRow} from './mappers';
import {err, ok, type Result} from './result';
import type {CreateJobInput, Job} from './types';

export async function listJobs(handymanId: string): Promise<Result<Job[]>> {
  try {
    const {data, error} = await supabase
      .from('jobs')
      .select('*')
      .eq('handyman_id', handymanId)
      .order('created_at', {ascending: false});

    if (error) return err(error);
    return ok((data || []).map(mapJobRow));
  } catch (e) {
    return err(e, 'Failed to load jobs');
  }
}

export async function getJob(id: string): Promise<Result<Job>> {
  try {
    const {data, error} = await supabase.from('jobs').select('*').eq('id', id).single();
    if (error) return err(error);
    return ok(mapJobRow(data));
  } catch (e) {
    return err(e, 'Failed to load job');
  }
}

export async function createJob(input: CreateJobInput): Promise<Result<Job>> {
  try {
    const {data, error} = await supabase
      .from('jobs')
      .insert({
        handyman_id: input.handyman_id,
        quote_id: input.quote_id ?? null,
        client_id: input.client_id ?? null,
        client_name: input.client_name,
        job_name: input.job_name,
        total_amount: input.total_amount,
        labor_cost: input.labor_cost ?? 0,
        material_cost: input.material_cost ?? 0,
        status: input.status ?? 'schedule',
        notes: input.notes ?? null,
        before_photos: input.before_photos ?? [],
        after_photos: input.after_photos ?? [],
        payments: input.payments ?? [],
        scheduled_date: input.scheduled_date ?? null,
        completed_date: input.completed_date ?? null,
      })
      .select()
      .single();

    if (error) return err(error);
    return ok(mapJobRow(data));
  } catch (e) {
    return err(e, 'Failed to create job');
  }
}

export async function updateJob(
  id: string,
  updates: Partial<Job>,
): Promise<Result<void>> {
  try {
    const dbUpdates = jobUpdatesToDb(updates);
    if (Object.keys(dbUpdates).length === 0) return ok(undefined);

    const {error} = await supabase.from('jobs').update(dbUpdates).eq('id', id);
    if (error) return err(error);
    return ok(undefined);
  } catch (e) {
    return err(e, 'Failed to update job');
  }
}
