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

export type EstimateProvider = 'xai' | 'gemini' | 'auto';

export type EstimateJobCostInput = {
  description?: string;
  photoUrls?: string[];
  hourlyRate?: number;
  region?: string;
  /** Prefer Gemini, xAI, or auto (server default). */
  provider?: EstimateProvider;
  /** Raw base64 audio (no data: prefix) for voice-to-quote. */
  audioBase64?: string;
  audioMime?: string;
};

export type EstimateJobCostResult = {
  estimate: AiCostEstimate;
  provider?: string;
};

/**
 * Calls authenticated edge function estimate-job-cost (Gemini and/or xAI).
 * Pass audioBase64 for voice-to-quote (Gemini multimodal).
 */
export async function estimateJobCost(
  input: EstimateJobCostInput,
): Promise<AiCostEstimate> {
  const full = await estimateJobCostWithMeta(input);
  return full.estimate;
}

export async function estimateJobCostWithMeta(
  input: EstimateJobCostInput,
): Promise<EstimateJobCostResult> {
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
      provider: input.provider || (input.audioBase64 ? 'gemini' : 'auto'),
      audio_base64: input.audioBase64 || undefined,
      audio_mime: input.audioMime || undefined,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || json.detail || `Estimate failed (${res.status})`);
  }
  if (!json.estimate) {
    throw new Error('No estimate in response');
  }
  return {
    estimate: json.estimate as AiCostEstimate,
    provider: json.provider as string | undefined,
  };
}

/** Voice-to-quote: audio and/or transcript → line items + notes. */
export async function estimateFromVoice(input: {
  audioBase64?: string;
  audioMime?: string;
  transcript?: string;
  photoUrls?: string[];
  hourlyRate?: number;
  region?: string;
}): Promise<AiCostEstimate> {
  if (!input.audioBase64 && !input.transcript) {
    throw new Error('Record audio or provide a transcript');
  }
  return estimateJobCost({
    description: input.transcript || '',
    photoUrls: input.photoUrls,
    hourlyRate: input.hourlyRate,
    region: input.region,
    audioBase64: input.audioBase64,
    audioMime: input.audioMime,
    provider: input.audioBase64 ? 'gemini' : 'auto',
  });
}

export function estimateToDraftLineItems(estimate: AiCostEstimate): DraftLineItem[] {
  return (estimate.line_items || []).map((li) => ({
    description: li.description,
    quantity: li.quantity,
    unitPrice: li.unit_price,
    isLabor: li.is_labor,
  }));
}
