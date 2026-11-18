// Sets config.json imageBaseUrl for your GitHub repo.
// Usage: node src/set-repo.js <github-user> <repo> [branch]
const fs = require('fs');
const path = require('path');
const [user, repo, branch = 'main'] = process.argv.slice(2);
if (!user || !repo) { console.error('Usage: node src/set-repo.js <github-user> <repo> [branch]'); process.exit(1); }
const f = path.join(__dirname, '..', 'config.json');
const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
cfg.imageBaseUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/content/images`;
fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n');
console.log('imageBaseUrl set to', cfg.imageBaseUrl);
