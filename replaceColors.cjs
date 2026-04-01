const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'src');

const replacements = [
  { match: /#00f0ff/g, replace: '#ffffff' },
  { match: /#7b2fff/g, replace: '#cccccc' },
  { match: /#ff2d95/g, replace: '#888888' },
  { match: /#030014/g, replace: '#050505' },
  { match: /#0a0025/g, replace: '#121212' },
  { match: /#888888/g, replace: '#999999' },
  { match: /emerald-400/g, replace: 'gray-300' },
  { match: /emerald-500/g, replace: 'gray-400' },
  { match: /#10b981/g, replace: '#aaaaaa' },
  { match: /#eab308/g, replace: '#bbbbbb' },
  { match: /text-blue-400/g, replace: 'text-gray-300' },
  { match: /bg-blue-500/g, replace: 'bg-gray-500' },
  { match: /border-blue-500/g, replace: 'border-gray-500' },
  { match: /text-yellow-400/g, replace: 'text-gray-300' },
  { match: /bg-yellow-500/g, replace: 'bg-gray-500' },
  { match: /border-yellow-500/g, replace: 'border-gray-500' },
  { match: /text-orange-400/g, replace: 'text-gray-400' },
  { match: /bg-orange-500/g, replace: 'bg-gray-500' },
  { match: /border-orange-500/g, replace: 'border-gray-500' },
  { match: /text-red-400/g, replace: 'text-gray-400' },
  { match: /bg-red-500/g, replace: 'bg-gray-600' },
  { match: /border-red-500/g, replace: 'border-gray-600' },
  { match: /#ff9d00/g, replace: '#cccccc' },
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const r of replacements) {
        if (content.match(r.match)) {
          content = content.replace(r.match, r.replace);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', fullPath);
      }
    }
  }
}

processDir(dirPath);
