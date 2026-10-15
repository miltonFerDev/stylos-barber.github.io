// @astrojs/vercel v7 emite nodejs18.x/20.x (discontinuados en Vercel).
// Reescribe a nodejs24.x. shortcut: quitar al migrar a Astro 5 + adapter v8.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const funcsDir = '.vercel/output/functions';

let entries;
try {
  entries = readdirSync(funcsDir);
} catch {
  console.log('sin .vercel/output/functions, nada que parchear');
  process.exit(0);
}

for (const dir of entries) {
  const cfg = join(funcsDir, dir, '.vc-config.json');
  try {
    const json = JSON.parse(readFileSync(cfg, 'utf8'));
    if (json.runtime === 'nodejs18.x' || json.runtime === 'nodejs20.x') {
      json.runtime = 'nodejs24.x';
      writeFileSync(cfg, JSON.stringify(json, null, '\t') + '\n');
      console.log('runtime parcheado -> nodejs24.x:', dir);
    }
  } catch {
    // ignora funciones sin .vc-config.json
  }
}
