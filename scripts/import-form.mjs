// Google Form yanıtlarını (CSV olarak indirilmiş) commits/form-<kimlik>.json dosyalarına çevirir.
// Kullanım: node scripts/import-form.mjs yanitlar.csv
// Aynı CSV tekrar içe aktarılırsa mevcut dosyalar atlanır. Oluşan dosyalar PR ile moderatör onayına gider.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateEntry, cleanEntry } from './lib/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

const COLUMNS = {
  zaman: /zaman|timestamp/i,
  rumuz: /rumuz/i,
  il: /^il\b|^İl\b/i,
  tur: /tür|tur/i,
  mesaj: /mesaj|satır|satir/i,
  ogrenciGrubu: /öğrenci grubu|ogrenci grubu/i,
  onay: /onay/i,
};

const TYPE = (v) => (/ders/i.test(v) ? 'ders' : 'commit');
const GROUP = (v) => (/çocuk|cocuk/i.test(v) ? 'cocuk' : /65/.test(v) ? '65+' : /yetişkin|yetiskin/i.test(v) ? 'yetiskin' : v);

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Kullanım: node scripts/import-form.mjs yanitlar.csv');
  process.exit(1);
}

const [header, ...rows] = parseCsv(fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, ''));
const col = {};
for (const [key, re] of Object.entries(COLUMNS)) {
  const idx = header.findIndex((h) => re.test(h.trim()));
  if (idx !== -1 && !Object.values(col).includes(idx)) col[key] = idx;
}
for (const need of ['rumuz', 'il', 'mesaj']) {
  if (col[need] === undefined) {
    console.error(`CSV başlıklarında "${need}" sütunu bulunamadı. Başlıklar: ${header.join(' | ')}`);
    process.exit(1);
  }
}

const dir = path.join(ROOT, 'commits');
fs.mkdirSync(dir, { recursive: true });
let written = 0, skipped = 0, rejected = 0;

for (const r of rows) {
  const get = (k) => (col[k] === undefined ? '' : (r[col[k]] ?? '').trim());
  if (col.onay !== undefined && !get('onay')) { rejected++; console.log(`- Onaysız yanıt atlandı: ${get('rumuz')}`); continue; }
  const entry = { rumuz: get('rumuz'), il: get('il'), mesaj: get('mesaj'), tur: TYPE(get('tur')) };
  if (entry.tur === 'ders') entry.ogrenciGrubu = GROUP(get('ogrenciGrubu'));

  const id = crypto.createHash('sha1').update(`${get('zaman')}|${entry.rumuz}|${entry.mesaj}`).digest('hex').slice(0, 10);
  const file = path.join(dir, `form-${id}.json`);
  if (fs.existsSync(file)) { skipped++; continue; }

  const { errors, warnings } = validateEntry(entry);
  if (errors.length) {
    rejected++;
    console.log(`- Reddedildi (${entry.rumuz || 'rumuzsuz'}): ${errors.join(' ')}`);
    continue;
  }
  for (const w of warnings) console.log(`- İncele (${entry.rumuz}): ${w}`);
  fs.writeFileSync(file, JSON.stringify(cleanEntry(entry), null, 2) + '\n');
  written++;
}

console.log(`\n${written} yeni dosya yazıldı, ${skipped} zaten vardı, ${rejected} yanıt eklenmedi.`);
