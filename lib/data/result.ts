/** Discriminated union for data-layer outcomes. */
export type Result<T> =
  | {ok: true; data: T}
  | {ok: false; error: string};

export function ok<T>(data: T): Result<T> {
  return {ok: true, data};
}

export function err<T = never>(error: unknown, fallback = 'Request failed'): Result<T> {
  if (typeof error === 'string') return {ok: false, error};
  if (error instanceof Error && error.message) return {ok: false, error: error.message};
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as {message?: unknown}).message;
    if (typeof m === 'string' && m) return {ok: false, error: m};
  }
  return {ok: false, error: fallback};
}

/** Unwrap or throw — useful in call sites that prefer try/catch. */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
