import { test } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import config2vmess from '../src/utils/config2vmess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('config2vmess - should convert v2ray config to vmess URL', async () => {
  const testConfig = {
    outbounds: [{
      protocol: 'vmess',
      tag: 'test-server',
      settings: {
        vnext: [{
          address: 'example.com',
          port: 443,
          users: [{
            id: 'test-uuid-1234',
            alterId: 0
          }]
        }]
      },
      streamSettings: {
        network: 'tcp',
        security: 'tls',
        tlsSettings: {
          serverName: 'example.com'
        }
      }
    }]
  };
  
  const tempDir = mkdtempSync(join(tmpdir(), 'v2ray-test-'));
  const configPath = join(tempDir, 'config.json');
  writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
  
  try {
    const vmessUrl = await config2vmess({ path: configPath });
    
    assert.ok(vmessUrl, 'Should return vmess URL');
    assert.ok(vmessUrl.startsWith('vmess://'), 'URL should start with vmess://');
    
    // Decode and verify
    const base64Part = vmessUrl.slice(8);
    const decoded = JSON.parse(Buffer.from(base64Part, 'base64').toString());
    
    assert.strictEqual(decoded.add, 'example.com', 'Address should match');
    assert.strictEqual(decoded.port, '443', 'Port should match');
    assert.strictEqual(decoded.id, 'test-uuid-1234', 'ID should match');
    assert.strictEqual(decoded.aid, '0', 'AlterId should match');
    assert.strictEqual(decoded.net, 'tcp', 'Network should match');
    assert.strictEqual(decoded.tls, 'tls', 'TLS should match');
  } finally {
    unlinkSync(configPath);
  }
});

test('config2vmess - should handle websocket configuration', async () => {
  const testConfig = {
    outbounds: [{
      protocol: 'vmess',
      tag: 'ws-server',
      settings: {
        vnext: [{
          address: 'ws.example.com',
          port: 443,
          users: [{
            id: 'ws-uuid',
            alterId: 0
          }]
        }]
      },
      streamSettings: {
        network: 'ws',
        security: 'tls',
        wsSettings: {
          path: '/ws-path',
          headers: {
            Host: 'ws.example.com'
          }
        },
        tlsSettings: {
          serverName: 'ws.example.com'
        }
      }
    }]
  };
  
  const tempDir = mkdtempSync(join(tmpdir(), 'v2ray-test-'));
  const configPath = join(tempDir, 'config.json');
  writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
  
  try {
    const vmessUrl = await config2vmess({ path: configPath });
    const base64Part = vmessUrl.slice(8);
    const decoded = JSON.parse(Buffer.from(base64Part, 'base64').toString());
    
    assert.strictEqual(decoded.net, 'ws', 'Network should be ws');
    assert.strictEqual(decoded.path, '/ws-path', 'Path should match');
    assert.strictEqual(decoded.host, 'ws.example.com', 'Host should match');
  } finally {
    unlinkSync(configPath);
  }
});

test('config2vmess - should handle h2 configuration', async () => {
  const testConfig = {
    outbounds: [{
      protocol: 'vmess',
      tag: 'h2-server',
      settings: {
        vnext: [{
          address: 'h2.example.com',
          port: 443,
          users: [{
            id: 'h2-uuid',
            alterId: 0
          }]
        }]
      },
      streamSettings: {
        network: 'h2',
        security: 'tls',
        httpSettings: {
          path: '/h2-path',
          host: ['h2.example.com', 'h2-alt.example.com']
        }
      }
    }]
  };
  
  const tempDir = mkdtempSync(join(tmpdir(), 'v2ray-test-'));
  const configPath = join(tempDir, 'config.json');
  writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
  
  try {
    const vmessUrl = await config2vmess({ path: configPath });
    const base64Part = vmessUrl.slice(8);
    const decoded = JSON.parse(Buffer.from(base64Part, 'base64').toString());
    
    assert.strictEqual(decoded.net, 'h2', 'Network should be h2');
    assert.strictEqual(decoded.path, '/h2-path', 'Path should match');
    assert.ok(decoded.host.includes('h2.example.com'), 'Host should include domain');
  } finally {
    unlinkSync(configPath);
  }
});

test('config2vmess - should extract tag name correctly', async () => {
  const testConfig = {
    outbounds: [{
      protocol: 'vmess',
      tag: 'MyServer example.com 443',
      settings: {
        vnext: [{
          address: 'example.com',
          port: 443,
          users: [{
            id: 'test-uuid',
            alterId: 0
          }]
        }]
      },
      streamSettings: {
        network: 'tcp'
      }
    }]
  };
  
  const tempDir = mkdtempSync(join(tmpdir(), 'v2ray-test-'));
  const configPath = join(tempDir, 'config.json');
  writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
  
  try {
    const vmessUrl = await config2vmess({ path: configPath });
    const base64Part = vmessUrl.slice(8);
    const decoded = JSON.parse(Buffer.from(base64Part, 'base64').toString());
    
    assert.strictEqual(decoded.ps, 'MyServer', 'Should extract first part of tag');
  } finally {
    unlinkSync(configPath);
  }
});

test('config2vmess - should return false for invalid config path', async () => {
  const result = await config2vmess({ path: '/nonexistent/path/config.json' });
  assert.strictEqual(result, false, 'Should return false for invalid path');
});
