import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

import { localDevelopmentUrls } from './local-runtime.mjs';

const lan = process.argv.includes('--lan');
const port = 5173;
const host = lan ? '0.0.0.0' : '127.0.0.1';
const { localUrl, lanUrls } = localDevelopmentUrls({
  interfaces: networkInterfaces(),
  lan,
  port,
});

console.log(`[una-voce] Local: ${localUrl}`);
if (lan) {
  if (lanUrls.length === 0) {
    console.warn('[una-voce] LAN: no private IPv4 address was detected');
  } else {
    for (const url of lanUrls) {
      console.log(`[una-voce] LAN:   ${url}`);
    }
  }
}

const child = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    host,
    '--port',
    String(port),
    '--strictPort',
  ],
  { stdio: 'inherit' },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
