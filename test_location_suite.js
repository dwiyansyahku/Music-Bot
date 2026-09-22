/**
 * Test Suite Komprehensif: Sistem Deteksi Lokasi Domestik & Internasional
 * Mencakup Indonesia (514 Kab/Kota), Filipina, Malaysia, Brunei, Kamboja, dan Global
 */

const { parseLocation } = require('./src/utils/locationHelper');
const { getMemberMapData, createMemberMapPanelPayload } = require('./src/utils/memberMapHelper');
const { buildMemberCardEmbed } = require('./src/utils/cardHandler');

console.log('======================================================');
console.log('🧪 MEMULAI PENGUJIAN MENYELURUH FITUR DETEKSI LOKASI');
console.log('======================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

// ==========================================
// PENGUJIAN 1: PARSER LOKASI SPESIFIK NEGARA
// ==========================================
console.log('📍 [Bagian 1] Pengujian Deteksi Negara & Kota ASEAN / Global...');

// A. 🇵🇭 Filipina
const phTests = [
  { in: 'Philippines', expC: 'Filipina', expF: '🇵🇭' },
  { in: 'Filipina', expC: 'Filipina', expF: '🇵🇭' },
  { in: 'Pilipinas', expC: 'Filipina', expF: '🇵🇭' },
  { in: 'Manila', expC: 'Filipina', expF: '🇵🇭', expP: 'Metro Manila' },
  { in: 'Makati', expC: 'Filipina', expF: '🇵🇭', expP: 'Metro Manila' },
  { in: 'Taguig', expC: 'Filipina', expF: '🇵🇭', expP: 'Metro Manila' },
  { in: 'Cebu', expC: 'Filipina', expF: '🇵🇭', expP: 'Central Visayas' },
  { in: 'Davao', expC: 'Filipina', expF: '🇵🇭', expP: 'Davao Region' },
  { in: 'Baguio', expC: 'Filipina', expF: '🇵🇭', expP: 'Benguet' },
  { in: 'Angeles', expC: 'Filipina', expF: '🇵🇭', expP: 'Pampanga' }
];
for (const t of phTests) {
  const r = parseLocation(t.in);
  assert(r && r.country === t.expC && r.flag === t.expF, `Filipina: "${t.in}" -> ${r?.display}`);
}

// B. 🇲🇾 Malaysia
const myTests = [
  { in: 'Malaysia', expC: 'Malaysia', expF: '🇲🇾' },
  { in: 'Kuala Lumpur', expC: 'Malaysia', expF: '🇲🇾' },
  { in: 'KL', expC: 'Malaysia', expF: '🇲🇾' },
  { in: 'Kuching', expC: 'Malaysia', expF: '🇲🇾' },
  { in: 'Johor Bahru', expC: 'Malaysia', expF: '🇲🇾' },
  { in: 'Penang', expC: 'Malaysia', expF: '🇲🇾' },
  { in: 'Sarawak', expC: 'Malaysia', expF: '🇲🇾' },
  { in: 'Sabah', expC: 'Malaysia', expF: '🇲🇾' }
];
for (const t of myTests) {
  const r = parseLocation(t.in);
  assert(r && r.country === t.expC && r.flag === t.expF, `Malaysia: "${t.in}" -> ${r?.display}`);
}

// C. 🇧🇳 Brunei Darussalam
const bnTests = [
  { in: 'Brunei', expC: 'Brunei', expF: '🇧🇳' },
  { in: 'Brunei Darussalam', expC: 'Brunei', expF: '🇧🇳' },
  { in: 'Bandar Seri Begawan', expC: 'Brunei', expF: '🇧🇳' },
  { in: 'BSB', expC: 'Brunei', expF: '🇧🇳' },
  { in: 'Kuala Belait', expC: 'Brunei', expF: '🇧🇳' },
  { in: 'Seria', expC: 'Brunei', expF: '🇧🇳' },
  { in: 'Tutong', expC: 'Brunei', expF: '🇧🇳' }
];
for (const t of bnTests) {
  const r = parseLocation(t.in);
  assert(r && r.country === t.expC && r.flag === t.expF, `Brunei: "${t.in}" -> ${r?.display}`);
}

// D. 🇰🇭 Kamboja
const khTests = [
  { in: 'Cambodia', expC: 'Kamboja', expF: '🇰🇭' },
  { in: 'Kamboja', expC: 'Kamboja', expF: '🇰🇭' },
  { in: 'Phnom Penh', expC: 'Kamboja', expF: '🇰🇭' },
  { in: 'Siem Reap', expC: 'Kamboja', expF: '🇰🇭' },
  { in: 'Battambang', expC: 'Kamboja', expF: '🇰🇭' },
  { in: 'Sihanoukville', expC: 'Kamboja', expF: '🇰🇭' },
  { in: 'Kampong Som', expC: 'Kamboja', expF: '🇰🇭' }
];
for (const t of khTests) {
  const r = parseLocation(t.in);
  assert(r && r.country === t.expC && r.flag === t.expF, `Kamboja: "${t.in}" -> ${r?.display}`);
}

// E. 🇮🇩 Indonesia (Domestik)
console.log('\n📍 [Bagian 2] Pengujian Deteksi Indonesia & Satelit...');
const idTests = [
  { in: 'Indonesia', expC: 'Indonesia', expF: '🇮🇩' },
  { in: 'Indo', expC: 'Indonesia', expF: '🇮🇩' },
  { in: 'Bandung', expC: 'Indonesia', expP: 'Jawa Barat' },
  { in: 'Surabaya', expC: 'Indonesia', expP: 'Jawa Timur' },
  { in: 'Boyolali', expC: 'Indonesia', expP: 'Jawa Tengah' },
  { in: 'Tuban', expC: 'Indonesia', expP: 'Jawa Timur' },
  { in: 'Lhokseumawe', expC: 'Indonesia', expP: 'Aceh' },
  { in: 'Mamuju', expC: 'Indonesia', expP: 'Sulawesi Barat' },
  { in: 'Labuan Bajo', expC: 'Indonesia', expP: 'Nusa Tenggara Timur' },
  { in: 'Wamena', expC: 'Indonesia', expP: 'Papua Pegunungan' },
  { in: 'IKN', expC: 'Indonesia', expP: 'Kalimantan Timur' },
  { in: 'BSD', expC: 'Indonesia', expP: 'Banten' },
  { in: 'Bintaro', expC: 'Indonesia', expP: 'Banten' },
  { in: 'Cikarang', expC: 'Indonesia', expP: 'Jawa Barat' },
  { in: 'Bekasea', expC: 'Indonesia', expP: 'Jawa Barat' },
  { in: 'Solo', expC: 'Indonesia', expP: 'Jawa Tengah' },
  { in: 'Jawa Barat', expC: 'Indonesia', expP: 'Jawa Barat' },
  { in: 'Sulsel', expC: 'Indonesia', expP: 'Sulawesi Selatan' },
  { in: 'Kembangan', expC: 'Indonesia', expP: 'DKI Jakarta' },
  { in: 'Kebon Jeruk', expC: 'Indonesia', expP: 'DKI Jakarta' },
  { in: 'Menteng', expC: 'Indonesia', expP: 'DKI Jakarta' },
  { in: 'Tebet', expC: 'Indonesia', expP: 'DKI Jakarta' },
  { in: 'DKI Jakarta', expC: 'Indonesia', expP: 'DKI Jakarta' },
  { in: 'Aceh', expC: 'Indonesia', expP: 'Aceh' },
  { in: 'Jambi', expC: 'Indonesia', expP: 'Jambi' },
  { in: 'Sumatra', expC: 'Indonesia', expP: 'Pulau Sumatera' }
];
for (const t of idTests) {
  const r = parseLocation(t.in);
  assert(r && r.country === t.expC && (!t.expP || r.stateOrProvince === t.expP), `Indonesia: "${t.in}" -> ${r?.display}`);
}

// F. Lokasi Fiksi / Meme
console.log('\n📍 [Bagian 3] Pengujian Filter Meme / Anomali...');
const memeTests = ['isekai', 'konoha', 'bikini bottom', 'surga', 'neraka', 'mars'];
for (const m of memeTests) {
  const r = parseLocation(m);
  assert(r && r.isAnomaly === true && r.flag === '🌌', `Anomali: "${m}" -> ${r?.display}`);
}

// ==========================================
// PENGUJIAN 2: INTEGRASI PETA MEMBER (/membermap)
// ==========================================
console.log('\n📍 [Bagian 4] Pengujian Integrasi Hierarki Peta Member (/membermap)...');

const storage = require('./src/utils/storage');
const originalRead = storage.read;

// Mocking multi-country server
const mockCards = {
  // Member Filipina
  u_ph1: { asal: 'Manila', location: parseLocation('Manila') },
  u_ph2: { asal: 'Cebu', location: parseLocation('Cebu') },
  // Member Malaysia
  u_my1: { asal: 'Kuala Lumpur', location: parseLocation('Kuala Lumpur') },
  u_my2: { asal: 'Kuching', location: parseLocation('Kuching') },
  // Member Brunei
  u_bn1: { asal: 'Bandar Seri Begawan', location: parseLocation('Bandar Seri Begawan') },
  // Member Kamboja
  u_kh1: { asal: 'Phnom Penh', location: parseLocation('Phnom Penh') },
  // Member Indonesia
  u_id1: { asal: 'Bandung', location: parseLocation('Bandung') },
  u_id2: { asal: 'Boyolali', location: parseLocation('Boyolali') },
  u_id3: { asal: 'Surabaya', location: parseLocation('Surabaya') },
  u_id4: { asal: 'Kembangan', location: parseLocation('Kembangan') },
  u_id5: { asal: 'DKI Jakarta', location: parseLocation('DKI Jakarta') },
  u_id6: { asal: 'Aceh', location: parseLocation('Aceh') },
  u_id7: { asal: 'Sumatra', location: parseLocation('Sumatra') }
};

storage.read = (key) => {
  if (key === 'cards') return { guild_test: mockCards };
  return originalRead(key);
};

const mockGuild = {
  id: 'guild_test',
  name: 'Komunitas ASEAN',
  iconURL: () => null,
  members: {
    cache: new Map(Object.keys(mockCards).map(id => [id, {}])),
    fetch: async () => new Map()
  }
};

const mapResult = getMemberMapData(mockGuild);
assert(mapResult.totalValidLocations === 13, `Total valid locations: ${mapResult.totalValidLocations} / 13`);

const regionNames = mapResult.sortedRegions.map(r => r.name);
assert(regionNames.includes('Filipina'), 'Hierarki Region mencakup negara Filipina 🇵🇭');
assert(regionNames.includes('Malaysia'), 'Hierarki Region mencakup negara Malaysia 🇲🇾');
assert(regionNames.includes('Brunei'), 'Hierarki Region mencakup negara Brunei 🇧🇳');
assert(regionNames.includes('Kamboja'), 'Hierarki Region mencakup negara Kamboja 🇰🇭');
assert(regionNames.includes('Jawa Barat'), 'Hierarki Region mencakup provinsi Jawa Barat 🇮🇩');
assert(regionNames.includes('Jawa Tengah'), 'Hierarki Region mencakup provinsi Jawa Tengah 🇮🇩');
assert(regionNames.includes('DKI Jakarta'), 'Hierarki Region mencakup DKI Jakarta (termasuk Kembangan) 🇮🇩');
assert(mapResult.locMetadata['Kembangan']?.region === 'DKI Jakarta', 'Kembangan terdeteksi wilayah DKI Jakarta');
assert(mapResult.locMetadata['DKI Jakarta']?.region === 'Provinsi', 'DKI Jakarta terdeteksi wilayah Provinsi');
assert(mapResult.locMetadata['Aceh']?.region === 'Provinsi', 'Aceh terdeteksi wilayah Provinsi');
assert(mapResult.locMetadata['Sumatera']?.region === 'Pulau Sumatera', 'Sumatra terdeteksi wilayah Pulau Sumatera');

// Uji payload panel publik
const panelPayload = createMemberMapPanelPayload(mockGuild);
assert(panelPayload && panelPayload.embeds && panelPayload.components, 'Payload panel publik peta member berhasil dibuat');

// ==========================================
// PENGUJIAN 3: RENDER PROFILE CARD
// ==========================================
(async () => {
  console.log('\n📍 [Bagian 5] Pengujian Render Kartu Profil (buildMemberCardEmbed)...');

  const mockTargetUser = {
    id: 'u_ph1',
    username: 'juan',
    tag: 'member_ph#0001',
    displayName: 'Juan',
    displayAvatarURL: () => 'https://example.com/avatar.png'
  };

  const mockMember = {
    id: 'u_ph1',
    user: mockTargetUser,
    displayName: 'Juan',
    joinedAt: new Date(),
    roles: { color: null }
  };

  const { embed: cardEmbed } = await buildMemberCardEmbed(mockGuild, mockMember);
  assert(cardEmbed && cardEmbed.data && cardEmbed.data.fields, 'Card Embed berhasil dirender tanpa error');
  const locField = cardEmbed.data.fields.find(f => f.name === 'Location');
  assert(locField && locField.value.includes('Filipina 🇵🇭'), `Field Location pada kartu profil menampilkan: "${locField?.value}"`);

  storage.read = originalRead;

  console.log('\n======================================================');
  console.log(`🎉 HASIL AKHIR: ${passedTests} LULUS, ${failedTests} GAGAL (Total: ${totalTests} Pengujian)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
