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

/** Baca seluruh isi file JSON */
function read(name) {
  const fp = getFilePath(name);
  if (!fs.existsSync(fp)) return {};
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return {};
  }
}

/** Tulis seluruh isi file JSON */
function write(name, data) {
  fs.writeFileSync(getFilePath(name), JSON.stringify(data, null, 2), 'utf8');
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
  const settings = read('settings');
  for (const [guildId, guildData] of Object.entries(settings)) {
    if (guildData.welcome) client.welcomeSettings.set(guildId, guildData.welcome);
    if (guildData.morning) client.morningSettings.set(guildId, guildData.morning);
    if (guildData.night)   client.nightSettings.set(guildId, guildData.night);
  }
  console.log(`💾 [Storage] Settings dimuat untuk ${Object.keys(settings).length} guild.`);
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
