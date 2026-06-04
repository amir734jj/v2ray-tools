import { test } from 'node:test';
import assert from 'node:assert';
import vless2config from '../src/utils/vless2config.js';

test('vless2config - should convert basic vless url to config', async () => {
  const url = 'vless://test-uuid-1234@example.com:443?type=tcp&security=none&encryption=none#my-vless';

  const config = await vless2config({ url });

  assert.ok(config, 'Should return a config');
  const outbound = config.outbounds.find(o => o.protocol === 'vless');
  assert.ok(outbound, 'Should have a vless outbound');

  const [vnext] = outbound.settings.vnext;
  assert.strictEqual(vnext.address, 'example.com');
  assert.strictEqual(vnext.port, 443);
  assert.strictEqual(vnext.users[0].id, 'test-uuid-1234');
  assert.strictEqual(vnext.users[0].encryption, 'none');
  assert.ok(outbound.tag.includes('my-vless'), 'Tag should contain remark');
});

test('vless2config - should handle websocket with TLS', async () => {
  const url = 'vless://ws-uuid@ws.example.com:443?type=ws&security=tls&sni=ws.example.com&path=%2Fws&host=ws.example.com&encryption=none#ws-server';

  const config = await vless2config({ url });

  assert.ok(config);
  const outbound = config.outbounds.find(o => o.protocol === 'vless');
  assert.strictEqual(outbound.streamSettings.network, 'ws');
  assert.strictEqual(outbound.streamSettings.security, 'tls');
  assert.strictEqual(outbound.streamSettings.tlsSettings.serverName, 'ws.example.com');
  assert.strictEqual(outbound.streamSettings.wsSettings.path, '/ws');
  assert.strictEqual(outbound.streamSettings.wsSettings.headers.Host, 'ws.example.com');
});

test('vless2config - should handle REALITY security', async () => {
  const url = 'vless://reality-uuid@reality.example.com:443?type=tcp&security=reality&sni=www.google.com&pbk=abc123&sid=deadbeef&fp=chrome&encryption=none#reality-server';

  const config = await vless2config({ url });

  assert.ok(config);
  const outbound = config.outbounds.find(o => o.protocol === 'vless');
  assert.strictEqual(outbound.streamSettings.security, 'reality');
  assert.strictEqual(outbound.streamSettings.realitySettings.serverName, 'www.google.com');
  assert.strictEqual(outbound.streamSettings.realitySettings.publicKey, 'abc123');
  assert.strictEqual(outbound.streamSettings.realitySettings.shortId, 'deadbeef');
  assert.strictEqual(outbound.streamSettings.realitySettings.fingerprint, 'chrome');
});

test('vless2config - should set custom port and listen', async () => {
  const url = 'vless://test-uuid@1.2.3.4:8080?type=tcp&security=none&encryption=none#test';

  const config = await vless2config({ url, port: 1080, listen: '127.0.0.1' });

  assert.ok(config);
  assert.strictEqual(config.inbounds[0].port, 1080);
  assert.strictEqual(config.inbounds[0].listen, '127.0.0.1');
});

test('vless2config - should return false for invalid url', async () => {
  const result = await vless2config({ url: 'not-a-url' });
  assert.strictEqual(result, false);
});

test('vless2config - should handle grpc transport', async () => {
  const url = 'vless://grpc-uuid@grpc.example.com:443?type=grpc&security=tls&sni=grpc.example.com&serviceName=mygrpc&encryption=none#grpc-server';

  const config = await vless2config({ url });

  assert.ok(config);
  const outbound = config.outbounds.find(o => o.protocol === 'vless');
  assert.strictEqual(outbound.streamSettings.network, 'grpc');
  assert.strictEqual(outbound.streamSettings.grpcSettings.serviceName, 'mygrpc');
});
