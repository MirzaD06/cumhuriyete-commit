// GitHub issue formundan gelen katkıyı doğrular; --write ile commits/issue-<no>.json dosyasını yazar.
// Girdi ortam değişkenlerinden okunur (ISSUE_BODY, ISSUE_NUMBER, ISSUE_LABELS) ki issue metni kabuğa karışmasın.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEntry, cleanEntry } from './lib/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://mirzad06.github.io/cumhuriyete-commit/';

const FIELD_BY_HEADING = {
  'Rumuz': 'rumuz',
  'Gönüllü rumuzu': 'rumuz',
  'İl': 'il',
  'Commit mesajı': 'mesaj',
  'Öğrencinin ilk kod satırı': 'mesaj',
  'Öğrenci grubu': 'ogrenciGrubu',
};

const GROUP_BY_LABEL = {
  'Çocuk (veli izni ve öğretmen gözetiminde)': 'cocuk',
  'Yetişkin': 'yetiskin',
  '65 yaş ve üzeri': '65+',
};

export function parseIssueBody(body) {
  const sections = {};
  const parts = body.replace(/\r\n/g, '\n').split(/^### /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
    const value = (nl === -1 ? '' : part.slice(nl + 1)).trim();
    sections[heading] = value === '_No response_' ? '' : value;
  }

  const entry = {};
  for (const [heading, value] of Object.entries(sections)) {
    const field = FIELD_BY_HEADING[heading];
    if (!field) continue;
    let v = value.replace(/^```[a-z]*\n?|\n?```$/g, '').trim();
    if (field === 'ogrenciGrubu') v = GROUP_BY_LABEL[v] ?? v;
    entry[field] = v;
  }

  const consentBoxes = Object.entries(sections)
    .filter(([h]) => h.startsWith('Onay'))
    .flatMap(([, v]) => v.split('\n').filter((l) => /^- \[[ xX]\]/.test(l)));
  const consentOk = consentBoxes.length > 0 && consentBoxes.every((l) => /^- \[[xX]\]/.test(l));

  return { entry, consentOk };
}

function main() {
  const write = process.argv.includes('--write');
  const body = process.env.ISSUE_BODY ?? '';
  const number = process.env.ISSUE_NUMBER;
  const labels = (process.env.ISSUE_LABELS ?? '').split(',').map((l) => l.trim());

  const { entry, consentOk } = parseIssueBody(body);
  entry.tur = labels.includes('ders') ? 'ders' : 'commit';

  const { errors, warnings } = validateEntry(entry);
  if (!consentOk) errors.push('Onay kutularının tamamı işaretlenmeli.');

  const lines = ['### Otomatik katkı kontrolü', ''];
  if (!errors.length) {
    lines.push(
      `✅ Biçim uygun: **${entry.rumuz}** (${entry.il}) — \`${entry.mesaj}\``,
      '',
      write ? 'Katkın onaylandı ve mozaiğe eklendi. Teşekkürler! 🇹🇷' : 'Bir moderatör inceleyip onayladığında pikselin yanacak.',
    );
    if (write && /^\d+$/.test(number ?? '')) {
      lines.push(
        '',
        `📍 **Pikselin:** ${SITE_URL}?piksel=${number}`,
        '',
        'Site birkaç dakika içinde güncellenir. Bu bağlantıyı paylaşabilir ya da sitede "Pikselini bul" kutusuna rumuzunu veya `#' + number + '` yazabilirsin.',
      );
    }
  } else {
    lines.push('❌ Katkı şu haliyle eklenemiyor. Issue\'yu düzenleyerek (Edit) düzeltebilirsin:', '');
    for (const e of errors) lines.push(`- ${e}`);
  }
  for (const w of warnings) lines.push('', `⚠️ ${w}`);
  fs.writeFileSync(path.join(ROOT, 'issue-report.md'), lines.join('\n') + '\n');

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `valid=${errors.length ? 'false' : 'true'}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `flagged=${warnings.length ? 'true' : 'false'}\n`);
  }

  if (write && !errors.length) {
    if (!/^\d+$/.test(number ?? '')) throw new Error('ISSUE_NUMBER geçersiz');
    const file = path.join(ROOT, 'commits', `issue-${number}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(cleanEntry(entry), null, 2) + '\n');
    console.log(`${path.relative(ROOT, file)} yazıldı.`);
  }

  console.log(lines.join('\n'));
  if (errors.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
