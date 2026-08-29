// Script untuk upload backup data
// Jalankan di Railway Console: node upload.js

const https = require('https');
const http = require('http');
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

// Upload dengan follow redirect
function upload(url, fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const boundary = '----Backup' + Date.now();
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/gzip\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([Buffer.from(header), fileBuffer, Buffer.from(footer)]);

    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
      }
    }, (res) => {
      // Follow redirects
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        console.log('Redirect ke:', res.headers.location);
        upload(res.headers.location, fileBuffer, filename).then(resolve).catch(reject);
        return;
      }

      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // Coba 0x0.st dulu (paling simpel & reliable)
  console.log('\nMengupload ke 0x0.st...');
  try {
    const result = await upload('https://0x0.st', compressed, 'backup.json.gz');
    if (result.status === 200) {
      const link = result.body.trim();
      console.log('========================================');
      console.log('  LINK DOWNLOAD BACKUP:');
      console.log('  ' + link);
      console.log('========================================');
      console.log('\nKirimkan link di atas ke chat!');
      return;
    }
    console.log('Status:', result.status, result.body.substring(0, 200));
  } catch (e) {
    console.log('0x0.st error:', e.message);
  }

  // Fallback: file.io dengan redirect
  console.log('\nMengupload ke file.io...');
  try {
    const result = await upload('https://file.io', compressed, 'backup.json.gz');
    const parsed = JSON.parse(result.body);
    if (parsed.success) {
      console.log('========================================');
      console.log('  LINK DOWNLOAD BACKUP:');
      console.log('  ' + parsed.link);
      console.log('========================================');
      console.log('\nKirimkan link di atas ke chat!');
      return;
    }
    console.log('file.io response:', result.body.substring(0, 200));
  } catch (e) {
    console.log('file.io error:', e.message);
  }

  // Fallback terakhir: cetak base64 langsung
  console.log('\n=== FALLBACK: BASE64 OUTPUT ===');
  console.log('Salin teks di bawah ini:');
  console.log('--- START ---');
  console.log(compressed.toString('base64'));
  console.log('--- END ---');
}

main();
