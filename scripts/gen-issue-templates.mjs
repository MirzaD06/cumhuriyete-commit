// .github/ISSUE_TEMPLATE altındaki formları iller.json'dan üretir: node scripts/gen-issue-templates.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROVINCES, ABROAD, LIMITS } from './lib/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, '.github', 'ISSUE_TEMPLATE');
fs.mkdirSync(DIR, { recursive: true });

const provinceOptions = [...[...PROVINCES].sort((a, b) => a.localeCompare(b, 'tr')), ABROAD]
  .map((p) => `        - ${p}`)
  .join('\n');

const ilField = `  - type: dropdown
    id: il
    attributes:
      label: İl
      description: Şu an yaşadığın il. Mozaikte rumuzunla birlikte görünür.
      options:
${provinceOptions}
    validations:
      required: true`;

const privacy = `  - type: markdown
    attributes:
      value: |
        **Gizlilik:** Bu issue herkese açıktır; GitHub kullanıcı adın görünür. Mozaikte yalnızca rumuz, il ve mesaj gösterilir.
        Gerçek adını, e-postanı, telefonunu veya başkasına ait kişisel bilgiyi yazma. Katkını istediğin zaman kaldırtabilirsin.`;

const commit = `name: "Cumhuriyet'e commit'imi at"
description: Geleceğe bırakacağın katkıyı yaz, bayraktaki pikselini yak.
title: "commit: "
labels: ["commit"]
body:
  - type: markdown
    attributes:
      value: |
        Katkın bir git commit mesajı gibi kısa olsun (en fazla ${LIMITS.mesajMax} karakter).
        Örnekler: \`feat: köyümdeki okula kodlama kulübü kuracağım\` · \`fix: öğrendiğimi kardeşime de öğreteceğim\`
${privacy}
  - type: input
    id: rumuz
    attributes:
      label: Rumuz
      description: Mozaikte görünecek ad (${LIMITS.rumuzMin}–${LIMITS.rumuzMax} karakter). Gerçek adın olmak zorunda değil.
      placeholder: ör. genc_gelistirici
    validations:
      required: true
${ilField}
  - type: input
    id: mesaj
    attributes:
      label: Commit mesajı
      description: Tek satır, en fazla ${LIMITS.mesajMax} karakter. Bağlantı, @etiket ve kişisel bilgi içeremez.
      placeholder: "feat: ..."
    validations:
      required: true
  - type: checkboxes
    id: onay
    attributes:
      label: Onay
      options:
        - label: Rumuzum, ilim ve mesajımın kampanya sitesinde herkese açık gösterilmesini kabul ediyorum.
          required: true
        - label: Mesajım siyasi parti/kişi çağrısı, nefret söylemi veya kişisel veri içermiyor.
          required: true
`;

const ders = `name: "Millet Mektebi 2.0 dersimi bildir"
description: Birine ilk kod satırını yazdırdıysan altın pikselini yak.
title: "ders: "
labels: ["ders"]
body:
  - type: markdown
    attributes:
      value: |
        Kodlamayla hiç tanışmamış birine bir saatlik ilk dersi verdiysen, öğrencinin yazdığı ilk satırı paylaş.
        Bu satır mozaiğe **altın piksel** olarak eklenir. Öğrencinin adını yazma; yalnızca yaş grubunu seç.
${privacy}
  - type: input
    id: rumuz
    attributes:
      label: Gönüllü rumuzu
      description: Senin rumuzun (${LIMITS.rumuzMin}–${LIMITS.rumuzMax} karakter).
    validations:
      required: true
${ilField}
  - type: dropdown
    id: grup
    attributes:
      label: Öğrenci grubu
      options:
        - Çocuk (veli izni ve öğretmen gözetiminde)
        - Yetişkin
        - 65 yaş ve üzeri
    validations:
      required: true
  - type: input
    id: mesaj
    attributes:
      label: Öğrencinin ilk kod satırı
      description: En fazla ${LIMITS.mesajMax} karakter.
      placeholder: "print('Yaşasın Cumhuriyet')"
    validations:
      required: true
  - type: checkboxes
    id: onay
    attributes:
      label: Onay
      options:
        - label: Dersi gerçekten verdim; öğrenci (çocuksa velisi) bu satırın rumuzsuz paylaşılmasına izin verdi.
          required: true
        - label: Rumuzum, ilim ve bu satırın kampanya sitesinde herkese açık gösterilmesini kabul ediyorum.
          required: true
`;

fs.writeFileSync(path.join(DIR, '1-commit.yml'), commit);
fs.writeFileSync(path.join(DIR, '2-ders.yml'), ders);
console.log('Issue formları yazıldı.');
