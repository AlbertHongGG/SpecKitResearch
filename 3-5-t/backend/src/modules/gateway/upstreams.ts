import { BadRequestException } from '@nestjs/common';

function normalizeHost(host: string) {
  const trimmed = host.trim().toLowerCase().replace(/\.+$/, '');
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function isIpv6(host: string) {
  return host.includes(':');
}

export function assertUpstreamAllowed(upstreamUrl: string, allowHosts: string[]) {
  let url: URL;
  try {
    url = new URL(upstreamUrl);
  } catch {
    throw new BadRequestException('Invalid upstream URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Invalid upstream URL');
  }
  if (url.username || url.password) {
    throw new BadRequestException('Invalid upstream URL');
  }
  if (url.search || url.hash) {
    throw new BadRequestException('Invalid upstream URL');
  }

  const host = normalizeHost(url.hostname);
  const allow = new Set(allowHosts.map(normalizeHost));
  const port = url.port || undefined;
  const hostKey = host;
  const hostPortKey = port ? (isIpv6(host) ? `[${host}]:${port}` : `${host}:${port}`) : undefined;

  if (!allow.has(hostKey) && (!hostPortKey || !allow.has(hostPortKey))) {
    throw new BadRequestException('Upstream host not allowed');
  }
  return url;
}
