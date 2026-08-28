/** Domain models used by the app UI and data layer. */

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isLabor: boolean;
  photoUri?: string;
  photo_url?: string;
}

/** Draft line item while building a new quote (no server id yet). */
export interface DraftLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  isLabor: boolean;
  photoUri?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  created_at?: string;
  createdAt?: string;
  handyman_id?: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | string;
export type AcceptanceMode = 'deposit' | 'accept';

export interface Quote {
  id: string;
  client_id: string | null;
  client_name: string;
  client_phone?: string | null;
  template_id?: string;
  job_name: string;
  quote_line_items: LineItem[];
  notes: string;
  total_amount: number;
  status: QuoteStatus;
  created_at: string;
  photos: string[];
  handyman_id?: string;
  /** Client-facing scope (public page). */
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

/** Snapshot stored on each revision row (state before the change). */
export interface QuoteRevisionSnapshot {
  job_name: string;
  notes: string;
  total_amount: number;
  status?: string;
  client_name?: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    is_labor?: boolean;
    photo_url?: string | null;
  }>;
}

export interface QuoteRevision {
  id: string;
  quote_id: string;
  handyman_id: string;
  revision_number: number;
  reason: string;
  previous_status: string | null;
  new_status: string | null;
  previous_total: number | null;
  new_total: number | null;
  snapshot: QuoteRevisionSnapshot;
  note: string | null;
  created_at: string;
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
  quote_id: string;
  client_id: string | null;
  client_name: string;
  total_amount: number;
  job_name: string;
  schedule_date: string;
  completed_date?: string;
  labor_cost: number;
  materials_cost: number;
  handyman_id: string;
  before_photos: string[];
  after_photos: string[];
  notes: string;
  payments: Payment[];
  status: JobStatus;
  created_at: string;
}

/** Business profile — drives PDF headers and public quote page. */
export interface Profile {
  id?: string;
  full_name: string;
  business_name: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  hourly_rate: number;
  logo_url?: string;
  stripe_account_id?: string;
  tagline?: string;
  website?: string;
  license_number?: string;
  insurance_info?: string;
  payment_note?: string;
  default_material_markup?: number;
  default_tax_rate?: number;
  /** Expo push token for offline notifications */
  expo_push_token?: string | null;
  /** Defaults applied to new quotes / public page. */
  default_inclusions?: string | null;
  default_exclusions?: string | null;
  warranty_text?: string | null;
  deposit_percent?: number | null;
  quote_valid_days?: number | null;
  default_acceptance_mode?: AcceptanceMode | null;
}

export interface CreateClientInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface CreateQuoteInput {
  handyman_id: string;
  client_name: string;
  client_phone?: string | null;
  client_id?: string | null;
  job_name: string;
  notes?: string | null;
  photos?: string[];
  total_amount: number;
  status?: QuoteStatus;
  inclusions?: string | null;
  exclusions?: string | null;
  warranty_text?: string | null;
  deposit_percent?: number | null;
  valid_until?: string | null;
  acceptance_mode?: AcceptanceMode | null;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    is_labor?: boolean;
    photo_url?: string | null;
  }>;
}

export interface CreateJobInput {
  handyman_id: string;
  quote_id?: string | null;
  client_id?: string | null;
  client_name: string;
  job_name: string;
  total_amount: number;
  labor_cost?: number;
  material_cost?: number;
  status?: JobStatus;
  notes?: string | null;
  before_photos?: string[];
  after_photos?: string[];
  payments?: Payment[];
  scheduled_date?: string | null;
  completed_date?: string | null;
}
