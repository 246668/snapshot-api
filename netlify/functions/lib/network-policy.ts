import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

export class NetworkPolicyError extends Error {
  constructor(message = 'The requested target is not allowed.') {
    super(message);
    this.name = 'NetworkPolicyError';
  }
}

export type Lookup = (hostname: string) => Promise<Array<{ address: string }>>;

const defaultLookup: Lookup = (hostname) => lookup(hostname, { all: true, verbatim: true });

export function isPublicIp(address: string): boolean {
  const family = isIP(address);

  if (family === 4) {
    return isPublicIpv4(address);
  }

  if (family === 6) {
    return isPublicIpv6(address);
  }

  return false;
}

function isPublicIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [a, b, c] = octets;

  if (a === 0 || a === 10 || a === 127 || a === 255 || (a >= 224 && a <= 239)) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 0) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a >= 240) return false;

  return true;
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === '::' || normalized === '::1') return false;

  const mappedIpv4 = normalized.match(/^(?:0*:)*ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4) return isPublicIpv4(mappedIpv4[1]);

  const groups = expandIpv6(normalized);
  if (!groups) return false;

  const first = groups[0];
  const second = groups[1];

  if ((first & 0xff00) === 0xff00) return false;
  if ((first & 0xfe00) === 0xfc00) return false;
  if ((first & 0xffc0) === 0xfe80) return false;
  if (first === 0x2001 && second === 0x0db8) return false;

  return true;
}

function expandIpv6(address: string): number[] | null {
  const parts = address.split('::');
  if (parts.length > 2) return null;

  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts[1] ? parts[1].split(':') : [];
  const missing = 8 - left.length - right.length;

  if (missing < 0 || (parts.length === 1 && missing !== 0)) return null;

  const groups = [...left, ...Array(missing).fill('0'), ...right];
  if (groups.length !== 8) return null;

  const values = groups.map((group) => {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return Number.NaN;
    return Number.parseInt(group, 16);
  });

  return values.some(Number.isNaN) ? null : values;
}

export async function assertPublicTarget(url: URL, resolve: Lookup = defaultLookup): Promise<void> {
  const hostname = url.hostname.replace(/\.$/, '').toLowerCase();

  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || !hostname.includes('.')) {
    throw new NetworkPolicyError();
  }

  if (isIP(hostname)) {
    if (!isPublicIp(hostname)) throw new NetworkPolicyError();
    return;
  }

  let records: Array<{ address: string }>;
  try {
    records = await resolve(hostname);
  } catch {
    throw new NetworkPolicyError();
  }

  if (records.length === 0 || records.some((record) => !isPublicIp(record.address))) {
    throw new NetworkPolicyError();
  }
}
