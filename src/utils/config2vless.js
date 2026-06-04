import path from 'path';
import { readFile } from 'fs/promises';

const VLESS_PROTO = 'vless://';

// Encode stream settings into VLESS query-string params
function streamSettingsToParams(streamSettings) {
  const params = new URLSearchParams();

  const network = streamSettings?.network ?? 'tcp';
  params.set('type', network);

  const security = streamSettings?.security ?? 'none';
  params.set('security', security);

  if (security === 'tls') {
    const sni = streamSettings?.tlsSettings?.serverName;
    if (sni) params.set('sni', sni);
    const fp = streamSettings?.tlsSettings?.fingerprint;
    if (fp) params.set('fp', fp);
  } else if (security === 'reality') {
    const realitySettings = streamSettings?.realitySettings ?? {};
    if (realitySettings.serverName) params.set('sni', realitySettings.serverName);
    if (realitySettings.publicKey)  params.set('pbk', realitySettings.publicKey);
    if (realitySettings.shortId)    params.set('sid', realitySettings.shortId);
    if (realitySettings.fingerprint) params.set('fp', realitySettings.fingerprint);
  }

  if (network === 'ws') {
    const ws = streamSettings?.wsSettings ?? {};
    if (ws.path) params.set('path', ws.path);
    const host = ws.headers?.Host;
    if (host) params.set('host', host);
  } else if (network === 'grpc') {
    const grpc = streamSettings?.grpcSettings ?? {};
    if (grpc.serviceName) params.set('serviceName', grpc.serviceName);
  } else if (network === 'h2' || network === 'http') {
    const http = streamSettings?.httpSettings ?? {};
    if (http.path) params.set('path', http.path);
    if (http.host?.length) params.set('host', http.host[0]);
  } else if (network === 'tcp') {
    const tcpHeader = streamSettings?.tcpSettings?.header;
    if (tcpHeader?.type === 'http') {
      params.set('headerType', 'http');
      const host = tcpHeader?.request?.headers?.Host;
      if (host) params.set('host', Array.isArray(host) ? host[0] : host);
      const reqPath = tcpHeader?.request?.path;
      if (reqPath) params.set('path', Array.isArray(reqPath) ? reqPath[0] : reqPath);
    }
  }

  params.set('encryption', 'none');
  return params.toString();
}

// Build a VLESS share URL from a server-side inbound config
function createVlessUrl(inboundConfig, addressOverride) {
  const { port, settings, streamSettings } = inboundConfig;
  const tag = inboundConfig.tag ?? `vless-${port}`;
  const [client] = settings?.clients ?? [];
  const id = client?.id;
  if (!id) throw new Error('VLESS inbound has no client id');

  const address = addressOverride
    || (inboundConfig.listen === '0.0.0.0' || !inboundConfig.listen
      ? 'YOUR_SERVER_IP'
      : inboundConfig.listen);

  const query = streamSettingsToParams(streamSettings);
  const fragment = encodeURIComponent(tag);
  return `${VLESS_PROTO}${id}@${address}:${port}?${query}#${fragment}`;
}

/**
 * Convert a v2ray server config file with a vless inbound into a VLESS share URL.
 *
 * @param {{ path: string, inboundTag?: string, address?: string }} options
 *   path       - path to the server-side v2ray config.json
 *   inboundTag - optional tag to select a specific inbound (defaults to first vless inbound)
 *   address    - optional server address override (uses inbound.listen if omitted)
 */
export default async function config2vless({ path: filePath, inboundTag, address } = {}) {
  try {
    const absolute = path.resolve(process.cwd(), filePath);
    const configContent = await readFile(absolute, 'utf8');
    const config = JSON.parse(configContent);

    const inbound = config.inbounds?.find(
      (i) => i.protocol === 'vless' && (inboundTag ? i.tag === inboundTag : true)
    );
    if (!inbound) throw new Error('No vless inbound found in config');

    return createVlessUrl(inbound, address);
  } catch (e) {
    return false;
  }
}
