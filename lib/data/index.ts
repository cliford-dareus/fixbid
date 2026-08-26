/**
 * Thin data layer — all Supabase access for domain entities.
 * Contexts / screens should call these functions and keep UI state locally.
 */

export type {Result} from './result';
export {ok, err, unwrap} from './result';

export type {
  Client,
  CreateClientInput,
  CreateJobInput,
  CreateQuoteInput,
  DraftLineItem,
  Job,
  JobStatus,
  LineItem,
  Payment,
  Profile,
  Quote,
  QuoteStatus,
} from './types';

export * as clientsApi from './clients';
export * as quotesApi from './quotes';
export * as jobsApi from './jobs';
export * as profilesApi from './profiles';
