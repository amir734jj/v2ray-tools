V2Ray Tools
====

Installaction
----
```shell
npm -g install v2ray-tools
```

Usage
----
```shell
v2ray-tools [command]

Commands:
  v2ray-tools vmess2config  convert vmess url into v2ray config
  v2ray-tools config2vmess  convert v2ray config file into vmess url

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

```shell
v2ray-tools vmess2config

convert vmess url into v2ray config

Options:
  --base     base v2ray config file path              [default: "assets/base.json"]
  --url      vmess url                                                [required]
  --port     port for listen                           [number] [default: 10800]
  --listen   listen interface
```

```shell
v2ray-tools config2vmess

convert v2ray config file into vmess url

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
  --path     the path for the v2ray config file                       [required]
```

