const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /#050505/gi, to: '#030014' },
  { from: /#0f172a/gi, to: '#030014' },
  { from: /#121212/gi, to: '#0f0a28' },
  { from: /#3b82f6/gi, to: '#00f0ff' },
  { from: /#1e293b/gi, to: '#1a1a3a' },
  { from: /#1f2937/gi, to: '#1a1a3a' }
];

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        processDirectory(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      replacements.forEach(r => {
        content = content.replace(r.from, r.to);
      });
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated: ${fullPath}`);
      }
    }
  });
}

processDirectory('c:/Users/ROMERO/Desktop/HelpDeskTzomp/src');
processDirectory('c:/Users/ROMERO/Desktop/HelpDeskTzomp/public');
processDirectory('c:/Users/ROMERO/Desktop/HelpDeskTzomp');
