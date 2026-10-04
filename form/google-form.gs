// Cumhuriyet'e Commit — Google Form kurulumu ve GitHub köprüsü (Google Apps Script)
//
// 1) script.google.com → Yeni proje → bu dosyanın tamamını yapıştır → Kaydet.
// 2) Üstten "formuOlustur" fonksiyonunu seçip Çalıştır; izinleri onayla.
//    Form, yanıt tablosu ve gönderim tetikleyicisi oluşturulur; form bağlantısı Yürütme günlüğüne yazılır.
// 3) Proje ayarları → Komut dosyası özellikleri → GITHUB_TOKEN ekle (yalnızca bu repoda
//    "Issues: Read and write" izni olan fine-grained token). Token yoksa yanıtlar yalnızca tabloda birikir.
//
// Her yanıt, GitHub issue formuyla aynı biçimde bir issue'ya dönüşür; otomatik kontrol ve moderatör onayı aynen işler.

const REPO = 'MirzaD06/cumhuriyete-commit';
const PRIVACY_URL = 'https://mirzad06.github.io/cumhuriyete-commit/gizlilik.html';

const TYPE_COMMIT = 'Commit: geleceğe bırakacağım katkıyı yazacağım';
const TYPE_DERS = 'Ders: Millet Mektebi 2.0 kapsamında birine ilk kod dersini verdim';

const CONSENTS = [
  'Rumuzum, ilim ve mesajımın kampanya sitesinde herkese açık gösterilmesini kabul ediyorum.',
  'Mesajım siyasi parti/kişi çağrısı, nefret söylemi veya kişisel veri içermiyor.',
];

// Değerler GitHub issue formundaki seçeneklerle birebir aynı olmalı; doğrulama betiği bunları tanır.
const GROUPS = ['Çocuk (veli izni ve öğretmen gözetiminde)', 'Yetişkin', '65 yaş ve üzeri'];

const PROVINCES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin',
  'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur',
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir',
  'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas',
  'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat',
  'Zonguldak', 'Yurt dışı',
];

function formuOlustur() {
  const form = FormApp.create("Cumhuriyet'e Commit — Katılım Formu");
  form
    .setDescription(
      'O bize harfleri öğretti. Sıradaki satır bizden. #CumhuriyeteCommit\n\n' +
        'Geleceğe bırakacağın katkıyı bir commit mesajıyla yaz ya da Millet Mektebi 2.0 kapsamında verdiğin ilk kod dersini bildir. ' +
        'Moderatör onayından sonra katkın 29 Ekim bayrağında bir piksel olarak yanar.\n\n' +
        'Mozaikte yalnızca rumuz, il ve mesaj herkese açık görünür. Gerçek adını, e-postanı, telefonunu veya başkasına ait kişisel bilgiyi yazma. ' +
        'Bu form e-posta adresi toplamaz. Moderasyon için yanıtın kampanya reposunda herkese açık bir kayıt olarak yayımlanır. ' +
        'Aydınlatma metni: ' + PRIVACY_URL,
    )
    .setCollectEmail(false)
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(true)
    .setProgressBar(true)
    .setConfirmationMessage('Teşekkürler! Katkın moderatör onayından sonra bayrakta piksel olarak yanacak. Sıradaki satır bizden. 🇹🇷');

  const max = (n) =>
    FormApp.createTextValidation().requireTextLengthLessThanOrEqualTo(n).setHelpText(`En fazla ${n} karakter.`).build();

  form
    .addTextItem()
    .setTitle('Rumuz')
    .setHelpText('Mozaikte görünecek ad (2–30 karakter). Gerçek adın olmak zorunda değil.')
    .setRequired(true)
    .setValidation(max(30));

  form.addListItem().setTitle('İl').setHelpText('Şu an yaşadığın il.').setChoiceValues(PROVINCES).setRequired(true);

  form
    .addCheckboxItem()
    .setTitle('Onay')
    .setChoiceValues(CONSENTS)
    .setValidation(FormApp.createCheckboxValidation().requireSelectExactly(CONSENTS.length).build())
    .setRequired(true);

  const typeItem = form.addMultipleChoiceItem().setTitle('Katkı türü').setRequired(true);

  const commitPage = form.addPageBreakItem().setTitle('Commit mesajın');
  form
    .addTextItem()
    .setTitle('Commit mesajı')
    .setHelpText('Tek satır, en fazla 72 karakter. Örnek: feat: köyümdeki okula kodlama kulübü kuracağım')
    .setRequired(true)
    .setValidation(max(72));

  const dersPage = form
    .addPageBreakItem()
    .setTitle('Millet Mektebi 2.0 dersin')
    .setHelpText('Öğrencinin adını yazma; yalnızca yaş grubunu ve yazdığı ilk satırı paylaş.')
    .setGoToPage(FormApp.PageNavigationType.SUBMIT);
  form.addListItem().setTitle('Öğrenci grubu').setChoiceValues(GROUPS).setRequired(true);
  form
    .addTextItem()
    .setTitle('Öğrencinin ilk kod satırı')
    .setHelpText("En fazla 72 karakter. Örnek: print('Yaşasın Cumhuriyet')")
    .setRequired(true)
    .setValidation(max(72));

  typeItem.setChoices([typeItem.createChoice(TYPE_COMMIT, commitPage), typeItem.createChoice(TYPE_DERS, dersPage)]);

  const sheet = SpreadsheetApp.create("Cumhuriyet'e Commit — Form Yanıtları");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  ScriptApp.newTrigger('yanitGeldi').forForm(form).onFormSubmit().create();

  if (typeof form.setPublished === 'function') form.setPublished(true);

  Logger.log('Form bağlantısı (siteye bu eklenecek): ' + form.getPublishedUrl());
  Logger.log('Kısa bağlantı: ' + form.shortenFormUrl(form.getPublishedUrl()));
  Logger.log('Düzenleme: ' + form.getEditUrl());
  Logger.log('Yanıt tablosu: ' + sheet.getUrl());
}

function yanitGeldi(e) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) return;

  const answers = {};
  for (const r of e.response.getItemResponses()) answers[r.getItem().getTitle()] = r.getResponse();
  // Tek satırlık yanıtın "### " ile başlayıp issue gövdesindeki başlıkları taklit etmesini önler.
  const clean = (v) => String(v || '').replace(/[\r\n]+/g, ' ').replace(/^#+\s*/, '').trim() || '_No response_';

  const ders = answers['Katkı türü'] === TYPE_DERS;
  const fields = ders
    ? [
        ['Gönüllü rumuzu', answers['Rumuz']],
        ['İl', answers['İl']],
        ['Öğrenci grubu', answers['Öğrenci grubu']],
        ['Öğrencinin ilk kod satırı', answers['Öğrencinin ilk kod satırı']],
      ]
    : [
        ['Rumuz', answers['Rumuz']],
        ['İl', answers['İl']],
        ['Commit mesajı', answers['Commit mesajı']],
      ];

  const given = answers['Onay'] || [];
  const body = [
    ...fields.map(([h, v]) => `### ${h}\n\n${clean(v)}`),
    '### Onay\n\n' + CONSENTS.map((c) => `- [${given.indexOf(c) !== -1 ? 'X' : ' '}] ${c}`).join('\n'),
    '_Google Form üzerinden gönderildi._',
  ].join('\n\n');

  const res = UrlFetchApp.fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({
      title: `${ders ? 'ders' : 'commit'}: (form) ${clean(answers['Rumuz'])}`.slice(0, 100),
      body,
      labels: [ders ? 'ders' : 'commit'],
    }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    console.error(`GitHub issue açılamadı (${res.getResponseCode()}): ${res.getContentText()}`);
  }
}
