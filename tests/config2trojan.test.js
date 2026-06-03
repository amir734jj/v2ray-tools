import { test } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import config2trojan from '../src/utils/config2trojan.js';

function makeTempConfig(obj) {
  const dir = mkdtempSync(join(tmpdir(), 'v2ray-test-'));
  const p = join(dir, 'config.json');
  writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}

test('config2trojan - basic tcp inbound', async () => {
  const cfg = {
    inbounds: [{
      tag: 'trojan-7236',
      listen: '1.2.3.4',
      port: 7236,
      protocol: 'trojan',
      settings: { clients: [{ password: 'my-secret-pass' }] },
      streamSettings: { network: 'tcp', security: 'none' }
    }]
  };
  const p = makeTempConfig(cfg);
  try {
    const url = await config2trojan({ path: p });
    assert.ok(url, 'Should return a url');
    assert.ok(url.startsWith('trojan://'), 'Should start with trojan://');
    assert.ok(url.includes('my-secret-pass'), 'Should contain the password');
    assert.ok(url.includes('1.2.3.4:7236'), 'Should contain host and port');
    assert.ok(url.includes('type=tcp'), 'Should contain network type');
  } finally {
    unlinkSync(p);
  }
});

test('config2trojan - websocket with TLS', async () => {
  const cfg = {
    inbounds: [{
      tag: 'trojan-ws',
      listen: 'example.com',
      port: 443,
      protocol: 'trojan',
      settings: { clients: [{ password: 'ws-pass' }] },
      streamSettings: {
        network: 'ws',
        security: 'tls',
        tlsSettings: { serverName: 'example.com' },
        wsSettings: { path: '/trojan', headers: { Host: 'example.com' } }
      }
    }]
  };
  const p = makeTempConfig(cfg);
  try {
    const url = await config2trojan({ path: p });
    assert.ok(url.includes('type=ws'), 'Should have ws type');
    assert.ok(url.includes('security=tls'), 'Should have tls security');
    assert.ok(url.includes('sni=example.com'), 'Should have sni');
    assert.ok(url.includes('path=%2Ftrojan'), 'Should have encoded path');
  } finally {
    unlinkSync(p);
  }
});

test('config2trojan - selects by inboundTag from multi-inbound config', async () => {
  const cfg = {
    inbounds: [
      {
        tag: 'first',
        listen: '1.1.1.1',
        port: 1111,
        protocol: 'trojan',
        settings: { clients: [{ password: 'pass-one' }] },
        streamSettings: { network: 'tcp', security: 'none' }
      },
      {
        tag: 'second',
        listen: '2.2.2.2',
        port: 2222,
        protocol: 'trojan',
        settings: { clients: [{ password: 'pass-two' }] },
        streamSettings: { network: 'tcp', security: 'none' }
      }
    ]
  };
  const p = makeTempConfig(cfg);
  try {
    const url = await config2trojan({ path: p, inboundTag: 'second' });
    assert.ok(url.includes('pass-two'), 'Should pick second inbound');
    assert.ok(url.includes('2.2.2.2:2222'), 'Should use second host/port');
  } finally {
    unlinkSync(p);
  }
});

test('config2trojan - returns false when no trojan inbound', async () => {
  const cfg = {
    inbounds: [{
      tag: 'vless-in',
      listen: '0.0.0.0',
      port: 4556,
      protocol: 'vless',
      settings: { clients: [{ id: 'x' }], decryption: 'none' },
      streamSettings: { network: 'tcp' }
    }]
  };
  const p = makeTempConfig(cfg);
  try {
    const result = await config2trojan({ path: p });
    assert.strictEqual(result, false, 'Should return false when no trojan inbound');
  } finally {
    unlinkSync(p);
  }
});
