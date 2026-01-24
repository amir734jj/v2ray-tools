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
  v2ray-tools vmess2config  convert vmess url into v2ray config
  v2ray-tools config2vmess  convert v2ray config file into vmess url

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

## Credits

Special thanks to [@AliSawari](https://github.com/AliSawari) for their fix PR: [#18](https://github.com/kltk/v2ray-tools/pull/18)

