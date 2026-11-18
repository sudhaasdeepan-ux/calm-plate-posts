// Renders a 1080x1350 PNG card for every queue item that has no image yet.
// Uses headless Edge/Chrome. Run locally: node src/render.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const queuePath = path.join(root, 'content', 'queue.json');
const imgDir = path.join(root, 'content', 'images');
const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
fs.mkdirSync(imgDir, { recursive: true });

const candidates = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const browser = candidates.find((p) => fs.existsSync(p));
if (!browser) { console.error('No Edge/Chrome found. Set BROWSER=path'); process.exit(1); }

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const PAL = [
  { bg: '#FFD84D', w1: '#FF6B5E', w2: '#1FB5A8', acc: '#E2603F', em: ['🥕', '🍎', '🥦', '🍓'] },
  { bg: '#8FD3F4', w1: '#FF8A3D', w2: '#1FB5A8', acc: '#1E88C9', em: ['🥪', '🍇', '🍎', '🥕'] },
  { bg: '#FFB3A7', w1: '#7B61C9', w2: '#FFD84D', acc: '#D6455B', em: ['🍓', '🍌', '🥛', '🍪'] },
  { bg: '#A8E6A1', w1: '#FF8A5E', w2: '#FFC93C', acc: '#2E9E5B', em: ['🥦', '🥕', '🍐', '🥬'] },
  { bg: '#CDB8F5', w1: '#FF6B8E', w2: '#4DC9B0', acc: '#7B4FD0', em: ['🍇', '🫐', '🍎', '🧀'] },
];
const INK = '#1F2A5A';
const wave = (c, flip) => `<svg style="position:absolute;left:0;${flip ? 'bottom' : 'top'}:0;width:1080px;height:120px${flip ? ';transform:scaleY(-1)' : ''}" viewBox="0 0 816 46" preserveAspectRatio="none"><path d="M0 0H816V22C700 50 620 4 500 24C380 44 280 6 160 28C90 40 40 30 0 22Z" fill="${c.w1}"/><path d="M0 0H816V10C720 32 600 0 480 14C360 28 240 0 0 12Z" fill="${c.w2}"/></svg>`;

function html(item, idx) {
  const c = PAL[idx % PAL.length];
  const lines = String(item.body || '').split('\n').map((l) => `<li>${esc(l)}</li>`).join('');
  const e = (ch, st) => `<div style="position:absolute;font-size:96px;font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;${st}">${ch}</div>`;
  return `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1080px;height:1350px;position:relative;overflow:hidden;background-color:${c.bg};background-image:radial-gradient(circle,rgba(255,255,255,.6) 7px,transparent 8px);background-size:70px 70px;font-family:Georgia,serif;color:${INK}}
  .wrap{position:absolute;left:80px;right:80px;top:190px;bottom:230px;display:flex;flex-direction:column}
  .tag{font:700 28px Arial,sans-serif;letter-spacing:4px;color:${INK};text-transform:uppercase;background:#fff;align-self:flex-start;padding:10px 22px;border-radius:40px}
  h1{font-size:92px;line-height:1.05;margin:34px 0 40px;color:${INK}}
  ul{list-style:none;padding:0;font:600 42px/1.3 Arial,sans-serif}
  li{padding:20px 30px;border-left:14px solid ${c.acc};margin-bottom:20px;background:#fff;border-radius:18px}
  .foot{position:absolute;left:0;right:0;bottom:150px;text-align:center;font:700 32px Arial,sans-serif;color:${INK}}
  </style>${wave(c, false)}${wave(c, true)}
  ${e(c.em[0], 'left:24px;top:14px')}${e(c.em[1], 'right:24px;top:14px')}${e(c.em[2], 'left:24px;bottom:12px')}${e(c.em[3], 'right:24px;bottom:12px')}
  <div class="wrap"><div class="tag">${esc(cfg.niche.slice(0, 40))}</div><h1>${esc(item.headline)}</h1><ul>${lines}</ul></div>
  <div class="foot">${esc(cfg.brand)} · link in bio</div>`;
}

let made = 0;
for (const [idx, item] of queue.entries()) {
  const file = `${item.id}.png`;
  const out = path.join(imgDir, file);
  if (fs.existsSync(out)) { item.image = item.image || file; continue; }
  const tmp = path.join(os.tmpdir(), `card-${item.id}.html`);
  fs.writeFileSync(tmp, html(item, idx));
  const r = spawnSync(browser, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    '--window-size=1080,1350', `--screenshot=${out}`,
    'file:///' + tmp.split(path.sep).join('/'),
  ], { stdio: 'ignore', timeout: 60000 });
  // Edge can exit before the PNG is flushed (or exit non-zero after writing it), so wait for the file.
  for (let i = 0; i < 40 && !fs.existsSync(out); i++) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  if (!fs.existsSync(out)) { console.error('render failed for', item.id, 'exit', r.status); continue; }
  item.image = file; made++;
}
fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2) + '\n');
console.log(`rendered ${made} new card(s)`);
