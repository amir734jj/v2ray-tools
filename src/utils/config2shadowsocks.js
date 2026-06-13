import path from 'path';
import { readFile } from 'fs/promises';

const SS_PROTO = 'ss://';

/**
 * Build a Shadowsocks SIP002 share URL from a server-side inbound config.
 *
 * Format: ss://base64url(method:password)@host:port#tag
 */
function createShadowsocksUrl(inboundConfig, addressOverride) {
  const { port, settings } = inboundConfig;
  const tag = inboundConfig.tag ?? `ss-${port}`;
  const method = settings?.method;
  const password = settings?.password;
  if (!method || !password) throw new Error('Shadowsocks inbound missing method or password');

  const address = addressOverride
    || (inboundConfig.listen === '0.0.0.0' || !inboundConfig.listen
      ? 'YOUR_SERVER_IP'
      : inboundConfig.listen);

  const userinfo = Buffer.from(`${method}:${password}`).toString('base64url');
  const fragment = encodeURIComponent(tag);
  return `${SS_PROTO}${userinfo}@${address}:${port}#${fragment}`;
}

/**
 * Convert a v2ray server config file with a shadowsocks inbound into a
 * Shadowsocks SIP002 share URL.
 *
 * @param {{ path: string, inboundTag?: string, address?: string }} options
 *   path       - path to the server-side v2ray config.json
 *   inboundTag - optional tag to select a specific inbound (defaults to first shadowsocks inbound)
 *   address    - optional server address override (uses inbound.listen if omitted)
 */
export default async function config2shadowsocks({ path: filePath, inboundTag, address } = {}) {
  try {
    const absolute = path.resolve(process.cwd(), filePath);
    const configContent = await readFile(absolute, 'utf8');
    const config = JSON.parse(configContent);

    const inbound = config.inbounds?.find(
      (i) => i.protocol === 'shadowsocks' && (inboundTag ? i.tag === inboundTag : true)
    );
    if (!inbound) throw new Error('No shadowsocks inbound found in config');

    return createShadowsocksUrl(inbound, address);
  } catch (e) {
    return false;
  }
}
