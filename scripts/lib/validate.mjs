import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const LIMITS = { rumuzMin: 2, rumuzMax: 30, mesajMin: 5, mesajMax: 72 };
export const TYPES = ['commit', 'ders'];
export const STUDENT_GROUPS = ['cocuk', 'yetiskin', '65+'];
export const ABROAD = 'Yurt dışı';

const ALLOWED_FIELDS = new Set(['rumuz', 'il', 'mesaj', 'tur', 'ogrenciGrubu']);

export const PROVINCES = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'data', 'iller.json'), 'utf8'));
const PROVINCE_SET = new Set([...PROVINCES, ABROAD]);

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };
// "ı" bilerek korunur: "sık" ile küfür arasındaki tek fark odur.
const ASCII = { ç: 'c', ğ: 'g', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

export function normalize(text) {
  return text
    .toLocaleLowerCase('tr')
    .replace(/[013457@$!]/g, (c) => LEET[c])
    .replace(/[çğöşüâîû]/g, (c) => ASCII[c])
    .replace(/[^a-zı\s]/g, ' ')
    .replace(/([a-zı])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadList(name) {
  return fs
    .readFileSync(path.join(ROOT, 'scripts', name), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const prefix = l.endsWith('*');
      return { term: normalize(prefix ? l.slice(0, -1) : l), prefix };
    });
}

const BLOCK = loadList('blocklist.txt');
const WATCH = loadList('watchlist.txt');

export function matchList(text, list) {
  const norm = normalize(text);
  const tokens = norm.split(' ');
  const hits = [];
  for (const { term, prefix } of list) {
    if (!term) continue;
    const found = term.includes(' ')
      ? ` ${norm} `.includes(` ${term}${prefix ? '' : ' '}`)
      : tokens.some((t) => (prefix ? t.startsWith(term) : t === term));
    if (found) hits.push(term);
  }
  return hits;
}

const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|dev|tr|xyz|ly|me)\b)/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const MENTION_RE = /(^|\s)@[\w-]+/;
const PHONE_RE = /(\d[\s-]?){10,}/;
const RUMUZ_RE = /^[\p{L}\p{N} ._-]+$/u;

export function validateEntry(entry) {
  const errors = [];
  const warnings = [];

  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return { errors: ['Dosya bir JSON nesnesi olmalı.'], warnings };
  }

  for (const key of Object.keys(entry)) {
    if (!ALLOWED_FIELDS.has(key)) errors.push(`İzin verilmeyen alan: "${key}". Kişisel veri eklemeyin.`);
  }

  const { rumuz, il, mesaj, tur, ogrenciGrubu } = entry;

  if (typeof rumuz !== 'string' || rumuz.trim().length < LIMITS.rumuzMin || rumuz.trim().length > LIMITS.rumuzMax) {
    errors.push(`"rumuz" ${LIMITS.rumuzMin}–${LIMITS.rumuzMax} karakter olmalı.`);
  } else if (!RUMUZ_RE.test(rumuz)) {
    errors.push('"rumuz" yalnızca harf, rakam, boşluk, nokta, alt çizgi ve tire içerebilir.');
  }

  if (typeof il !== 'string' || !PROVINCE_SET.has(il)) {
    errors.push(`"il" 81 ilden biri ya da "${ABROAD}" olmalı (ör. "İstanbul").`);
  }

  if (typeof mesaj !== 'string' || mesaj.trim().length < LIMITS.mesajMin || mesaj.length > LIMITS.mesajMax) {
    errors.push(`"mesaj" ${LIMITS.mesajMin}–${LIMITS.mesajMax} karakter olmalı (git commit başlığı gibi).`);
  } else {
    if (/[\r\n]/.test(mesaj)) errors.push('"mesaj" tek satır olmalı.');
    if (URL_RE.test(mesaj)) errors.push('"mesaj" bağlantı içeremez.');
    if (EMAIL_RE.test(mesaj)) errors.push('"mesaj" e-posta adresi içeremez.');
    if (MENTION_RE.test(mesaj)) errors.push('"mesaj" kullanıcı etiketi (@) içeremez.');
    if (PHONE_RE.test(mesaj)) errors.push('"mesaj" telefon numarası içeremez.');
  }

  if (!TYPES.includes(tur)) {
    errors.push('"tur" "commit" ya da "ders" olmalı.');
  } else if (tur === 'ders') {
    if (!STUDENT_GROUPS.includes(ogrenciGrubu)) {
      errors.push('Ders kaydında "ogrenciGrubu" "cocuk", "yetiskin" ya da "65+" olmalı.');
    }
  } else if (ogrenciGrubu !== undefined) {
    errors.push('"ogrenciGrubu" yalnızca ders kayıtlarında kullanılır.');
  }

  const text = [rumuz, mesaj].filter((v) => typeof v === 'string').join(' ');
  const blocked = matchList(text, BLOCK);
  if (blocked.length) errors.push('Uygunsuz ifade filtresine takıldı. Lütfen mesajı düzenleyin.');
  const watched = matchList(text, WATCH);
  if (watched.length) {
    warnings.push(`Moderatör incelemesi gerekli (siyasi/hassas ifade olabilir): ${watched.join(', ')}`);
  }

  return { errors, warnings };
}

export function cleanEntry(entry) {
  const out = { rumuz: entry.rumuz.trim(), il: entry.il, mesaj: entry.mesaj.trim(), tur: entry.tur };
  if (entry.tur === 'ders') out.ogrenciGrubu = entry.ogrenciGrubu;
  return out;
}
