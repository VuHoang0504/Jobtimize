import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontFiles } from '../shared/cv/fonts.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'client/public/cv-fonts');
fs.mkdirSync(target, { recursive: true });
for (const { file } of fontFiles()) {
  const family = ObjectKey(file);
  fs.copyFileSync(path.join(root, 'client/node_modules/@fontsource', family, 'files', file), path.join(target, file));
}
for (const family of ['be-vietnam-pro', 'roboto', 'roboto-condensed', 'lato']) {
  fs.copyFileSync(path.join(root, 'client/node_modules/@fontsource', family, 'LICENSE'), path.join(target, `${family}-LICENSE.txt`));
}
function ObjectKey(file) { return ['be-vietnam-pro', 'roboto-condensed', 'roboto', 'lato'].find(id => file.startsWith(`${id}-`)); }
console.log('Copied CV fonts and licenses.');
