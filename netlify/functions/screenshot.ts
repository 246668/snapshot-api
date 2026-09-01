import type { Config, Context } from '@netlify/functions';
import type { Browser, HTTPRequest, Page } from 'puppeteer-core';
import { launchBrowser, VIEWPORT } from './lib/browser.js';
import { assertPublicTarget, NetworkPolicyError } from './lib/network-policy.js';
import { evaluateBrowserSource } from './lib/request-policy.js';
import { jsonError, pngResponse } from './lib/response.js';
import { parseTargetUrl, TargetUrlError } from './lib/target-url.js';

const navigationTimeout = boundedEnvironmentNumber('SCREENSHOT_NAVIGATION_TIMEOUT_MS', 15_000, 1_000, 25_000);
const settleDelay = boundedEnvironmentNumber('SCREENSHOT_SETTLE_DELAY_MS', 750, 0, 3_000);
const maxRequests = boundedEnvironmentNumber('SCREENSHOT_MAX_REQUESTS', 150, 10, 300);

export const config: Config = {
  path: '/api/*',
};

export default async function handler(request: Request, _context: Context): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonError(405, 'method_not_allowed', 'Only GET is supported.', { allow: 'GET' });
  }

  const sourcePolicy = evaluateBrowserSource(request);
  if (!sourcePolicy.allowed) {
    if (sourcePolicy.reason === 'misconfigured') {
      return jsonError(500, 'access_policy_misconfigured', 'The screenshot service is unavailable.');
    }

    return jsonError(403, 'request_not_allowed', 'The request source is not allowed.');
  }

  let target: URL;
  try {
    target = parseTargetUrl(request.url);
    await assertPublicTarget(target);
  } catch (error) {
    if (error instanceof TargetUrlError) {
      return jsonError(400, error.code, error.message);
    }

    if (error instanceof NetworkPolicyError) {
      return jsonError(403, 'target_not_allowed', 'The requested target is not allowed.');
    }

    return jsonError(500, 'render_failed', 'The screenshot service could not process this request.');
  }

  let browser: Browser | undefined;
  let page: Page | undefined;

  try {
    browser = await launchBrowser();
    page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await page.setJavaScriptEnabled(true);
    await page.setRequestInterception(true);

    let interceptedRequestCount = 0;
    let blockedMainFrame = false;

    page.on('request', (interceptedRequest: HTTPRequest) => {
      void handleRequest(interceptedRequest, page!, () => {
        interceptedRequestCount += 1;
        return interceptedRequestCount;
      }, () => {
        blockedMainFrame = true;
      }).catch(() => {
        if (interceptedRequest.isInterceptResolutionHandled()) return;
        void interceptedRequest.abort('blockedbyclient').catch(() => undefined);
      });
    });

    await page.goto(target.href, {
      timeout: navigationTimeout,
      waitUntil: 'domcontentloaded',
    });

    if (blockedMainFrame) {
      return jsonError(403, 'target_not_allowed', 'The requested target is not allowed.');
    }

    if (settleDelay > 0) {
      await delay(settleDelay);
    }

    const image = await page.screenshot({ type: 'png', fullPage: false });
    return pngResponse(image);
  } catch (error) {
    console.error('Screenshot rendering failed', {
      error: describeError(error),
      targetHost: target.hostname,
    });

    if (error instanceof NetworkPolicyError) {
      return jsonError(403, 'target_not_allowed', 'The requested target is not allowed.');
    }

    if (isTimeout(error)) {
      return jsonError(504, 'render_timeout', 'The target page took too long to render.');
    }

    return jsonError(502, 'target_unavailable', 'The target page could not be rendered.');
  } finally {
    await page?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}

async function handleRequest(
  request: HTTPRequest,
  page: Page,
  incrementRequestCount: () => number,
  markBlockedMainFrame: () => void,
): Promise<void> {
  if (incrementRequestCount() > maxRequests) {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      markBlockedMainFrame();
    }
    await request.abort('blockedbyclient');
    return;
  }

  let resourceUrl: URL;
  try {
    resourceUrl = new URL(request.url());
    await assertPublicTarget(resourceUrl);
  } catch {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      markBlockedMainFrame();
    }
    await request.abort('blockedbyclient');
    return;
  }

  await request.continue();
}

function boundedEnvironmentNumber(name: string, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function describeError(error: unknown): { name: string; message: string; stack?: string } | { value: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { value: String(error) };
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && /timeout/i.test(error.message);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
