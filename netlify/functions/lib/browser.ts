import chromium from '@sparticuz/chromium';
import puppeteer, { type Browser } from 'puppeteer-core';

export const VIEWPORT = {
  width: 800,
  height: 600,
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
  isLandscape: true,
} as const;

export async function launchBrowser(): Promise<Browser> {
  const localExecutable = process.env.PUPPETEER_EXECUTABLE_PATH;

  if (localExecutable) {
    return puppeteer.launch({
      executablePath: localExecutable,
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    });
  }

  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    headless: true,
    args: chromium.args,
  });
}
