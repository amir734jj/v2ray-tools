V2Ray Tools
====

Installation
----
```shell
npm -g install v2ray-tools
```

Usage
----

### Global Installation

After installing globally, use the CLI directly:

```shell
v2ray-tools [command]

Commands:
  v2ray-tools vmess2config        convert vmess url into v2ray config
  v2ray-tools config2vmess        convert v2ray config file into vmess url
  v2ray-tools config2vless        convert v2ray server config file into vless share url
  v2ray-tools config2trojan       convert v2ray server config file into trojan share url
  v2ray-tools config2shadowsocks  convert v2ray server config file into shadowsocks share url
  v2ray-tools config2hysteria2    convert v2ray server config file into hysteria2 share url

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

### Local Development

For local development, use npm scripts:

```shell
# Show help
npm run cli -- --help

# Convert vmess URL to config
npm run vmess2config -- --url <vmess-url>

# Convert config to vmess URL
npm run config2vmess -- --path <config-path>
```

### Commands

#### vmess2config

convert vmess url into v2ray config

```shell
# Global
v2ray-tools vmess2config --url <vmess-url> [options]

# Local
npm run vmess2config -- --url <vmess-url> [options]
```

**Options:**
- `--base` - base v2ray config file path (default: "assets/base.json")
- `--url` - vmess url (required)
- `--port` - port for listen (default: 10800)
- `--listen` - listen interface

#### config2vmess

convert v2ray config file into vmess url

```shell
# Global
v2ray-tools config2vmess --path <config-path>

# Local
npm run config2vmess -- --path <config-path>
```

**Options:**
- `--path` - the path for the v2ray config file (required)
- `--version` - show version number
- `--help` - show help

#### config2vless

Convert a v2ray **server** config file containing a `vless` inbound into a VLESS
share URL. Supports TCP, WebSocket, gRPC, H2, and TLS/REALITY stream settings.

```shell
# Global
v2ray-tools config2vless --path <server-config-path> [--tag <inbound-tag>]

# Local
npm run cli -- config2vless --path <server-config-path>
```

**Options:**
- `--path` - path to the server-side v2ray config file (required)
- `--tag`  - inbound tag to select when the config has multiple inbounds (optional; defaults to first vless inbound)

**Example output:**
```
vless://uuid@1.2.3.4:4556?type=tcp&security=none&encryption=none#vless-4556
```

#### config2trojan

Convert a v2ray **server** config file containing a `trojan` inbound into a
Trojan share URL. Supports TCP, WebSocket, gRPC, H2, and TLS stream settings.

```shell
# Global
v2ray-tools config2trojan --path <server-config-path> [--tag <inbound-tag>]

# Local
npm run cli -- config2trojan --path <server-config-path>
```

**Options:**
- `--path` - path to the server-side v2ray config file (required)
- `--tag`  - inbound tag to select when the config has multiple inbounds (optional; defaults to first trojan inbound)

**Example output:**
```
trojan://password@1.2.3.4:7236?type=tcp&security=none#trojan-7236
```

#### config2shadowsocks

Convert a v2ray **server** config file containing a `shadowsocks` inbound into a
Shadowsocks SIP002 share URL.

```shell
# Global
v2ray-tools config2shadowsocks --path <server-config-path> [--tag <inbound-tag>]

# Local
npm run cli -- config2shadowsocks --path <server-config-path>
```

**Options:**
- `--path`    - path to the server-side v2ray config file (required)
- `--tag`     - inbound tag to select when the config has multiple inbounds (optional; defaults to first shadowsocks inbound)
- `--address` - server address override

**Example output:**
```
ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ@1.2.3.4:9388#ss-9388
```

#### config2hysteria2

Convert a v2ray **server** config file containing a `hysteria2` inbound into a
Hysteria2 share URL. Supports v2fly v5 native hysteria2 (password in
`streamSettings.transportSettings`) and fallback `settings.password`.

```shell
# Global
v2ray-tools config2hysteria2 --path <server-config-path> [--tag <inbound-tag>]

# Local
npm run cli -- config2hysteria2 --path <server-config-path>
```

**Options:**
- `--path`    - path to the server-side v2ray config file (required)
- `--tag`     - inbound tag to select when the config has multiple inbounds (optional; defaults to first hysteria2 inbound)
- `--address` - server address override

**Example output:**
```
hysteria2://password@1.2.3.4:5678/?insecure=1#hy2-5678
```

#### vless2config

Convert a VLESS share URL into a v2ray **client** config. Supports TCP, WebSocket,
gRPC, H2, TLS, and REALITY stream settings.

```shell
# Global
v2ray-tools vless2config --url <vless-url> [options]

# Local
npm run vless2config -- --url <vless-url>
```

**Options:**
- `--url`    - VLESS share URL (required)
- `--base`   - base v2ray config file path (optional)
- `--port`   - local SOCKS port (default: 10800)
- `--listen` - local listen interface

**Example:**
```shell
v2ray-tools vless2config --url "vless://uuid@1.2.3.4:443?type=tcp&security=none&encryption=none#my-vless"
```

#### trojan2config

Convert a Trojan share URL into a v2ray **client** config. Supports TCP, WebSocket,
gRPC, H2, and TLS stream settings.

```shell
# Global
v2ray-tools trojan2config --url <trojan-url> [options]

# Local
npm run trojan2config -- --url <trojan-url>
```

**Options:**
- `--url`    - Trojan share URL (required)
- `--base`   - base v2ray config file path (optional)
- `--port`   - local SOCKS port (default: 10800)
- `--listen` - local listen interface

**Example:**
```shell
v2ray-tools trojan2config --url "trojan://password@1.2.3.4:443?type=tcp&security=tls#my-trojan"
```

## Credits

Special thanks to [@AliSawari](https://github.com/AliSawari) for their fix PR: [#18](https://github.com/kltk/v2ray-tools/pull/18)

