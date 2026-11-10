# V2Ray Tools

Convert V2Ray share URLs and JSON configurations for VMess, VLESS, Trojan,
Shadowsocks, and Hysteria2.

## Install

```shell
npm install --global v2ray-tools
```

## CLI

```shell
v2ray-tools <command> --help
```

| Command | Conversion |
|---|---|
| `vmess2config` | VMess URL to client config |
| `vless2config` | VLESS URL to client config |
| `trojan2config` | Trojan URL to client config |
| `config2vmess` | Client config to VMess URL |
| `config2vless` | Server config to VLESS URL |
| `config2trojan` | Server config to Trojan URL |
| `config2shadowsocks` | Server config to Shadowsocks URL |
| `config2hysteria2` | Server config to Hysteria2 URL |

Examples:

```shell
v2ray-tools vmess2config --url "<vmess-url>"
v2ray-tools vless2config --url "<vless-url>"
v2ray-tools config2vless --path ./server.json --tag vless-grpc
v2ray-tools config2trojan --path ./server.json --address proxy.example.com
```

Common URL-to-config options:

- `--url <url>`: share URL
- `--base <path>`: optional base client config
- `--port <number>`: local SOCKS port; defaults to `10800`
- `--listen <address>`: local listen address

Common config-to-URL options:

- `--path <path>`: JSON config file
- `--tag <tag>`: select an inbound when multiple candidates exist
- `--address <host>`: override the public server address

## JavaScript API

Import from the package root:

```js
import {
  createConnectionUrl,
  createOutbound,
  config2vless,
  vless2config,
} from 'v2ray-tools';
```

### In-memory conversion

Use the synchronous APIs when you already have a server inbound:

```js
const options = {
  inbound: serverConfig.inbounds.find(item => item.tag === 'vmess-grpc'),
  address: 'grpc.example.com',
  port: 443,
  streamSettings: {
    network: 'grpc',
    security: 'tls',
    tlsSettings: { serverName: 'grpc.example.com' },
    grpcSettings: { serviceName: 'vmess-grpc' },
  },
};

const outbound = createOutbound(options);
const shareUrl = createConnectionUrl(options);
```

`address` is required. `port`, `tag`, and `streamSettings` override the inbound
values. Inputs are not mutated.

For current v2rayNG clients, pass `client: 'v2rayng'` to `createConnectionUrl`:

```js
const shareUrl = createConnectionUrl({ ...options, client: 'v2rayng' });
```

Shadowsocks over WebSocket is then encoded as a native `v2rayn://` profile,
preserving TLS verification, SNI, Host, path, cipher, and password. v2rayNG's
`ss://` importer ignores `v2ray-plugin` transport options. Other protocols and
plain TCP Shadowsocks retain their existing URLs. Without this option,
Shadowsocks WebSocket links remain SIP002 `ss://` links for plugin-aware clients.

Supported protocols:

- VLESS
- VMess, including gRPC service names and TLS SNI
- Trojan
- Shadowsocks, including WebSocket `v2ray-plugin` links

Native Shadowsocks gRPC works with `createOutbound`, but it has no portable
share-URL representation, so `createConnectionUrl` rejects it.

### File-based conversion

The existing asynchronous `config2*` functions accept a config path:

```js
const url = await config2vless({
  path: './server.json',
  inboundTag: 'vless-grpc',
  address: 'grpc.example.com',
});
```

The in-memory APIs throw descriptive errors. For backward compatibility,
legacy file-based `config2*` functions return `false` when conversion fails.

`config2shadowsocks` also accepts `client: 'v2rayng'`. Its CLI equivalent is:

```shell
v2ray-tools config2shadowsocks --path server.json --address vpn.example.com --client v2rayng
```

## Development

```shell
npm install
npm test
npm run cli -- --help
```

`npm test` uses Node.js's automatic test discovery. CI runs the suite on
Node.js 22 and 24.

## License

MIT
