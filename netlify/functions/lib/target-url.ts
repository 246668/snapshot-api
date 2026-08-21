const API_PREFIX = '/api/';
const MAX_TARGET_URL_LENGTH = 2_048;
const ALLOWED_PORTS = new Set(['', '80', '443']);

export class TargetUrlError extends Error {
  constructor(
    public readonly code: 'invalid_target_url' | 'unsupported_target_url',
    message: string,
  ) {
    super(message);
    this.name = 'TargetUrlError';
  }
}

export function parseTargetUrl(requestUrl: string): URL {
  const request = new URL(requestUrl);

  if (!request.pathname.startsWith(API_PREFIX)) {
    throw new TargetUrlError('invalid_target_url', 'Provide an absolute URL after /api/.');
  }

  const encodedTarget = request.pathname.slice(API_PREFIX.length);
  if (!encodedTarget) {
    throw new TargetUrlError('invalid_target_url', 'Provide an absolute URL after /api/.');
  }

  let target: string;
  try {
    target = decodeURIComponent(encodedTarget);
  } catch {
    throw new TargetUrlError('invalid_target_url', 'The target URL contains invalid percent encoding.');
  }

  if (target.length > MAX_TARGET_URL_LENGTH) {
    throw new TargetUrlError('invalid_target_url', 'The target URL is too long.');
  }

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new TargetUrlError('invalid_target_url', 'Provide an absolute http or https URL after /api/.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TargetUrlError('unsupported_target_url', 'Only http and https target URLs are supported.');
  }

  if (url.username || url.password) {
    throw new TargetUrlError('unsupported_target_url', 'Target URLs cannot contain credentials.');
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    throw new TargetUrlError('unsupported_target_url', 'Only ports 80 and 443 are supported.');
  }

  return url;
}
