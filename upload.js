// Jalankan di Railway Console kapan saja: node upload.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

async function main() {
  const dataDir = path.join(process.cwd(), 'data');
  const files = ['cards.json', 'settings.json', 'voiceStats.json', 'jail.json',
    'events.json', 'timecapsules.json', 'gacha_data.json', 'musicquiz_lb.json'];

  const bundle = {};
  for (const f of files) {
    const fp = path.join(dataDir, f);
    if (fs.existsSync(fp)) {
      try {
        bundle[f] = JSON.parse(fs.readFileSync(fp, 'utf8'));
        console.log('✅ OK:', f);
      } catch (e) {}
    }
  }

  const jsonStr = JSON.stringify(bundle);
  const compressed = zlib.gzipSync(Buffer.from(jsonStr));
  console.log(`\nMengemas data: ${(jsonStr.length / 1024).toFixed(0)} KB -> ${(compressed.length / 1024).toFixed(0)} KB`);

  // 1. Coba upload ke tmpfiles.org
  try {
    const blob = new Blob([compressed], { type: 'application/gzip' });
    const formData = new FormData();
    formData.append('file', blob, 'qumpruy_database_backup.json.gz');

    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data?.data?.url) {
      console.log('\n========================================');
      console.log('  LINK DOWNLOAD BACKUP:');
      console.log('  ' + data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/'));
      console.log('========================================\n');
      return;
    }
  } catch (err) {
    console.log('tmpfiles error:', err.message);
  }

  // 2. Fallback: upload ke catbox.moe
  try {
    const blob = new Blob([compressed], { type: 'application/gzip' });
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', blob, 'qumpruy_database_backup.json.gz');

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData
    });
    const url = await res.text();
    if (url && url.startsWith('http')) {
      console.log('\n========================================');
      console.log('  LINK DOWNLOAD BACKUP:');
      console.log('  ' + url.trim());
      console.log('========================================\n');
      return;
    }
  } catch (err) {
    console.log('catbox error:', err.message);
  }
}

main();
