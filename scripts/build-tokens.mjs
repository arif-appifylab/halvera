// Generates src/design-system/tokens.css from src/design-system/tokens.json.
// Run with `npm run tokens`. Edit tokens.json, never tokens.css.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/design-system/', import.meta.url));
const t = JSON.parse(readFileSync(dir + 'tokens.json', 'utf8'));

const themes = t.color.themes.map((th) => th.id);
const base = themes[0];
const byTheme = Object.fromEntries(themes.map((id) => [id, []]));

const themed = (name, value) => {
  if (typeof value === 'string') byTheme[base].push(`  --${name}: ${value};`);
  else for (const id of themes) if (value[id] != null) byTheme[id].push(`  --${name}: ${value[id]};`);
};

for (const tok of t.color.tokens) themed(tok.name, tok.value);
for (const tok of t.shadow?.tokens || []) themed(tok.name, tok.value);

const flat = [];
for (const [name, value] of Object.entries(t.type.families)) flat.push(`  --font-${name}: ${value};`);
for (const group of t.type.groups) {
  for (const s of group.styles) {
    flat.push(`  --${s.name}-font-family: var(--font-${group.family});`);
    flat.push(`  --${s.name}-font-size: ${s.fontSize};`);
    flat.push(`  --${s.name}-line-height: ${s.lineHeight};`);
    flat.push(`  --${s.name}-font-weight: ${s.fontWeight};`);
    if (s.letterSpacing) flat.push(`  --${s.name}-letter-spacing: ${s.letterSpacing};`);
  }
}
for (const family of ['spacing', 'radius', 'layout', 'zIndex']) {
  for (const tok of t[family]?.tokens || []) flat.push(`  --${tok.name}: ${tok.value};`);
}

const css = `/* ${t.name} — generated from tokens.json by scripts/build-tokens.mjs. Do not edit. */

:root,
[data-theme="${base}"] {
  color-scheme: ${base};
${byTheme[base].join('\n')}
${flat.join('\n')}
}
${themes.slice(1).map((id) => `
[data-theme="${id}"] {
  color-scheme: ${id};
${byTheme[id].join('\n')}
}
`).join('')}`;

writeFileSync(dir + 'tokens.css', css);
console.log('Wrote src/design-system/tokens.css');
