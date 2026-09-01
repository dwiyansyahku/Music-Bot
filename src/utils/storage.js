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

/** Baca seluruh isi file JSON (dengan in-memory caching & auto-seed) */
function read(name) {
  if (memoryCache.has(name)) {
    return memoryCache.get(name);
  }
  const fp = getFilePath(name);
  if (!fs.existsSync(fp)) {
    // Auto-seed dari folder seeds/ jika data/ masih kosong (fresh deployment / volume baru)
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
    memoryCache.set(name, parsed);
    return parsed;
  } catch {
    memoryCache.set(name, {});
    return {};
  }
}

/** Tulis seluruh isi file JSON (update memory cache & disk) */
function write(name, data) {
  memoryCache.set(name, data);
  try {
    fs.writeFileSync(getFilePath(name), JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`[Storage] Gagal menulis ${name}.json:`, err.message);
  }
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

module.exports = { read, write, get, set, del, loadAllSettings, saveGuildSetting };
