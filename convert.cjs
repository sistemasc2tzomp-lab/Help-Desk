const fs = require('fs'); 
const img = fs.readFileSync('public/img/logo_tzompantepec.png', 'base64'); 
fs.writeFileSync('src/utils/logoBase64.ts', 'export const logoBase64 = "data:image/png;base64,' + img + '";\n');
console.log('Logo converted successfully');
