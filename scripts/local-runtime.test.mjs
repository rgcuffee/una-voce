import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  isPrivateIpv4,
  localDevelopmentUrls,
  privateLanAddresses,
} from './local-runtime.mjs';

const interfaces = {
  en0: [
    { address: '192.168.50.24', family: 'IPv4', internal: false },
    { address: 'fe80::1', family: 'IPv6', internal: false },
  ],
  bridge0: [
    { address: '10.0.0.8', family: 'IPv4', internal: false },
  ],
  utun0: [
    { address: '100.64.0.3', family: 'IPv4', internal: false },
  ],
  lo0: [
    { address: '127.0.0.1', family: 'IPv4', internal: true },
  ],
};

test('private IPv4 detection covers RFC1918 ranges only', () => {
  assert.equal(isPrivateIpv4('10.1.2.3'), true);
  assert.equal(isPrivateIpv4('172.16.0.1'), true);
  assert.equal(isPrivateIpv4('172.31.255.255'), true);
  assert.equal(isPrivateIpv4('172.32.0.1'), false);
  assert.equal(isPrivateIpv4('192.168.1.4'), true);
  assert.equal(isPrivateIpv4('8.8.8.8'), false);
});

test('LAN address discovery is deterministic and ignores loopback and non-private addresses', () => {
  assert.deepEqual(privateLanAddresses(interfaces), ['10.0.0.8', '192.168.50.24']);
});

test('normal development surfaces loopback only', () => {
  assert.deepEqual(localDevelopmentUrls({ interfaces, lan: false, port: 5173 }), {
    localUrl: 'http://127.0.0.1:5173',
    lanUrls: [],
  });
});

test('LAN development surfaces usable private-network URLs', () => {
  assert.deepEqual(localDevelopmentUrls({ interfaces, lan: true, port: 5173 }), {
    localUrl: 'http://127.0.0.1:5173',
    lanUrls: ['http://10.0.0.8:5173', 'http://192.168.50.24:5173'],
  });
});

test('local Vite functions inherit server-only development environment without exposing it to the bundle', async () => {
  const source = await readFile(new URL('./start-local-dev.mjs', import.meta.url), 'utf8');
  assert.match(source, /loadEnv\('development', process\.cwd\(\), ''\)/);
  assert.match(source, /Object\.assign\(process\.env/);
  assert.doesNotMatch(source, /console\.log\([^\n]*(SECRET|SERVICE_ROLE)/);
});
