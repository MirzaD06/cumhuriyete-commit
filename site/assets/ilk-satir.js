import { CONFIG } from './config.js';

const LESSONS = [
  {
    title: 'İlk satır',
    text: `<p>Bilgisayara bir şey söyletmek için <code>print</code> komutunu kullanırız. Söylemesini istediğin yazıyı tırnak içine koyarız.</p>
           <p><strong>Çalıştır</strong>'a bas ve ne olduğuna bak.</p>`,
    code: "print('Yaşasın Cumhuriyet')",
  },
  {
    title: 'Kendi cümlen',
    text: `<p>Şimdi tırnakların arasındaki yazıyı sil ve kendi cümleni yaz. Tırnaklara ve parantezlere dokunma.</p>
           <p>Örneğin: <code>print('Benim adım Ayşe')</code></p>`,
    code: "print('Benim adım ...')",
  },
  {
    title: 'Hesap makinesi',
    text: `<p>Bilgisayar hesap da yapar. Sayılar tırnaksız yazılır.</p>
           <p>Cumhuriyet 1923'te ilan edildi. 103 yıl sonrası hangi yıl? Çalıştır ve gör.</p>`,
    code: 'print(1923 + 103)',
  },
  {
    title: 'Kutu (değişken)',
    text: `<p>Bir bilgiyi bir kutuya koyup kutuya ad verebiliriz. Aşağıda <code>ad</code> adlı kutuya bir isim koyduk.</p>
           <p>İsmi kendi adınla değiştir ve çalıştır.</p>`,
    code: "ad = 'Ayşe'\nprint('Merhaba ' + ad)",
  },
  {
    title: 'Tekrar',
    text: `<p>Aynı şeyi tekrar tekrar yazmak yerine bilgisayara "10 kez yap" diyebiliriz.</p>
           <p>İkinci satırın başındaki 4 boşluk önemli: tekrarlanacak işi gösterir. 10 yerine başka bir sayı dene.</p>`,
    code: "for i in range(10):\n    print('Yaşasın Cumhuriyet')",
  },
  {
    title: "Cumhuriyet'in yaşı",
    text: `<p>Son adım: öğrendiklerimizi birleştirelim. Bilgisayar yaşı kendisi hesaplasın.</p>
           <p>Tebrikler! Artık bir programcının ilk adımlarını attın. 🇹🇷</p>`,
    code: "yil = 2026\nprint('Cumhuriyet', yil - 1923, 'yaşında')",
  },
];

const TIMEOUT_MS = 5000;
const MAX_OUTPUT = 20000;

const $ = (id) => document.getElementById(id);
const code = $('code');
const runBtn = $('run');
const status = $('status');
const output = $('output');
const hint = $('hint');

let current = 0;
let worker = null;
let ready = false;
let running = null;
const done = new Set();

function startWorker() {
  ready = false;
  runBtn.disabled = true;
  worker = new Worker('assets/python-worker.js');
  worker.onmessage = onWorkerMessage;
  worker.postMessage({ type: 'init', indexURL: CONFIG.pyodideUrl });
}

function onWorkerMessage({ data }) {
  if (data.type === 'ready') {
    ready = true;
    runBtn.disabled = false;
    status.textContent = 'Hazır. Çalıştır\'a bas ya da Ctrl+Enter.';
  } else if (data.type === 'load-failed') {
    status.textContent = 'Python yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.';
  } else if (data.type === 'out') {
    write(data.text + '\n');
  } else if (data.type === 'err') {
    write(data.text + '\n', true);
  } else if (data.type === 'done') {
    finishRun(data);
  }
}

function write(text, isError = false) {
  if (output.textContent.length > MAX_OUTPUT) return;
  const span = document.createElement('span');
  if (isError) span.className = 'err';
  span.textContent = text;
  output.append(span);
  output.scrollTop = output.scrollHeight;
}

function friendlyError(message) {
  const m = message || '';
  if (/input\(\) kullanılmıyor/.test(m)) return "Bu alıştırmada input() kullanılmıyor. Değeri doğrudan yaz: ad = 'Ayşe'";
  if (/unterminated string|EOL while scanning|unterminated triple/.test(m)) {
    return "Bir tırnak işareti eksik. Yazının başında ve sonunda ' olmalı: print('Merhaba')";
  }
  if (/was never closed|unexpected EOF|'\(' was never closed/.test(m)) {
    return 'Bir parantez kapanmamış. ( ile açtıysan ) ile kapatmalısın.';
  }
  if (/IndentationError|expected an indented block|unexpected indent|unindent/.test(m)) {
    return 'Satır başındaki boşluklar karıştı. "for" satırından sonraki satır 4 boşlukla başlamalı, diğerleri boşluksuz.';
  }
  const name = m.match(/NameError: name '([^']+)' is not defined/);
  if (name) {
    if (name[1].toLowerCase() === 'print') return `"${name[1]}" diye bir komut yok. Python büyük-küçük harfe dikkat eder: print küçük harfle yazılır.`;
    return `Bilgisayar "${name[1]}" sözcüğünü tanımıyor. Yazım hatası olabilir; bir yazıysa tırnak içine al: '${name[1]}'`;
  }
  if (/can only concatenate str|unsupported operand type/.test(m)) {
    return "Yazı ile sayıyı + ile birleştiremezsin. Araya virgül koy: print('Yaş:', 103)";
  }
  if (/ZeroDivisionError/.test(m)) return 'Bir sayı sıfıra bölünemez.';
  if (/SyntaxError/.test(m)) return 'Yazımda küçük bir hata var. Tırnakları, parantezleri ve iki noktayı (:) kontrol et.';
  return null;
}

function normalizeQuotes(text) {
  return text.replace(/[‘’‚‛`´]/g, "'").replace(/[“”„‟]/g, '"');
}

function run() {
  if (!ready || running) return;
  const source = normalizeQuotes(code.value);
  if (source !== code.value) code.value = source;
  output.replaceChildren();
  hint.hidden = true;
  status.textContent = 'Çalışıyor…';
  runBtn.disabled = true;
  running = setTimeout(() => {
    worker.terminate();
    running = null;
    write('Kod çok uzun sürdü, durdurdum. Bitmeyen bir tekrar (sonsuz döngü) olabilir.\n', true);
    status.textContent = 'Python yeniden hazırlanıyor…';
    startWorker();
  }, TIMEOUT_MS);
  worker.postMessage({ type: 'run', code: source });
}

function finishRun(result) {
  clearTimeout(running);
  running = null;
  runBtn.disabled = false;
  if (result.ok) {
    status.textContent = 'Harika, çalıştı! ✓';
    if (!output.textContent) write('(Kod çalıştı ama ekrana bir şey yazdırmadı. print kullanmayı unutma.)\n');
    done.add(current);
    renderLessons();
  } else {
    status.textContent = 'Küçük bir hata var, sorun değil.';
    write(result.error + '\n', true);
    const tip = friendlyError(result.detail);
    if (tip) {
      hint.textContent = '💡 ' + tip;
      hint.hidden = false;
    }
  }
  updateReportLink();
}

function renderLessons() {
  const list = $('lessons');
  list.replaceChildren(
    ...LESSONS.map((lesson, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${i + 1}. ${lesson.title}`;
      if (i === current) b.setAttribute('aria-current', 'step');
      if (done.has(i)) b.classList.add('done');
      b.addEventListener('click', () => show(i));
      li.append(b);
      return li;
    }),
  );
}

function show(i) {
  current = i;
  const lesson = LESSONS[i];
  $('step-text').innerHTML = `<h2>${i + 1}. ${lesson.title}</h2>${lesson.text}`;
  code.value = lesson.code;
  output.replaceChildren();
  hint.hidden = true;
  $('prev').disabled = i === 0;
  $('next').disabled = i === LESSONS.length - 1;
  renderLessons();
  updateReportLink();
}

function updateReportLink() {
  const p = CONFIG.formPrefill;
  const firstLine = (code.value.split('\n').find((l) => l.trim()) || '').trim().slice(0, 72);
  const params = new URLSearchParams({ usp: 'pp_url' });
  params.set(p.typeEntry, p.typeLesson);
  if (firstLine) params.set(p.firstLineEntry, firstLine);
  $('report').href = `${p.viewUrl}?${params}`;
}

function setFont(delta) {
  const practice = document.querySelector('.practice');
  const now = parseFloat(getComputedStyle(practice).getPropertyValue('--size')) || 1.25;
  const next = Math.min(2.2, Math.max(1, now + delta));
  practice.style.setProperty('--size', `${next}rem`);
}

code.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    run();
  } else if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    const { selectionStart: s, selectionEnd: end } = code;
    code.setRangeText('    ', s, end, 'end');
  }
});
code.addEventListener('input', updateReportLink);
runBtn.addEventListener('click', run);
$('prev').addEventListener('click', () => current > 0 && show(current - 1));
$('next').addEventListener('click', () => current < LESSONS.length - 1 && show(current + 1));
$('font-up').addEventListener('click', () => setFont(0.15));
$('font-down').addEventListener('click', () => setFont(-0.15));

show(0);
startWorker();
