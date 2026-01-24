import { test } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vmess2config from '../src/utils/vmess2config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('vmess2config - should parse valid vmess URL and generate config', () => {
  // Valid vmess URL (base64 encoded JSON)
  const vmessData = {
    v: "2",
    ps: "test-server",
    add: "example.com",
    port: "443",
    id: "test-uuid-1234",
    aid: "0",
    net: "tcp",
    type: "none",
    host: "",
    path: "",
    tls: "tls"
  };
  
  const vmessUrl = 'vmess://' + Buffer.from(JSON.stringify(vmessData)).toString('base64');
  const baseConfigPath = join(__dirname, '..', 'assets', 'base.json');
  
  const config = vmess2config({
    url: vmessUrl,
    base: baseConfigPath,
    port: 1080,
    listen: '127.0.0.1'
  });
  
  assert.ok(config, 'Config should be generated');
  assert.ok(config.inbounds, 'Config should have inbounds');
  assert.ok(config.outbounds, 'Config should have outbounds');
  assert.strictEqual(config.inbounds[0].port, 1080, 'Inbound port should be set');
  assert.strictEqual(config.inbounds[0].listen, '127.0.0.1', 'Listen interface should be set');
  
  const outbound = config.outbounds[0];
  assert.strictEqual(outbound.protocol, 'vmess', 'Outbound protocol should be vmess');
  assert.strictEqual(outbound.settings.vnext[0].address, 'example.com', 'Server address should match');
  assert.strictEqual(outbound.settings.vnext[0].port, 443, 'Server port should match');
  assert.strictEqual(outbound.settings.vnext[0].users[0].id, 'test-uuid-1234', 'User ID should match');
  assert.ok(outbound.tag.includes('test-server'), 'Tag should include server name');
});

test('vmess2config - should handle default port', () => {
  const vmessData = {
    v: "2",
    ps: "test",
    add: "example.com",
    port: "443",
    id: "uuid",
    aid: "0",
    net: "tcp",
    type: "none",
    host: "",
    path: "",
    tls: ""
  };
  
  const vmessUrl = 'vmess://' + Buffer.from(JSON.stringify(vmessData)).toString('base64');
  const baseConfigPath = join(__dirname, '..', 'assets', 'base.json');
  
  const config = vmess2config({
    url: vmessUrl,
    base: baseConfigPath
  });
  
  assert.ok(config.inbounds[0].port, 'Should have default port');
});

test('vmess2config - should handle websocket settings', () => {
  const vmessData = {
    v: "2",
    ps: "ws-server",
    add: "ws.example.com",
    port: "443",
    id: "test-uuid",
    aid: "0",
    net: "ws",
    type: "none",
    host: "ws.example.com",
    path: "/ws-path",
    tls: "tls"
  };
  
  const vmessUrl = 'vmess://' + Buffer.from(JSON.stringify(vmessData)).toString('base64');
  const baseConfigPath = join(__dirname, '..', 'assets', 'base.json');
  
  const config = vmess2config({
    url: vmessUrl,
    base: baseConfigPath,
    port: 1080
  });
  
  const outbound = config.outbounds[0];
  assert.strictEqual(outbound.streamSettings.network, 'ws', 'Network type should be ws');
  assert.strictEqual(outbound.streamSettings.wsSettings.headers.Host, 'ws.example.com', 'WS host should be set');
  assert.strictEqual(outbound.streamSettings.wsSettings.path, '/ws-path', 'WS path should be set');
  assert.strictEqual(outbound.streamSettings.security, 'tls', 'Security should be tls');
});

test('vmess2config - should not modify base config file', () => {
  const vmessData = {
    v: "2",
    ps: "test",
    add: "example.com",
    port: "443",
    id: "uuid",
    aid: "0",
    net: "tcp",
    type: "none",
    host: "",
    path: "",
    tls: ""
  };
  
  const vmessUrl = 'vmess://' + Buffer.from(JSON.stringify(vmessData)).toString('base64');
  const baseConfigPath = join(__dirname, '..', 'assets', 'base.json');
  
  const config1 = vmess2config({
    url: vmessUrl,
    base: baseConfigPath,
    port: 1080
  });
  
  const config2 = vmess2config({
    url: vmessUrl,
    base: baseConfigPath,
    port: 2080
  });
  
  assert.notStrictEqual(config1.inbounds[0].port, config2.inbounds[0].port, 'Configs should be independent');
});
