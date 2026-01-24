import path from 'path';
import { readFile } from 'fs/promises';


const VMESS_PROTO = 'vmess://';

// attempts to reverse the streamSettings present in any v2ray config.json file
// by extracting the required information for a Vmess Obj 
function streamSettingsReverse(config) {
  let net = null, tls = null, host = null, type = null, path = null;

  net = config?.network;

  if (config?.security === 'tls') {
    tls = 'tls';
    if (config?.tlsSettings?.serverName) host = config?.tlsSettings?.serverName;
  }

  if (net === 'kcp') {
    const { kcpSettings } = config;
    type = kcpSettings?.header?.type
  } else if (net === 'ws') {
    const { wsSettings } = config;
    if (host) host = wsSettings?.headers?.Host;
    if (wsSettings?.path) path = wsSettings?.path;
  } else if (net === 'h2') {
    const { httpSettings } = config;
    if (httpSettings?.host) host = httpSettings?.host?.join(',');
    path = httpSettings?.path;
  } else if (net === 'quic') {
    const { quicSettings } = config;
    host = quicSettings?.security
    path = quicSettings?.key
    type = quicSettings?.header?.type;
  } else if (net === 'tcp') {
    const { tcpSettings } = config;
    if (tcpSettings && tcpSettings.header && tcpSettings.header.type === 'http') {
      type = tcpSettings.header.type;
      const hostHeader = tcpSettings.header.request.headers.Host;
      host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
      path = tcpSettings.header.request.path[0]
    }
  }

  return {
    net, tls, host, type, path
  }
}

// the final Vmess configuration object that will be converted to JSON then to Base64
function createVmessObj(outboundConfig) {
  let { tag } = outboundConfig;
  if(tag && tag.length) {
    tag = tag.split(" ")[0];
  }
  const streamSettings = outboundConfig?.streamSettings;
  const [vnext] = outboundConfig.settings?.vnext;
  const { address, port } = vnext;
  const [user] = vnext?.users;
  const id = user?.id;
  const aid = user?.alterId;
  const scy = user?.security || 'auto';
  const { net, tls, host, type, path } = streamSettingsReverse(streamSettings);

  // the reason for casting out "none" here is that v2ray configs are strict
  // an empty string "" instead of "none" will break the config 
  const obj = {
    v: "2",
    ps: tag || "none",
    add: address || "none",
    port: String(port || 0),
    id: id || "0",
    aid: String(aid || 0),
    net: net || "none",
    type: type || "none",
    host: host || "",
    path: path || "none",
    tls: tls || "none",
    scy: scy
  }

  return obj;
}

// craft a Base64 string out of Vmess Obj
function createEncodedUrl(config) {
  const [outbound] = config.outbounds;
  if (outbound.protocol === 'vmess') {
    const vmessObj = createVmessObj(outbound);
    const jsoned = JSON.stringify(vmessObj);
    const encodedString = Buffer.from(jsoned).toString('base64');
    return `${VMESS_PROTO}${encodedString}`;
  } else return new Error("only vmess protocol URLs are supported");
}

export default async function config2vmess({ path: filePath }) {
  try {
    const absolute = path.resolve(process.cwd(), filePath);
    const configContent = await readFile(absolute, 'utf8');
    const config = JSON.parse(configContent);
    const encoded = createEncodedUrl(config);
    return encoded;
  } catch (e) {
    // Silently return false for invalid paths in production
    // console.log(e)
    return false;
  }
}
