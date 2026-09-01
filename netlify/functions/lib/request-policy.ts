export type RequestPolicyResult =
  | { allowed: true }
  | { allowed: false; reason: 'misconfigured' | 'request_not_allowed' };

export function evaluateBrowserSource(
  request: Request,
  configuredOrigins = process.env.SCREENSHOT_ALLOWED_ORIGINS,
  disableOriginCheck = process.env.SCREENSHOT_DISABLE_ORIGIN_CHECK,
): RequestPolicyResult {
  if (isOriginCheckDisabled(disableOriginCheck)) {
    return { allowed: true };
  }

  const allowedOrigins = parseAllowedOrigins(configuredOrigins);
  if (!allowedOrigins) {
    return { allowed: false, reason: 'misconfigured' };
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (!origin && !referer) {
    return { allowed: false, reason: 'request_not_allowed' };
  }

  const requestOrigin = origin ? parseOrigin(origin) : undefined;
  const refererOrigin = referer ? parseRefererOrigin(referer) : undefined;

  if ((origin && !requestOrigin) || (referer && !refererOrigin)) {
    return { allowed: false, reason: 'request_not_allowed' };
  }

  if (requestOrigin && !allowedOrigins.has(requestOrigin)) {
    return { allowed: false, reason: 'request_not_allowed' };
  }

  if (refererOrigin && !allowedOrigins.has(refererOrigin)) {
    return { allowed: false, reason: 'request_not_allowed' };
  }

  return { allowed: true };
}

export function isOriginCheckDisabled(value = process.env.SCREENSHOT_DISABLE_ORIGIN_CHECK): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function parseAllowedOrigins(raw: string | undefined): Set<string> | undefined {
  if (!raw?.trim()) return undefined;

  const values = raw.split(',').map((value) => value.trim());
  if (values.some((value) => !value)) return undefined;

  const origins = values.map(parseConfiguredOrigin);
  if (origins.some((origin) => origin === undefined)) return undefined;

  return new Set(origins as string[]);
}

function parseConfiguredOrigin(value: string): string | undefined {
  if (value.includes('*')) return undefined;

  const origin = parseOrigin(value);
  if (!origin) return undefined;

  const parsed = new URL(value);
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) return undefined;

  return origin;
}

function parseOrigin(value: string): string | undefined {
  if (value === 'null') return undefined;

  try {
    const parsed = new URL(value);
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    ) {
      return undefined;
    }

    return parsed.origin;
  } catch {
    return undefined;
  }
}

function parseRefererOrigin(value: string): string | undefined {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.origin;
  } catch {
    return undefined;
  }
}
