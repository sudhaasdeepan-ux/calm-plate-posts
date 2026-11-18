// Publishes the next pending queue item to Instagram via the Graph API.
// Usage: node src/post.js [--dry-run]
// Needs env IG_USER_ID and IG_ACCESS_TOKEN (not required for --dry-run).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
try { // optional local .env
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch (e) { /* no .env */ }

const dry = process.argv.includes('--dry-run');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const queuePath = path.join(root, 'content', 'queue.json');
const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const GRAPH = 'https://graph.facebook.com/v21.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, url, params) {
  const opts = { method };
  if (method === 'POST') {
    opts.body = new URLSearchParams(params);
  } else {
    url += '?' + new URLSearchParams(params);
  }
  const res = await fetch(url, opts);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(JSON.stringify(json.error || json));
  return json;
}

(async () => {
  const item = queue.find((q) => q.status === 'pending' && q.image);
  if (!item) { console.log('Queue empty: add items to content/queue.json and run render.js'); process.exit(0); }

  const imageUrl = `${cfg.imageBaseUrl}/${item.image}`;
  const caption = [item.caption, cfg.disclaimer, cfg.hashtags.join(' ')].filter(Boolean).join('\n\n').slice(0, 2200);
  console.log(`Next: ${item.id} ${item.headline}\nImage: ${imageUrl}\nCaption:\n${caption}\n`);
  if (!dry) {
    // Instagram fetches the image from this URL, so make sure it is reachable first.
    const head = await fetch(imageUrl, { method: 'HEAD' }).catch(() => null);
    if (!head || !head.ok) throw new Error('Image URL not reachable (' + (head ? head.status : 'network error') + '): ' + imageUrl + '. Push content/images to a PUBLIC repo and run node src/set-repo.js.');
  }
  if (dry) { console.log('[dry run] nothing posted'); return; }

  const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;
  if (!IG_USER_ID || !IG_ACCESS_TOKEN) throw new Error('Missing IG_USER_ID / IG_ACCESS_TOKEN');

  // 1. create container
  const c = await api('POST', `${GRAPH}/${IG_USER_ID}/media`, {
    image_url: imageUrl, caption, access_token: IG_ACCESS_TOKEN,
  });
  // 2. wait until processed
  for (let i = 0; i < 12; i++) {
    const s = await api('GET', `${GRAPH}/${c.id}`, { fields: 'status_code', access_token: IG_ACCESS_TOKEN });
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR') throw new Error('Container processing failed');
    await sleep(5000);
  }
  // 3. publish
  const p = await api('POST', `${GRAPH}/${IG_USER_ID}/media_publish`, {
    creation_id: c.id, access_token: IG_ACCESS_TOKEN,
  });
  item.status = 'posted';
  item.postedAt = new Date().toISOString();
  item.mediaId = p.id;
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2) + '\n');
  console.log('Posted, media id', p.id);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
