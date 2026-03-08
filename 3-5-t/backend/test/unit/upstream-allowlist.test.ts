import { describe, expect, it } from 'vitest';

import { getConfig } from '../../src/common/config/config';
import { assertUpstreamAllowed } from '../../src/modules/gateway/upstreams';

describe('upstream allowlist parsing and validation', () => {
  it('accepts host-only entries', () => {
    const cfg = getConfig({
      DATABASE_URL: 'file:../data/test.db',
      API_KEY_PEPPER: 'pepper-pepper-pepper-pepper',
      UPSTREAM_ALLOWLIST_HOSTS: 'localhost,127.0.0.1,example.com',
    } as any);

    expect(cfg.upstreamAllowlistHosts).toEqual(['localhost', '127.0.0.1', 'example.com']);
  });

  it('accepts host:port entries and de-duplicates', () => {
    const cfg = getConfig({
      DATABASE_URL: 'file:../data/test.db',
      API_KEY_PEPPER: 'pepper-pepper-pepper-pepper',
      UPSTREAM_ALLOWLIST_HOSTS: 'localhost:4000,localhost:4000,localhost',
    } as any);

    expect(cfg.upstreamAllowlistHosts).toEqual(['localhost:4000', 'localhost']);
  });

  it('accepts bracketed IPv6 with port', () => {
    const cfg = getConfig({
      DATABASE_URL: 'file:../data/test.db',
      API_KEY_PEPPER: 'pepper-pepper-pepper-pepper',
      UPSTREAM_ALLOWLIST_HOSTS: '[::1]:4000,::1',
    } as any);

    expect(cfg.upstreamAllowlistHosts).toEqual(['[::1]:4000', '::1']);
  });

  it('rejects entries with scheme/path/userinfo', () => {
    expect(() =>
      getConfig({
        DATABASE_URL: 'file:../data/test.db',
        API_KEY_PEPPER: 'pepper-pepper-pepper-pepper',
        UPSTREAM_ALLOWLIST_HOSTS: 'http://localhost:4000',
      } as any),
    ).toThrow(/UPSTREAM_ALLOWLIST_HOSTS/);

    expect(() =>
      getConfig({
        DATABASE_URL: 'file:../data/test.db',
        API_KEY_PEPPER: 'pepper-pepper-pepper-pepper',
        UPSTREAM_ALLOWLIST_HOSTS: 'localhost:4000/evil',
      } as any),
    ).toThrow(/UPSTREAM_ALLOWLIST_HOSTS/);

    expect(() =>
      getConfig({
        DATABASE_URL: 'file:../data/test.db',
        API_KEY_PEPPER: 'pepper-pepper-pepper-pepper',
        UPSTREAM_ALLOWLIST_HOSTS: 'user@localhost:4000',
      } as any),
    ).toThrow(/UPSTREAM_ALLOWLIST_HOSTS/);
  });
});

describe('assertUpstreamAllowed', () => {
  it('allows any port when host-only is allowlisted', () => {
    expect(() => assertUpstreamAllowed('http://localhost:1234', ['localhost'])).not.toThrow();
  });

  it('enforces port match when host:port is allowlisted', () => {
    expect(() => assertUpstreamAllowed('http://localhost:4000', ['localhost:4000'])).not.toThrow();
    expect(() => assertUpstreamAllowed('http://localhost:1234', ['localhost:4000'])).toThrow(
      /Upstream host not allowed/,
    );
  });

  it('rejects non-http(s), userinfo, and query/hash', () => {
    expect(() => assertUpstreamAllowed('file:///etc/passwd', ['localhost'])).toThrow(/Invalid upstream URL/);
    expect(() => assertUpstreamAllowed('http://user:pass@localhost:4000', ['localhost'])).toThrow(
      /Invalid upstream URL/,
    );
    expect(() => assertUpstreamAllowed('http://localhost:4000?x=1', ['localhost:4000'])).toThrow(
      /Invalid upstream URL/,
    );
    expect(() => assertUpstreamAllowed('http://localhost:4000#frag', ['localhost:4000'])).toThrow(
      /Invalid upstream URL/,
    );
  });
});
