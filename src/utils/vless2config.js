import { readFile } from 'fs/promises';

/**
 * Parse a VLESS share URL into its components.
 *
 * Format: vless://uuid@address:port?type=tcp&security=none&...#remark
 */
function parseVless(url) {
  if (!url?.startsWith('vless://')) return null;

  const withoutProto = url.slice(8); // strip "vless://"
  const [mainPart, fragment] = withoutProto.split('#');
  const [userHost, queryStr] = mainPart.split('?');
  const [userInfo, hostPort] = userHost.split('@');
  const lastColon = hostPort.lastIndexOf(':');
  const address = hostPort.slice(0, lastColon);
  const port = parseInt(hostPort.slice(lastColon + 1), 10);
  const params = new URLSearchParams(queryStr || '');

  return {
    id: userInfo,
    address,
    port,
    remark: fragment ? decodeURIComponent(fragment) : '',
    type: params.get('type') || 'tcp',
    security: params.get('security') || 'none',
    sni: params.get('sni') || '',
    fp: params.get('fp') || '',
    alpn: params.get('alpn') || '',
    pbk: params.get('pbk') || '',
    sid: params.get('sid') || '',
    path: params.get('path') || '',
    host: params.get('host') || '',
    serviceName: params.get('serviceName') || '',
    headerType: params.get('headerType') || '',
    encryption: params.get('encryption') || 'none',
    flow: params.get('flow') || '',
    seed: params.get('seed') || '',
  };
}

/**
 * Build stream settings from parsed VLESS URL data.
 */
function buildStreamSettings(data) {
  const ss = { network: data.type };

  if (data.security === 'tls') {
    ss.security = 'tls';
    ss.tlsSettings = {};
    if (data.sni) ss.tlsSettings.serverName = data.sni;
    if (data.fp) ss.tlsSettings.fingerprint = data.fp;
    if (data.alpn) ss.tlsSettings.alpn = data.alpn.split(',');
  } else if (data.security === 'reality') {
    ss.security = 'reality';
    ss.realitySettings = {};
    if (data.sni) ss.realitySettings.serverName = data.sni;
    if (data.pbk) ss.realitySettings.publicKey = data.pbk;
    if (data.sid) ss.realitySettings.shortId = data.sid;
    if (data.fp) ss.realitySettings.fingerprint = data.fp;
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
  } else if (data.type === 'kcp') {
    ss.kcpSettings = { header: {} };
    if (data.headerType) ss.kcpSettings.header.type = data.headerType;
    if (data.seed) ss.kcpSettings.seed = data.seed;
  } else if (data.type === 'tcp' && data.headerType === 'http') {
    ss.tcpSettings = {
      header: {
        type: 'http',
        request: {
          headers: { Host: data.host ? [data.host] : [] },
          path: data.path ? [data.path] : ['/'],
        },
      },
    };
  }

  return ss;
}

/**
 * Convert a VLESS share URL into a v2ray client config.
 *
 * @param {Object} options
 * @param {string} options.url   - VLESS share URL (vless://...)
 * @param {string} [options.base] - Path to a base config file (optional; uses built-in defaults)
 * @param {number} [options.port] - Local SOCKS port (default: 10800)
 * @param {string} [options.listen] - Local listen interface
 * @returns {Promise<Object|false>} Parsed config object, or false on error.
 */
export default async function vless2config({ url, base, port, listen } = {}) {
  try {
    const data = parseVless(url);
    if (!data) throw new Error('Invalid VLESS URL');

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
          protocol: 'vless',
          settings: { vnext: [{ address: '', port: 0, users: [{}] }] },
          streamSettings: {},
        }],
      };
    }

    // Set inbound port/listen
    const [inbound] = config.inbounds;
    if (port) inbound.port = port;
    if (listen) inbound.listen = listen;

    // Find or create a VLESS outbound
    let outbound = config.outbounds.find(o => o.protocol === 'vless');
    if (!outbound) {
      outbound = {
        tag: 'proxy',
        protocol: 'vless',
        settings: { vnext: [{ address: '', port: 0, users: [{}] }] },
        streamSettings: {},
      };
      config.outbounds.unshift(outbound);
    }

    outbound.protocol = 'vless';
    outbound.tag = `${data.remark || 'vless'} ${data.address} ${data.port}`;

    const [vnext] = outbound.settings.vnext;
    vnext.address = data.address;
    vnext.port = data.port;

    const [user] = vnext.users;
    user.id = data.id;
    user.encryption = data.encryption;
    if (data.flow) user.flow = data.flow;

    outbound.streamSettings = buildStreamSettings(data);

    return config;
  } catch (e) {
    return false;
  }
}
