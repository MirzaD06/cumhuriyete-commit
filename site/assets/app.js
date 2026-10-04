import { CONFIG } from './config.js';
import { buildLayout, COLS, ROWS, POOL_COUNT, FINAL_COUNT, HISTORY_COUNT } from './flag.js';

const COLOR = {
  red: '#e30a17',
  white: '#ffffff',
  gold: '#f2c14e',
  emptyRed: 'rgba(227, 10, 23, 0.17)',
  emptyWhite: 'rgba(255, 255, 255, 0.13)',
  hover: '#58a6ff',
};
const TOTAL = COLS * ROWS;
const LOG_PAGE = 50;

const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = new Intl.NumberFormat('tr-TR');

const $ = (id) => document.getElementById(id);
const canvas = $('mosaic');
const ctx = canvas.getContext('2d');
const frame = $('frame');
const tooltip = $('tooltip');

const layout = buildLayout();
const cellInfo = new Map();
let entries = [];
let finalTime = new Date(CONFIG.finalTime).getTime();
let finalLitCount = 0;
let finalAnimating = false;
let hoverIndex = -1;
let cellSize = 0;
let gap = 1;

function shortHash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7);
}

function demoEntries(n) {
  const names = ['ayse.dev', 'mehmet_k', 'zeynep', 'can42', 'elif.codes', 'emre', 'deniz_t', 'selin', 'burak.js', 'ece'];
  const msgs = [
    'feat: köyümdeki okula kodlama kulübü kuracağım',
    'fix: öğrendiğimi kardeşime de öğreteceğim',
    'feat: açık kaynağa ilk katkımı yapacağım',
    'docs: Türkçe yazılım kaynaklarını çoğaltacağım',
    'feat: annemi ilk satırıyla tanıştıracağım',
    'refactor: geleceği birlikte kodlayacağız',
  ];
  const provinces = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Trabzon', 'Van', 'Diyarbakır', 'Eskişehir', 'Antalya', 'Kars', 'Konya', 'Samsun'];
  const pick = (arr, i) => arr[(i * 7919) % arr.length];
  return Array.from({ length: n }, (_, i) => {
    const ders = i % 12 === 5;
    return {
      rumuz: `${pick(names, i)}${i}`,
      il: pick(provinces, i + 3),
      mesaj: ders ? "print('Yaşasın Cumhuriyet')" : pick(msgs, i + 1),
      tur: ders ? 'ders' : 'commit',
      ogrenciGrubu: ders ? '65+' : undefined,
      t: new Date(Date.UTC(2026, 9, 19) + i * 60000 * 7).toISOString(),
    };
  });
}

async function loadJson(url, fallback) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

function assignCells(history) {
  cellInfo.clear();
  layout.history.forEach((cell, i) => {
    const h = history[i];
    if (h) cellInfo.set(cell.index, { kind: 'history', cell, data: h });
  });
  entries.slice(0, POOL_COUNT).forEach((e, i) => {
    const cell = layout.pool[i];
    cellInfo.set(cell.index, { kind: e.tur === 'ders' ? 'ders' : 'commit', cell, data: e });
  });
  layout.final.forEach((cell, i) => cellInfo.set(cell.index, { kind: 'final', cell, order: i }));
}

function cellColor(cell, info, pulse) {
  if (!info) return cell.white ? COLOR.emptyWhite : COLOR.emptyRed;
  if (info.kind === 'ders') return COLOR.gold;
  if (info.kind === 'final') {
    if (info.order < finalLitCount) return COLOR.white;
    return `rgba(255, 255, 255, ${0.16 + 0.14 * pulse})`;
  }
  return cell.white ? COLOR.white : COLOR.red;
}

function resize() {
  const width = canvas.parentElement.clientWidth - parseFloat(getComputedStyle(frame).paddingLeft) * 2;
  cellSize = Math.max(4, Math.floor(width / COLS));
  gap = cellSize >= 10 ? 1 : 0;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = COLS * cellSize * dpr;
  canvas.height = ROWS * cellSize * dpr;
  canvas.style.width = `${COLS * cellSize}px`;
  canvas.style.height = `${ROWS * cellSize}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function draw(now = performance.now()) {
  const pulse = reducedMotion ? 0.5 : (Math.sin(now / 600) + 1) / 2;
  ctx.clearRect(0, 0, COLS * cellSize, ROWS * cellSize);
  for (const cell of layout.cells) {
    const info = cellInfo.get(cell.index);
    ctx.fillStyle = cellColor(cell, info, pulse);
    ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize - gap, cellSize - gap);
    if (info?.kind === 'ders' && cellSize >= 8) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(cell.x * cellSize + 1, cell.y * cellSize + 1, Math.max(2, cellSize / 4), Math.max(2, cellSize / 4));
    }
  }
  if (hoverIndex >= 0) {
    const c = layout.cells[hoverIndex];
    ctx.strokeStyle = COLOR.hover;
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x * cellSize + 1, c.y * cellSize + 1, cellSize - gap - 2, cellSize - gap - 2);
  }
}

function animatePulse(now) {
  if (finalLitCount < FINAL_COUNT || finalAnimating) draw(now);
  requestAnimationFrame(animatePulse);
}

function describe(info, cell) {
  const wrap = document.createDocumentFragment();
  const line = (cls, text) => {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    wrap.append(s);
  };
  if (!info) {
    line('t-msg', 'Bu piksel seni bekliyor.');
    line('t-meta', "Commit'ini at, bayrağı birlikte tamamlayalım.");
  } else if (info.kind === 'history') {
    line('t-msg', info.data.mesaj);
    line('t-meta', info.data.tarih.replaceAll('-', '.'));
  } else if (info.kind === 'final') {
    if (info.order < finalLitCount) {
      line('t-msg', 'Ay-yıldız tamamlandı.');
      line('t-meta', "29 Ekim 2026, 19.23 · Cumhuriyet'in 103. yılı");
    } else {
      line('t-msg', "29 Ekim 19.23'te yanacak.");
      line('t-meta', 'Son 103 piksel finalde birlikte yakılır.');
    }
  } else {
    line('t-msg', info.data.mesaj);
    line('t-meta', `${info.data.rumuz} · ${info.data.il}`);
    if (info.kind === 'ders') line('t-meta t-gold', 'Millet Mektebi 2.0 · ilk kod satırı');
  }
  return wrap;
}

function cellAt(evt) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((evt.clientX - rect.left) / rect.width) * COLS);
  const y = Math.floor(((evt.clientY - rect.top) / rect.height) * ROWS);
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return -1;
  return y * COLS + x;
}

function showTooltip(evt) {
  const index = cellAt(evt);
  if (index === hoverIndex) return positionTooltip(evt);
  hoverIndex = index;
  if (index < 0) return hideTooltip();
  tooltip.replaceChildren(describe(cellInfo.get(index), layout.cells[index]));
  tooltip.hidden = false;
  positionTooltip(evt);
  draw();
}

function positionTooltip(evt) {
  if (tooltip.hidden) return;
  const fr = frame.getBoundingClientRect();
  let left = evt.clientX - fr.left + 14;
  let top = evt.clientY - fr.top + 14;
  if (left + tooltip.offsetWidth > fr.width - 8) left = evt.clientX - fr.left - tooltip.offsetWidth - 14;
  if (top + tooltip.offsetHeight > fr.height - 8) top = evt.clientY - fr.top - tooltip.offsetHeight - 14;
  tooltip.style.left = `${Math.max(4, left)}px`;
  tooltip.style.top = `${Math.max(4, top)}px`;
}

function hideTooltip() {
  hoverIndex = -1;
  tooltip.hidden = true;
  draw();
}

function setBar(id, value, goal) {
  $(id).style.width = `${Math.min(100, (value / goal) * 100)}%`;
}

function updateStats() {
  const commits = entries.filter((e) => e.tur !== 'ders').length;
  const lessons = entries.length - commits;
  const provinces = new Set(entries.map((e) => e.il).filter((il) => il !== 'Yurt dışı')).size;
  const lit = HISTORY_COUNT + Math.min(entries.length, POOL_COUNT) + finalLitCount;

  $('stat-commits').textContent = fmt.format(commits);
  $('stat-lessons').textContent = fmt.format(lessons);
  $('stat-provinces').textContent = fmt.format(provinces);
  $('stat-lit').textContent = fmt.format(lit);
  $('goal-commits').textContent = fmt.format(CONFIG.goals.commits);
  $('goal-lessons').textContent = fmt.format(CONFIG.goals.lessons);
  setBar('bar-commits', commits, CONFIG.goals.commits);
  setBar('bar-lessons', lessons, CONFIG.goals.lessons);
  setBar('bar-provinces', provinces, 81);
  setBar('bar-lit', lit, TOTAL);
  canvas.setAttribute(
    'aria-label',
    `Piksel Türk bayrağı: ${fmt.format(TOTAL)} pikselden ${fmt.format(lit)} tanesi yandı. ` +
      `${fmt.format(commits)} commit, ${fmt.format(lessons)} Millet Mektebi dersi, ${provinces} il.`,
  );
}

let logShown = 0;
let logRows = [];

function buildLog(history) {
  const participant = entries.map((e) => ({
    cls: e.tur === 'ders' ? 'ders' : '',
    hash: shortHash(`${e.rumuz}|${e.mesaj}|${e.t}`),
    date: e.t.slice(0, 10).replaceAll('-', '.'),
    msg: e.tur === 'ders' ? `ders: ${e.mesaj}` : e.mesaj,
    author: `${e.rumuz} · ${e.il}`,
  }));
  const past = history.map((h) => ({
    cls: 'history',
    hash: shortHash(h.tarih + h.mesaj),
    date: h.tarih.replaceAll('-', '.'),
    msg: h.mesaj,
    author: '',
  }));
  const head = {
    cls: 'history',
    hash: '·······',
    date: '2026.10.29',
    msg: "feat: ... ← senin commit'in",
    author: '',
  };
  logRows = [head, ...participant.reverse(), ...past.reverse()];
  logShown = 0;
  $('log').replaceChildren();
  renderMoreLog();
}

function renderMoreLog() {
  const list = $('log');
  const next = logRows.slice(logShown, logShown + LOG_PAGE);
  for (const r of next) {
    const li = document.createElement('li');
    if (r.cls) li.className = r.cls;
    for (const [cls, text] of [['hash', r.hash], ['date', ` ${r.date} `], ['msg', r.msg]]) {
      const s = document.createElement('span');
      s.className = cls;
      s.textContent = text;
      li.append(s);
    }
    if (r.author) {
      const s = document.createElement('span');
      s.className = 'author';
      s.textContent = ` — ${r.author}`;
      li.append(s);
    }
    list.append(li);
  }
  logShown += next.length;
  $('log-more').hidden = logShown >= logRows.length;
}

function formatRemaining(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d}g ${pad(h)}sa ${pad(m)}dk ${pad(sec)}sn`;
}

function startFinal() {
  if (finalAnimating || finalLitCount >= FINAL_COUNT) return;
  if (reducedMotion) {
    finalLitCount = FINAL_COUNT;
    finishFinal();
    return;
  }
  finalAnimating = true;
  $('countdown-time').textContent = 'Final başladı!';
  const overlay = $('final-overlay');
  const counter = $('final-count');
  overlay.hidden = false;
  const step = (CONFIG.finalDuration * 1000) / FINAL_COUNT;
  const started = performance.now();
  const tick = (now) => {
    finalLitCount = Math.min(FINAL_COUNT, Math.floor((now - started) / step) + 1);
    counter.textContent = String(FINAL_COUNT - finalLitCount);
    updateStats();
    if (finalLitCount < FINAL_COUNT) requestAnimationFrame(tick);
    else {
      finalAnimating = false;
      setTimeout(() => (overlay.hidden = true), 2500);
      finishFinal();
    }
  };
  requestAnimationFrame(tick);
}

function finishFinal() {
  updateStats();
  draw();
  $('countdown-time').textContent = 'Bayrak tamamlandı. Sıradaki satır bizden.';
}

function tickCountdown() {
  const remaining = finalTime - Date.now();
  if (remaining > 0) {
    $('countdown-time').textContent = formatRemaining(remaining);
    return;
  }
  if (finalLitCount < FINAL_COUNT) startFinal();
}

function wireLinks() {
  const repoUrl = `https://github.com/${CONFIG.repo}`;
  const setLink = (id, url) => {
    const a = $(id);
    if (url) {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
    } else {
      a.classList.add('disabled');
      a.setAttribute('aria-disabled', 'true');
      a.textContent += ' (yakında)';
    }
  };
  setLink('link-issue-commit', `${repoUrl}/issues/new?template=1-commit.yml`);
  setLink('link-issue-ders', `${repoUrl}/issues/new?template=2-ders.yml`);
  setLink('link-repo', repoUrl);
  setLink('link-star', repoUrl);
  setLink('link-form', CONFIG.formUrl);
  setLink('link-kit', CONFIG.dersKitiUrl);
}

async function init() {
  wireLinks();

  const [history, loaded] = await Promise.all([
    loadJson('data/history.json', []),
    loadJson('data/commits.json', []),
  ]);
  const demo = Number(params.get('demo'));
  entries = demo > 0 ? demoEntries(Math.min(demo, POOL_COUNT + 50)) : loaded;

  if (params.get('final') === 'prova') finalTime = Date.now() + 10_000;
  if (Date.now() >= finalTime && params.get('final') !== 'prova') finalLitCount = FINAL_COUNT;

  assignCells(history);
  buildLog(history);
  updateStats();
  resize();

  if (finalLitCount >= FINAL_COUNT) finishFinal();
  tickCountdown();
  setInterval(tickCountdown, 1000);
  requestAnimationFrame(animatePulse);

  canvas.addEventListener('mousemove', showTooltip);
  canvas.addEventListener('mouseleave', hideTooltip);
  canvas.addEventListener('click', showTooltip);
  $('log-more').addEventListener('click', renderMoreLog);
  new ResizeObserver(resize).observe(frame);
}

init();
