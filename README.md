# Netlify webpage screenshot API

This Netlify Function renders a requested public website as a fixed **800 × 600** PNG:

```text
GET /api/https://google.com
```

For target URLs containing query strings, fragments, or reserved characters, percent-encode the target portion:

```text
/api/https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dnetlify
```

## Browser access policy

The service is intended for images embedded by approved sites. By default, configure `SCREENSHOT_ALLOWED_ORIGINS` as a comma-separated list of exact origins:

```dotenv
SCREENSHOT_ALLOWED_ORIGINS=https://www.mydomain.com,https://mydomain.com
```

For local debugging only, set `SCREENSHOT_DISABLE_ORIGIN_CHECK=true` to skip this browser-source check. Never enable it in a public deployment: anyone could then use the endpoint to render permitted public targets.

An ordinary browser image request is accepted when its `Origin` or `Referer` belongs to that allowlist. When both are present, both must be allowed. There is no custom request header, so an approved page can render an image directly:

```html
<img src="https://snapshot.mydomain.com/api/https%3A%2F%2Fexample.com" alt="Example website snapshot">
```

For normal cross-origin image requests, browsers generally send a reduced origin-only `Referer` under the default `strict-origin-when-cross-origin` policy. Do not set `Referrer-Policy: no-referrer` on pages that embed this endpoint, or the request will be rejected unless it supplies an allowed `Origin` instead.

CORS is intentionally not enabled. It is not required to display an `<img>` and is not an authentication mechanism. If a later integration needs Canvas, `fetch()`, or `<img crossorigin="anonymous">`, add a separate, narrowly allowlisted CORS policy.

## Security limits

Origin/Referer validation is a browser hotlink deterrent, not cryptographic authentication. A non-browser client can forge these headers. Use Netlify/WAF rate limits before enabling production traffic, and use signed short-lived URLs or an authenticated edge/server-side gateway if direct-client render abuse needs to be prevented.

The function separately validates the initial target and every browser request, including redirects and subresources. It rejects non-HTTP(S) schemes, credentials, unsupported ports, localhost, single-label names, private/link-local/loopback/reserved IPv4 and IPv6 addresses, and hostnames with any non-public DNS result. This remains required even when the requesting website is allowlisted.

Successful images use `Cache-Control: private, no-store`; shared CDN caching is disabled so an edge cache cannot bypass the request-source check.

## Local development

1. Copy `.env.example` to `.env`.
2. Either set `SCREENSHOT_ALLOWED_ORIGINS` to the origin of the page that will embed snapshots, such as `http://localhost:4321`, or set `SCREENSHOT_DISABLE_ORIGIN_CHECK=true` for local debugging.
3. Set `PUPPETEER_EXECUTABLE_PATH` to a locally installed Chrome or Chromium executable. Do not configure this variable in Netlify: the function falls back to serverless Chromium when the configured local path is unavailable.
4. Install the Netlify CLI if needed, then run `npm run dev`.
5. Request `http://localhost:8888/api/https://example.com` with an allowed `Referer`, for example `http://localhost:4321/page`.

## Deployment checklist

- Configure `SCREENSHOT_ALLOWED_ORIGINS` in the Netlify environment before deploying; it is fail-closed when absent or invalid. Do not set `SCREENSHOT_DISABLE_ORIGIN_CHECK=true` in a public deployment.
- Do not configure `PUPPETEER_EXECUTABLE_PATH` in Netlify; it is for local development only. The function uses serverless Chromium in production.
- Confirm the Netlify plan has enough memory and timeout for headless Chromium.
- Verify serverless Chromium resolution on a Deploy Preview.
- Test a real `<img>` on an allowlisted page and inspect its outgoing Referer in DevTools.
- Set `SCREENSHOT_E2E_BASE_URL` and `SCREENSHOT_E2E_ALLOWED_ORIGIN` to run the deployed E2E tests. The allowed origin must also be included in Netlify's `SCREENSHOT_ALLOWED_ORIGINS`.
- Configure upstream or Netlify/WAF rate limits and review third-party screenshot-content requirements.
