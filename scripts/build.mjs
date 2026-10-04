// Kullanım:
//   node scripts/build.mjs                 → commits/ klasörünü doğrular, site/data/commits.json üretir
//   node scripts/build.mjs --check         → yalnızca doğrular (dosya yazmaz)
//   node scripts/build.mjs --check --files commits/a.json,commits/b.json
//   --report rapor.md                      → sonuçları Markdown olarak da yazar
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateEntry, cleanEntry } from './lib/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMMITS_DIR = path.join(ROOT, 'commits');
const OUT = path.join(ROOT, 'site', 'data', 'commits.json');

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const checkOnly = args.includes('--check');
const onlyFiles = opt('--files')?.split(',').map((f) => f.trim()).filter(Boolean);
const reportPath = opt('--report');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return d.name.endsWith('.json') ? [p] : [];
  });
}

function addedAt(file) {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%cI', '-1', '--', file], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (out) return new Date(out).toISOString();
  } catch {}
  return fs.statSync(file).mtime.toISOString();
}

const files = onlyFiles
  ? onlyFiles.filter((f) => f.endsWith('.json')).map((f) => path.resolve(ROOT, f)).filter((f) => fs.existsSync(f))
  : walk(COMMITS_DIR);

const results = [];
const entries = [];
const seen = new Map();

for (const file of files) {
  const rel = path.relative(ROOT, file).replaceAll('\\', '/');
  let entry;
  try {
    entry = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    results.push({ rel, errors: [`JSON okunamadı: ${e.message}`], warnings: [] });
    continue;
  }
  const { errors, warnings } = validateEntry(entry);
  if (!errors.length) {
    const key = `${entry.rumuz.trim().toLocaleLowerCase('tr')}|${entry.mesaj.trim().toLocaleLowerCase('tr')}`;
    if (seen.has(key)) warnings.push(`Aynı rumuz ve mesaj başka bir dosyada da var: ${seen.get(key)}`);
    else seen.set(key, rel);
    const no = path.basename(file).match(/^issue-(\d+)\.json$/)?.[1];
    entries.push({ ...cleanEntry(entry), ...(no && { no: Number(no) }), t: addedAt(file), _file: rel });
  }
  results.push({ rel, errors, warnings });
}

const failed = results.filter((r) => r.errors.length);
const warned = results.filter((r) => r.warnings.length);

const lines = [`## Cumhuriyet'e Commit — katkı kontrolü`, '', `İncelenen dosya: ${results.length}`, ''];
if (!results.length) lines.push('Kontrol edilecek katkı dosyası bulunamadı.');
for (const r of results) {
  const status = r.errors.length ? '❌' : r.warnings.length ? '⚠️' : '✅';
  lines.push(`${status} \`${r.rel}\``);
  for (const e of r.errors) lines.push(`  - Hata: ${e}`);
  for (const w of r.warnings) lines.push(`  - Uyarı: ${w}`);
}
const report = lines.join('\n');
console.log(report);
if (reportPath) fs.writeFileSync(reportPath, report + '\n');

if (!checkOnly) {
  entries.sort((a, b) => a.t.localeCompare(b.t) || a._file.localeCompare(b._file));
  const out = entries.map(({ _file, ...rest }) => rest);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0) + '\n');
  const lessons = out.filter((e) => e.tur === 'ders').length;
  console.log(`\n${OUT} yazıldı: ${out.length - lessons} commit, ${lessons} ders.`);
}

if (failed.length) {
  console.error(`\n${failed.length} dosyada hata var.${checkOnly ? '' : ' Bu dosyalar siteye eklenmedi.'}`);
  if (checkOnly) process.exit(1);
}
if (warned.length) console.log(`\n${warned.length} dosya moderatör incelemesi bekliyor.`);
