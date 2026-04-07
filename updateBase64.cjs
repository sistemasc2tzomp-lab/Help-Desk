const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, 'public', 'favicon_io', 'android-chrome-192x192.png');
if(fs.existsSync(imgPath)){
  const base64Data = fs.readFileSync(imgPath, {encoding: 'base64'});
  const output = `export const logoBase64 = 'data:image/png;base64,${base64Data}';\n`;
  fs.writeFileSync(path.join(__dirname, 'src', 'utils', 'logoBase64.ts'), output);
  console.log('Successfully updated logoBase64.ts');
} else {
  console.error('Image not found: ' + imgPath);
}
