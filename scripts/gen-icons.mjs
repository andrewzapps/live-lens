// Minimal valid PNG (1x1 grey pixel) - we'll resize by repeating; Chrome accepts small icons
const minimalPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
import fs from 'fs';
import path from 'path';
const dir = path.join(process.cwd(), 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
[16, 48, 128].forEach((size) => {
  fs.writeFileSync(path.join(dir, `icon${size}.png`), minimalPng);
});
console.log('Wrote placeholder icons to icons/');
