import { existsSync } from 'node:fs';
import chromium from '@sparticuz/chromium';
import puppeteer, { type Browser } from 'puppeteer-core';

export const VIEWPORT = {
  width: 1600,
  height: 1200,
  deviceScaleFactor: 0.5,
  isMobile: false,
  hasTouch: false,
  isLandscape: true,
} as const;

export function resolveBrowserExecutable(
  localExecutable = process.env.PUPPETEER_EXECUTABLE_PATH,
  pathExists: (path: string) => boolean = existsSync,
): { executablePath?: string; useLocalExecutable: boolean } {
  if (localExecutable && pathExists(localExecutable)) {
    return { executablePath: localExecutable, useLocalExecutable: true };
  }

  return { useLocalExecutable: false };
}

export async function launchBrowser(): Promise<Browser> {
  const { executablePath: localExecutable, useLocalExecutable } = resolveBrowserExecutable();
  const executablePath = localExecutable ?? await chromium.executablePath();

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: useLocalExecutable
      ? ['--disable-dev-shm-usage', '--no-sandbox']
      : chromium.args,
  });
}
