import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEntry, normalize } from './lib/validate.mjs';
import { parseIssueBody } from './issue-to-commit.mjs';

const ok = { rumuz: 'genc_gelistirici', il: 'Ankara', mesaj: 'feat: köyümdeki okula kodlama kulübü', tur: 'commit' };

test('geçerli commit kabul edilir', () => {
  assert.deepEqual(validateEntry(ok).errors, []);
});

test('geçerli ders kabul edilir', () => {
  const r = validateEntry({ ...ok, tur: 'ders', mesaj: "print('Yaşasın Cumhuriyet')", ogrenciGrubu: '65+' });
  assert.deepEqual(r.errors, []);
});

test('ders için öğrenci grubu zorunlu', () => {
  assert.ok(validateEntry({ ...ok, tur: 'ders' }).errors.length);
});

test('bilinmeyen alan ve kişisel veri reddedilir', () => {
  assert.ok(validateEntry({ ...ok, eposta: 'a@b.com' }).errors.length);
  assert.ok(validateEntry({ ...ok, mesaj: 'beni yaz: ali@ornek.com' }).errors.length);
  assert.ok(validateEntry({ ...ok, mesaj: 'ara beni 0532 123 45 67' }).errors.length);
  assert.ok(validateEntry({ ...ok, mesaj: 'feat: siteme bakın www.ornek.com' }).errors.length);
  assert.ok(validateEntry({ ...ok, mesaj: 'feat: selam @biri nasılsın' }).errors.length);
});

test('il listesi ve uzunluk sınırları', () => {
  assert.ok(validateEntry({ ...ok, il: 'Ankra' }).errors.length);
  assert.deepEqual(validateEntry({ ...ok, il: 'Yurt dışı' }).errors, []);
  assert.ok(validateEntry({ ...ok, mesaj: 'x'.repeat(73) }).errors.length);
  assert.ok(validateEntry({ ...ok, rumuz: 'a' }).errors.length);
});

test('küfür filtresi leetspeak ve harf tekrarını yakalar', () => {
  assert.ok(validateEntry({ ...ok, mesaj: 'feat: s1kt1r git' }).errors.length);
  assert.ok(validateEntry({ ...ok, mesaj: 'feat: siiiiktir' }).errors.length);
  assert.ok(validateEntry({ ...ok, rumuz: 'orospu_cocugu' }).errors.length);
});

test('"sık" ve "sıkış" gibi masum kelimeler engellenmez', () => {
  assert.deepEqual(validateEntry({ ...ok, mesaj: 'feat: sık sık kod yazacağım' }).errors, []);
  assert.deepEqual(validateEntry({ ...ok, mesaj: 'fix: sıkışan arkadaşlara yardım' }).errors, []);
  assert.deepEqual(validateEntry({ ...ok, mesaj: 'feat: Python öğreneceğim' }).errors, []);
});

test('siyasi ifadeler reddedilmez, incelemeye işaretlenir', () => {
  const r = validateEntry({ ...ok, mesaj: 'feat: seçimlerde oy verin' });
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.length);
});

test('normalize Türkçe büyük harfleri doğru küçültür', () => {
  assert.equal(normalize('IŞIK'), 'ısık');
  assert.equal(normalize('İSTANBUL'), 'istanbul');
});

test('issue formu gövdesi ayrıştırılır', () => {
  const body = [
    '### Gönüllü rumuzu', '', 'mirza', '',
    '### İl', '', 'İstanbul', '',
    '### Öğrenci grubu', '', '65 yaş ve üzeri', '',
    '### Öğrencinin ilk kod satırı', '', "print('Yaşasın Cumhuriyet')", '',
    '### Onay', '', '- [X] Dersi gerçekten verdim', '- [x] Kabul ediyorum',
  ].join('\n');
  const { entry, consentOk } = parseIssueBody(body);
  assert.deepEqual(entry, { rumuz: 'mirza', il: 'İstanbul', ogrenciGrubu: '65+', mesaj: "print('Yaşasın Cumhuriyet')" });
  assert.equal(consentOk, true);
});

test('işaretlenmemiş onay kutusu yakalanır', () => {
  const { consentOk } = parseIssueBody('### Rumuz\n\nx\n\n### Onay\n\n- [X] a\n- [ ] b');
  assert.equal(consentOk, false);
});
