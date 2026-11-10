import { createEncodedUrl } from './config2vmess.js';
import { createVlessUrl } from './config2vless.js';
import { createTrojanUrl } from './config2trojan.js';
import { createShadowsocksUrl } from './config2shadowsocks.js';

/**
 * Build a client outbound from a server inbound without mutating either input.
 * Endpoint and streamSettings overrides describe the public side of a reverse proxy.
 *
 * @param {{ inbound: object, address: string, port?: number, streamSettings?: object, tag?: string }} options
 * @returns {object} A V2Ray client outbound. Invalid input throws.
 */
export function createOutbound({ inbound, address, port = inbound?.port, streamSettings = inbound?.streamSettings, tag = inbound?.tag } = {}) {
  const protocol = inbound?.protocol;
  if (!['vless', 'vmess', 'trojan', 'shadowsocks'].includes(protocol)) {
    throw new Error(`Unsupported inbound protocol: ${protocol}`);
  }
  if (typeof address !== 'string' || !address.trim()) throw new Error('Server address is required');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Server port must be between 1 and 65535');

  const client = inbound.settings?.clients?.[0];
  let settings;
  if (protocol === 'vless' || protocol === 'vmess') {
    if (!client?.id) throw new Error(`${protocol.toUpperCase()} inbound has no client id`);
    settings = {
      vnext: [{
        address,
        port,
        users: [{
          id: client.id,
          ...(protocol === 'vless'
            ? { encryption: 'none', ...(client.flow ? { flow: client.flow } : {}) }
            : { alterId: client.alterId ?? 0, security: client.security ?? 'auto' }),
        }],
      }],
    };
  } else {
    const password = protocol === 'trojan' ? client?.password : inbound.settings?.password;
    if (!password) throw new Error(`${protocol} inbound has no password`);
    if (protocol === 'shadowsocks' && !inbound.settings?.method) {
      throw new Error('Shadowsocks inbound has no method');
    }
    settings = {
      servers: [{
        address,
        port,
        password,
        ...(protocol === 'shadowsocks' ? { method: inbound.settings.method } : {}),
      }],
    };
  }
  return {
    tag,
    protocol,
    settings,
    ...(streamSettings ? { streamSettings: structuredClone(streamSettings) } : {}),
    mux: { enabled: false },
  };
}

/**
 * Encode a server inbound as a share URL entirely in memory.
 * Accepts the same public endpoint overrides as createOutbound; invalid input throws.
 * Shadowsocks supports TCP and WebSocket (v2ray-plugin), not native gRPC.
 * Set options.client to 'v2rayng' for native Shadowsocks WebSocket share profiles.
 */
export function createConnectionUrl(options) {
  const outbound = createOutbound(options);
  if (outbound.protocol === 'vmess') return createEncodedUrl({ outbounds: [outbound] });

  const target = (outbound.settings.vnext ?? outbound.settings.servers)[0];
  const inbound = {
    ...options.inbound,
    tag: outbound.tag,
    port: target.port,
    streamSettings: outbound.streamSettings,
  };
  const converters = {
    vless: createVlessUrl,
    trojan: createTrojanUrl,
    shadowsocks: createShadowsocksUrl,
  };
  return converters[outbound.protocol](inbound, target.address, { client: options.client });
}
