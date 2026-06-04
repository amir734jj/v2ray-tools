import { test } from 'node:test';
import assert from 'node:assert';
import trojan2config from '../src/utils/trojan2config.js';

test('trojan2config - should convert basic trojan url to config', async () => {
  const url = 'trojan://mypassword@example.com:443?type=tcp&security=tls&sni=example.com#my-trojan';

  const config = await trojan2config({ url });

  assert.ok(config, 'Should return a config');
  const outbound = config.outbounds.find(o => o.protocol === 'trojan');
  assert.ok(outbound, 'Should have a trojan outbound');

  const [server] = outbound.settings.servers;
  assert.strictEqual(server.address, 'example.com');
  assert.strictEqual(server.port, 443);
  assert.strictEqual(server.password, 'mypassword');
  assert.ok(outbound.tag.includes('my-trojan'), 'Tag should contain remark');
});

test('trojan2config - should handle websocket with TLS', async () => {
  const url = 'trojan://wspassword@ws.example.com:443?type=ws&security=tls&sni=ws.example.com&path=%2Fws&host=ws.example.com#ws-trojan';

  const config = await trojan2config({ url });

  assert.ok(config);
  const outbound = config.outbounds.find(o => o.protocol === 'trojan');
  assert.strictEqual(outbound.streamSettings.network, 'ws');
  assert.strictEqual(outbound.streamSettings.security, 'tls');
  assert.strictEqual(outbound.streamSettings.tlsSettings.serverName, 'ws.example.com');
  assert.strictEqual(outbound.streamSettings.wsSettings.path, '/ws');
  assert.strictEqual(outbound.streamSettings.wsSettings.headers.Host, 'ws.example.com');
});

test('trojan2config - should handle no-tls tcp transport', async () => {
  const url = 'trojan://plainpass@1.2.3.4:8080?type=tcp&security=none#plain-trojan';

  const config = await trojan2config({ url });

  assert.ok(config);
  const outbound = config.outbounds.find(o => o.protocol === 'trojan');
  assert.strictEqual(outbound.streamSettings.security, 'none');
  assert.strictEqual(outbound.settings.servers[0].port, 8080);
});

test('trojan2config - should set custom port and listen', async () => {
  const url = 'trojan://pass@1.2.3.4:443?type=tcp&security=tls#test';

  const config = await trojan2config({ url, port: 1080, listen: '127.0.0.1' });

  assert.ok(config);
  assert.strictEqual(config.inbounds[0].port, 1080);
  assert.strictEqual(config.inbounds[0].listen, '127.0.0.1');
});

test('trojan2config - should return false for invalid url', async () => {
  const result = await trojan2config({ url: 'not-a-url' });
  assert.strictEqual(result, false);
});

test('trojan2config - should handle grpc transport', async () => {
  const url = 'trojan://grpcpass@grpc.example.com:443?type=grpc&security=tls&sni=grpc.example.com&serviceName=mygrpc#grpc-trojan';

  const config = await trojan2config({ url });

  assert.ok(config);
  const outbound = config.outbounds.find(o => o.protocol === 'trojan');
  assert.strictEqual(outbound.streamSettings.network, 'grpc');
  assert.strictEqual(outbound.streamSettings.grpcSettings.serviceName, 'mygrpc');
});

test('trojan2config - should handle url-encoded password', async () => {
  const url = 'trojan://p%40ss%23word@example.com:443?type=tcp&security=tls#encoded';

  const config = await trojan2config({ url });

  assert.ok(config);
  const outbound = config.outbounds.find(o => o.protocol === 'trojan');
  assert.strictEqual(outbound.settings.servers[0].password, 'p@ss#word');
});
