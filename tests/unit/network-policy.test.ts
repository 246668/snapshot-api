import { describe, expect, it } from 'vitest';
import {
  assertPublicTarget,
  isPublicIp,
  NetworkPolicyError,
} from '../../netlify/functions/lib/network-policy.js';

describe('isPublicIp', () => {
  it.each([
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.1.1',
    '172.16.0.1',
    '192.168.1.1',
    '198.18.0.1',
    '224.0.0.1',
    '::',
    '::1',
    'fc00::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
    '::ffff:127.0.0.1',
  ])('rejects non-public address %s', (address) => {
    expect(isPublicIp(address)).toBe(false);
  });

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('accepts public address %s', (address) => {
    expect(isPublicIp(address)).toBe(true);
  });
});

describe('assertPublicTarget', () => {
  it('rejects localhost before DNS resolution', async () => {
    await expect(assertPublicTarget(new URL('https://localhost'), async () => [])).rejects.toBeInstanceOf(
      NetworkPolicyError,
    );
  });

  it('allows a host with public DNS responses only', async () => {
    await expect(
      assertPublicTarget(new URL('https://example.com'), async () => [
        { address: '93.184.216.34' },
        { address: '2606:2800:220:1:248:1893:25c8:1946' },
      ]),
    ).resolves.toBeUndefined();
  });

  it('rejects a host with a mixed public and private DNS result', async () => {
    await expect(
      assertPublicTarget(new URL('https://example.com'), async () => [
        { address: '93.184.216.34' },
        { address: '127.0.0.1' },
      ]),
    ).rejects.toBeInstanceOf(NetworkPolicyError);
  });

  it('rejects IP-address targets from protected ranges', async () => {
    await expect(assertPublicTarget(new URL('http://127.0.0.1'))).rejects.toBeInstanceOf(NetworkPolicyError);
  });
});
