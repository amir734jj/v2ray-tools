import { test } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import config2vless from '../src/utils/config2vless.js';

function makeTempConfig(obj) {
  const dir = mkdtempSync(join(tmpdir(), 'v2ray-test-'));
  const p = join(dir, 'config.json');
  writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}

test('config2vless - basic tcp inbound', async () => {
  const cfg = {
    inbounds: [{
      tag: 'vless-4556',
      listen: '1.2.3.4',
      port: 4556,
      protocol: 'vless',
      settings: { clients: [{ id: 'test-uuid-abcd' }], decryption: 'none' },
      streamSettings: { network: 'tcp', security: 'none' }
    }]
  };
  const p = makeTempConfig(cfg);
  try {
    const url = await config2vless({ path: p });
    assert.ok(url, 'Should return a url');
    assert.ok(url.startsWith('vless://'), 'Should start with vless://');
    assert.ok(url.includes('test-uuid-abcd'), 'Should contain the client id');
    assert.ok(url.includes('1.2.3.4:4556'), 'Should contain host and port');
    assert.ok(url.includes('type=tcp'), 'Should contain network type');
    assert.ok(url.includes('encryption=none'), 'Should contain encryption=none');
  } finally {
    unlinkSync(p);
  }
});

test('config2vless - websocket with TLS', async () => {
  const cfg = {
    inbounds: [{
      tag: 'vless-ws-443',
      listen: 'example.com',
      port: 443,
      protocol: 'vless',
      settings: { clients: [{ id: 'ws-uuid' }], decryption: 'none' },
      streamSettings: {
        network: 'ws',
        security: 'tls',
        tlsSettings: { serverName: 'example.com' },
        wsSettings: { path: '/ws', headers: { Host: 'example.com' } }
      }
    }]
  };
  const p = makeTempConfig(cfg);
  try {
    const url = await config2vless({ path: p });
    assert.ok(url.includes('type=ws'), 'Should have ws type');
    assert.ok(url.includes('security=tls'), 'Should have tls security');
    assert.ok(url.includes('sni=example.com'), 'Should have sni');
    assert.ok(url.includes('path=%2Fws'), 'Should have encoded path');
  } finally {
    unlinkSync(p);
  }
});

test('config2vless - selects by inboundTag from multi-inbound config', async () => {
  const cfg = {
    inbounds: [
      {
        tag: 'first',
        listen: '1.1.1.1',
        port: 1111,
        protocol: 'vless',
        settings: { clients: [{ id: 'first-uuid' }], decryption: 'none' },
        streamSettings: { network: 'tcp', security: 'none' }
      },
      {
        tag: 'second',
        listen: '2.2.2.2',
        port: 2222,
        protocol: 'vless',
        settings: { clients: [{ id: 'second-uuid' }], decryption: 'none' },
        streamSettings: { network: 'tcp', security: 'none' }
      }
    ]
  };
  const p = makeTempConfig(cfg);
  try {
    const url = await config2vless({ path: p, inboundTag: 'second' });
    assert.ok(url.includes('second-uuid'), 'Should pick second inbound');
    assert.ok(url.includes('2.2.2.2:2222'), 'Should use second host/port');
  } finally {
    unlinkSync(p);
  }
});

test('config2vless - returns false when no vless inbound', async () => {
  const cfg = {
    inbounds: [{
      tag: 'vmess-in',
      listen: '0.0.0.0',
      port: 1234,
      protocol: 'vmess',
      settings: { clients: [{ id: 'x', alterId: 0 }] },
      streamSettings: { network: 'tcp' }
    }]
  };
  const p = makeTempConfig(cfg);
  try {
    const result = await config2vless({ path: p });
    assert.strictEqual(result, false, 'Should return false when no vless inbound');
  } finally {
    unlinkSync(p);
  }
});

test('config2vless - address override replaces listen in URL', async () => {
  const cfg = {
    inbounds: [{
      tag: 'vless-in',
      listen: '0.0.0.0',
      port: 4556,
      protocol: 'vless',
      settings: { clients: [{ id: 'addr-uuid' }], decryption: 'none' },
      streamSettings: { network: 'tcp', security: 'none' }
    }]
  };
  const p = makeTempConfig(cfg);
  try {
    const url = await config2vless({ path: p, address: 'my.server.com' });
    assert.ok(url.includes('my.server.com:4556'), 'Should use address override');
    assert.ok(!url.includes('YOUR_SERVER_IP'), 'Should not contain placeholder');
    assert.ok(!url.includes('0.0.0.0'), 'Should not contain 0.0.0.0');
  } finally {
    unlinkSync(p);
  }
});
