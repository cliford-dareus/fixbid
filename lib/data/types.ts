export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | string;
export type AcceptanceMode = 'deposit' | 'accept';

export interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isLabor: boolean;
  photo_url?: string | null;
  photoUri?: string | null;
}

export interface Quote {
  id: string;
  client_id?: string | null;
  client_name: string;
  client_phone?: string | null;
  template_id?: string | null;
  job_name: string;
  quote_line_items?: LineItem[];
  notes?: string | null;
  total_amount: number;
  status: QuoteStatus;
  created_at?: string;
  photos?: string[] | null;
  handyman_id?: string;
  inclusions?: string | null;
  exclusions?: string | null;
  warranty_text?: string | null;
  deposit_percent?: number | null;
  valid_until?: string | null;
  /** deposit = pay to accept; accept = e-sign without payment */
  acceptance_mode?: AcceptanceMode | null;
  accepted_at?: string | null;
  accepted_by_name?: string | null;
}

export interface QuoteRevisionSnapshot {
  job_name?: string;
  notes?: string | null;
  total_amount?: number;
  line_items?: LineItem[];
  inclusions?: string | null;
  exclusions?: string | null;
  warranty_text?: string | null;
  status?: string;
}

export interface QuoteRevision {
  id: string;
  quote_id: string;
  revision_number: number;
  created_at: string;
  previous_status: string | null;
  new_status: string | null;
  previous_total: number | null;
  new_total: number | null;
  snapshot: QuoteRevisionSnapshot;
  note?: string | null;
}

export interface Payment {
  amount: number;
  method?: 'cash' | 'card' | 'paypal' | 'venmo' | 'other' | string;
  date?: string;
  type?: string;
  stripe_payment_intent_id?: string | null;
  at?: string;
}

export type JobStatus =
  | 'schedule'
  | 'in-progress'
  | 'completed'
  | 'invoiced'
  | 'paid'
  | string;

export interface Job {
  id: string;
  quote_id?: string | null;
  client_id?: string | null;
  client_name: string;
  total_amount: number;
  job_name: string;
  schedule_date?: string | null;
  completed_date?: string | null;
  labor_cost?: number;
  materials_cost?: number;
  handyman_id?: string;
  before_photos?: string[];
  after_photos?: string[];
  notes?: string | null;
  payments: Payment[];
  status: JobStatus;
  created_at?: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: string;
  createdAt?: string;
  handyman_id?: string;
}

export interface Profile {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  license_number?: string | null;
  insurance_info?: string | null;
  logo_url?: string | null;
  default_labor_rate?: number | null;
  default_material_markup?: number | null;
  default_tax_rate?: number | null;
  expo_push_token?: string | null;
  default_inclusions?: string | null;
  default_exclusions?: string | null;
  warranty_text?: string | null;
  deposit_percent?: number | null;
  quote_valid_days?: number | null;
  default_acceptance_mode?: AcceptanceMode | null;
}

export interface CreateQuoteInput {
  handyman_id: string;
  client_id?: string | null;
  client_name: string;
  client_phone?: string | null;
  template_id?: string | null;
  job_name: string;
  notes?: string | null;
  total_amount: number;
  status?: QuoteStatus;
  photos?: string[] | null;
  line_items?: LineItem[];
  inclusions?: string | null;
  exclusions?: string | null;
  warranty_text?: string | null;
  deposit_percent?: number | null;
  valid_until?: string | null;
  acceptance_mode?: AcceptanceMode | null;
}

export interface CreateJobInput {
  handyman_id: string;
  quote_id?: string | null;
  client_id?: string | null;
  client_name: string;
  job_name: string;
  total_amount: number;
  schedule_date?: string | null;
  notes?: string | null;
  status?: JobStatus;
  labor_cost?: number;
  materials_cost?: number;
  payments?: Payment[];
}

export type Result<T> =
  | {ok: true; data: T}
  | {ok: false; error: string};
