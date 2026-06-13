import path from 'path';
import { readFile } from 'fs/promises';

const HY2_PROTO = 'hysteria2://';

/**
 * Build a Hysteria2 share URL from a server-side inbound config.
 *
 * Format: hysteria2://password@host:port/?insecure=1#tag
 *
 * Supports both:
 * - v2fly v5 native hy2 (password in streamSettings.transportSettings.password)
 * - standalone hysteria2 server config (password in settings.password or auth.password)
 */
function createHysteria2Url(inboundConfig, addressOverride) {
  const { port } = inboundConfig;
  const tag = inboundConfig.tag ?? `hy2-${port}`;

  // v2fly v5: password lives in streamSettings.transportSettings
  const password = inboundConfig.streamSettings?.transportSettings?.password
    // fallback: settings-level password
    || inboundConfig.settings?.password;

  if (!password) throw new Error('Hysteria2 inbound has no password');

  const address = addressOverride
    || (inboundConfig.listen === '0.0.0.0' || !inboundConfig.listen
      ? 'YOUR_SERVER_IP'
      : inboundConfig.listen);

  const fragment = encodeURIComponent(tag);
  return `${HY2_PROTO}${encodeURIComponent(password)}@${address}:${port}/?insecure=1#${fragment}`;
}

/**
 * Convert a v2ray server config file with a hysteria2 inbound into a
 * Hysteria2 share URL.
 *
 * @param {{ path: string, inboundTag?: string, address?: string }} options
 *   path       - path to the server-side v2ray config.json
 *   inboundTag - optional tag to select a specific inbound (defaults to first hysteria2 inbound)
 *   address    - optional server address override (uses inbound.listen if omitted)
 */
export default async function config2hysteria2({ path: filePath, inboundTag, address } = {}) {
  try {
    const absolute = path.resolve(process.cwd(), filePath);
    const configContent = await readFile(absolute, 'utf8');
    const config = JSON.parse(configContent);

    const inbound = config.inbounds?.find(
      (i) => i.protocol === 'hysteria2' && (inboundTag ? i.tag === inboundTag : true)
    );
    if (!inbound) throw new Error('No hysteria2 inbound found in config');

    return createHysteria2Url(inbound, address);
  } catch (e) {
    return false;
  }
}
