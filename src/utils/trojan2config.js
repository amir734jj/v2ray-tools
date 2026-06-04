import { readFile } from 'fs/promises';

/**
 * Parse a Trojan share URL into its components.
 *
 * Format: trojan://password@address:port?type=tcp&security=tls&...#remark
 */
function parseTrojan(url) {
  if (!url?.startsWith('trojan://')) return null;

  const withoutProto = url.slice(9); // strip "trojan://"
  const [mainPart, fragment] = withoutProto.split('#');
  const [userHost, queryStr] = mainPart.split('?');
  const [password, hostPort] = userHost.split('@');
  const lastColon = hostPort.lastIndexOf(':');
  const address = hostPort.slice(0, lastColon);
  const port = parseInt(hostPort.slice(lastColon + 1), 10);
  const params = new URLSearchParams(queryStr || '');

  return {
    password: decodeURIComponent(password),
    address,
    port,
    remark: fragment ? decodeURIComponent(fragment) : '',
    type: params.get('type') || 'tcp',
    security: params.get('security') || 'tls',
    sni: params.get('sni') || '',
    fp: params.get('fp') || '',
    alpn: params.get('alpn') || '',
    path: params.get('path') || '',
    host: params.get('host') || '',
    serviceName: params.get('serviceName') || '',
    headerType: params.get('headerType') || '',
  };
}

/**
 * Build stream settings from parsed Trojan URL data.
 */
function buildStreamSettings(data) {
  const ss = { network: data.type };

  if (data.security === 'tls') {
    ss.security = 'tls';
    ss.tlsSettings = {};
    if (data.sni) ss.tlsSettings.serverName = data.sni;
    if (data.fp) ss.tlsSettings.fingerprint = data.fp;
    if (data.alpn) ss.tlsSettings.alpn = data.alpn.split(',');
  } else {
    ss.security = 'none';
  }

  if (data.type === 'ws') {
    ss.wsSettings = {};
    if (data.path) ss.wsSettings.path = data.path;
    if (data.host) ss.wsSettings.headers = { Host: data.host };
  } else if (data.type === 'grpc') {
    ss.grpcSettings = {};
    if (data.serviceName) ss.grpcSettings.serviceName = data.serviceName;
  } else if (data.type === 'h2' || data.type === 'http') {
    ss.httpSettings = {};
    if (data.path) ss.httpSettings.path = data.path;
    if (data.host) ss.httpSettings.host = data.host.split(',');
  }

  return ss;
}

/**
 * Convert a Trojan share URL into a v2ray client config.
 *
 * @param {Object} options
 * @param {string} options.url    - Trojan share URL (trojan://...)
 * @param {string} [options.base] - Path to a base config file (optional)
 * @param {number} [options.port] - Local SOCKS port (default: 10800)
 * @param {string} [options.listen] - Local listen interface
 * @returns {Promise<Object|false>} Parsed config object, or false on error.
 */
export default async function trojan2config({ url, base, port, listen } = {}) {
  try {
    const data = parseTrojan(url);
    if (!data) throw new Error('Invalid Trojan URL');

    let config;
    if (base) {
      const raw = await readFile(base, 'utf8');
      config = JSON.parse(raw);
    } else {
      config = {
        inbounds: [{
          tag: 'proxy',
          port: 10800,
          listen: '0.0.0.0',
          protocol: 'socks',
          settings: { auth: 'noauth', udp: true },
        }],
        outbounds: [{
          tag: 'proxy',
          protocol: 'trojan',
          settings: { servers: [{ address: '', port: 0, password: '' }] },
          streamSettings: {},
        }],
      };
    }

    // Set inbound port/listen
    const [inbound] = config.inbounds;
    if (port) inbound.port = port;
    if (listen) inbound.listen = listen;

    // Find or create a trojan outbound
    let outbound = config.outbounds.find(o => o.protocol === 'trojan');
    if (!outbound) {
      outbound = {
        tag: 'proxy',
        protocol: 'trojan',
        settings: { servers: [{ address: '', port: 0, password: '' }] },
        streamSettings: {},
      };
      config.outbounds.unshift(outbound);
    }

    outbound.protocol = 'trojan';
    outbound.tag = `${data.remark || 'trojan'} ${data.address} ${data.port}`;

    const [server] = outbound.settings.servers;
    server.address = data.address;
    server.port = data.port;
    server.password = data.password;

    outbound.streamSettings = buildStreamSettings(data);

    return config;
  } catch (e) {
    return false;
  }
}
