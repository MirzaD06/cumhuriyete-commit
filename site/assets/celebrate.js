const COLORS = ['#e30a17', '#ffffff', '#ff4d57', '#f2c14e', '#ffffff'];
const GRAVITY = 0.045;
const BANNER_MS = 15000;
const FLAG_SVG =
  '<svg class="celebration-flag" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#e30a17"/>' +
  '<circle cx="11.25" cy="10" r="5" fill="#fff"/><circle cx="12.5" cy="10" r="4" fill="#e30a17"/>' +
  '<polygon fill="#fff" points="20.27,10 16.52,11.22 18.84,8.03 18.84,11.97 16.52,8.78"/></svg>';

let running = false;

function banner(onClose) {
  const el = document.createElement('div');
  el.className = 'celebration';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Cumhuriyet kutlaması');
  el.innerHTML = `
    <div class="celebration-card">
      <button type="button" class="celebration-close" aria-label="Kapat">×</button>
      <p class="celebration-eyebrow">29 Ekim 1923 → 29 Ekim 2026</p>
      <h2>Yaşasın Cumhuriyet!</h2>
      <p class="celebration-sub">Bayrak tamamlandı. 103. yıl kutlu olsun! ${FLAG_SVG}</p>
      <p class="celebration-code"><span>$</span> git tag -a v103.0 -m "Sıradaki satır bizden"</p>
    </div>`;
  const close = () => {
    el.classList.add('closing');
    setTimeout(() => el.remove(), 400);
    onClose();
  };
  el.querySelector('.celebration-close').addEventListener('click', close);
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', esc);
      if (el.isConnected) close();
    }
  });
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  return { el, close };
}

export function celebrate({ reducedMotion = false, duration = 45000 } = {}) {
  if (running) return;
  running = true;
  document.body.classList.add('celebrating');

  const done = () => {
    running = false;
    document.body.classList.remove('celebrating');
  };
  const b = banner(reducedMotion ? done : () => {});
  setTimeout(() => b.el.isConnected && b.close(), BANNER_MS);
  if (reducedMotion) return;

  const makeLayer = () => {
    const c = document.createElement('canvas');
    c.className = 'fireworks';
    c.setAttribute('aria-hidden', 'true');
    document.body.append(c);
    return c;
  };
  const canvas = makeLayer();
  const confettiCanvas = makeLayer();
  const ctx = canvas.getContext('2d');
  const cctx = confettiCanvas.getContext('2d');
  let w = 0;
  let h = 0;
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    for (const [c, x] of [[canvas, ctx], [confettiCanvas, cctx]]) {
      c.width = w * dpr;
      c.height = h * dpr;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };
  fit();
  window.addEventListener('resize', fit);

  const rockets = [];
  const sparks = [];
  const confetti = [];
  const started = performance.now();
  let lastLaunch = 0;
  let stopping = false;
  let frame = 0;

  const launch = () => {
    rockets.push({
      x: w * (0.15 + Math.random() * 0.7),
      y: h + 10,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(h / 95 + Math.random() * 3),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  };

  const explode = (r) => {
    const n = 70 + Math.floor(Math.random() * 50);
    const speed = 2.5 + Math.random() * 2.5;
    const twoTone = Math.random() < 0.5;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.1;
      const s = speed * (0.6 + Math.random() * 0.4);
      sparks.push({
        x: r.x,
        y: r.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
        decay: 0.009 + Math.random() * 0.008,
        color: twoTone && i % 2 ? '#ffffff' : r.color,
      });
    }
  };

  for (let i = 0; i < 160; i++) {
    confetti.push({
      x: Math.random() * w,
      y: -Math.random() * h,
      vy: 1.2 + Math.random() * 2,
      sway: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      size: 5 + Math.random() * 6,
      color: i % 2 ? '#e30a17' : '#ffffff',
    });
  }

  const loop = (now) => {
    const t = now - started;
    if (!stopping && t > duration) stopping = true;
    if (!stopping && now - lastLaunch > (t < 8000 ? 350 : 700)) {
      launch();
      if (t < 8000 && Math.random() < 0.5) launch();
      lastLaunch = now;
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.x += r.vx;
      r.y += r.vy;
      r.vy += GRAVITY * 1.5;
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x - 1.5, r.y - 1.5, 3, 3);
      if (r.vy >= -1) {
        explode(r);
        rockets.splice(i, 1);
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.985;
      s.vy = s.vy * 0.985 + GRAVITY;
      s.life -= s.decay;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    cctx.clearRect(0, 0, w, h);
    for (const c of confetti) {
      if (c.y > h + 20) {
        if (t < 14000 && !stopping) c.y = -20;
        else continue;
      }
      c.y += c.vy;
      c.sway += 0.05;
      c.rot += 0.08;
      cctx.save();
      cctx.translate(c.x + Math.sin(c.sway) * 20, c.y);
      cctx.rotate(c.rot);
      cctx.fillStyle = c.color;
      cctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      cctx.restore();
    }

    frame = requestAnimationFrame(loop);
    if (stopping && !rockets.length && !sparks.length && !confetti.some((c) => c.y < h + 20)) {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', fit);
      canvas.remove();
      confettiCanvas.remove();
      done();
    }
  };
  frame = requestAnimationFrame(loop);
}
