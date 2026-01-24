import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findFirstExistFile(files) {
  if (!files || !files.length) return undefined;

  return files.find(function(file) {
    try {
      fs.accessSync(file, fs.constants.R_OK);
      return file;
    } catch (err) {
      return false;
    }
  });
}

function findDefaultConfig() {
  const configPath = './base.json';
  const files = [
    path.resolve(process.cwd(), configPath),
    path.resolve(__dirname, '..', configPath),
  ];
  return findFirstExistFile(files);
}

export default findDefaultConfig;
