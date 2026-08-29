// Script untuk upload backup data ke file.io
// Jalankan di Railway Console: node upload.js

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const dataDir = path.join(process.cwd(), 'data');
const files = ['cards.json', 'settings.json', 'voiceStats.json', 'jail.json',
  'events.json', 'timecapsules.json', 'gacha_data.json', 'musicquiz_lb.json'];

const bundle = {};
let count = 0;

for (const f of files) {
  const fp = path.join(dataDir, f);
  if (fs.existsSync(fp)) {
    try {
      bundle[f] = JSON.parse(fs.readFileSync(fp, 'utf8'));
      count++;
      console.log('  OK:', f);
    } catch (e) {
      console.log('  SKIP:', f, e.message);
    }
  }
}

if (count === 0) {
  console.log('Tidak ada file ditemukan!');
  process.exit(1);
}

console.log(`\nMengemas ${count} file...`);
const json = Buffer.from(JSON.stringify(bundle));
const compressed = zlib.gzipSync(json);
console.log(`Ukuran: ${(json.length / 1024).toFixed(0)} KB -> ${(compressed.length / 1024).toFixed(0)} KB (compressed)`);

console.log('Mengupload ke file.io...\n');

const boundary = '----Backup' + Date.now();
const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="backup.json.gz"\r\nContent-Type: application/gzip\r\n\r\n`;
const footer = `\r\n--${boundary}--\r\n`;
const body = Buffer.concat([Buffer.from(header), compressed, Buffer.from(footer)]);

const req = https.request({
  hostname: 'file.io',
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length
  }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.success) {
        console.log('========================================');
        console.log('  LINK DOWNLOAD BACKUP:');
        console.log('  ' + result.link);
        console.log('========================================');
        console.log('\nKirimkan link di atas ke chat!');
      } else {
        console.log('Upload gagal:', data);
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => console.log('Error:', e.message));
req.write(body);
req.end();
