import type {Client, Job, LineItem, Profile, Quote} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export function mapClientRow(row: Row): Client {
  return {
    id: row.id,
    name: row.name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    notes: row.notes ?? '',
    created_at: row.created_at,
    createdAt: row.created_at,
    handyman_id: row.handyman_id,
  };
}

export function mapLineItemRow(li: Row): LineItem {
  return {
    id: li.id,
    description: li.description ?? '',
    quantity: Number(li.quantity) || 0,
    unitPrice: Number(li.unit_price ?? li.unitPrice) || 0,
    isLabor: Boolean(li.is_labor ?? li.isLabor),
    photo_url: li.photo_url,
    photoUri: li.photo_url,
  };
}

export function mapQuoteRow(row: Row): Quote {
  const lineItems = (row.quote_line_items || []).map(mapLineItemRow);
  return {
    id: row.id,
    client_id: row.client_id ?? null,
    client_name: row.client_name ?? '',
    client_phone: row.client_phone,
    template_id: row.template_id,
    job_name: row.job_name ?? '',
    quote_line_items: lineItems,
    notes: row.notes ?? '',
    total_amount: Number(row.total_amount) || 0,
    status: row.status ?? 'draft',
    created_at: row.created_at,
    photos: row.photos ?? [],
    handyman_id: row.handyman_id,
  };
}

export function mapJobRow(row: Row): Job {
  return {
    id: row.id,
    quote_id: row.quote_id,
    client_id: row.client_id ?? null,
    client_name: row.client_name ?? '',
    total_amount: Number(row.total_amount) || 0,
    job_name: row.job_name ?? row.jobName ?? '',
    schedule_date: row.schedule_date ?? row.scheduled_date ?? '',
    completed_date: row.completed_date,
    labor_cost: Number(row.labor_cost) || 0,
    materials_cost: Number(row.materials_cost ?? row.material_cost) || 0,
    handyman_id: row.handyman_id,
    before_photos: row.before_photos ?? [],
    after_photos: row.after_photos ?? [],
    notes: row.notes ?? '',
    payments: Array.isArray(row.payments) ? row.payments : [],
    status: row.status ?? 'schedule',
    created_at: row.created_at,
  };
}

export function mapProfileRow(row: Row): Profile {
  return {
    id: row.id,
    full_name: row.full_name ?? '',
    business_name: row.business_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    zip: row.zip ?? '',
    hourly_rate: Number(row.hourly_rate) || 0,
    logo_url: row.logo_url,
    stripe_account_id: row.stripe_account_id,
    tagline: row.tagline ?? '',
    website: row.website ?? '',
    license_number: row.license_number ?? '',
    insurance_info: row.insurance_info ?? '',
    payment_note: row.payment_note ?? '',
    default_material_markup: row.default_material_markup != null
      ? Number(row.default_material_markup)
      : undefined,
    default_tax_rate: row.default_tax_rate != null
      ? Number(row.default_tax_rate)
      : undefined,
    expo_push_token: row.expo_push_token ?? null,
  };
}

/** Partial Quote → DB column patch (only defined keys). */
export function quoteUpdatesToDb(updates: Partial<Quote>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (updates.status !== undefined) db.status = updates.status;
  if (updates.job_name !== undefined) db.job_name = updates.job_name;
  if (updates.client_name !== undefined) db.client_name = updates.client_name;
  if (updates.client_phone !== undefined) db.client_phone = updates.client_phone;
  if (updates.client_id !== undefined) db.client_id = updates.client_id;
  if (updates.notes !== undefined) db.notes = updates.notes;
  if (updates.total_amount !== undefined) db.total_amount = updates.total_amount;
  if (updates.photos !== undefined) db.photos = updates.photos;
  return db;
}

export function clientUpdatesToDb(updates: Partial<Client>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (updates.name !== undefined) db.name = updates.name;
  if (updates.phone !== undefined) db.phone = updates.phone;
  if (updates.email !== undefined) db.email = updates.email;
  if (updates.address !== undefined) db.address = updates.address;
  if (updates.notes !== undefined) db.notes = updates.notes;
  return db;
}

export function jobUpdatesToDb(updates: Partial<Job>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (updates.status !== undefined) db.status = updates.status;
  if (updates.job_name !== undefined) db.job_name = updates.job_name;
  if (updates.schedule_date !== undefined) {
    db.schedule_date = updates.schedule_date;
    db.scheduled_date = updates.schedule_date;
  }
  if (updates.completed_date !== undefined) db.completed_date = updates.completed_date;
  if (updates.notes !== undefined) db.notes = updates.notes;
  if (updates.total_amount !== undefined) db.total_amount = updates.total_amount;
  if (updates.labor_cost !== undefined) db.labor_cost = updates.labor_cost;
  if (updates.materials_cost !== undefined) {
    db.materials_cost = updates.materials_cost;
    db.material_cost = updates.materials_cost;
  }
  if (updates.payments !== undefined) db.payments = updates.payments;
  if (updates.before_photos !== undefined) db.before_photos = updates.before_photos;
  if (updates.after_photos !== undefined) db.after_photos = updates.after_photos;
  return db;
}

export function profileUpdatesToDb(updates: Partial<Profile>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (updates.full_name !== undefined) db.full_name = updates.full_name;
  if (updates.business_name !== undefined) db.business_name = updates.business_name;
  if (updates.phone !== undefined) db.phone = updates.phone;
  if (updates.email !== undefined) db.email = updates.email;
  if (updates.address !== undefined) db.address = updates.address;
  if (updates.city !== undefined) db.city = updates.city;
  if (updates.state !== undefined) db.state = updates.state;
  if (updates.zip !== undefined) db.zip = updates.zip;
  if (updates.hourly_rate !== undefined) db.hourly_rate = updates.hourly_rate;
  if (updates.logo_url !== undefined) db.logo_url = updates.logo_url;
  if (updates.stripe_account_id !== undefined) db.stripe_account_id = updates.stripe_account_id;
  if (updates.tagline !== undefined) db.tagline = updates.tagline;
  if (updates.website !== undefined) db.website = updates.website;
  if (updates.license_number !== undefined) db.license_number = updates.license_number;
  if (updates.insurance_info !== undefined) db.insurance_info = updates.insurance_info;
  if (updates.payment_note !== undefined) db.payment_note = updates.payment_note;
  if (updates.default_material_markup !== undefined) {
    db.default_material_markup = updates.default_material_markup;
  }
  if (updates.default_tax_rate !== undefined) db.default_tax_rate = updates.default_tax_rate;
  if (updates.expo_push_token !== undefined) db.expo_push_token = updates.expo_push_token;
  return db;
}
