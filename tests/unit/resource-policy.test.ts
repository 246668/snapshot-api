import { describe, expect, it } from 'vitest';
import { shouldBlockResource } from '../../netlify/functions/screenshot.js';

describe('shouldBlockResource', () => {
  it.each(['media'])('blocks %s resources', (resourceType) => {
    expect(shouldBlockResource(resourceType)).toBe(true);
  });

  it.each(['image', 'stylesheet', 'script', 'document', 'font'])('allows %s resources', (resourceType) => {
    expect(shouldBlockResource(resourceType)).toBe(false);
  });
});
