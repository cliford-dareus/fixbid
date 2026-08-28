import {supabase} from '@/lib/supabase';
import type {DraftLineItem} from '@/lib/data';

export type AiLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  is_labor: boolean;
};

export type AiCostEstimate = {
  job_name: string;
  category: string;
  summary: string;
  confidence: number;
  labor_hours: number;
  labor_rate: number;
  line_items: AiLineItem[];
  total: number;
  suggested: number;
  notes: string;
  upsells: string[];
};

export type EstimateJobCostInput = {
  description?: string;
  photoUrls?: string[];
  hourlyRate?: number;
  region?: string;
};

/**
 * Calls authenticated edge function estimate-job-cost (xAI / Grok).
 */
export async function estimateJobCost(
  input: EstimateJobCostInput,
): Promise<AiCostEstimate> {
  const {data: sessionData} = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error('Sign in required for AI estimates');
  }

  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');

  const res = await fetch(`${base.replace(/\/$/, '')}/functions/v1/estimate-job-cost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY || '',
    },
    body: JSON.stringify({
      description: input.description || '',
      photo_urls: input.photoUrls || [],
      hourly_rate: input.hourlyRate,
      region: input.region,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || json.detail || `Estimate failed (${res.status})`);
  }
  if (!json.estimate) {
    throw new Error('No estimate in response');
  }
  return json.estimate as AiCostEstimate;
}

export function estimateToDraftLineItems(estimate: AiCostEstimate): DraftLineItem[] {
  return (estimate.line_items || []).map((li) => ({
    description: li.description,
    quantity: li.quantity,
    unitPrice: li.unit_price,
    isLabor: li.is_labor,
  }));
}
