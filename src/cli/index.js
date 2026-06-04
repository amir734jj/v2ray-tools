#!/usr/bin/env node

import { Command } from 'commander';
import { findDefaultConfig, vmess2config, vless2config, trojan2config, config2vmess, config2vless, config2trojan } from '../utils/index.js';

const program = new Command();

program
  .name('v2ray-tools')
  .description('v2ray tools for vmess/vless/trojan url and config conversion')
  .version('0.3.0');

program
  .command('vmess2config')
  .description('convert vmess url into v2ray config')
  .requiredOption('-u, --url <url>', 'vmess url')
  .option('-b, --base <path>', 'base v2ray config file path', findDefaultConfig())
  .option('-p, --port <number>', 'port for listen', '10800')
  .option('-l, --listen <interface>', 'listen interface')
  .action(async (options) => {
    const config = await vmess2config({
      url: options.url,
      base: options.base,
      port: parseInt(options.port),
      listen: options.listen
    });
    console.log(JSON.stringify(config, '', 2));
  });

program
  .command('config2vmess')
  .description('convert v2ray config file into vmess url')
  .requiredOption('-p, --path <path>', 'the path for the v2ray config file')
  .action(async (options) => {
    const vmessUrl = await config2vmess({ path: options.path });
    console.log(vmessUrl);
  });

program
  .command('config2vless')
  .description('convert v2ray server config file into vless share url')
  .requiredOption('-p, --path <path>', 'the path for the v2ray server config file')
  .option('-t, --tag <tag>', 'inbound tag to select (defaults to first vless inbound)')
  .option('-a, --address <address>', 'server address override (default: uses inbound listen)')
  .action(async (options) => {
    const vlessUrl = await config2vless({ path: options.path, inboundTag: options.tag, address: options.address });
    if (!vlessUrl) { console.error('Failed to generate VLESS url'); process.exit(1); }
    console.log(vlessUrl);
  });

program
  .command('config2trojan')
  .description('convert v2ray server config file into trojan share url')
  .requiredOption('-p, --path <path>', 'the path for the v2ray server config file')
  .option('-t, --tag <tag>', 'inbound tag to select (defaults to first trojan inbound)')
  .option('-a, --address <address>', 'server address override (default: uses inbound listen)')
  .action(async (options) => {
    const trojanUrl = await config2trojan({ path: options.path, inboundTag: options.tag, address: options.address });
    if (!trojanUrl) { console.error('Failed to generate Trojan url'); process.exit(1); }
    console.log(trojanUrl);
  });

program
  .command('vless2config')
  .description('convert vless share url into v2ray client config')
  .requiredOption('-u, --url <url>', 'vless share url')
  .option('-b, --base <path>', 'base v2ray config file path')
  .option('-p, --port <number>', 'port for listen', '10800')
  .option('-l, --listen <interface>', 'listen interface')
  .action(async (options) => {
    const config = await vless2config({
      url: options.url,
      base: options.base,
      port: parseInt(options.port),
      listen: options.listen
    });
    if (!config) { console.error('Failed to convert VLESS url'); process.exit(1); }
    console.log(JSON.stringify(config, '', 2));
  });

program
  .command('trojan2config')
  .description('convert trojan share url into v2ray client config')
  .requiredOption('-u, --url <url>', 'trojan share url')
  .option('-b, --base <path>', 'base v2ray config file path')
  .option('-p, --port <number>', 'port for listen', '10800')
  .option('-l, --listen <interface>', 'listen interface')
  .action(async (options) => {
    const config = await trojan2config({
      url: options.url,
      base: options.base,
      port: parseInt(options.port),
      listen: options.listen
    });
    if (!config) { console.error('Failed to convert Trojan url'); process.exit(1); }
    console.log(JSON.stringify(config, '', 2));
  });

program.parse();
