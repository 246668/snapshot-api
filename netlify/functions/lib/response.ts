export type ApiErrorCode =
  | 'access_policy_misconfigured'
  | 'request_not_allowed'
  | 'method_not_allowed'
  | 'invalid_target_url'
  | 'unsupported_target_url'
  | 'target_not_allowed'
  | 'target_unavailable'
  | 'render_timeout'
  | 'render_failed';

interface ErrorResponseOptions {
  allow?: string;
}

export function jsonError(
  status: number,
  error: ApiErrorCode,
  message: string,
  options: ErrorResponseOptions = {},
): Response {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });

  if (options.allow) {
    headers.set('Allow', options.allow);
  }

  return new Response(JSON.stringify({ error, message }), { status, headers });
}

export function pngResponse(image: Uint8Array): Response {
  const body = image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength) as ArrayBuffer;

  return new Response(body, {
    status: 200,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Length': String(image.byteLength),
      'Content-Type': 'image/png',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
