#!/usr/bin/env node

import { Command } from 'commander';
import { findDefaultConfig, vmess2config, config2vmess, config2vless, config2trojan } from '../utils/index.js';

const program = new Command();

program
  .name('v2ray-tools')
  .description('v2ray tools for vmess url and config conversion')
  .version('0.2.1');

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
  .action(async (options) => {
    const vlessUrl = await config2vless({ path: options.path, inboundTag: options.tag });
    if (!vlessUrl) { console.error('Failed to generate VLESS url'); process.exit(1); }
    console.log(vlessUrl);
  });

program
  .command('config2trojan')
  .description('convert v2ray server config file into trojan share url')
  .requiredOption('-p, --path <path>', 'the path for the v2ray server config file')
  .option('-t, --tag <tag>', 'inbound tag to select (defaults to first trojan inbound)')
  .action(async (options) => {
    const trojanUrl = await config2trojan({ path: options.path, inboundTag: options.tag });
    if (!trojanUrl) { console.error('Failed to generate Trojan url'); process.exit(1); }
    console.log(trojanUrl);
  });

program.parse();
