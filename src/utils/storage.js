const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');

// Buat folder data/ kalau belum ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

const SEEDS_DIR = path.join(process.cwd(), 'seeds');

// In-Memory Cache untuk performa super cepat (0ms disk I/O)
const memoryCache = new Map();

// Cloud Sync Configuration (Supabase REST API)
const DEFAULT_SUPABASE_URL = 'https://kguskfklfrfoomsnxwkt.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtndXNrZmtsZnJmb29tc254d2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTg4MjYsImV4cCI6MjA4MzY3NDgyNn0.h5PvtHV7fUouV7W_MWZIFMq8mWaEV8Qma99VX8x-9Zg';

const SUPABASE_URL = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

let cloudInitialized = false;
const cloudSyncQueue = new Map();
let syncTimer = null;

/**
 * Inisialisasi Cloud Storage dari Supabase saat startup.
 * Mengunduh semua data JSON terbaru dari database cloud ke memori & disk lokal.
 */
async function initCloudStorage() {
  if (cloudInitialized) return;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('ℹ️ [Cloud Storage] Konfigurasi Supabase tidak tersedia. Menggunakan penyimpanan lokal.');
    return;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bot_storage?select=key,data`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (res.ok) {
      const records = await res.json();
      for (const { key, data } of records) {
        if (key && data) {
          memoryCache.set(key, data);
          try {
            fs.writeFileSync(getFilePath(key), JSON.stringify(data, null, 2), 'utf8');
          } catch (_) {}
        }
      }
      cloudInitialized = true;
      console.log(`☁️ [Cloud Storage] Berhasil sinkronisasi ${records.length} database dari Supabase Cloud!`);
    } else {
      console.warn(`⚠️ [Cloud Storage] Gagal sinkron cloud (${res.status}): ${await res.text()}`);
    }
  } catch (err) {
    console.warn('⚠️ [Cloud Storage] Gagal terhubung ke Supabase:', err.message);
  }
}

/**
 * Kirim update data ke Supabase di background (debounced).
 */
function queueCloudSync(name, data) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  cloudSyncQueue.set(name, data);

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const batch = Array.from(cloudSyncQueue.entries());
    cloudSyncQueue.clear();

    for (const [key, content] of batch) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/bot_storage`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            key,
            data: content,
            updated_at: new Date().toISOString()
          })
        });
      } catch (err) {
        console.warn(`⚠️ [Cloud Sync] Gagal sync ${key} ke Supabase:`, err.message);
      }
    }
  }, 1000);
}

/** Baca seluruh isi file JSON (dengan in-memory caching & auto-seed) */
function read(name) {
  if (memoryCache.has(name)) {
    return memoryCache.get(name);
  }
  const fp = getFilePath(name);
  if (!fs.existsSync(fp)) {
    // Auto-seed dari folder seeds/ jika data/ masih kosong
    const seedPath = path.join(SEEDS_DIR, `${name}.json`);
    if (fs.existsSync(seedPath)) {
      try {
        fs.copyFileSync(seedPath, fp);
        console.log(`[Storage] Auto-seeding database ${name}.json dari seeds/`);
      } catch (seedErr) {
        console.error(`[Storage] Gagal auto-seed ${name}.json:`, seedErr.message);
      }
    }
  }

  if (!fs.existsSync(fp)) {
    memoryCache.set(name, {});
    return {};
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8'));
    // Deep-merge dengan seed jika ada data/setting baru dari seed yang belum ada di disk
    const seedPath = path.join(SEEDS_DIR, `${name}.json`);
    if (fs.existsSync(seedPath)) {
      try {
        const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        function recursiveMerge(target, source) {
          let changed = false;
          for (const [key, val] of Object.entries(source)) {
            if (target[key] === undefined || target[key] === null || target[key] === '') {
              target[key] = val;
              changed = true;
            } else if (Array.isArray(val) && Array.isArray(target[key])) {
              for (const item of val) {
                if (!target[key].includes(item)) {
                  target[key].push(item);
                  changed = true;
                }
              }
            } else if (val !== null && typeof val === 'object' && !Array.isArray(val) && typeof target[key] === 'object' && !Array.isArray(target[key])) {
              if (recursiveMerge(target[key], val)) {
                changed = true;
              }
            }
          }
          return changed;
        }
        if (recursiveMerge(parsed, seedData)) {
          fs.writeFileSync(fp, JSON.stringify(parsed, null, 2), 'utf8');
        }
      } catch (_) {}
    }
    memoryCache.set(name, parsed);
    return parsed;
  } catch {
    memoryCache.set(name, {});
    return {};
  }
}

/** Tulis seluruh isi file JSON (update memory cache, disk atomik, & cloud sync) */
function write(name, data) {
  memoryCache.set(name, data);
  const targetPath = getFilePath(name);
  const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, targetPath);
  } catch (err) {
    console.error(`[Storage] Gagal menulis ${name}.json:`, err.message);
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (_) {}
  }
  // Sync otomatis ke Cloud Supabase
  queueCloudSync(name, data);
}

/** Ambil satu key dari file JSON */
function get(name, key) {
  return read(name)[key] ?? null;
}

/** Set satu key di file JSON */
function set(name, key, value) {
  const data = read(name);
  data[key] = value;
  write(name, data);
}

/** Hapus satu key dari file JSON */
function del(name, key) {
  const data = read(name);
  delete data[key];
  write(name, data);
}

/**
 * Load semua guild settings dari JSON ke client Maps saat bot start.
 * Dipanggil sekali di ready.js.
 */
function loadAllSettings(client) {
  if (!client.stay247) client.stay247 = new Set();
  if (!client.stay247Settings) client.stay247Settings = new Map();

  const settings = read('settings');
  for (const [guildId, guildData] of Object.entries(settings)) {
    if (guildData.welcome) client.welcomeSettings.set(guildId, guildData.welcome);
    if (guildData.morning) client.morningSettings.set(guildId, guildData.morning);
    if (guildData.night)   client.nightSettings.set(guildId, guildData.night);
    if (guildData.stay247 && guildData.stay247.enabled) {
      client.stay247.add(guildId);
      client.stay247Settings.set(guildId, guildData.stay247);
    }
  }

  // Load AFK persistent data into client.afkUsers
  const afkData = read('afk');
  for (const [key, value] of Object.entries(afkData)) {
    client.afkUsers.set(key, value);
  }

  console.log(`💾 [Storage] Settings dimuat untuk ${Object.keys(settings).length} guild (${client.afkUsers.size} active AFK sessions, ${client.stay247.size} 24/7 active).`);
}

/**
 * Simpan setting satu seksi untuk satu guild.
 * Contoh: saveGuildSetting(guildId, 'welcome', { channelId, enabled })
 */
function saveGuildSetting(guildId, section, value) {
  const settings = read('settings');
  if (!settings[guildId]) settings[guildId] = {};
  settings[guildId][section] = value;
  write('settings', settings);
}

module.exports = {
  read,
  write,
  get,
  set,
  del,
  loadAllSettings,
  saveGuildSetting,
  initCloudStorage
};

