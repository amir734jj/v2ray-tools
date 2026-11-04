import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOutbound, createConnectionUrl, config2shadowsocks, config2vmess } from '../src/utils/index.js';

const address = 'public.example.com';
const credentials = {
  vless: { clients: [{ id: 'test-id' }] },
  vmess: { clients: [{ id: 'test-id', alterId: 7 }] },
  trojan: { clients: [{ password: 'p@ss:#/?' }] },
  shadowsocks: { method: 'aes-256-gcm', password: 'p@ss:#/?' },
};

function options(protocol, network = 'ws') {
  return {
    inbound: {
      protocol,
      tag: `${protocol}-internal`,
      listen: '0.0.0.0',
      port: 12345,
      settings: structuredClone(credentials[protocol]),
      streamSettings: { network, security: 'none' },
    },
    address,
    port: 443,
    tag: `${protocol}-${network}`,
    streamSettings: {
      network,
      security: 'tls',
      tlsSettings: { serverName: address },
      ...(network === 'ws'
        ? { wsSettings: { path: `/${protocol}`, headers: { Host: address } } }
        : { grpcSettings: { serviceName: `${protocol}-grpc` } }),
    },
  };
}

for (const protocol of Object.keys(credentials)) {
  for (const network of ['ws', 'grpc']) {
    test(`${protocol} ${network}: in-memory outbound preserves credentials and public overrides`, () => {
      const input = options(protocol, network);
      const snapshot = structuredClone(input);
      const outbound = createOutbound(input);
      const target = (outbound.settings.vnext ?? outbound.settings.servers)[0];
      assert.equal(outbound.protocol, protocol);
      assert.equal(outbound.tag, `${protocol}-${network}`);
      assert.equal(target.address, address);
      assert.equal(target.port, 443);
      assert.deepEqual(outbound.streamSettings, input.streamSettings);
      assert.deepEqual(outbound.mux, { enabled: false });
      if (target.users) {
        assert.equal(target.users[0].id, 'test-id');
        if (protocol === 'vless') assert.equal(target.users[0].encryption, 'none');
        else {
          assert.equal(target.users[0].alterId, 7);
          assert.equal(target.users[0].security, 'auto');
        }
      } else {
        assert.equal(target.password, 'p@ss:#/?');
        if (protocol === 'shadowsocks') assert.equal(target.method, 'aes-256-gcm');
      }
      outbound.streamSettings.tlsSettings.serverName = 'changed.example.com';
      assert.deepEqual(input, snapshot);
    });

    if (protocol === 'shadowsocks' && network === 'grpc') continue;
    test(`${protocol} ${network}: share URL contains public transport and credentials`, () => {
      const input = options(protocol, network);
      const snapshot = structuredClone(input);
      const result = createConnectionUrl(input);
      if (protocol === 'vmess') {
        const decoded = JSON.parse(Buffer.from(result.slice(8), 'base64'));
        assert.equal(decoded.add, address);
        assert.equal(decoded.port, '443');
        assert.equal(decoded.id, 'test-id');
        assert.equal(decoded.aid, '7');
        assert.equal(decoded.net, network);
        assert.equal(decoded.tls, 'tls');
        assert.equal(decoded.sni, address);
        assert.equal(decoded.path, network === 'ws' ? '/vmess' : 'vmess-grpc');
        assert.equal(decoded.host, network === 'ws' ? address : '');
        assert.equal(decoded.type, 'none');
      } else {
        const decoded = new URL(result);
        assert.equal(decoded.hostname, address);
        assert.equal(decoded.port, '443');
        assert.equal(decodeURIComponent(decoded.hash.slice(1)), `${protocol}-${network}`);
        if (protocol === 'shadowsocks') {
          assert.equal(Buffer.from(decoded.username, 'base64url').toString(), 'aes-256-gcm:p@ss:#/?');
          assert.equal(decoded.searchParams.get('plugin'), `v2ray-plugin;tls;mux=0;host=${address};path=/shadowsocks`);
        } else {
          assert.equal(decodeURIComponent(decoded.username), protocol === 'vless' ? 'test-id' : 'p@ss:#/?');
          assert.equal(decoded.searchParams.get('type'), network);
          assert.equal(decoded.searchParams.get('security'), 'tls');
          assert.equal(decoded.searchParams.get('sni'), address);
          assert.equal(decoded.searchParams.get(network === 'ws' ? 'path' : 'serviceName'),
            network === 'ws' ? `/${protocol}` : `${protocol}-grpc`);
        }
      }
      assert.deepEqual(input, snapshot);
    });
  }
}

test('outbound defaults use inbound port, tag and transport without sharing references', () => {
  const { inbound } = options('vmess');
  const outbound = createOutbound({ inbound, address });
  assert.equal(outbound.tag, inbound.tag);
  assert.equal(outbound.settings.vnext[0].port, inbound.port);
  assert.deepEqual(outbound.streamSettings, inbound.streamSettings);
  assert.notEqual(outbound.streamSettings, inbound.streamSettings);
});

test('VMess keeps WebSocket Host independent of TLS SNI, including without TLS', () => {
  const input = options('vmess');
  input.streamSettings.wsSettings.headers.Host = 'ws.example.com';
  const decode = () => JSON.parse(Buffer.from(createConnectionUrl(input).slice(8), 'base64'));
  assert.equal(decode().host, 'ws.example.com');
  assert.equal(decode().sni, address);
  input.streamSettings.security = 'none';
  assert.equal(decode().host, 'ws.example.com');
  assert.equal(decode().tls, 'none');
  assert.equal(decode().sni, undefined);
});

test('VLESS preserves client flow in both outbound and URL', () => {
  const input = options('vless');
  input.inbound.settings.clients[0].flow = 'xtls-rprx-vision';
  assert.equal(createOutbound(input).settings.vnext[0].users[0].flow, 'xtls-rprx-vision');
  assert.equal(new URL(createConnectionUrl(input)).searchParams.get('flow'), 'xtls-rprx-vision');
});

test('invalid inputs throw explicit errors rather than returning false', () => {
  assert.throws(() => createOutbound(), /Unsupported inbound protocol/);
  assert.throws(() => createConnectionUrl(), /Unsupported inbound protocol/);
  for (const port of [0, -1, 65536, 1.5, '443', null]) {
    assert.throws(() => createConnectionUrl({ ...options('vless'), port }), /Server port/);
  }
  for (const value of ['', undefined, null, 123]) {
    assert.throws(() => createOutbound({ ...options('vless'), address: value }), /Server address/);
  }
  for (const protocol of Object.keys(credentials)) {
    const input = options(protocol);
    input.inbound.settings = {};
    assert.throws(() => createConnectionUrl(input), /no (client id|password)/i);
  }
  const input = options('shadowsocks');
  delete input.inbound.settings.method;
  assert.throws(() => createConnectionUrl(input), /no method/);
  assert.throws(() => createConnectionUrl(options('shadowsocks', 'grpc')), /do not support native gRPC/);
});

test('Shadowsocks TCP links stay plain and WebSocket supports non-TLS plugins', () => {
  const input = options('shadowsocks');
  input.streamSettings.security = 'none';
  const ws = new URL(createConnectionUrl(input));
  assert.equal(ws.searchParams.get('plugin'), `v2ray-plugin;mux=0;host=${address};path=/shadowsocks`);
  input.streamSettings = { network: 'tcp' };
  const tcp = new URL(createConnectionUrl(input));
  assert.equal(tcp.searchParams.has('plugin'), false);
  input.streamSettings = { network: 'quic' };
  assert.throws(() => createConnectionUrl(input), /Unsupported Shadowsocks/);
});

test('Shadowsocks plugin rejects unrepresentable separators', () => {
  const input = options('shadowsocks');
  input.streamSettings.wsSettings.path = '/path;injected=value';
  assert.throws(() => createConnectionUrl(input), /Invalid v2ray-plugin/);
});

test('file converters also encode VMess gRPC and Shadowsocks plugins', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'v2ray-connection-test-'));
  try {
    const vmess = options('vmess', 'grpc');
    const ss = options('shadowsocks');
    const vmessPath = join(dir, 'vmess.json');
    const ssPath = join(dir, 'ss.json');
    await Promise.all([
      writeFile(vmessPath, JSON.stringify({ outbounds: [createOutbound(vmess)] })),
      writeFile(ssPath, JSON.stringify({
        inbounds: [{ ...ss.inbound, tag: ss.tag, port: ss.port, streamSettings: ss.streamSettings }],
      })),
    ]);
    assert.equal(await config2vmess({ path: vmessPath }), createConnectionUrl(vmess));
    assert.equal(await config2shadowsocks({ path: ssPath, address }), createConnectionUrl(ss));
    assert.equal(await config2shadowsocks({ path: join(dir, 'missing.json') }), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
