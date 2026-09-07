const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const storage = require('../utils/storage');
const { isOwnerOrMod } = require('../utils/helpers');

/**
 * In-memory state untuk Duel Tahta aktif (Clash of Thrones)
 * Key: duelId, Value: duel state object
 */
const activeDuels = new Map();

/**
 * In-memory state untuk Live Feed Embed di channel hasil tarikan
 * Key: guildId, Value: { messageId, channelId, entries: [], createdAt, timer }
 */
const activeResultFeeds = new Map();
const RESULT_FEED_WINDOW_MS = 30 * 1000; // 30 detik
const RESULT_FEED_MAX_ENTRIES = 8;

/**
 * Master Loot Table (32 Collectible Artifacts across 5 Tiers)
 */
const GACHA_ITEMS = [
  // ✦ MYTHIC (3% Drop Rate — 5 Stars)
  {
    id: 'mythic_aegis',
    tier: 'MYTHIC',
    rate: 3,
    stars: '★★★★★',
    tag: '✦',
    color: 0xFF007F,
    name: 'Cosmic Aegis of Infinity',
    badge: '✦ Supreme Celestial',
    title: 'Lord of Infinity',
    desc: 'Pusaka kosmik primordial yang memancarkan energi tak terbatas.',
    recycleStardust: 500
  },
  {
    id: 'mythic_dragon',
    tier: 'MYTHIC',
    rate: 3,
    stars: '★★★★★',
    tag: '✦',
    color: 0xFF007F,
    name: 'Aura of the Celestial Dragon',
    badge: '✦ Dragon Sovereign',
    title: 'Cosmic Dragon',
    desc: 'Aura naga langit legendaris yang menggetarkan seisi galaksi.',
    recycleStardust: 500
  },
  {
    id: 'mythic_vinyl',
    tier: 'MYTHIC',
    rate: 3,
    stars: '★★★★★',
    tag: '✦',
    color: 0xFF007F,
    name: 'Genesis Vinyl of Eternity',
    badge: '✦ Master of Harmonies',
    title: 'Eternal Maestro',
    desc: 'Piringan hitam mitos yang memutar melodi awal mula alam semesta.',
    recycleStardust: 500
  },

  // 🟡 LEGENDARY (10% Drop Rate — 5 Stars)
  {
    id: 'leg_crown',
    tier: 'LEGENDARY',
    rate: 10,
    stars: '★★★★★',
    tag: '✧',
    color: 0xFEE75C,
    name: 'Crown of Destiny',
    badge: '✦ Sultan Mpruy',
    title: 'Sovereign of Luck',
    desc: 'Mahkota takdir berbalut emas murni. Kamu mendapatkan status kehormatan legenda!',
    recycleStardust: 200
  },
  {
    id: 'leg_star',
    tier: 'LEGENDARY',
    rate: 10,
    stars: '★★★★★',
    tag: '✧',
    color: 0xFEE75C,
    name: 'Celestial Star Relic',
    badge: '✦ Bintang Takdir',
    title: 'Chosen by Cosmos',
    desc: 'Semesta tersenyum padamu! Hoki seribu tahun telah tercurahkan kepadamu.',
    recycleStardust: 200
  },
  {
    id: 'leg_excalibur',
    tier: 'LEGENDARY',
    rate: 10,
    stars: '★★★★★',
    tag: '✧',
    color: 0xFEE75C,
    name: 'Excalibur of the Dawn',
    badge: '✦ Dawnblade Master',
    title: 'Blade of Light',
    desc: 'Pedang suci fajar yang menerangi jalan menuju kejayaan dan kehormatan server.',
    recycleStardust: 200
  },
  {
    id: 'leg_phoenix',
    tier: 'LEGENDARY',
    rate: 10,
    stars: '★★★★★',
    tag: '✧',
    color: 0xFEE75C,
    name: 'Phoenix Flame Quill',
    badge: '✦ Immortal Scribe',
    title: 'Reborn Phoenix',
    desc: 'Pena berbulu burung phoenix abadi yang menorehkan sejarah abadi.',
    recycleStardust: 200
  },
  {
    id: 'leg_chrono',
    tier: 'LEGENDARY',
    rate: 10,
    stars: '★★★★★',
    tag: '✧',
    color: 0xFEE75C,
    name: 'Chrono Scepter',
    badge: '✦ Time Traveler',
    title: 'Master of Chronos',
    desc: 'Tongkat pengendali waktu yang membekukan detik-detik keberuntunganmu.',
    recycleStardust: 200
  },

  // 🟣 EPIC (20% Drop Rate — 4 Stars)
  {
    id: 'epic_orb',
    tier: 'EPIC',
    rate: 20,
    stars: '★★★★☆',
    tag: '◈',
    color: 0x9B59B6,
    name: 'Amethyst Crystal Orb',
    badge: '◈ Gacha Lord',
    title: 'Aura of Fortune',
    desc: 'Aura mistis menyelimutimu. Tingkat keberuntunganmu di atas rata-rata!',
    recycleStardust: 75
  },
  {
    id: 'epic_shield',
    tier: 'EPIC',
    rate: 20,
    stars: '★★★★☆',
    tag: '◈',
    color: 0x9B59B6,
    name: 'Midnight Guardian Shield',
    badge: '◈ Guardian Angel',
    title: 'Night Watcher',
    desc: 'Simbol ketangguhan begadang di voice channel sampai subuh tanpa henti.',
    recycleStardust: 75
  },
  {
    id: 'epic_cloak',
    tier: 'EPIC',
    rate: 20,
    stars: '★★★★☆',
    tag: '◈',
    color: 0x9B59B6,
    name: 'Shadow Assassin Cloak',
    badge: '◈ Ghost Walker',
    title: 'Silent Phantom',
    desc: 'Jubah misterius yang membuatmu bergerak lincah dan elegan di server.',
    recycleStardust: 75
  },
  {
    id: 'epic_dagger',
    tier: 'EPIC',
    rate: 20,
    stars: '★★★★☆',
    tag: '◈',
    color: 0x9B59B6,
    name: 'Frostfire Dagger',
    badge: '◈ Frost Vanguard',
    title: 'Twin Elementalist',
    desc: 'Belati bertuah es dan api yang membekukan musuh sekaligus membakarnya.',
    recycleStardust: 75
  },
  {
    id: 'epic_cyber',
    tier: 'EPIC',
    rate: 20,
    stars: '★★★★☆',
    tag: '◈',
    color: 0x9B59B6,
    name: 'Cyberpunk Hologram Key',
    badge: '◈ Netrunner Elite',
    title: 'Cyber Sovereign',
    desc: 'Kunci enkripsi hologram untuk membobol brankas rahasia dunia siber.',
    recycleStardust: 75
  },
  {
    id: 'epic_harp',
    tier: 'EPIC',
    rate: 20,
    stars: '★★★★☆',
    tag: '◈',
    color: 0x9B59B6,
    name: 'Thunderstorm Harp',
    badge: '◈ Storm Bard',
    title: 'Thunderstruck',
    desc: 'Harpa petir yang menghasilkan alunan musik berdentum dahsyat.',
    recycleStardust: 75
  },

  // 🔵 RARE (32% Drop Rate — 3 Stars)
  {
    id: 'rare_clover',
    tier: 'RARE',
    rate: 32,
    stars: '★★★☆☆',
    tag: '◇',
    color: 0x3498DB,
    name: 'Four-Leaf Clover Token',
    badge: '◇ Lucky Explorer',
    title: 'Blessed Soul',
    desc: 'Jimat keberuntungan untuk menghadapi hari-hari penuh tugas dan tantangan.',
    recycleStardust: 25
  },
  {
    id: 'rare_coffee',
    tier: 'RARE',
    rate: 32,
    stars: '★★★☆☆',
    tag: '◇',
    color: 0x3498DB,
    name: 'Eternal Espresso Cup',
    badge: '◇ Kafein Booster',
    title: 'Coffee Aficionado',
    desc: 'Secangkir kopi yang tak pernah dingin untuk menemanimu ngobrol santai.',
    recycleStardust: 25
  },
  {
    id: 'rare_gamepad',
    tier: 'RARE',
    rate: 32,
    stars: '★★★☆☆',
    tag: '◇',
    color: 0x3498DB,
    name: 'Golden Gamepad Artifact',
    badge: '◇ Pro Gamer',
    title: 'Squad MVP',
    desc: 'Simbol pemain clutch paling andal dan berprestasi di seluruh server.',
    recycleStardust: 25
  },
  {
    id: 'rare_cassette',
    tier: 'RARE',
    rate: 32,
    stars: '★★★☆☆',
    tag: '◇',
    color: 0x3498DB,
    name: 'Neon Cassette Tape',
    badge: '◇ Retro Vibe',
    title: 'Synthwave Nomad',
    desc: 'Kaset pita neon berisikan lagu-lagu nostalgia 80-an yang syahdu.',
    recycleStardust: 25
  },
  {
    id: 'rare_compass',
    tier: 'RARE',
    rate: 32,
    stars: '★★★☆☆',
    tag: '◇',
    color: 0x3498DB,
    name: 'Starlight Compass',
    badge: '◇ Astral Navigator',
    title: 'Wayfarer',
    desc: 'Kompas bercahaya bintang yang selalu menuntunmu ke arah yang tepat.',
    recycleStardust: 25
  },
  {
    id: 'rare_bookmark',
    tier: 'RARE',
    rate: 32,
    stars: '★★★☆☆',
    tag: '◇',
    color: 0x3498DB,
    name: 'Enchanted Bookmark',
    badge: '◇ Lore Keeper',
    title: 'Scholar of Whispers',
    desc: 'Pembatas buku sihir yang mengingat setiap lembar kisah server.',
    recycleStardust: 25
  },
  {
    id: 'rare_conch',
    tier: 'RARE',
    rate: 32,
    stars: '★★★☆☆',
    tag: '◇',
    color: 0x3498DB,
    name: 'Whispering Conch',
    badge: '◇ Ocean Listener',
    title: 'Deep Sea Echo',
    desc: 'Kerang laut mistis yang membisikkan rahasia gelombang suara samudra.',
    recycleStardust: 25
  },
  {
    id: 'rare_prism',
    tier: 'RARE',
    rate: 32,
    stars: '★★★☆☆',
    tag: '◇',
    color: 0x3498DB,
    name: 'Prismatic Crystal Shard',
    badge: '◇ Prism Weaver',
    title: 'Spectrum Artist',
    desc: 'Prisma kristal yang membiaskan cahaya redup menjadi pelangi memukau.',
    recycleStardust: 25
  },

  // ⚪ COMMON (35% Drop Rate — 2 Stars)
  {
    id: 'com_fishbone',
    tier: 'COMMON',
    rate: 35,
    stars: '★★☆☆☆',
    tag: '•',
    color: 0x95A5A6,
    name: 'Mysterious Fish Bone',
    badge: null,
    title: null,
    desc: 'Hanya tulang sisa makan siang. Jangan patah arang, coba lagi besok!',
    recycleStardust: 10
  },
  {
    id: 'com_sock',
    tier: 'COMMON',
    rate: 35,
    stars: '★★☆☆☆',
    tag: '•',
    color: 0x95A5A6,
    name: 'Vintage Cozy Sock',
    badge: null,
    title: null,
    desc: 'Wangi-wangi nostalgia. Lumayan untuk menghangatkan malam di kamar.',
    recycleStardust: 10
  },
  {
    id: 'com_paper',
    tier: 'COMMON',
    rate: 35,
    stars: '★★☆☆☆',
    tag: '•',
    color: 0x95A5A6,
    name: 'Lucky Fortune Paper',
    badge: null,
    title: null,
    desc: 'Catatan kecil bertuliskan: "Hari esok pasti akan jauh lebih cerah!"',
    recycleStardust: 10
  },
  {
    id: 'com_coin',
    tier: 'COMMON',
    rate: 35,
    stars: '★★☆☆☆',
    tag: '•',
    color: 0x95A5A6,
    name: 'Rusty Copper Coin',
    badge: null,
    title: null,
    desc: 'Koin tembaga kuno berkarat. Bisa dilebur menjadi Stardust murni!',
    recycleStardust: 10
  },
  {
    id: 'com_tea',
    tier: 'COMMON',
    rate: 35,
    stars: '★★☆☆☆',
    tag: '•',
    color: 0x95A5A6,
    name: 'Warm Green Tea Cup',
    badge: null,
    title: null,
    desc: 'Secangkir teh hijau hangat yang menenangkan pikiran setelah lelah beraktivitas.',
    recycleStardust: 10
  },
  {
    id: 'com_lint',
    tier: 'COMMON',
    rate: 35,
    stars: '★★☆☆☆',
    tag: '•',
    color: 0x95A5A6,
    name: 'Pocket Lint of Wisdom',
    badge: null,
    title: null,
    desc: 'Gumpalan benang di kantong celana. Katanya membawa hoki tersembunyi.',
    recycleStardust: 10
  },
  {
    id: 'com_donut',
    tier: 'COMMON',
    rate: 35,
    stars: '★★☆☆☆',
    tag: '•',
    color: 0x95A5A6,
    name: 'Half-Eaten Donut',
    badge: null,
    title: null,
    desc: 'Donat cokelat meses yang tersisa separuh. Masih manis dan renyah kok!',
    recycleStardust: 10
  },
  {
    id: 'com_battery',
    tier: 'COMMON',
    rate: 35,
    stars: '★★☆☆☆',
    tag: '•',
    color: 0x95A5A6,
    name: 'Pixelated Battery',
    badge: null,
    title: null,
    desc: 'Baterai 8-bit tua dengan sisa daya 1%. Masih bisa dipakai nyalakan lampu senter.',
    recycleStardust: 10
  },
  {
    id: 'com_tape',
    tier: 'COMMON',
    rate: 35,
    stars: '★★☆☆☆',
    tag: '•',
    color: 0x95A5A6,
    name: 'Duct Tape of Destiny',
    badge: null,
    title: null,
    desc: 'Lakban serbaguna yang mampu merekatkan hubungan yang hampir retak.',
    recycleStardust: 10
  },
  {
    id: 'com_duck',
    tier: 'COMMON',
    rate: 35,
    stars: '★★☆☆☆',
    tag: '•',
    color: 0x95A5A6,
    name: 'Squeaky Rubber Duck',
    badge: null,
    title: null,
    desc: 'Bebek karet kuning berbunyi kwek-kwek untuk teman curhat dan debugging.',
    recycleStardust: 10
  }
];

/**
 * Konfigurasi Tahta Role (Skema C: Hanya Mythic & Legendary)
 */
const THRONE_CONFIG = {
  MYTHIC: {
    name: 'Tahta Dewa Kosmik (MYTHIC)',
    quota: 3,           // Maksimal 3 orang di server
    permanent: true,
    tierRank: 4
  },
  LEGENDARY: {
    name: 'Tahta Sultan Server (LEGENDARY)',
    quota: 5,           // Maksimal 5 orang di server
    permanent: true,
    tierRank: 3
  }
};

const TIER_RANK = {
  COMMON: 0,
  RARE: 1,
  EPIC: 2,
  LEGENDARY: 3,
  MYTHIC: 4
};

/**
 * Gacha Shop Catalog (Stardust Exchange)
 */
const GACHA_SHOP_ITEMS = [
  {
    id: 'ticket_1',
    name: '1x Gacha Ticket',
    cost: 100,
    desc: 'Tiket standar untuk membuka 1 Kotak Misteri Gacha.',
    type: 'ticket',
    amount: 1
  },
  {
    id: 'ticket_5',
    name: '5x Gacha Ticket Bundle',
    cost: 450,
    desc: 'Paket hemat 5 tiket gacha (Diskon 10%!).',
    type: 'ticket',
    amount: 5
  },
  {
    id: 'ticket_10',
    name: '10x Gacha Ticket Bundle',
    cost: 850,
    desc: 'Paket sultan 10 tiket gacha sekaligus (Diskon 15%!).',
    type: 'ticket',
    amount: 10
  },
  {
    id: 'title_alchemist',
    name: 'Title & Badge: Stardust Alchemist',
    cost: 600,
    desc: 'Gelar eksklusif penjelajah debu bintang: "Stardust Alchemist" & Badge ✦ Alchemist Sovereign.',
    type: 'title_badge',
    title: 'Stardust Alchemist',
    badge: '✦ Alchemist Sovereign'
  },
  {
    id: 'title_merchant',
    name: 'Title & Badge: Celestial Merchant',
    cost: 1200,
    desc: 'Gelar pedagang antariksa terpandang: "Celestial Merchant" & Badge ✦ Star Trader.',
    type: 'title_badge',
    title: 'Celestial Merchant',
    badge: '✦ Star Trader'
  },
  {
    id: 'title_collector',
    name: 'Title & Badge: Cosmic Collector',
    cost: 2500,
    desc: 'Gelar tertinggi kolektor sejati: "Cosmic Collector" & Badge ✧ Ultimate Hoarder.',
    type: 'title_badge',
    title: 'Cosmic Collector',
    badge: '✧ Ultimate Hoarder'
  }
];

const DAILY_COOLDOWN_HOURS = 24;

/**
 * Format remaining duration to clean human-readable text
 */
function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Kadaluarsa';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} hari ${hours} jam`;
  if (hours > 0) return `${hours} jam ${mins} mnt`;
  return `${mins} menit`;
}

/**
 * Helper to ensure user data initialized cleanly
 */
function getOrInitUserData(gachaData, guildId, userId) {
  if (!gachaData[guildId]) gachaData[guildId] = {};
  if (!gachaData[guildId][userId]) {
    gachaData[guildId][userId] = {
      tickets: 3,
      stardust: 50,
      pulls: 0,
      pityEpic: 0,
      pityLegendary: 0,
      lastDaily: 0,
      streak: 0,
      inventory: [],
      badges: [],
      titles: [],
      equippedTitle: null,
      activeRole: null, // { tier, roleId, expiresAt }
      duelDefenseStreak: 0,
      duelHistory: [],
      throneProtectedUntil: 0,
      challengeCooldownUntil: 0
    };
  } else {
    const u = gachaData[guildId][userId];
    if (u.tickets === undefined) u.tickets = 1;
    if (u.stardust === undefined) u.stardust = 0;
    if (u.pityEpic === undefined) u.pityEpic = 0;
    if (u.pityLegendary === undefined) u.pityLegendary = 0;
    if (u.lastDaily === undefined) u.lastDaily = 0;
    if (u.streak === undefined) u.streak = 0;
    if (u.equippedTitle === undefined) u.equippedTitle = null;
    if (u.activeRole === undefined) u.activeRole = null;
    if (u.duelDefenseStreak === undefined) u.duelDefenseStreak = 0;
    if (u.throneProtectedUntil === undefined) u.throneProtectedUntil = 0;
    if (u.challengeCooldownUntil === undefined) u.challengeCooldownUntil = 0;
    if (!Array.isArray(u.duelHistory)) u.duelHistory = [];
    if (!Array.isArray(u.inventory)) u.inventory = [];
    if (!Array.isArray(u.badges)) u.badges = [];
    if (!Array.isArray(u.titles)) u.titles = [];
  }
  return gachaData[guildId][userId];
}

/**
 * ==========================================
 *  👑 THRONE STORAGE & HELPER (CLASH OF THRONES 2.0)
 * ==========================================
 */
function getThroneStorage() {
  return storage.read('throne_duels') || {};
}

function saveThroneStorage(data) {
  storage.write('throne_duels', data);
}

function getGuildThroneData(guildId) {
  const allData = getThroneStorage();
  if (!allData[guildId]) {
    allData[guildId] = {
      activeDuels: {},
      queues: {
        MYTHIC: [],
        LEGENDARY: []
      }
    };
  }
  if (!allData[guildId].activeDuels) allData[guildId].activeDuels = {};
  if (!allData[guildId].queues) allData[guildId].queues = { MYTHIC: [], LEGENDARY: [] };
  if (!allData[guildId].queues.MYTHIC) allData[guildId].queues.MYTHIC = [];
  if (!allData[guildId].queues.LEGENDARY) allData[guildId].queues.LEGENDARY = [];
  return { allData, guildData: allData[guildId] };
}

function getGuildThroneDataByDuelId(duelId) {
  const allData = getThroneStorage();
  for (const [guildId, gData] of Object.entries(allData)) {
    if (gData.activeDuels && gData.activeDuels[duelId]) {
      return { allData, guildData: gData, guildId, duel: gData.activeDuels[duelId] };
    }
  }
  return { allData, guildData: null, guildId: null, duel: null };
}

/**
 * Buat ActionRow untuk opsi tantangan (Tombol Acak & Select Menu Pemilihan Lawan)
 */
async function buildDefenderChallengeComponents(guild, itemTier, challengerId, activeHolders, busyDefenderIds) {
  const components = [];
  if (!activeHolders || activeHolders.length === 0) return components;

  const now = Date.now();

  // 1. Button Row (Tombol Acak Lawan)
  const hasAvailable = activeHolders.some(h => !busyDefenderIds.has(h.userId) && !(h.userData?.throneProtectedUntil > now));
  const randomBtn = new ButtonBuilder()
    .setCustomId(`throne_challenge_random:${itemTier}:${challengerId}`)
    .setLabel('Acak Lawan')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!hasAvailable);

  const buttonRow = new ActionRowBuilder().addComponents(randomBtn);
  components.push(buttonRow);

  // 2. Select Menu Row (Pilih Lawan Sendiri)
  const options = [];
  for (const holder of activeHolders) {
    let displayName = holder.userId;
    try {
      const m = guild ? (guild.members.cache.get(holder.userId) || await guild.members.fetch(holder.userId).catch(() => null)) : null;
      if (m) displayName = m.displayName;
    } catch (_) {}

    const isBusy = busyDefenderIds.has(holder.userId);
    const isProtected = holder.userData?.throneProtectedUntil && holder.userData.throneProtectedUntil > now;
    const streak = holder.userData?.duelDefenseStreak || 0;

    let statusDesc = 'Tersedia untuk ditantang';
    if (isProtected) {
      const remMins = Math.ceil((holder.userData.throneProtectedUntil - now) / 60000);
      statusDesc = `Kebal tantangan (${remMins} mnt lagi)`;
    } else if (isBusy) {
      statusDesc = 'Sedang duel (Masuk antrean)';
    } else if (streak > 0) {
      statusDesc = `Pertahanan: ${streak}x`;
    }

    options.push({
      label: displayName.slice(0, 100),
      description: statusDesc.slice(0, 100),
      value: holder.userId
    });
  }

  if (options.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`throne_pick_defender:${itemTier}:${challengerId}`)
      .setPlaceholder('Pilih pemegang tahta yang ingin kamu tantang...')
      .addOptions(options.slice(0, 25));

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);
    components.push(selectRow);
  }

  return components;
}

/**
 * Sistem Tahta Terbatas & Kudeta (Throne Usurpation) — Role Permanen & Pilihan Tantangan
 */
async function applySmartGachaRole(guild, member, itemTier, userData, gachaData, channel = null, client = null) {
  const config = THRONE_CONFIG[itemTier];
  if (!config) return ''; // Hanya Mythic dan Legendary yang mendapatkan Role

  const guildId = guild.id;
  const settingsData = storage.read('settings');
  const configuredRoleId = settingsData[guildId]?.gachaRoles?.[itemTier];
  if (!configuredRoleId) return '';

  const now = Date.now();

  // 1. Cek semua pemegang tahta aktif saat ini di server untuk tier ini (Permanen)
  const guildUsers = gachaData[guildId] || {};
  const activeHolders = [];

  for (const [uId, uData] of Object.entries(guildUsers)) {
    if (uData.activeRole && uData.activeRole.tier === itemTier) {
      activeHolders.push({
        userId: uId,
        userData: uData,
        obtainedAt: uData.activeRole.obtainedAt || now
      });
    }
  }

  // Case A: Member ini SUDAH memegang tahta tier ini -> PERTAHANKAN
  if (userData.activeRole && userData.activeRole.tier === itemTier) {
    try {
      if (!member.roles.cache.has(configuredRoleId)) {
        await member.roles.add(configuredRoleId);
      }
    } catch (_) {}
    return {
      text: `\n• **Tahta ${itemTier} Dipertahankan**\nKamu sudah menduduki tahta <@&${configuredRoleId}> (Permanen).`,
      challengeRows: [],
      toString() { return this.text; }
    };
  }

  // Case B: Member sedang punya role tier LEBIH TINGGI (misal punya Mythic, dapat Legendary)
  const currentRank = userData.activeRole ? (TIER_RANK[userData.activeRole.tier] || 0) : 0;
  if (currentRank > config.tierRank) {
    return {
      text: `\n• *Mempertahankan tahta kasta tertinggi <@&${userData.activeRole.roleId}> (Permanen).*`,
      challengeRows: [],
      toString() { return this.text; }
    };
  }

  // Lepas role lama jika sebelumnya punya role tier lebih rendah (misal sebelumnya punya Legendary, sekarang dapat Mythic)
  if (userData.activeRole && userData.activeRole.roleId && member.roles.cache.has(userData.activeRole.roleId)) {
    await member.roles.remove(userData.activeRole.roleId).catch(() => {});
  }

  // Case C: Kursi tahta masih TERSEDIA (< Quota)
  if (activeHolders.length < config.quota) {
    try {
      await member.roles.add(configuredRoleId);
      userData.activeRole = {
        tier: itemTier,
        roleId: configuredRoleId,
        obtainedAt: now
      };
      const seatsUsed = activeHolders.length + 1;
      return {
        text: `\n• **Tahta ${itemTier} Diperoleh (${seatsUsed}/${config.quota} Kursi Terisi)**\nRole <@&${configuredRoleId}> aktif secara **Permanen**.`,
        challengeRows: [],
        toString() { return this.text; }
      };
    } catch (err) {
      console.error('[Gacha Throne Assign Error]:', err.message);
      return '';
    }
  }

  // Case D: KURSI TAHTA PENUH! (>= Quota) -> Tampilkan 2 Opsi Tantangan (Acak & Dipilih)
  const { allData: throneAll, guildData: throneGuild } = getGuildThroneData(guildId);

  const busyDefenderIds = new Set(
    Object.values(throneGuild.activeDuels || {})
      .filter(d => d.itemTier === itemTier && d.status === 'WAITING_TACTICS')
      .map(d => d.defenderId)
  );

  const candidateHolders = activeHolders.filter(h => h.userId !== member.id);
  const challengeRows = await buildDefenderChallengeComponents(guild, itemTier, member.id, candidateHolders, busyDefenderIds);

  const text = (
    `\n• **Kursi Tahta ${itemTier} Penuh (${activeHolders.length}/${config.quota} Terisi)**\n` +
    `Sebagai pemilik relik ${itemTier}, kamu berhak menantang pemegang tahta untuk merebut role <@&${configuredRoleId}>!\n` +
    `Pilih lawanmu: gunakan tombol **Acak Lawan** atau **Pilih dari Menu** di bawah.`
  );

  return {
    text,
    challengeRows,
    toString() { return this.text; }
  };
}

/**
 * Worker: Pengecekan otomatis role gacha (Role tahta kini Permanen)
 */
async function checkAndExpireGachaRoles(client) {
  // Role tahta Mythic & Legendary berstatus permanen (hanya berpindah melalui tantangan duel)
  return;
}

/**
 * ==========================================
 *  ⚔️ CLASH OF THRONES 2.0 — DUEL ENGINE (12 JAM ASYNC & QUEUE)
 * ==========================================
 */

function generateDuelId() {
  return `duel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

const MOVE_DISPLAY = {
  attack: { name: 'Serang' },
  defend: { name: 'Bertahan' },
  special: { name: 'Jurus' }
};

/**
 * RPS-style round resolution
 * attack > special, defend > attack, special > defend
 */
function resolveRound(choice1, choice2) {
  if (choice1 === choice2) return 'draw';
  const beats = { attack: 'special', defend: 'attack', special: 'defend' };
  return beats[choice1] === choice2 ? 'player1' : 'player2';
}

function buildThroneDuelEmbed(duel, statusText = '') {
  const config = THRONE_CONFIG[duel.itemTier];
  const tierColor = duel.itemTier === 'MYTHIC' ? 0xFF007F : 0xFEE75C;

  const cReady = duel.tactics?.challenger ? 'Siap' : 'Menunggu';
  const dReady = duel.tactics?.defender ? 'Siap' : 'Menunggu';
  const expUnix = Math.floor(duel.expiresAt / 1000);

  const embed = new EmbedBuilder()
    .setColor(tierColor)
    .setAuthor({ name: `Clash of Thrones — Perebutan Tahta ${duel.itemTier}` })
    .setTitle('Tantangan Perebutan Kursi')
    .setDescription(
      `> **<@${duel.challengerId}>** menantang **<@${duel.defenderId}>**\n\n` +
      `Kursi **${config.name}** telah terisi penuh (${config.quota}/${config.quota}).\n` +
      `<@${duel.challengerId}> harus mengungguli <@${duel.defenderId}> dalam duel strategi **Best of 3** untuk merebut tahta.\n\n` +
      `• **Batas Waktu:** 12 Jam (berakhir <t:${expUnix}:R>)\n\n` +
      `**Status Kesiapan:**\n` +
      `• Penantang (<@${duel.challengerId}>): **${cReady}**\n` +
      `• Pemegang Tahta (<@${duel.defenderId}>): **${dReady}**\n\n` +
      `**Aturan Taktik:**\n` +
      `• **Serang** mengalahkan **Jurus**\n` +
      `• **Bertahan** mengalahkan **Serang**\n` +
      `• **Jurus** mengalahkan **Bertahan**\n\n` +
      `*Silakan pasang 3 taktik rahasiamu melalui tombol di bawah.*\n` +
      `*(Jika salah satu pihak tidak merespon dalam 12 jam, pemain aktif menang default)*` +
      (statusText ? `\n\n${statusText}` : '')
    )
    .setFooter({ text: `Duel ID: ${duel.id} • Pilihan bersifat rahasia` })
    .setTimestamp();

  return embed;
}

function buildThroneDuelActionRow(duelId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`throne_duel:set:${duelId}`)
      .setLabel('Pasang Taktik')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`throne_duel:status:${duelId}`)
      .setLabel('Status Duel')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
}

async function initiateThroneDuel({ guildId, challengerId, targetDefender, itemTier, configuredRoleId, channel, client }) {
  const { allData: throneAll, guildData: throneGuild } = getGuildThroneData(guildId);
  const now = Date.now();
  const duelId = generateDuelId();
  const expiresAt = now + 12 * 60 * 60 * 1000; // 12 jam

  const duelData = {
    id: duelId,
    guildId,
    challengerId,
    defenderId: targetDefender.userId,
    itemTier,
    configuredRoleId,
    tactics: {
      challenger: null,
      defender: null
    },
    status: 'WAITING_TACTICS',
    channelId: channel.id,
    messageId: null,
    createdAt: now,
    expiresAt
  };

  throneGuild.activeDuels[duelId] = duelData;
  saveThroneStorage(throneAll);

  const duelEmbed = buildThroneDuelEmbed(duelData);
  const duelRow = buildThroneDuelActionRow(duelId);
  const duelMsg = await channel.send({
    content: `<@${challengerId}> menantang <@${targetDefender.userId}> untuk memperebutkan **Tahta ${itemTier}**!`,
    embeds: [duelEmbed],
    components: [duelRow]
  });

  duelData.messageId = duelMsg.id;
  saveThroneStorage(throneAll);

  // Kirim notifikasi DM otomatis ke pemegang tahta (Duel Alert)
  if (client) {
    try {
      const defenderUser = await client.users.fetch(targetDefender.userId).catch(() => null);
      if (defenderUser) {
        const guild = client.guilds.cache.get(guildId);
        const expUnix = Math.floor(expiresAt / 1000);
        const dmEmbed = new EmbedBuilder()
          .setColor(itemTier === 'MYTHIC' ? 0xFF007F : 0xFEE75C)
          .setTitle('Peringatan Clash of Thrones')
          .setDescription(
            `Tahta **${itemTier}** milikmu sedang ditantang oleh **<@${challengerId}>** di server **${guild ? guild.name : 'Discord'}**!\n\n` +
            `• **Batas Waktu:** 12 Jam (hingga <t:${expUnix}:R>)\n` +
            `• **Arena Duel:** <#${channel.id}>\n\n` +
            `Kunjungi arena dan tekan tombol **[Pasang Taktik]** sebelum waktu berakhir agar tidak kalah default.`
          )
          .setFooter({ text: 'Clash of Thrones 2.0 • Duel Alert' })
          .setTimestamp();
        await defenderUser.send({ embeds: [dmEmbed] }).catch(() => {});
      }
    } catch (_) {}
  }

  return duelData;
}

async function executeInstantClash(duelId, client) {
  const { allData: throneAll, guildData: throneGuild, duel } = getGuildThroneDataByDuelId(duelId);
  if (!duel) return;

  duel.status = 'FINISHED';

  const cTactics = duel.tactics.challenger;
  const dTactics = duel.tactics.defender;

  // Best of 3 simulation
  const rounds = [];
  let cScore = 0;
  let dScore = 0;

  for (let i = 0; i < 3; i++) {
    const cMove = cTactics[i];
    const dMove = dTactics[i];
    const res = resolveRound(cMove, dMove);
    const winner = res === 'player1' ? 'challenger' : res === 'player2' ? 'defender' : 'draw';
    if (winner === 'challenger') cScore++;
    else if (winner === 'defender') dScore++;
    rounds.push({
      round: i + 1,
      cMove,
      dMove,
      winner
    });
  }

  // Penantang harus memiliki kemenangan murni lebih banyak untuk merebut tahta.
  // Jika seri, Defender mempertahankan tahtanya (Defender incumbent advantage).
  const challengerWins = cScore > dScore;

  const gachaData = storage.read('gacha_data');
  const guild = client.guilds.cache.get(duel.guildId);
  const challengerData = getOrInitUserData(gachaData, duel.guildId, duel.challengerId);
  const defenderData = getOrInitUserData(gachaData, duel.guildId, duel.defenderId);

  const config = THRONE_CONFIG[duel.itemTier];
  const now = Date.now();

  let resultTitle, resultDesc;

  if (challengerWins) {
    if (guild) {
      try {
        const defenderMember = await guild.members.fetch(duel.defenderId).catch(() => null);
        if (defenderMember && defenderMember.roles.cache.has(duel.configuredRoleId)) {
          await defenderMember.roles.remove(duel.configuredRoleId).catch(() => {});
        }
      } catch (_) {}
    }
    defenderData.activeRole = null;
    defenderData.stardust = (defenderData.stardust || 0) + 250;
    defenderData.duelDefenseStreak = 0;

    if (guild) {
      try {
        const challengerMember = await guild.members.fetch(duel.challengerId).catch(() => null);
        if (challengerMember) {
          if (challengerData.activeRole && challengerData.activeRole.roleId && challengerMember.roles.cache.has(challengerData.activeRole.roleId)) {
            await challengerMember.roles.remove(challengerData.activeRole.roleId).catch(() => {});
          }
          await challengerMember.roles.add(duel.configuredRoleId).catch(() => {});
        }
      } catch (_) {}
    }
    challengerData.activeRole = {
      tier: duel.itemTier,
      roleId: duel.configuredRoleId,
      obtainedAt: now
    };
    challengerData.throneProtectedUntil = now + 60 * 60 * 1000; // 1 Jam kebal tantangan
    challengerData.challengeCooldownUntil = 0;

    resultTitle = `Tahta ${duel.itemTier} Berpindah Tangan`;
    resultDesc = (
      `<@${duel.challengerId}> berhasil mengungguli <@${duel.defenderId}> dalam duel strategi.\n\n` +
      `• Pemegang Tahta Baru: **<@${duel.challengerId}>** (${config.name} — Permanen)\n` +
      `• Kompensasi: **<@${duel.defenderId}>** (+250 Stardust)`
    );
  } else {
    // DEFENDER MENANG (atau SERI)
    defenderData.duelDefenseStreak = (defenderData.duelDefenseStreak || 0) + 1;
    defenderData.stardust = (defenderData.stardust || 0) + 50;
    defenderData.throneProtectedUntil = now + 60 * 60 * 1000; // 1 Jam kebal tantangan
    challengerData.challengeCooldownUntil = now + 30 * 60 * 1000; // 30 Menit jeda tantangan

    let streakText = '';
    if (defenderData.duelDefenseStreak >= 3 && !defenderData.badges.includes('✦ Unshakeable Sovereign')) {
      defenderData.badges.push('✦ Unshakeable Sovereign');
      streakText = `\n• Lencana Terbuka: \`Unshakeable Sovereign\` (${defenderData.duelDefenseStreak}x Pertahanan Berturut-turut)`;
    } else if (defenderData.duelDefenseStreak >= 2) {
      streakText = `\n• Pertahanan Beruntun: ${defenderData.duelDefenseStreak}x`;
    }

    resultTitle = `Tahta ${duel.itemTier} Berhasil Dipertahankan`;
    resultDesc = (
      `<@${duel.defenderId}> berhasil mempertahankan posisinya dari tantangan <@${duel.challengerId}>.\n\n` +
      `• Status: **<@${duel.defenderId}>** tetap menduduki tahta secara Permanen (+50 Stardust)` +
      streakText +
      `\n• Penantang: Relik <@${duel.challengerId}> tersimpan di inventaris.`
    );
  }

  // Riwayat Duel
  const duelRecord = { date: now, tier: duel.itemTier };
  challengerData.duelHistory = challengerData.duelHistory || [];
  challengerData.duelHistory.unshift({
    ...duelRecord,
    opponent: duel.defenderId,
    result: challengerWins ? 'win' : 'lose',
    role: 'challenger'
  });
  if (challengerData.duelHistory.length > 10) challengerData.duelHistory.pop();

  defenderData.duelHistory = defenderData.duelHistory || [];
  defenderData.duelHistory.unshift({
    ...duelRecord,
    opponent: duel.challengerId,
    result: challengerWins ? 'lose' : 'win',
    role: 'defender'
  });
  if (defenderData.duelHistory.length > 10) defenderData.duelHistory.pop();

  storage.write('gacha_data', gachaData);

  // Update embed channel
  try {
    const channel = await client.channels.fetch(duel.channelId).catch(() => null);
    if (channel) {
      const message = await channel.messages.fetch(duel.messageId).catch(() => null);
      if (message) {
        const roundsHistory = rounds.map(r => {
          const c1 = MOVE_DISPLAY[r.cMove] || { name: r.cMove };
          const c2 = MOVE_DISPLAY[r.dMove] || { name: r.dMove };
          const winText = r.winner === 'challenger' ? 'Penantang Unggul' : r.winner === 'defender' ? 'Defender Unggul' : 'Seri';
          return `• **Ronde ${r.round}:** ${c1.name} vs ${c2.name} — *${winText}*`;
        }).join('\n');

        const tierColor = challengerWins ? 0xFF007F : 0x57F287;
        const finalEmbed = new EmbedBuilder()
          .setColor(tierColor)
          .setAuthor({ name: 'Clash of Thrones — Hasil Duel' })
          .setTitle(resultTitle)
          .setDescription(
            `> **<@${duel.challengerId}>** vs **<@${duel.defenderId}>**\n\n` +
            `• **Skor Akhir:** Penantang **${cScore}** — **${dScore}** Pemegang Tahta\n\n` +
            `**Rekapitulasi Ronde:**\n${roundsHistory}\n\n` +
            resultDesc
          )
          .setFooter({ text: `Clash of Thrones • Duel ID: ${duel.id}` })
          .setTimestamp();

        const disabledRow = buildThroneDuelActionRow(duelId, true);
        await message.edit({ embeds: [finalEmbed], components: [disabledRow] }).catch(() => {});

        // Kirim notifikasi mention hasil duel
        const winnerNotice = challengerWins
          ? `<@${duel.challengerId}> berhasil merebut tahta dari <@${duel.defenderId}>.`
          : `<@${duel.defenderId}> berhasil mempertahankan tahta dari <@${duel.challengerId}>.`;
        await channel.send({
          content: `<@${duel.challengerId}> <@${duel.defenderId}> — Pertarungan tahta selesai. ${winnerNotice}`
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('[Duel Finalize Embed Error]:', e.message);
  }

  // Hapus duel aktif
  if (throneGuild && throneGuild.activeDuels) {
    delete throneGuild.activeDuels[duelId];
    saveThroneStorage(throneAll);
  }

  // Auto-pop antrean jika ada
  await processChallengerQueue(duel.guildId, duel.itemTier, client);
}

async function handleDuelExpiry(duel, client) {
  const { allData: throneAll, guildData: throneGuild } = getGuildThroneDataByDuelId(duel.id);
  if (!duel || duel.status !== 'WAITING_TACTICS') return;

  const cHasTactics = !!(duel.tactics && duel.tactics.challenger);
  const dHasTactics = !!(duel.tactics && duel.tactics.defender);

  // Jika kedua pemain sudah mengunci sebelum expiry -> langsung clash
  if (cHasTactics && dHasTactics) {
    return executeInstantClash(duel.id, client);
  }

  duel.status = 'FINISHED';

  const gachaData = storage.read('gacha_data');
  const guild = client.guilds.cache.get(duel.guildId);
  const challengerData = getOrInitUserData(gachaData, duel.guildId, duel.challengerId);
  const defenderData = getOrInitUserData(gachaData, duel.guildId, duel.defenderId);

  const config = THRONE_CONFIG[duel.itemTier];
  const tierDurationMs = config.durationHours * 60 * 60 * 1000;
  const now = Date.now();

  let resultTitle = '';
  let resultDesc = '';
  let tierColor = 0xFEE75C;

  if (cHasTactics && !dHasTactics) {
    // Defender AFK > 12 Jam -> Penantang Menang Default!
    if (guild) {
      try {
        const defenderMember = await guild.members.fetch(duel.defenderId).catch(() => null);
        if (defenderMember && defenderMember.roles.cache.has(duel.configuredRoleId)) {
          await defenderMember.roles.remove(duel.configuredRoleId).catch(() => {});
        }
      } catch (_) {}
    }
    defenderData.activeRole = null;
    defenderData.stardust = (defenderData.stardust || 0) + 250;
    defenderData.duelDefenseStreak = 0;

    if (guild) {
      try {
        const challengerMember = await guild.members.fetch(duel.challengerId).catch(() => null);
        if (challengerMember) {
          if (challengerData.activeRole && challengerData.activeRole.roleId && challengerMember.roles.cache.has(challengerData.activeRole.roleId)) {
            await challengerMember.roles.remove(challengerData.activeRole.roleId).catch(() => {});
          }
          await challengerMember.roles.add(duel.configuredRoleId).catch(() => {});
        }
      } catch (_) {}
    }
    challengerData.activeRole = {
      tier: duel.itemTier,
      roleId: duel.configuredRoleId,
      obtainedAt: now
    };
    challengerData.throneProtectedUntil = now + 60 * 60 * 1000; // 1 Jam kebal tantangan
    challengerData.challengeCooldownUntil = 0;

    tierColor = 0xFF007F;
    resultTitle = `Tahta ${duel.itemTier} Direbut (Defender Tidak Merespon)`;
    resultDesc = (
      `<@${duel.defenderId}> tidak memasang taktik dalam batas waktu 12 Jam.\n\n` +
      `• Pemegang Tahta Baru: **<@${duel.challengerId}>** (${config.name} — Permanen)\n` +
      `• Kompensasi: **<@${duel.defenderId}>** (+250 Stardust)`
    );
  } else if (!cHasTactics && dHasTactics) {
    // Challenger AFK > 12 Jam -> Defender Menang Default!
    defenderData.duelDefenseStreak = (defenderData.duelDefenseStreak || 0) + 1;
    defenderData.stardust = (defenderData.stardust || 0) + 50;
    defenderData.throneProtectedUntil = now + 60 * 60 * 1000; // 1 Jam kebal tantangan
    challengerData.challengeCooldownUntil = now + 30 * 60 * 1000; // 30 Menit jeda tantangan

    tierColor = 0x57F287;
    resultTitle = `Tahta ${duel.itemTier} Dipertahankan (Penantang Tidak Merespon)`;
    resultDesc = (
      `<@${duel.challengerId}> tidak memasang taktik dalam batas waktu 12 Jam.\n\n` +
      `• Status: **<@${duel.defenderId}>** tetap menduduki tahta secara Permanen (+50 Stardust)\n` +
      `• Penantang: Relik <@${duel.challengerId}> tersimpan di inventaris.`
    );
  } else {
    // Both AFK > 12 Jam -> Duel hangus, Defender tetap aman
    resultTitle = `Duel Tahta ${duel.itemTier} Dibatalkan (Waktu Habis)`;
    resultDesc = (
      `Kedua pihak tidak memasang taktik dalam batas waktu 12 Jam.\n` +
      `Duel dibatalkan. <@${duel.defenderId}> tetap memegang tahtanya.\n` +
      `Relik <@${duel.challengerId}> tersimpan di inventaris.`
    );
  }

  storage.write('gacha_data', gachaData);

  // Update embed channel
  try {
    const channel = await client.channels.fetch(duel.channelId).catch(() => null);
    if (channel) {
      const message = await channel.messages.fetch(duel.messageId).catch(() => null);
      if (message) {
        const timeoutEmbed = new EmbedBuilder()
          .setColor(tierColor)
          .setAuthor({ name: 'Clash of Thrones — Batas Waktu Habis' })
          .setTitle(resultTitle)
          .setDescription(
            `> **<@${duel.challengerId}>** vs **<@${duel.defenderId}>**\n\n` +
            resultDesc
          )
          .setFooter({ text: 'Timeout Resolution' })
          .setTimestamp();

        const disabledRow = buildThroneDuelActionRow(duel.id, true);
        await message.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});

        // Kirim notifikasi mention timeout 12 jam
        await channel.send({
          content: `<@${duel.challengerId}> <@${duel.defenderId}> — Batas waktu duel 12 jam telah habis. ${resultTitle}`
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('[Duel Timeout Embed Error]:', e.message);
  }

  if (throneGuild && throneGuild.activeDuels) {
    delete throneGuild.activeDuels[duel.id];
    saveThroneStorage(throneAll);
  }

  // Auto-pop antrean jika ada
  await processChallengerQueue(duel.guildId, duel.itemTier, client);
}

async function checkAndExpireThroneDuels(client) {
  const throneData = storage.read('throne_duels') || {};
  const now = Date.now();

  for (const [guildId, guildDuels] of Object.entries(throneData)) {
    const activeDuelsObj = guildDuels.activeDuels || {};
    for (const [duelId, duel] of Object.entries(activeDuelsObj)) {
      if (duel.status === 'WAITING_TACTICS' && duel.expiresAt <= now) {
        try {
          await handleDuelExpiry(duel, client);
        } catch (expErr) {
          console.error(`[Duel Expiry Error ${duelId}]:`, expErr.message);
        }
      }
    }
  }
}

async function processChallengerQueue(guildId, itemTier, client) {
  const { allData: throneAll, guildData: throneGuild } = getGuildThroneData(guildId);
  if (!throneGuild.queues[itemTier] || throneGuild.queues[itemTier].length === 0) return;

  const gachaData = storage.read('gacha_data');
  const guildUsers = gachaData[guildId] || {};
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const now = Date.now();
  const activeHolders = [];
  for (const [uId, uData] of Object.entries(guildUsers)) {
    if (uData.activeRole && uData.activeRole.tier === itemTier) {
      activeHolders.push({ userId: uId, userData: uData, obtainedAt: uData.activeRole.obtainedAt || now });
    }
  }

  const config = THRONE_CONFIG[itemTier];

  // Jika kursi belum penuh (< quota), penantang pertama langsung klaim kursi tahta
  if (activeHolders.length < config.quota) {
    const nextQ = throneGuild.queues[itemTier].shift();
    saveThroneStorage(throneAll);

    const challengerMember = await guild.members.fetch(nextQ.challengerId).catch(() => null);
    if (challengerMember) {
      const uData = getOrInitUserData(gachaData, guildId, nextQ.challengerId);
      await challengerMember.roles.add(nextQ.configuredRoleId).catch(() => {});
      uData.activeRole = {
        tier: itemTier,
        roleId: nextQ.configuredRoleId,
        obtainedAt: now
      };
      storage.write('gacha_data', gachaData);

      if (nextQ.channelId) {
        const ch = await client.channels.fetch(nextQ.channelId).catch(() => null);
        if (ch) {
          ch.send(`Kursi tahta kosong tersedia. <@${nextQ.challengerId}> dari antrean resmi menduduki kursi tahta **${config.name}** (Permanen).`);
        }
      }
    }
    return processChallengerQueue(guildId, itemTier, client);
  }

  // Cari defender yang sedang tidak dalam duel aktif
  const busyDefenderIds = new Set(
    Object.values(throneGuild.activeDuels || {})
      .filter(d => d.itemTier === itemTier && d.status === 'WAITING_TACTICS')
      .map(d => d.defenderId)
  );

  // Jika antrean memiliki preferensi targetDefenderId tertentu
  const nextQPeek = throneGuild.queues[itemTier][0];
  let targetDefender = null;
  if (nextQPeek && nextQPeek.targetDefenderId) {
    targetDefender = activeHolders.find(h => h.userId === nextQPeek.targetDefenderId && !busyDefenderIds.has(h.userId));
  }
  if (!targetDefender) {
    targetDefender = activeHolders.find(h => !busyDefenderIds.has(h.userId));
  }

  if (!targetDefender) {
    // Semua kursi masih sibuk duel
    return;
  }

  // Ambil penantang pertama dari antrean
  const nextChallenger = throneGuild.queues[itemTier].shift();
  saveThroneStorage(throneAll);

  const cMember = await guild.members.fetch(nextChallenger.challengerId).catch(() => null);
  if (!cMember) {
    // User sudah tidak di server, proses antrean berikutnya
    return processChallengerQueue(guildId, itemTier, client);
  }

  let ch = null;
  const settings = storage.read('settings');
  const duelChId = settings[guildId]?.gachaChannels?.duel;
  if (duelChId) {
    ch = await client.channels.fetch(duelChId).catch(() => null);
  }
  if (!ch && nextChallenger.channelId) {
    ch = await client.channels.fetch(nextChallenger.channelId).catch(() => null);
  }
  if (!ch) {
    const fallbackId = settings[guildId]?.gachaChannels?.broadcast || settings[guildId]?.gachaChannel;
    if (fallbackId) ch = await client.channels.fetch(fallbackId).catch(() => null);
  }

  if (ch) {
    await initiateThroneDuel({
      guildId,
      challengerId: nextChallenger.challengerId,
      targetDefender,
      itemTier,
      configuredRoleId: nextChallenger.configuredRoleId,
      channel: ch,
      client
    });
  }
}

async function processDuelButton(interaction, client) {
  const customId = interaction.customId;

  // 0A. Tombol Acak Lawan (Random Match)
  if (customId.startsWith('throne_challenge_random:')) {
    const parts = customId.split(':');
    const itemTier = parts[1];
    const challengerId = parts[2];

    if (interaction.user.id !== challengerId) {
      return interaction.reply({
        content: 'Hanya penantang yang berhak menentukan lawan duel.',
        flags: MessageFlags.Ephemeral
      });
    }

    const guildId = interaction.guildId;
    const gachaData = storage.read('gacha_data');
    const challengerData = getOrInitUserData(gachaData, guildId, challengerId);
    const now = Date.now();

    if (challengerData.challengeCooldownUntil && challengerData.challengeCooldownUntil > now) {
      const remMins = Math.ceil((challengerData.challengeCooldownUntil - now) / 60000);
      return interaction.reply({
        content: `Kamu sedang dalam masa jeda tantangan. Silakan tunggu **${remMins} menit** lagi sebelum menantang tahta kembali.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const guildUsers = gachaData[guildId] || {};
    const activeHolders = [];

    for (const [uId, uData] of Object.entries(guildUsers)) {
      if (uData.activeRole && uData.activeRole.tier === itemTier && uId !== challengerId) {
        activeHolders.push({ userId: uId, userData: uData });
      }
    }

    if (activeHolders.length === 0) {
      return interaction.update({
        content: `Tidak ada pemegang tahta **${itemTier}** yang dapat ditantang saat ini.`,
        components: []
      });
    }

    const { allData: throneAll, guildData: throneGuild } = getGuildThroneData(guildId);
    const busyDefenderIds = new Set(
      Object.values(throneGuild.activeDuels || {})
        .filter(d => d.itemTier === itemTier && d.status === 'WAITING_TACTICS')
        .map(d => d.defenderId)
    );

    const availableHolders = activeHolders.filter(h => !busyDefenderIds.has(h.userId) && !(h.userData?.throneProtectedUntil > now));
    if (availableHolders.length === 0) {
      const existingQueueIdx = throneGuild.queues[itemTier].findIndex(q => q.challengerId === challengerId);
      if (existingQueueIdx === -1) {
        const settingsData = storage.read('settings');
        throneGuild.queues[itemTier].push({
          challengerId,
          itemTier,
          configuredRoleId: settingsData[guildId]?.gachaRoles?.[itemTier],
          channelId: interaction.channelId,
          queuedAt: Date.now()
        });
        saveThroneStorage(throneAll);
      }
      return interaction.update({
        content: `Semua pemegang tahta **${itemTier}** sedang bertarung dalam duel aktif atau memiliki perlindungan tahta. Kamu telah ditempatkan pada antrean penantang (Posisi: #${throneGuild.queues[itemTier].length}).`,
        components: []
      });
    }

    const targetDefender = availableHolders[Math.floor(Math.random() * availableHolders.length)];
    const settingsData = storage.read('settings');
    const configuredRoleId = settingsData[guildId]?.gachaRoles?.[itemTier];
    let duelTargetChannel = interaction.channel;
    const arenaChannelId = settingsData[guildId]?.gachaChannels?.duel;
    if (arenaChannelId && client) {
      const arenaCh = await client.channels.fetch(arenaChannelId).catch(() => null);
      if (arenaCh) duelTargetChannel = arenaCh;
    }

    await initiateThroneDuel({
      guildId,
      challengerId,
      targetDefender,
      itemTier,
      configuredRoleId,
      channel: duelTargetChannel,
      client
    });

    return interaction.update({
      content: `Lawan terpilih secara acak: <@${targetDefender.userId}>!\nDuel perebutan **Tahta ${itemTier}** telah dimulai di <#${duelTargetChannel.id}>. Silakan menuju arena untuk memasang taktikmu.`,
      components: []
    });
  }

  // 0B. Select Menu Pemilihan Lawan Manual (Manual Pick)
  if (customId.startsWith('throne_pick_defender:')) {
    const parts = customId.split(':');
    const itemTier = parts[1];
    const challengerId = parts[2];

    if (interaction.user.id !== challengerId) {
      return interaction.reply({
        content: 'Hanya penantang yang berhak menentukan lawan duel.',
        flags: MessageFlags.Ephemeral
      });
    }

    const selectedUserId = interaction.values ? interaction.values[0] : null;
    if (!selectedUserId) return;

    const guildId = interaction.guildId;
    const gachaData = storage.read('gacha_data');
    const challengerData = getOrInitUserData(gachaData, guildId, challengerId);
    const now = Date.now();

    if (challengerData.challengeCooldownUntil && challengerData.challengeCooldownUntil > now) {
      const remMins = Math.ceil((challengerData.challengeCooldownUntil - now) / 60000);
      return interaction.reply({
        content: `Kamu sedang dalam masa jeda tantangan. Silakan tunggu **${remMins} menit** lagi sebelum menantang tahta kembali.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const guildUsers = gachaData[guildId] || {};
    const targetUserData = guildUsers[selectedUserId];

    if (!targetUserData || !targetUserData.activeRole || targetUserData.activeRole.tier !== itemTier) {
      return interaction.update({
        content: `Member tersebut sudah tidak lagi menduduki **Tahta ${itemTier}**.`,
        components: []
      });
    }

    if (targetUserData.throneProtectedUntil && targetUserData.throneProtectedUntil > now) {
      const remMins = Math.ceil((targetUserData.throneProtectedUntil - now) / 60000);
      return interaction.reply({
        content: `<@${selectedUserId}> baru saja menyelesaikan pertarungan tahta dan memiliki kekebalan perlindungan tahta selama **${remMins} menit** lagi. Silakan pilih lawan lain.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const targetDefender = { userId: selectedUserId, userData: targetUserData };
    const { allData: throneAll, guildData: throneGuild } = getGuildThroneData(guildId);
    const busyDefenderIds = new Set(
      Object.values(throneGuild.activeDuels || {})
        .filter(d => d.itemTier === itemTier && d.status === 'WAITING_TACTICS')
        .map(d => d.defenderId)
    );

    const settingsData = storage.read('settings');
    const configuredRoleId = settingsData[guildId]?.gachaRoles?.[itemTier];

    if (busyDefenderIds.has(selectedUserId)) {
      throneGuild.queues[itemTier].push({
        challengerId,
        targetDefenderId: selectedUserId,
        itemTier,
        configuredRoleId,
        channelId: interaction.channelId,
        queuedAt: Date.now()
      });
      saveThroneStorage(throneAll);

      return interaction.update({
        content: `<@${selectedUserId}> saat ini sedang dalam duel aktif. Kamu telah dimasukkan ke antrean khusus untuk menantangnya setelah duelnya selesai.`,
        components: []
      });
    }

    let duelTargetChannel = interaction.channel;
    const arenaChannelId = settingsData[guildId]?.gachaChannels?.duel;
    if (arenaChannelId && client) {
      const arenaCh = await client.channels.fetch(arenaChannelId).catch(() => null);
      if (arenaCh) duelTargetChannel = arenaCh;
    }

    await initiateThroneDuel({
      guildId,
      challengerId,
      targetDefender,
      itemTier,
      configuredRoleId,
      channel: duelTargetChannel,
      client
    });

    return interaction.update({
      content: `Kamu telah memilih <@${selectedUserId}> sebagai lawanmu!\nDuel perebutan **Tahta ${itemTier}** telah dimulai di <#${duelTargetChannel.id}>. Silakan menuju arena untuk memasang taktikmu.`,
      components: []
    });
  }

  // 1. Cek Status Duel
  if (customId.startsWith('throne_duel:status:')) {
    const duelId = customId.replace('throne_duel:status:', '');
    const { duel } = getGuildThroneDataByDuelId(duelId);

    if (!duel || duel.status !== 'WAITING_TACTICS') {
      return interaction.reply({
        content: 'Duel ini sudah selesai atau tidak ditemukan.',
        flags: MessageFlags.Ephemeral
      });
    }

    const cReady = duel.tactics?.challenger ? 'Terkunci' : 'Belum Memasang';
    const dReady = duel.tactics?.defender ? 'Terkunci' : 'Belum Memasang';
    const expUnix = Math.floor(duel.expiresAt / 1000);

    return interaction.reply({
      content:
        `**Status Duel Tahta ${duel.itemTier}:**\n\n` +
        `• Penantang (<@${duel.challengerId}>): **${cReady}**\n` +
        `• Pemegang Tahta (<@${duel.defenderId}>): **${dReady}**\n\n` +
        `• **Batas Waktu:** <t:${expUnix}:F> (<t:${expUnix}:R>)\n` +
        `*(Pemenang ditentukan otomatis jika salah satu pihak tidak merespon hingga batas waktu)*`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 2. Klik "Pasang Taktik"
  if (customId.startsWith('throne_duel:set:')) {
    const duelId = customId.replace('throne_duel:set:', '');
    const { duel } = getGuildThroneDataByDuelId(duelId);

    if (!duel || duel.status !== 'WAITING_TACTICS') {
      return interaction.reply({
        content: 'Duel ini sudah selesai atau tidak ditemukan.',
        flags: MessageFlags.Ephemeral
      });
    }

    const userId = interaction.user.id;
    const isChallenger = userId === duel.challengerId;
    const isDefender = userId === duel.defenderId;

    if (!isChallenger && !isDefender) {
      return interaction.reply({
        content: `Kamu bukan peserta duel ini. Pertarungan berlangsung antara <@${duel.challengerId}> dan <@${duel.defenderId}>.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const role = isChallenger ? 'challenger' : 'defender';
    if (duel.tactics && duel.tactics[role]) {
      const [r1, r2, r3] = duel.tactics[role];
      return interaction.reply({
        content:
          `**Taktikmu sudah terkunci**\n\n` +
          `• Ronde 1: **${MOVE_DISPLAY[r1]?.name}**\n` +
          `• Ronde 2: **${MOVE_DISPLAY[r2]?.name}**\n` +
          `• Ronde 3: **${MOVE_DISPLAY[r3]?.name}**\n\n` +
          `*Menunggu lawan memasang taktik... Hasil akan keluar segera setelah kedua pihak siap.*`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Tampilkan tombol ronde 1
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`throne_pick:1:attack:${duelId}`)
        .setLabel('Serang')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`throne_pick:1:defend:${duelId}`)
        .setLabel('Bertahan')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`throne_pick:1:special:${duelId}`)
        .setLabel('Jurus')
        .setStyle(ButtonStyle.Success)
    );

    return interaction.reply({
      content:
        `**Pasang Taktik — Ronde 1 dari 3**\n\n` +
        `Pilih taktik rahasiamu:\n` +
        `• **Serang** mengalahkan Jurus\n` +
        `• **Bertahan** mengalahkan Serang\n` +
        `• **Jurus** mengalahkan Bertahan\n\n` +
        `*Pilihan ini bersifat rahasia.*`,
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  }

  // 3. Tombol Pemilihan Taktik Bertahap (throne_pick:round:move:duelId:...)
  if (customId.startsWith('throne_pick:')) {
    const parts = customId.split(':');
    const step = parts[1]; // '1', '2', or '3'
    const move = parts[2];
    const duelId = parts[3];

    const { allData: throneAll, duel } = getGuildThroneDataByDuelId(duelId);
    if (!duel || duel.status !== 'WAITING_TACTICS') {
      return interaction.update({
        content: 'Duel ini sudah selesai atau tidak ditemukan.',
        components: []
      });
    }

    const userId = interaction.user.id;
    const isChallenger = userId === duel.challengerId;
    const isDefender = userId === duel.defenderId;
    if (!isChallenger && !isDefender) {
      return interaction.reply({
        content: 'Kamu bukan peserta duel ini.',
        flags: MessageFlags.Ephemeral
      });
    }

    const role = isChallenger ? 'challenger' : 'defender';

    // Ronde 1 terpilih -> Tampilkan Ronde 2
    if (step === '1') {
      const r1move = move;
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`throne_pick:2:attack:${duelId}:${r1move}`)
          .setLabel('Serang')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`throne_pick:2:defend:${duelId}:${r1move}`)
          .setLabel('Bertahan')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`throne_pick:2:special:${duelId}:${r1move}`)
          .setLabel('Jurus')
          .setStyle(ButtonStyle.Success)
      );

      return interaction.update({
        content:
          `**Pasang Taktik — Ronde 2 dari 3**\n\n` +
          `• Ronde 1: **${MOVE_DISPLAY[r1move]?.name}**\n\n` +
          `Pilih taktik rahasiamu untuk **Ronde 2**:`,
        components: [row2]
      });
    }

    // Ronde 2 terpilih -> Tampilkan Ronde 3
    if (step === '2') {
      const r1move = parts[4];
      const r2move = move;
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`throne_pick:3:attack:${duelId}:${r1move}:${r2move}`)
          .setLabel('Serang')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`throne_pick:3:defend:${duelId}:${r1move}:${r2move}`)
          .setLabel('Bertahan')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`throne_pick:3:special:${duelId}:${r1move}:${r2move}`)
          .setLabel('Jurus')
          .setStyle(ButtonStyle.Success)
      );

      return interaction.update({
        content:
          `**Pasang Taktik — Ronde 3 dari 3**\n\n` +
          `• Ronde 1: **${MOVE_DISPLAY[r1move]?.name}**\n` +
          `• Ronde 2: **${MOVE_DISPLAY[r2move]?.name}**\n\n` +
          `Pilih taktik rahasiamu untuk **Ronde 3**:`,
        components: [row3]
      });
    }

    // Ronde 3 terpilih -> Kunci 3 Taktik!
    if (step === '3') {
      const r1move = parts[4];
      const r2move = parts[5];
      const r3move = move;

      if (!duel.tactics) duel.tactics = { challenger: null, defender: null };
      duel.tactics[role] = [r1move, r2move, r3move];
      saveThroneStorage(throneAll);

      await interaction.update({
        content:
          `**Taktik Berhasil Dikunci**\n\n` +
          `• Ronde 1: **${MOVE_DISPLAY[r1move]?.name}**\n` +
          `• Ronde 2: **${MOVE_DISPLAY[r2move]?.name}**\n` +
          `• Ronde 3: **${MOVE_DISPLAY[r3move]?.name}**\n\n` +
          `*Pilihanmu tersimpan rahasia. Pertarungan akan disimulasikan seketika saat lawan selesai memasang taktik.*`,
        components: []
      });

      // Update embed publik di channel
      try {
        const channel = await client.channels.fetch(duel.channelId).catch(() => null);
        if (channel) {
          const message = await channel.messages.fetch(duel.messageId).catch(() => null);
          if (message) {
            const updatedEmbed = buildThroneDuelEmbed(duel);
            const row = buildThroneDuelActionRow(duelId);
            await message.edit({ embeds: [updatedEmbed], components: [row] }).catch(() => {});
          }
        }
      } catch (embedErr) {
        console.error('[Duel Embed Update Error]:', embedErr.message);
      }

      // Jika kedua pemain sudah mengunci -> Eksekusi Pertarungan Instan!
      if (duel.tactics.challenger && duel.tactics.defender) {
        await executeInstantClash(duelId, client);
      }
      return;
    }
  }
}

/**
 * Roll Gacha Engine with Pity System
 */
function rollSingleGacha(userData) {
  const pityEpic = userData.pityEpic || 0;
  const pityLeg = userData.pityLegendary || 0;

  let targetTier = 'COMMON';
  const rand = Math.random() * 100;

  // 1. HARD PITY TRIGGER (15 Pulls for Legendary+, 5 Pulls for Epic+)
  if (pityLeg >= 14) {
    targetTier = Math.random() < 0.3 ? 'MYTHIC' : 'LEGENDARY'; // 30% Mythic, 70% Legendary
  } else if (pityEpic >= 4) {
    const subRand = Math.random() * 100;
    if (subRand < 10) targetTier = 'MYTHIC';         // 10% Mythic
    else if (subRand < 45) targetTier = 'LEGENDARY'; // 35% Legendary (total 45% chance role)
    else targetTier = 'EPIC';                        // 55% Epic
  } else {
    // Normal Probabilities (Mythic 3%, Legendary 10%, Epic 20%, Rare 32%, Common 35%)
    if (rand < 3) targetTier = 'MYTHIC';             // 3%
    else if (rand < 13) targetTier = 'LEGENDARY';    // 10%
    else if (rand < 33) targetTier = 'EPIC';         // 20%
    else if (rand < 65) targetTier = 'RARE';         // 32%
    else targetTier = 'COMMON';                      // 35%
  }

  // Update Pity Counters
  if (targetTier === 'MYTHIC' || targetTier === 'LEGENDARY') {
    userData.pityLegendary = 0;
    userData.pityEpic = 0;
  } else if (targetTier === 'EPIC') {
    userData.pityEpic = 0;
    userData.pityLegendary++;
  } else {
    userData.pityEpic++;
    userData.pityLegendary++;
  }

  const candidates = GACHA_ITEMS.filter(item => item.tier === targetTier);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  // Check if duplicate
  const isDuplicate = userData.inventory.includes(chosen.name);
  if (!isDuplicate) {
    userData.inventory.push(chosen.name);
  }
  if (chosen.badge && !userData.badges.includes(chosen.badge)) {
    userData.badges.push(chosen.badge);
  }
  if (chosen.title && !userData.titles.includes(chosen.title)) {
    userData.titles.push(chosen.title);
  }

  let stardustAwarded = 0;
  if (isDuplicate) {
    stardustAwarded = chosen.recycleStardust || 10;
    userData.stardust += stardustAwarded;
  }

  userData.pulls++;

  return {
    item: chosen,
    isDuplicate,
    stardustAwarded
  };
}

/**
 * Create ActionRow components for Gacha pull embeds
 */
function createGachaActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('gacha_btn_pull_1')
      .setLabel('Tarik 1x')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('gacha_btn_pull_10')
      .setLabel('Tarik 10x')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('gacha_btn_inv')
      .setLabel('Inventory')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('gacha_btn_rates')
      .setLabel('Info & Pity')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Create Payload for Daily Claim Interactive Panel
 */
function createDailyPanelPayload(guild) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('KLAIM HADIAH HARIAN')
    .setDescription(
      `Selamat datang di saluran **Klaim Hadiah Harian** ${guild ? guild.name : ''}!\n\n` +
      `Klaim tiket gacha dan stardust gratis kamu setiap 24 jam.\n` +
      `Pertahankan streak klaim hingga 7 hari berturut-turut untuk melipatgandakan tiket dan mendapatkan lencana eksklusif!\n\n` +
      `**Skema Hadiah Mingguan:**\n` +
      `• **Hari 1-2:** +1 Tiket • Stardust 50-75\n` +
      `• **Hari 3-5:** +2 Tiket • Stardust 100-150\n` +
      `• **Hari 6:** +3 Tiket • Stardust 200\n` +
      `• **Hari 7:** +4 Tiket • Stardust 350 + ✦ *Streak Master 7D*\n\n` +
      `Tekan tombol di bawah untuk mengambil hadiah:`
    )
    .setFooter({ text: 'Hasil klaim hanya bisa dilihat oleh diri sendiri (Private / Ephemeral)' });

  const buttons = [
    new ButtonBuilder()
      .setCustomId('gacha_btn_daily')
      .setLabel('Ambil Hadiah Harian')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('gacha_btn_inv')
      .setLabel('Cek Inventory')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('gacha_btn_rates')
      .setLabel('Info & Pity')
      .setStyle(ButtonStyle.Secondary)
  ];

  // Cross-panel link button ke channel Pull jika terpisah
  if (guild?.id) {
    const settingsData = storage.read('settings') || {};
    const pullChId = settingsData[guild.id]?.gachaChannels?.pull;
    const dailyChId = settingsData[guild.id]?.gachaChannels?.daily;
    if (pullChId && pullChId !== dailyChId) {
      const pullCh = guild.channels?.cache?.get(pullChId);
      const label = pullCh ? `Tarik Gacha (#${pullCh.name})` : 'Buka Tarik Gacha';
      buttons.push(
        new ButtonBuilder()
          .setLabel(label.slice(0, 80))
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${pullChId}`)
      );
    }
  }

  const row = new ActionRowBuilder().addComponents(buttons);
  return { embeds: [embed], components: [row] };
}

/**
 * Create Payload for Gacha Pull Interactive Panel
 */
function createPullPanelPayload(guild) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('ARENA KOTAK MISTERI GACHA')
    .setDescription(
      `Selamat datang di saluran **Tarik Gacha** ${guild ? guild.name : ''}!\n\n` +
      `Gunakan tiket gacha kamu untuk membuka kotak misteri, mengumpulkan relik legenda, dan memperebutkan tahta server!\n\n` +
      `**Peluang Kelangkaan Relik:**\n` +
      `• ✦ **MYTHIC (3%):** Tahta Tertinggi (Maksimal 3 Kursi • Permanen)\n` +
      `• ✧ **LEGENDARY (10%):** Tahta Raja (Maksimal 5 Kursi • Permanen)\n` +
      `• ◈ **EPIC (20%)** • ⬡ **RARE (32%)** • ◽ **COMMON (35%)**\n\n` +
      `**Sistem Jaminan (Pity System):**\n` +
      `• Garansi minimal 1x **EPIC+** setiap 5 tarikan.\n` +
      `• Garansi minimal 1x **LEGENDARY+** pada tarikan ke-15.\n\n` +
      `Pilih tarikan di bawah untuk mulai:`
    )
    .setFooter({ text: 'Hasil tarikan tampil privat (ephemeral) • Live Feed publik di channel result' });

  const buttons = [
    new ButtonBuilder()
      .setCustomId('gacha_btn_pull_1')
      .setLabel('Tarik 1x')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('gacha_btn_pull_10')
      .setLabel('Tarik 10x')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('gacha_btn_inv')
      .setLabel('Inventory')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('gacha_btn_rates')
      .setLabel('Info & Pity')
      .setStyle(ButtonStyle.Secondary)
  ];

  // Cross-panel link button ke channel Daily jika terpisah (max 5 buttons in an ActionRow)
  if (guild?.id) {
    const settingsData = storage.read('settings') || {};
    const dailyChId = settingsData[guild.id]?.gachaChannels?.daily;
    const pullChId = settingsData[guild.id]?.gachaChannels?.pull;
    if (dailyChId && dailyChId !== pullChId) {
      const dailyCh = guild.channels?.cache?.get(dailyChId);
      const label = dailyCh ? `Klaim Harian (#${dailyCh.name})` : 'Klaim Harian';
      buttons.push(
        new ButtonBuilder()
          .setLabel(label.slice(0, 80))
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${dailyChId}`)
      );
    }
  }

  const row = new ActionRowBuilder().addComponents(buttons);
  return { embeds: [embed], components: [row] };
}

/**
 * Deploy & Clean Panel Message in designated channel
 */
async function deployGachaPanel(guild, channel, type, client) {
  if (!channel || !channel.isTextBased() || channel.isThread()) return null;
  const payload = type === 'daily' ? createDailyPanelPayload(guild) : createPullPanelPayload(guild);

  try {
    const fetched = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (fetched) {
      const botMessages = [...fetched.values()]
        .filter(m => m.author.id === client.user.id)
        .sort((a, b) => b.createdTimestamp - a.createdTimestamp);

      if (botMessages.length > 0) {
        const latestMsg = botMessages[0];
        await latestMsg.edit(payload).catch(() => {});
        for (let i = 1; i < botMessages.length; i++) {
          await botMessages[i].delete().catch(() => {});
        }
        return latestMsg;
      }
    }
  } catch (err) {
    console.warn(`[deployGachaPanel] Error purging extra bot messages in ${channel.id}:`, err.message);
  }

  const newMsg = await channel.send(payload).catch(e => {
    console.error(`[deployGachaPanel] Failed to send panel in ${channel.id}:`, e.message);
    return null;
  });
  return newMsg;
}

/**
 * Broadcast Jackpot to configured channel (Legendary / Mythic)
 */
async function broadcastJackpot(guild, member, item, client) {
  try {
    const settingsData = storage.read('settings');
    const targetChannelId = settingsData[guild.id]?.gachaChannels?.broadcast || settingsData[guild.id]?.gachaChannel;
    if (!targetChannelId) return;

    const channel = guild.channels.cache.get(targetChannelId) ||
      await client.channels.fetch(targetChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const isMythic = item.tier === 'MYTHIC';
    const embed = new EmbedBuilder()
      .setColor(isMythic ? 0xFF007F : 0xFEE75C)
      .setAuthor({
        name: `Jackpot Server — [${item.tier}]`,
        iconURL: member.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle(`${member.displayName} Memperoleh ${item.name}`)
      .setDescription(
        `<@${member.id}> baru saja memperoleh relik **${item.tier}**!\n\n` +
        `• **Item:** **${item.name}** (${item.stars})\n` +
        `• **Deskripsi:** *${item.desc}*\n` +
        (item.badge ? `• **Badge:** \`${item.badge}\`\n` : '') +
        (item.title ? `• **Gelar:** \`"${item.title}"\`\n` : '') +
        `\nGunakan \`/gacha pull\` atau \`/gacha daily\` untuk ikut berpartisipasi.`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `${guild.name} • Koleksi Relik` })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error('[Gacha Jackpot Broadcast Error]:', err.message);
  }
}

/**
 * Post hasil tarikan ke Result Feed (channel terpisah) dengan batch window 30 detik.
 * Mengelompokkan hasil beberapa member ke dalam 1 embed agar channel tidak banjir.
 */
async function postToResultFeed(guild, member, pullSummary, client) {
  try {
    const settingsData = storage.read('settings');
    const resultChannelId = settingsData[guild.id]?.gachaChannels?.result;
    if (!resultChannelId) return; // Tidak ada channel result → skip

    const channel = (guild.channels?.cache ? guild.channels.cache.get(resultChannelId) : null) ||
      await client.channels.fetch(resultChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const guildId = guild.id;
    const now = Date.now();
    let feed = activeResultFeeds.get(guildId);

    // Entry baru untuk feed
    const newEntry = {
      userId: member.id,
      displayName: member.displayName,
      summary: pullSummary
    };

    // Cek apakah feed aktif masih valid (dalam jendela 30 detik & belum penuh)
    if (feed && (now - feed.createdAt < RESULT_FEED_WINDOW_MS) && feed.entries.length < RESULT_FEED_MAX_ENTRIES) {
      // Tambahkan ke feed yang sudah ada
      feed.entries.push(newEntry);
      const embed = buildResultFeedEmbed(feed.entries);
      try {
        const feedMsg = await channel.messages.fetch(feed.messageId).catch(() => null);
        if (feedMsg) {
          await feedMsg.edit({ embeds: [embed] });
        } else {
          // Pesan dihapus → buat baru
          const newMsg = await channel.send({ embeds: [embed] });
          feed.messageId = newMsg.id;
        }
      } catch (_) {
        const newMsg = await channel.send({ embeds: [embed] });
        feed.messageId = newMsg.id;
      }
    } else {
      // Buat feed embed baru
      const entries = [newEntry];
      const embed = buildResultFeedEmbed(entries);
      const newMsg = await channel.send({ embeds: [embed] });

      // Bersihkan timer lama jika ada
      if (feed && feed.timer) clearTimeout(feed.timer);

      const newFeed = {
        messageId: newMsg.id,
        channelId: resultChannelId,
        entries,
        createdAt: now,
        timer: null
      };

      // Timer untuk mengunci feed setelah 30 detik
      newFeed.timer = setTimeout(() => {
        activeResultFeeds.delete(guildId);
      }, RESULT_FEED_WINDOW_MS);

      activeResultFeeds.set(guildId, newFeed);
    }
  } catch (err) {
    console.error('[Gacha Result Feed Error]:', err.message);
  }
}

/**
 * Build embed untuk Result Feed (kumpulan hasil tarikan)
 */
function buildResultFeedEmbed(entries) {
  const lines = entries.map((e, i) => {
    return `◈ **${e.displayName}**\n${e.summary}`;
  });

  const totalPulls = entries.length;
  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle('Hasil Tarikan Gacha')
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: `${totalPulls} Tarikan • Live Feed` })
    .setTimestamp();
}

/**
 * Handle Subcommand /gacha challenge
 * Memungkinkan pemilik relik Mythic/Legendary menantang pemegang tahta (Acak atau Dipilih)
 */
async function executeGachaChallenge(interaction, client) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const member = interaction.member;

  const tier = interaction.options.getString('tier');
  const mode = interaction.options.getString('mode');
  const targetUser = interaction.options.getUser('target');

  const config = THRONE_CONFIG[tier];
  if (!config) {
    return interaction.reply({
      content: 'Tier tahta yang dipilih tidak valid.',
      flags: MessageFlags.Ephemeral
    });
  }

  const settingsData = storage.read('settings');
  const configuredRoleId = settingsData[guildId]?.gachaRoles?.[tier];
  if (!configuredRoleId) {
    return interaction.reply({
      content: `Role Discord untuk **Tahta ${tier}** belum dikonfigurasi oleh Admin. Gunakan \`/gacha setrole\` terlebih dahulu.`,
      flags: MessageFlags.Ephemeral
    });
  }

  const gachaData = storage.read('gacha_data');
  const userData = getOrInitUserData(gachaData, guildId, userId);
  const now = Date.now();

  if (userData.challengeCooldownUntil && userData.challengeCooldownUntil > now) {
    const remMins = Math.ceil((userData.challengeCooldownUntil - now) / 60000);
    return interaction.reply({
      content: `Kamu sedang dalam masa jeda tantangan. Silakan tunggu **${remMins} menit** lagi sebelum menantang tahta kembali.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 1. Cek kepemilikan relik tier terkait di inventaris
  const hasRelic = (userData.inventory || []).some(itemName => {
    const found = GACHA_ITEMS.find(g => g.name === itemName);
    return found && found.tier === tier;
  });

  if (!hasRelic) {
    return interaction.reply({
      content: `Kamu belum memiliki kartu relik bertier **${tier}** di inventarismu untuk menantang tahta ini.\nDapatkan relik ${tier} terlebih dahulu dari \`/gacha pull\` atau \`/gacha fuse\`.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 2. Cek apakah member sudah memegang tahta ini
  if (userData.activeRole && userData.activeRole.tier === tier) {
    return interaction.reply({
      content: `Kamu sudah memegang **Tahta ${tier}** (<@&${configuredRoleId}>)!`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 3. Cek apakah member memegang tahta kasta lebih tinggi
  const currentRank = userData.activeRole ? (TIER_RANK[userData.activeRole.tier] || 0) : 0;
  if (currentRank > config.tierRank) {
    return interaction.reply({
      content: `Kamu saat ini memegang tahta kasta lebih tinggi (<@&${userData.activeRole.roleId}>)!`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 4. Cari pemegang tahta aktif tier ini (Permanen)
  const guildUsers = gachaData[guildId] || {};
  const activeHolders = [];
  for (const [uId, uData] of Object.entries(guildUsers)) {
    if (uData.activeRole && uData.activeRole.tier === tier && uId !== userId) {
      activeHolders.push({ userId: uId, userData: uData });
    }
  }

  // 5. Jika kursi belum penuh (< quota), langsung berikan tahta permanen!
  if (activeHolders.length < config.quota) {
    try {
      if (userData.activeRole && userData.activeRole.roleId && member.roles.cache.has(userData.activeRole.roleId)) {
        await member.roles.remove(userData.activeRole.roleId).catch(() => {});
      }
      await member.roles.add(configuredRoleId);
      userData.activeRole = {
        tier,
        roleId: configuredRoleId,
        obtainedAt: Date.now()
      };
      storage.write('gacha_data', gachaData);

      const embed = new EmbedBuilder()
        .setColor(tier === 'MYTHIC' ? 0xFF007F : 0xFEE75C)
        .setTitle(`Tahta ${tier} Diperoleh`)
        .setDescription(
          `Kursi Tahta **${tier}** masih tersedia (${activeHolders.length + 1}/${config.quota} Kursi Terisi).\n\n` +
          `Selamat <@${userId}>, kamu langsung dianugerahi gelar Tahta <@&${configuredRoleId}> secara **Permanen**!`
        );

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Gacha Challenge Direct Assign Error]:', err.message);
      return interaction.reply({ content: 'Gagal memberikan role tahta.', flags: MessageFlags.Ephemeral });
    }
  }

  // 6. Kursi Penuh! (>= quota) -> Duel Clash of Thrones
  const { allData: throneAll, guildData: throneGuild } = getGuildThroneData(guildId);
  const busyDefenderIds = new Set(
    Object.values(throneGuild.activeDuels || {})
      .filter(d => d.itemTier === tier && d.status === 'WAITING_TACTICS')
      .map(d => d.defenderId)
  );

  let duelTargetChannel = interaction.channel;
  const arenaChannelId = settingsData[guildId]?.gachaChannels?.duel;
  if (arenaChannelId && client) {
    const arenaCh = await client.channels.fetch(arenaChannelId).catch(() => null);
    if (arenaCh) duelTargetChannel = arenaCh;
  }

  // Case 6A: Target user spesifik diberikan
  if (targetUser) {
    if (targetUser.id === userId) {
      return interaction.reply({
        content: 'Kamu tidak bisa menantang dirimu sendiri!',
        flags: MessageFlags.Ephemeral
      });
    }

    const targetHolder = activeHolders.find(h => h.userId === targetUser.id);
    if (!targetHolder) {
      return interaction.reply({
        content: `<@${targetUser.id}> bukan pemegang **Tahta ${tier}** saat ini.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (targetHolder.userData?.throneProtectedUntil && targetHolder.userData.throneProtectedUntil > now) {
      const remMins = Math.ceil((targetHolder.userData.throneProtectedUntil - now) / 60000);
      return interaction.reply({
        content: `<@${targetUser.id}> baru saja menyelesaikan pertarungan tahta dan memiliki kekebalan perlindungan tahta selama **${remMins} menit** lagi. Silakan pilih lawan lain.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (busyDefenderIds.has(targetUser.id)) {
      throneGuild.queues[tier].push({
        challengerId: userId,
        targetDefenderId: targetUser.id,
        itemTier: tier,
        configuredRoleId,
        channelId: interaction.channelId,
        queuedAt: Date.now()
      });
      saveThroneStorage(throneAll);

      return interaction.reply({
        content: `<@${targetUser.id}> saat ini sedang dalam duel aktif. Kamu telah dimasukkan ke antrean khusus untuk menantangnya setelah duelnya selesai.`,
        flags: MessageFlags.Ephemeral
      });
    }

    await initiateThroneDuel({
      guildId,
      challengerId: userId,
      targetDefender: targetHolder,
      itemTier: tier,
      configuredRoleId,
      channel: duelTargetChannel,
      client
    });

    return interaction.reply({
      content: `Tantangan berhasil dikirim ke <@${targetUser.id}>!\nDuel perebutan **Tahta ${tier}** telah dimulai di <#${duelTargetChannel.id}>.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // Case 6B: Mode acak dipilih
  if (mode === 'random') {
    const availableHolders = activeHolders.filter(h => !busyDefenderIds.has(h.userId) && !(h.userData?.throneProtectedUntil > now));
    if (availableHolders.length === 0) {
      throneGuild.queues[tier].push({
        challengerId: userId,
        itemTier: tier,
        configuredRoleId,
        channelId: interaction.channelId,
        queuedAt: Date.now()
      });
      saveThroneStorage(throneAll);

      return interaction.reply({
        content: `Semua pemegang tahta **${tier}** sedang bertarung dalam duel aktif atau memiliki perlindungan tahta. Kamu telah dimasukkan ke dalam antrean penantang (Posisi #${throneGuild.queues[tier].length}).`,
        flags: MessageFlags.Ephemeral
      });
    }

    const targetDefender = availableHolders[Math.floor(Math.random() * availableHolders.length)];
    await initiateThroneDuel({
      guildId,
      challengerId: userId,
      targetDefender,
      itemTier: tier,
      configuredRoleId,
      channel: duelTargetChannel,
      client
    });

    return interaction.reply({
      content: `Lawan terpilih secara acak: <@${targetDefender.userId}>!\nDuel perebutan **Tahta ${tier}** telah dimulai di <#${duelTargetChannel.id}>.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // Case 6C: Mode pick atau tanpa opsi -> Tampilkan 2 opsi (Tombol Acak & Select Menu)
  const challengeRows = await buildDefenderChallengeComponents(interaction.guild, tier, userId, activeHolders, busyDefenderIds);

  const embed = new EmbedBuilder()
    .setColor(tier === 'MYTHIC' ? 0xFF007F : 0xFEE75C)
    .setTitle(`Tantangan Tahta ${tier}`)
    .setDescription(
      `Kursi **${config.name}** telah terisi penuh (${activeHolders.length}/${config.quota}).\n` +
      `Sebagai pemilik relik ${tier}, kamu berhak menantang salah satu pemegang tahta untuk merebut posisinya!\n\n` +
      `Silakan tentukan lawanmu melalui opsi di bawah:`
    );

  return interaction.reply({
    embeds: [embed],
    components: challengeRows,
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Handle Ephemeral Prompt when user clicks [Tantang Tahta] button in /gacha inventory
 */
async function executeGachaChallengePrompt(interaction, client, challengeTier) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const member = interaction.member;

  const tier = challengeTier || 'MYTHIC';
  const config = THRONE_CONFIG[tier];
  if (!config) {
    const content = 'Tier tahta yang dipilih tidak valid.';
    if (interaction.deferred || interaction.replied) return interaction.editReply({ content });
    return interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }

  const settingsData = storage.read('settings');
  const configuredRoleId = settingsData[guildId]?.gachaRoles?.[tier];
  if (!configuredRoleId) {
    const content = `Role Discord untuk **Tahta ${tier}** belum dikonfigurasi oleh Admin. Gunakan \`/gacha setrole\` terlebih dahulu.`;
    if (interaction.deferred || interaction.replied) return interaction.editReply({ content });
    return interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }

  const gachaData = storage.read('gacha_data');
  const userData = getOrInitUserData(gachaData, guildId, userId);
  const now = Date.now();

  if (userData.challengeCooldownUntil && userData.challengeCooldownUntil > now) {
    const remMins = Math.ceil((userData.challengeCooldownUntil - now) / 60000);
    const content = `Kamu sedang dalam masa jeda tantangan. Silakan tunggu **${remMins} menit** lagi sebelum menantang tahta kembali.`;
    if (interaction.deferred || interaction.replied) return interaction.editReply({ content });
    return interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }

  // 1. Cek kepemilikan relik tier terkait di inventaris
  const hasRelic = (userData.inventory || []).some(itemName => {
    const found = GACHA_ITEMS.find(g => g.name === itemName);
    return found && found.tier === tier;
  });

  if (!hasRelic) {
    const content = `Kamu belum memiliki kartu relik bertier **${tier}** di inventarismu untuk menantang tahta ini.\nDapatkan relik ${tier} terlebih dahulu dari \`/gacha pull\` atau \`/gacha fuse\`.`;
    if (interaction.deferred || interaction.replied) return interaction.editReply({ content });
    return interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }

  // 2. Cek apakah member sudah memegang tahta ini
  if (userData.activeRole && userData.activeRole.tier === tier) {
    const content = `Kamu sudah memegang **Tahta ${tier}** (<@&${configuredRoleId}>)!`;
    if (interaction.deferred || interaction.replied) return interaction.editReply({ content });
    return interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }

  // 3. Cek apakah member memegang tahta kasta lebih tinggi
  const currentRank = userData.activeRole ? (TIER_RANK[userData.activeRole.tier] || 0) : 0;
  if (currentRank > config.tierRank) {
    const content = `Kamu saat ini memegang tahta kasta lebih tinggi (<@&${userData.activeRole.roleId}>)!`;
    if (interaction.deferred || interaction.replied) return interaction.editReply({ content });
    return interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }

  // 4. Cari pemegang tahta aktif tier ini (Permanen)
  const guildUsers = gachaData[guildId] || {};
  const activeHolders = [];
  for (const [uId, uData] of Object.entries(guildUsers)) {
    if (uData.activeRole && uData.activeRole.tier === tier && uId !== userId) {
      activeHolders.push({ userId: uId, userData: uData });
    }
  }

  // 5. Jika kursi belum penuh (< quota), langsung berikan tahta permanen!
  if (activeHolders.length < config.quota) {
    try {
      if (userData.activeRole && userData.activeRole.roleId && member.roles.cache.has(userData.activeRole.roleId)) {
        await member.roles.remove(userData.activeRole.roleId).catch(() => {});
      }
      await member.roles.add(configuredRoleId);
      userData.activeRole = {
        tier,
        roleId: configuredRoleId,
        obtainedAt: Date.now()
      };
      storage.write('gacha_data', gachaData);

      const embed = new EmbedBuilder()
        .setColor(tier === 'MYTHIC' ? 0xFF007F : 0xFEE75C)
        .setTitle(`Tahta ${tier} Diperoleh`)
        .setDescription(
          `Kursi Tahta **${tier}** masih tersedia (${activeHolders.length + 1}/${config.quota} Kursi Terisi).\n\n` +
          `Selamat <@${userId}>, kamu langsung dianugerahi gelar Tahta <@&${configuredRoleId}> secara **Permanen**!`
        );

      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [embed] });
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('[Gacha Challenge Prompt Direct Assign Error]:', err.message);
      const content = 'Gagal memberikan role tahta.';
      if (interaction.deferred || interaction.replied) return interaction.editReply({ content });
      return interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
  }

  // 6. Kursi Penuh! (>= quota) -> Bangun komponen challenge (Acak / Pilih)
  const { allData: throneAll, guildData: throneGuild } = getGuildThroneData(guildId);
  const busyDefenderIds = new Set(
    Object.values(throneGuild.activeDuels || {})
      .filter(d => d.itemTier === tier && d.status === 'WAITING_TACTICS')
      .map(d => d.defenderId)
  );

  const challengeRows = await buildDefenderChallengeComponents(interaction.guild, tier, userId, activeHolders, busyDefenderIds);

  const embed = new EmbedBuilder()
    .setColor(tier === 'MYTHIC' ? 0xFF007F : 0xFEE75C)
    .setTitle(`Tantangan Tahta ${tier}`)
    .setDescription(
      `Kursi **${config.name}** telah terisi penuh (${activeHolders.length}/${config.quota}).\n` +
      `Sebagai pemilik relik ${tier}, kamu berhak menantang salah satu pemegang tahta untuk merebut posisinya!\n\n` +
      `Silakan tentukan lawanmu melalui opsi di bawah:`
    );

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({ embeds: [embed], components: challengeRows });
  }
  return interaction.reply({
    embeds: [embed],
    components: challengeRows,
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Handle Single / Multi Pull Execution Logic
 */
async function executeGachaPull(interaction, client, amount = 1) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const member = interaction.member;

  const gachaData = storage.read('gacha_data');
  const userData = getOrInitUserData(gachaData, guildId, userId);

  if (userData.tickets < amount) {
    const settingsData = storage.read('settings') || {};
    const gChannels = settingsData[guildId]?.gachaChannels || {};
    const dailyChId = gChannels.daily || gChannels.play;
    const isDailySeparate = dailyChId && dailyChId !== interaction.channelId;

    const dailyDescLine = isDailySeparate
      ? `• Klaim harian gratis di <#${dailyChId}> (\`/gacha daily\`)`
      : '• Klaim harian gratis di `/gacha daily`';

    const embedNoTickets = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('Tiket Gacha Tidak Mencukupi')
      .setDescription(
        `Kamu membutuhkan **${amount} Tiket**, saat ini hanya memiliki **${userData.tickets} Tiket**.\n\n` +
        `**Cara Mendapatkan Tiket:**\n` +
        `${dailyDescLine}\n` +
        `• Tukar Stardust di \`/gacha shop\`\n` +
        `• Ikuti kuis di \`/musicquiz\` atau aktif di Voice Channel`
      )
      .setFooter({ text: `Tiket: ${userData.tickets} • Stardust: ${userData.stardust}` });

    const rowDailyComponents = [];
    if (!isDailySeparate) {
      rowDailyComponents.push(
        new ButtonBuilder()
          .setCustomId('gacha_btn_daily')
          .setLabel('Klaim Harian')
          .setStyle(ButtonStyle.Success)
      );
    } else {
      rowDailyComponents.push(
        new ButtonBuilder()
          .setLabel('Ambil Tiket di Channel Daily')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guildId}/${dailyChId}`)
      );
    }
    rowDailyComponents.push(
      new ButtonBuilder()
        .setCustomId('gacha_btn_inv')
        .setLabel('Buka Inventory')
        .setStyle(ButtonStyle.Secondary)
    );
    const rowDaily = new ActionRowBuilder().addComponents(rowDailyComponents);

    if (interaction.replied || interaction.deferred) {
      return interaction.editReply({ embeds: [embedNoTickets], components: [rowDaily] });
    }
    return interaction.reply({ embeds: [embedNoTickets], components: [rowDaily], flags: MessageFlags.Ephemeral });
  }

  // Deduct tickets
  userData.tickets -= amount;

  // Single Pull Execution
  if (amount === 1) {
    const pullResult = rollSingleGacha(userData);
    const item = pullResult.item;

    // Apply Throne Usurpation / Limited Seats Role System
    const roleResult = await applySmartGachaRole(interaction.guild, member, item.tier, userData, gachaData, interaction.channel, client);
    const roleResultText = roleResult ? (roleResult.text || String(roleResult)) : '';
    const challengeRows = (roleResult && roleResult.challengeRows) || [];
    storage.write('gacha_data', gachaData);

    // Broadcast if Mythic or Legendary
    if (item.tier === 'MYTHIC' || item.tier === 'LEGENDARY') {
      broadcastJackpot(interaction.guild, member, item, client);
    }

    let duplicateText = '';
    if (pullResult.isDuplicate) {
      duplicateText = `\n• **Duplikat:** Dikonversi menjadi **+${pullResult.stardustAwarded} Stardust**`;
    }

    const embed = new EmbedBuilder()
      .setColor(item.color)
      .setAuthor({
        name: `Gacha Unboxing — [${item.tier}]`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle(`${item.name}`)
      .setDescription(
        `Selamat **${member.displayName}**.\n` +
        `*${item.desc}*\n\n` +
        (item.badge ? `• **Badge:** \`${item.badge}\`\n` : '') +
        (item.title ? `• **Gelar:** \`"${item.title}"\`\n` : '') +
        duplicateText +
        roleResultText
      )
      .addFields(
        {
          name: 'Kelangkaan',
          value: `Tier **${item.tier}** (${item.stars})\nTarikan ke-**#${userData.pulls}**`,
          inline: true
        },
        {
          name: 'Pity Status',
          value: `Epic: **${5 - (userData.pityEpic || 0)}x**\nLegendary: **${15 - (userData.pityLegendary || 0)}x**`,
          inline: true
        },
        {
          name: 'Saldo Akun',
          value: `**${userData.tickets} Tiket** • **${userData.stardust} Stardust**`,
          inline: false
        }
      )
      .setFooter({ text: 'Gunakan /gacha inventory untuk melihat koleksi' })
      .setTimestamp();

    const row = createGachaActionRow();
    const pullComponents = [row, ...challengeRows];

    // Post ke Result Feed channel (jika dikonfigurasi)
    const feedSummary = `Tarik 1x — **${item.name}** [${item.tier}] ${item.stars}` +
      (pullResult.isDuplicate ? ` *(+${pullResult.stardustAwarded} Dust)*` : ' **[NEW]**');
    postToResultFeed(interaction.guild, member, feedSummary, client);

    // Cek apakah ada channel result → reply ephemeral, jika tidak → reply publik
    const hasResultChannel = !!storage.read('settings')[guildId]?.gachaChannels?.result;
    if (interaction.replied || interaction.deferred) {
      return interaction.editReply({ content: null, embeds: [embed], components: pullComponents });
    }
    return interaction.reply({ embeds: [embed], components: pullComponents, flags: hasResultChannel ? MessageFlags.Ephemeral : undefined });
  }

  // 10x Multi Pull Execution
  const results = [];
  let totalStardustGained = 0;
  let highestItem = null;
  const highestTierRank = { MYTHIC: 5, LEGENDARY: 4, EPIC: 3, RARE: 2, COMMON: 1 };
  let currentMaxRank = 0;

  for (let i = 0; i < amount; i++) {
    const res = rollSingleGacha(userData);
    results.push(res);
    if (res.isDuplicate) {
      totalStardustGained += res.stardustAwarded;
    }

    const rank = highestTierRank[res.item.tier] || 1;
    if (rank > currentMaxRank) {
      currentMaxRank = rank;
      highestItem = res.item;
    }
  }

  // Apply Role for the highest item pulled
  let multiRoleText = '';
  let multiChallengeRows = [];
  if (highestItem) {
    const roleResult = await applySmartGachaRole(interaction.guild, member, highestItem.tier, userData, gachaData, interaction.channel, client);
    multiRoleText = roleResult ? (roleResult.text || String(roleResult)) : '';
    multiChallengeRows = (roleResult && roleResult.challengeRows) || [];
  }

  storage.write('gacha_data', gachaData);

  // Broadcast if highest item is Mythic or Legendary
  if (highestItem && (highestItem.tier === 'MYTHIC' || highestItem.tier === 'LEGENDARY')) {
    broadcastJackpot(interaction.guild, member, highestItem, client);
  }

  const itemsFormattedList = results.map((r, idx) => {
    const num = `\`#${(idx + 1).toString().padStart(2, '0')}\``;
    const dupIndicator = r.isDuplicate ? ` *(+${r.stardustAwarded} Dust)*` : ' **[NEW]**';
    return `${num} **${r.item.name}** [${r.item.tier}]${dupIndicator}`;
  }).join('\n');

  const multiEmbed = new EmbedBuilder()
    .setColor(highestItem ? highestItem.color : 0x2B2D31)
    .setAuthor({
      name: `10x Multi-Pull — ${member.displayName}`,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .setTitle('Hasil Tarikan 10 Relik')
    .setDescription(
      `${itemsFormattedList}\n\n` +
      `• **Relik Terbaik:** **${highestItem.name}** [${highestItem.tier}] (${highestItem.stars})\n` +
      (totalStardustGained > 0 ? `• **Daur Ulang Duplikat:** +${totalStardustGained} Stardust\n` : '') +
      multiRoleText
    )
    .addFields(
      {
        name: 'Saldo Akun',
        value: `Total: **#${userData.pulls}x**\nTiket: **${userData.tickets}** | Stardust: **${userData.stardust}**`,
        inline: true
      },
      {
        name: 'Pity Status',
        value: `Epic: **${5 - (userData.pityEpic || 0)}x**\nLegendary: **${15 - (userData.pityLegendary || 0)}x**`,
        inline: true
      }
    )
    .setFooter({ text: 'Gunakan /gacha inventory untuk melihat koleksi' })
    .setTimestamp();

  const row = createGachaActionRow();
  const multiComponents = [row, ...multiChallengeRows];

  // Post ke Result Feed channel (jika dikonfigurasi)
  const topItems = results.filter(r => r.item.tier === 'MYTHIC' || r.item.tier === 'LEGENDARY' || r.item.tier === 'EPIC');
  let feedSummary = `Tarik 10x — Terbaik: **${highestItem.name}** [${highestItem.tier}] ${highestItem.stars}`;
  if (topItems.length > 1) {
    feedSummary += `\n` + topItems.slice(0, 3).map(r => `  • ${r.item.name} [${r.item.tier}]`).join('\n');
  }
  postToResultFeed(interaction.guild, member, feedSummary, client);

  // Cek apakah ada channel result → reply ephemeral, jika tidak → reply publik
  const hasResultChannel = !!storage.read('settings')[guildId]?.gachaChannels?.result;
  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({ content: null, embeds: [multiEmbed], components: multiComponents });
  }
  return interaction.reply({ embeds: [multiEmbed], components: multiComponents, flags: hasResultChannel ? MessageFlags.Ephemeral : undefined });
}

/**
 * Handle Daily Claim Logic (24 Jam Cooldown)
 */
async function executeGachaDaily(interaction) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const gachaData = storage.read('gacha_data');
  const userData = getOrInitUserData(gachaData, guildId, userId);

  const now = Date.now();
  const timeSinceLast = now - (userData.lastDaily || 0);
  const cooldownMs = DAILY_COOLDOWN_HOURS * 60 * 60 * 1000;

  const settingsData = storage.read('settings') || {};
  const gChannels = settingsData[guildId]?.gachaChannels || {};
  const pullChId = gChannels.pull || gChannels.play;
  const isPullSeparate = pullChId && pullChId !== interaction.channelId;

  if (timeSinceLast < cooldownMs) {
    const remainingMs = cooldownMs - timeSinceLast;
    const remHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    const pullNote = isPullSeparate
      ? `\n\n*Kunjungi saluran <#${pullChId}> untuk menarik gacha.*`
      : '';

    const cdEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('Hadiah Harian Belum Siap')
      .setDescription(
        `Kamu sudah mengklaim hadiah harian sebelumnya.\n` +
        `Silakan kembali lagi dalam **${remHours} jam ${remMins} menit**.\n\n` +
        `• **Streak Saat Ini:** Hari ke-${userData.streak || 1}\n` +
        `• **Saldo:** **${userData.tickets} Tiket** • **${userData.stardust} Stardust**` +
        pullNote
      );

    const cdRowComponents = [];
    if (!isPullSeparate) {
      cdRowComponents.push(
        new ButtonBuilder()
          .setCustomId('gacha_btn_pull_1')
          .setLabel('Tarik Gacha')
          .setStyle(ButtonStyle.Primary)
      );
    } else {
      cdRowComponents.push(
        new ButtonBuilder()
          .setLabel('Menuju Channel Gacha')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guildId}/${pullChId}`)
      );
    }
    cdRowComponents.push(
      new ButtonBuilder()
        .setCustomId('gacha_btn_inv')
        .setLabel('Inventory')
        .setStyle(ButtonStyle.Secondary)
    );
    const row = new ActionRowBuilder().addComponents(cdRowComponents);

    if (interaction.replied || interaction.deferred) {
      return interaction.editReply({ embeds: [cdEmbed], components: [row] });
    }
    return interaction.reply({ embeds: [cdEmbed], components: [row], flags: MessageFlags.Ephemeral });
  }

  // Calculate Streak: Reset jika absen lebih dari 24 jam setelah cooldown siap (> 48 jam dari lastDaily)
  if (timeSinceLast > 48 * 60 * 60 * 1000) {
    userData.streak = 1;
  } else {
    userData.streak = ((userData.streak || 0) % 7) + 1;
  }

  userData.lastDaily = now;

  let ticketsAwarded = 1;
  let stardustAwarded = 50;
  let bonusBadge = null;

  switch (userData.streak) {
    case 1:
      ticketsAwarded = 1;
      stardustAwarded = 50;
      break;
    case 2:
      ticketsAwarded = 1;
      stardustAwarded = 75;
      break;
    case 3:
      ticketsAwarded = 2;
      stardustAwarded = 100;
      break;
    case 4:
      ticketsAwarded = 2;
      stardustAwarded = 125;
      break;
    case 5:
      ticketsAwarded = 2;
      stardustAwarded = 150;
      break;
    case 6:
      ticketsAwarded = 3;
      stardustAwarded = 200;
      break;
    case 7:
      ticketsAwarded = 4;
      stardustAwarded = 350;
      bonusBadge = '✦ Streak Master 7D';
      break;
  }

  userData.tickets += ticketsAwarded;
  userData.stardust += stardustAwarded;
  if (bonusBadge && !userData.badges.includes(bonusBadge)) {
    userData.badges.push(bonusBadge);
  }

  storage.write('gacha_data', gachaData);

  const streakDays = [1, 2, 3, 4, 5, 6, 7];
  const streakBar = streakDays.map(d => {
    if (d === userData.streak) return `**[H${d}]**`;
    return `H${d}`;
  }).join(' — ');

  const pullSuccessNote = isPullSeparate
    ? `\n\n*Tarik gacha di saluran <#${pullChId}>.*`
    : '';

  const embed = new EmbedBuilder()
    .setColor(userData.streak === 7 ? 0xFEE75C : 0x57F287)
    .setAuthor({
      name: `Hadiah Harian — ${interaction.member.displayName}`,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .setTitle(userData.streak === 7 ? 'Hadiah Mingguan Penuh (Hari ke-7)' : `Hadiah Hari ke-${userData.streak}`)
    .setDescription(
      `**Progress Streak Mingguan:**\n${streakBar}\n\n` +
      `**Hadiah Diterima:**\n` +
      `• **+${ticketsAwarded} Tiket Gacha**\n` +
      `• **+${stardustAwarded} Stardust**\n` +
      (bonusBadge ? `• **Badge Eksklusif:** \`${bonusBadge}\`\n` : '') +
      `\n**Saldo Akun:**\n` +
      `• **${userData.tickets} Tiket** • **${userData.stardust} Stardust**` +
      pullSuccessNote
    )
    .setFooter({ text: 'Klaim setiap hari untuk mempertahankan streak hadiah' })
    .setTimestamp();

  const row = isPullSeparate
    ? new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Menuju Channel Gacha')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guildId}/${pullChId}`),
        new ButtonBuilder()
          .setCustomId('gacha_btn_inv')
          .setLabel('Buka Inventory')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('gacha_btn_rates')
          .setLabel('Info & Pity')
          .setStyle(ButtonStyle.Secondary)
      )
    : createGachaActionRow();

  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({ embeds: [embed], components: [row] });
  }
  return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

/**
 * Handle Inventory Display Logic with Active Role & Equipped Title
 */
async function executeGachaInventory(interaction, targetUser) {
  const guildId = interaction.guild.id;
  const user = targetUser || interaction.user;

  const gachaData = storage.read('gacha_data');
  const targetData = getOrInitUserData(gachaData, guildId, user.id);

  const badgesText = targetData.badges.length > 0
    ? targetData.badges.map(b => `\`${b}\``).join('  ')
    : '_Belum memiliki lencana_';

  const titlesText = targetData.titles.length > 0
    ? targetData.titles.map(t => {
      const isEq = targetData.equippedTitle === t ? ' *(Equipped)*' : '';
      return `\`"${t}"\`${isEq}`;
    }).join('  ')
    : '_Belum memiliki gelar_';

  const itemsText = targetData.inventory.length > 0
    ? targetData.inventory.map(item => {
      const found = GACHA_ITEMS.find(g => g.name === item);
      const tier = found ? `[${found.tier}]` : '';
      return `• **${item}** ${tier}`;
    }).join('\n')
    : '_Belum ada relik yang dikoleksi_';

  const totalPool = GACHA_ITEMS.length;
  const userCollected = targetData.inventory.length;
  const percentage = Math.round((userCollected / totalPool) * 100);

  // Status Role Aktif
  let activeRoleDisplay = '_Tidak menduduki tahta_';
  if (targetData.activeRole && targetData.activeRole.roleId) {
    const streakInfo = targetData.duelDefenseStreak ? ` • Pertahanan: ${targetData.duelDefenseStreak}x` : '';
    activeRoleDisplay = `<@&${targetData.activeRole.roleId}> [${targetData.activeRole.tier}] — **Tahta Permanen**${streakInfo}`;
  }

  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `Koleksi & Inventaris — ${user.username}`,
      iconURL: user.displayAvatarURL({ dynamic: true })
    })
    .addFields(
      {
        name: 'Tiket Gacha',
        value: `**${targetData.tickets} Tiket**`,
        inline: true
      },
      {
        name: 'Stardust Relik',
        value: `**${targetData.stardust} Dust**`,
        inline: true
      },
      {
        name: 'Daily Streak',
        value: `Hari ke-**${targetData.streak || 0}**`,
        inline: true
      },
      {
        name: 'Total Tarikan',
        value: `**${targetData.pulls}x Tarikan**`,
        inline: true
      },
      {
        name: 'Kelengkapan Koleksi',
        value: `**${userCollected}/${totalPool}** (${percentage}%)`,
        inline: true
      },
      {
        name: 'Pity Status',
        value: `Epic: **${5 - (targetData.pityEpic || 0)}x** | Leg: **${15 - (targetData.pityLegendary || 0)}x**`,
        inline: true
      },
      {
        name: 'Tahta Role Aktif',
        value: activeRoleDisplay,
        inline: false
      },
      {
        name: 'Gelar Utama',
        value: targetData.equippedTitle ? `\`"${targetData.equippedTitle}"\` *(Tampil di /card)*` : '_Gunakan /gacha equip untuk memasang gelar_',
        inline: false
      },
      {
        name: 'Gelar & Lencana',
        value: `${badgesText}\n${titlesText}`,
        inline: false
      },
      {
        name: `Daftar Relik (${userCollected})`,
        value: itemsText.length > 1024 ? itemsText.substring(0, 1000) + '\n*... [Daftar dipotong]*' : itemsText,
        inline: false
      }
    )
    .setFooter({ text: '💡 Tips: Aktif mengobrol di Voice Channel memberi +15 Dust & +1 Tiket tiap 15m! (Anti-AFK aktif)' })
    .setTimestamp();

  const row = createGachaActionRow();

  // Tombol pintas Tantang Tahta jika melihat inventaris sendiri & memiliki relik eligible
  if (user.id === interaction.user.id) {
    const hasMythic = (targetData.inventory || []).some(n => GACHA_ITEMS.find(g => g.name === n)?.tier === 'MYTHIC');
    const hasLegendary = (targetData.inventory || []).some(n => GACHA_ITEMS.find(g => g.name === n)?.tier === 'LEGENDARY');
    let challengeTier = null;
    if (hasMythic && targetData.activeRole?.tier !== 'MYTHIC') {
      challengeTier = 'MYTHIC';
    } else if (hasLegendary && !targetData.activeRole) {
      challengeTier = 'LEGENDARY';
    }

    if (challengeTier) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`gacha_btn_challenge_prompt:${challengeTier}`)
          .setLabel('Tantang Tahta')
          .setStyle(ButtonStyle.Danger)
      );
    }
  }

  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({ embeds: [embed], components: [row] });
  }
  return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

/**
 * Handle Drop Rates & Pity Info Display
 */
async function executeGachaRates(interaction) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const gachaData = storage.read('gacha_data');
  const userData = getOrInitUserData(gachaData, guildId, userId);

  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle('Informasi Drop Rate, Pity & Sistem Tahta')
    .setDescription(
      `Sistem Gacha dilengkapi dengan **Kursi Tahta Terbatas & Clash of Thrones**.\n\n` +
      `**Drop Rate & Alokasi Tahta:**\n` +
      `• **MYTHIC (3%):** Tahta **3 Kursi Maksimal** • Role Permanen • Daur ulang: +500 Dust\n` +
      `• **LEGENDARY (10%):** Tahta **5 Kursi Maksimal** • Role Permanen • Daur ulang: +200 Dust\n` +
      `• **EPIC (20%):** Relik Koleksi & Lencana • Daur ulang: +75 Dust\n` +
      `• **RARE (32%):** Relik Koleksi • Daur ulang: +25 Dust\n` +
      `• **COMMON (35%):** Benda santai • Daur ulang: +10 Dust\n\n` +
      `**Sumber Stardust (Dust):**\n` +
      `• **Daur Ulang Duplikat:** Otomatis +10 s/d +500 Dust setiap dapat relik kembar.\n` +
      `• **Aktif Voice Channel:** Otomatis dapat **+15 Stardust & +1 Tiket** setiap **15 menit** nongkrong di Voice!\n` +
      `• **Klaim Harian (/gacha daily):** +50 s/d +350 Dust & bonus tiket gratis setiap hari.\n` +
      `• **Clash of Thrones:** Kompensasi kekalahan duel tahta sebesar +250 Dust.\n\n` +
      `**Sistem Duel Perebutan Tahta (12 Jam):**\n` +
      `• Jika kuota kursi Mythic (3/3) atau Legendary (5/5) telah penuh, penantang dapat memilih pemegang tahta yang ingin ditantang atau duel acak (Best of 3).\n` +
      `• Pemain yang kalah menerima kompensasi **+250 Stardust**.\n\n` +
      `**Garansi Pity System:**\n` +
      `• **Epic Guarantee:** Minimal 1 item **EPIC+** setiap **5 pull**.\n` +
      `• **Legendary Guarantee:** Minimal 1 item **LEGENDARY+** pada pull ke-**15**.\n\n` +
      `**Status Pity Akunmu:**\n` +
      `• Garansi Epic berikutnya dalam: **${5 - (userData.pityEpic || 0)}x tarikan**\n` +
      `• Garansi Legendary berikutnya dalam: **${15 - (userData.pityLegendary || 0)}x tarikan**`
    )
    .setFooter({ text: 'Daur ulang duplikat & aktif voice menghasilkan Stardust untuk dibelanjakan di /gacha shop' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('gacha_btn_pull_1')
      .setLabel('Tarik 1x')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('gacha_btn_pull_10')
      .setLabel('Tarik 10x')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('gacha_btn_inv')
      .setLabel('Inventory')
      .setStyle(ButtonStyle.Secondary)
  );

  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({ embeds: [embed], components: [row] });
  }
  return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('Buka Kotak Misteri Gacha, Alkimia Relic Fusion, dan Perebutan Kursi Tahta')
    // Subcommand: pull
    .addSubcommand(sub =>
      sub
        .setName('pull')
        .setDescription('Buka Kotak Misteri Gacha (1x atau 10x sekaligus)')
        .addIntegerOption(opt =>
          opt
            .setName('amount')
            .setDescription('Jumlah tarikan (1x atau 10x)')
            .setRequired(false)
            .addChoices(
              { name: '1x Pull (1 Tiket)', value: 1 },
              { name: '10x Multi-Pull (10 Tiket)', value: 10 }
            )
        )
    )
    // Subcommand: daily
    .addSubcommand(sub =>
      sub
        .setName('daily')
        .setDescription('Klaim Tiket Gacha & Stardust gratis setiap 24 jam dengan sistem streak')
    )
    // Subcommand: inventory
    .addSubcommand(sub =>
      sub
        .setName('inventory')
        .setDescription('Lihat saldo tiket, stardust, sisa durasi tahta, badges, dan relik yang kamu miliki')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User yang ingin dilihat inventarisnya').setRequired(false)
        )
    )
    // Subcommand: fuse (Alkimia Tempa Relik)
    .addSubcommand(sub =>
      sub
        .setName('fuse')
        .setDescription('Alkimia: Korbankan 3 relik dari tier yang sama untuk ditempa menjadi 1 relik tier atas')
        .addStringOption(opt =>
          opt
            .setName('tier')
            .setDescription('Tier relik yang ingin dikorbankan (3 item)')
            .setRequired(true)
            .addChoices(
              { name: '3x COMMON -> 1x RARE', value: 'COMMON' },
              { name: '3x RARE -> 1x EPIC', value: 'RARE' },
              { name: '3x EPIC -> 1x LEGENDARY', value: 'EPIC' },
              { name: '3x LEGENDARY -> 1x MYTHIC', value: 'LEGENDARY' }
            )
        )
    )
    // Subcommand: equip (Pasang Gelar ke Profil)
    .addSubcommand(sub =>
      sub
        .setName('equip')
        .setDescription('Pasang Title gacha yang kamu miliki sebagai Gelar Utama di kartu profil /card')
        .addStringOption(opt =>
          opt
            .setName('title')
            .setDescription('Nama persis Title yang ingin dipasang')
            .setRequired(true)
        )
    )
    // Subcommand: unequip
    .addSubcommand(sub =>
      sub
        .setName('unequip')
        .setDescription('Copot Gelar Utama yang sedang terpasang di kartu profil')
    )
    // Subcommand: album
    .addSubcommand(sub =>
      sub
        .setName('album')
        .setDescription('Lihat direktori seluruh kartu relik yang ada di server')
    )
    // Subcommand: shop
    .addSubcommand(sub =>
      sub
        .setName('shop')
        .setDescription('Toko Stardust: Tukar stardust menjadi tiket gacha, badge, atau title eksklusif')
    )
    // Subcommand: buy
    .addSubcommand(sub =>
      sub
        .setName('buy')
        .setDescription('Beli item dari Toko Stardust')
        .addStringOption(opt =>
          opt
            .setName('item')
            .setDescription('Item yang ingin dibeli')
            .setRequired(true)
            .addChoices(
              ...GACHA_SHOP_ITEMS.map(i => ({ name: `${i.name} — ${i.cost} Dust`, value: i.id }))
            )
        )
    )
    // Subcommand: gift
    .addSubcommand(sub =>
      sub
        .setName('gift')
        .setDescription('Hadiahkan salah satu relik koleksimu ke member lain')
        .addUserOption(opt =>
          opt.setName('user').setDescription('Member penerima hadiah').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('item_name').setDescription('Nama persis relik yang ingin dihadiahkan').setRequired(true)
        )
    )
    // Subcommand: leaderboard
    .addSubcommand(sub =>
      sub
        .setName('leaderboard')
        .setDescription('Lihat klasemen gacha server (Top Collector, Pulls, & Relik Langka)')
        .addStringOption(opt =>
          opt
            .setName('category')
            .setDescription('Kategori leaderboard')
            .setRequired(false)
            .addChoices(
              { name: 'Top Collector (Koleksi Terlengkap)', value: 'collector' },
              { name: 'Total Tarikan (Gacha Maniac)', value: 'pulls' },
              { name: 'Relik Langka (Mythic & Legendary)', value: 'luck' },
              { name: 'Pertahanan Tahta (Top Defenders)', value: 'defense' }
            )
        )
    )
    // Subcommand: setchannel (Admin only)
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Atur channel untuk Main Gacha, Arena Duel, atau Broadcast Jackpot (Admin Only)')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Tipe channel yang ingin diatur')
            .setRequired(true)
            .addChoices(
              { name: 'Channel Tarik Gacha (Batasi command /gacha pull & tombol tarik)', value: 'pull' },
              { name: 'Channel Hadiah Harian (Batasi command /gacha daily & tombol klaim)', value: 'daily' },
              { name: 'Channel Main Gacha Umum (Menu gacha & fallback jika pull/daily belum diatur)', value: 'play' },
              { name: 'Channel Hasil Tarikan (Log publik hasil pull di channel terpisah)', value: 'result' },
              { name: 'Channel Arena Duel (Tempat pertarungan Clash of Thrones dikirim)', value: 'duel' },
              { name: 'Channel Broadcast Jackpot (Pengumuman perolehan Mythic & Legendary)', value: 'broadcast' }
            )
        )
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel yang dipilih (kosongkan opsi ini untuk me-reset / menghapus pengaturan)')
            .setRequired(false)
        )
    )
    // Subcommand: challenge
    .addSubcommand(sub =>
      sub
        .setName('challenge')
        .setDescription('Tantang salah satu pemegang tahta (Mythic/Legendary) untuk merebut kursi tahta')
        .addStringOption(opt =>
          opt
            .setName('tier')
            .setDescription('Tier tahta yang ingin kamu perebutkan')
            .setRequired(true)
            .addChoices(
              { name: 'Tahta MYTHIC (Maksimal 3 Kursi • Permanen)', value: 'MYTHIC' },
              { name: 'Tahta LEGENDARY (Maksimal 5 Kursi • Permanen)', value: 'LEGENDARY' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('mode')
            .setDescription('Metode penentuan lawan (Acak atau Pilih)')
            .setRequired(false)
            .addChoices(
              { name: 'Acak Lawan (Random Match)', value: 'random' },
              { name: 'Pilih Sendiri Lawan (Manual Pick)', value: 'pick' }
            )
        )
        .addUserOption(opt =>
          opt
            .setName('target')
            .setDescription('Member pemegang tahta yang ingin kamu tantang langsung (Opsional)')
            .setRequired(false)
        )
    )
    // Subcommand: setrole (Admin only)
    .addSubcommand(sub =>
      sub
        .setName('setrole')
        .setDescription('Atur Role Discord Tahta untuk Mythic (3 Kursi) atau Legendary (5 Kursi) (Admin Only)')
        .addStringOption(opt =>
          opt
            .setName('tier')
            .setDescription('Tingkat kelangkaan Tahta')
            .setRequired(true)
            .addChoices(
              { name: 'MYTHIC (Maksimal 3 Kursi • Permanen)', value: 'MYTHIC' },
              { name: 'LEGENDARY (Maksimal 5 Kursi • Permanen)', value: 'LEGENDARY' }
            )
        )
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role Tahta yang akan diperebutkan').setRequired(true)
        )
    )
    // Subcommand: listroles
    .addSubcommand(sub =>
      sub
        .setName('listroles')
        .setDescription('Lihat status Kursi Tahta aktif & pemegang gelar saat ini')
    )
    // Subcommand: panel (Admin only)
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Pasang atau perbarui Panel Interaktif Gacha / Daily di channel tertentu (Admin Only)')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Tipe panel yang ingin dipasang')
            .setRequired(true)
            .addChoices(
              { name: 'Panel Hadiah Harian (Daily Claim)', value: 'daily' },
              { name: 'Panel Tarik Gacha (Mystery Box)', value: 'pull' },
              { name: 'Kedua Panel Sekaligus (Sesuai setchannel)', value: 'both' }
            )
        )
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Target channel pemasangan (opsional, default: channel yang sudah di-set)')
            .setRequired(false)
        )
    )
    // Subcommand: award (Admin Giveaway / Reward Event)
    .addSubcommand(sub =>
      sub
        .setName('award')
        .setDescription('Berikan bonus tiket atau stardust gacha ke member (Admin Only / Event / Giveaway)')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('Member penerima reward')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName('tickets')
            .setDescription('Jumlah tiket gacha yang diberikan')
            .setMinValue(1)
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt
            .setName('stardust')
            .setDescription('Jumlah stardust yang diberikan')
            .setMinValue(1)
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('reason')
            .setDescription('Alasan pemberian reward (misal: Juara 1 Kuis / Giveaway)')
            .setRequired(false)
        )
    ),

  // Export internal helpers for interactionCreate and ready.js
  executeGachaPull,
  executeGachaDaily,
  executeGachaInventory,
  executeGachaRates,
  executeGachaChallenge,
  executeGachaChallengePrompt,
  initiateThroneDuel,
  buildDefenderChallengeComponents,
  checkAndExpireGachaRoles,
  checkAndExpireThroneDuels,
  processDuelButton,
  activeDuels,
  GACHA_ITEMS,
  rollSingleGacha,
  createDailyPanelPayload,
  createPullPanelPayload,
  deployGachaPanel,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const settingsData = storage.read('settings');
    if (!settingsData[guildId]) settingsData[guildId] = {};
    if (!settingsData[guildId].gachaRoles) settingsData[guildId].gachaRoles = {};
    if (!settingsData[guildId].gachaChannels) {
      settingsData[guildId].gachaChannels = {
        play: null,
        pull: null,
        daily: null,
        result: null,
        duel: null,
        broadcast: settingsData[guildId].gachaChannel || null
      };
    }
    if (settingsData[guildId].gachaChannels.result === undefined) {
      settingsData[guildId].gachaChannels.result = null;
    }
    if (settingsData[guildId].gachaChannels.pull === undefined) {
      settingsData[guildId].gachaChannels.pull = null;
    }
    if (settingsData[guildId].gachaChannels.daily === undefined) {
      settingsData[guildId].gachaChannels.daily = null;
    }

    // Pembatasan Channel Gacha (Kecuali command Admin: setchannel, setrole, listroles, panel, award)
    const adminSubs = ['setchannel', 'setrole', 'listroles', 'panel', 'award'];
    if (!adminSubs.includes(sub)) {
      const gChannels = settingsData[guildId].gachaChannels || {};
      let requiredChannelId = null;
      let channelLabel = 'Gacha';

      if (sub === 'daily') {
        requiredChannelId = gChannels.daily || gChannels.play;
        channelLabel = 'Hadiah Harian (`/gacha daily`)';
      } else if (sub === 'pull') {
        requiredChannelId = gChannels.pull || gChannels.play;
        channelLabel = 'Tarik Gacha (`/gacha pull`)';
      } else if (sub === 'challenge') {
        requiredChannelId = gChannels.duel || gChannels.play;
        channelLabel = 'Tantangan Tahta (`/gacha challenge`)';
      } else {
        // inventory, fuse, equip, unequip, album, shop, buy, gift, leaderboard
        requiredChannelId = gChannels.play;
        channelLabel = `Menu Gacha (\`/gacha ${sub}\`)`;
      }

      if (requiredChannelId && interaction.channelId !== requiredChannelId) {
        const isAuthorized = await isOwnerOrMod(interaction, client);
        if (!isAuthorized) {
          const targetChannel = interaction.guild?.channels?.cache?.get(requiredChannelId);
          const chName = targetChannel ? `#${targetChannel.name}` : 'Saluran Khusus';
          const buttonLabel = `Menuju ke ${chName}`.slice(0, 80);
          const channelUrl = `https://discord.com/channels/${guildId}/${requiredChannelId}`;

          const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('Pengalihan Saluran Gacha')
            .setDescription(
              `Perintah **${channelLabel}** dialokasikan khusus di saluran <#${requiredChannelId}>.\n\n` +
              `Silakan klik tombol di bawah untuk langsung menuju ke saluran tersebut!`
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel(buttonLabel)
              .setStyle(ButtonStyle.Link)
              .setURL(channelUrl)
          );

          if (interaction.replied || interaction.deferred) {
            return interaction.editReply({ embeds: [embed], components: [row] });
          }
          return interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral
          });
        }
      }
    }

    // === SUBCOMMAND: SETCHANNEL (Admin Only) ===
    if (sub === 'setchannel') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized) {
        return interaction.reply({
          content: 'Perintah ini hanya bisa digunakan oleh **Owner Bot** atau **Moderator/Admin**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const type = interaction.options.getString('type');
      const channel = interaction.options.getChannel('channel');

      const typeLabels = {
        pull: 'Tarik Gacha',
        daily: 'Hadiah Harian',
        play: 'Main Gacha (Umum)',
        result: 'Hasil Tarikan',
        duel: 'Arena Duel Tahta',
        broadcast: 'Broadcast Jackpot'
      };
      const label = typeLabels[type] || type;

      if (channel) {
        settingsData[guildId].gachaChannels[type] = channel.id;
        if (type === 'broadcast') settingsData[guildId].gachaChannel = channel.id;
        storage.write('settings', settingsData);

        let desc = '';
        if (type === 'pull') {
          desc = `Command \`/gacha pull\` dan tombol tarikan kini dibatasi penggunaannya di <#${channel.id}>. Panel Tarik Gacha interaktif otomatis dipasang.`;
          await deployGachaPanel(interaction.guild, channel, 'pull', client);
        } else if (type === 'daily') {
          desc = `Command \`/gacha daily\` dan tombol klaim harian kini dibatasi penggunaannya di <#${channel.id}>. Panel Hadiah Harian interaktif otomatis dipasang.`;
          await deployGachaPanel(interaction.guild, channel, 'daily', client);
        } else if (type === 'play') {
          desc = `Saluran utama gacha diatur ke <#${channel.id}> (menu umum & fallback jika pull/daily tidak diset).`;
        } else if (type === 'result') {
          desc = `Hasil tarikan gacha akan otomatis diposting ke <#${channel.id}> sebagai **Live Feed** publik. Reply di channel tarikan menjadi privat (ephemeral).`;
        } else if (type === 'duel') {
          desc = `Seluruh tantangan, batas waktu 12 jam, dan hasil **Clash of Thrones** akan otomatis dialihkan ke <#${channel.id}>.`;
        } else if (type === 'broadcast') {
          desc = `Pengumuman perolehan relik **LEGENDARY** dan **MYTHIC** akan dikirimkan ke <#${channel.id}>.`;
        }

        const embed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('Pengaturan Saluran Diperbarui')
          .setDescription(
            `• **Tipe Saluran:** ${label}\n` +
            `• **Saluran Terpilih:** <#${channel.id}>\n\n` +
            `*${desc}*`
          )
          .setFooter({ text: 'Gunakan /gacha listroles untuk melihat status konfigurasi' });

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral
        });
      } else {
        settingsData[guildId].gachaChannels[type] = null;
        if (type === 'broadcast') settingsData[guildId].gachaChannel = null;
        storage.write('settings', settingsData);

        let resetDesc = '';
        if (type === 'pull') {
          resetDesc = 'Pembatasan saluran Tarik Gacha dihapus (kembali mengikuti saluran umum jika diatur).';
        } else if (type === 'daily') {
          resetDesc = 'Pembatasan saluran Hadiah Harian dihapus (kembali mengikuti saluran umum jika diatur).';
        } else if (type === 'play') {
          resetDesc = 'Pembatasan saluran umum gacha dihapus. Member dapat bermain di seluruh channel server.';
        } else if (type === 'result') {
          resetDesc = 'Live Feed dinonaktifkan. Hasil tarikan akan kembali ditampilkan langsung secara publik di channel tarikan.';
        } else if (type === 'duel') {
          resetDesc = 'Pengalihan arena dinonaktifkan. Duel tahta akan berlangsung di channel tempat gacha ditarik.';
        } else if (type === 'broadcast') {
          resetDesc = 'Pengumuman jackpot ke saluran terpisah dinonaktifkan.';
        }

        const embed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('Pengaturan Saluran Direset')
          .setDescription(
            `• **Tipe Saluran:** ${label}\n` +
            `• **Status:** Direset ke Default\n\n` +
            `*${resetDesc}*`
          )
          .setFooter({ text: 'Gunakan /gacha listroles untuk melihat status konfigurasi' });

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    // === SUBCOMMAND: SETROLE (Admin Only) ===
    if (sub === 'setrole') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized) {
        return interaction.reply({
          content: 'Perintah ini hanya bisa digunakan oleh **Owner Bot** atau **Moderator/Admin**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const tier = interaction.options.getString('tier');
      const role = interaction.options.getRole('role');

      settingsData[guildId].gachaRoles[tier] = role.id;
      storage.write('settings', settingsData);

      const cfg = THRONE_CONFIG[tier];
      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle(`Konfigurasi Role Tahta ${tier}`)
        .setDescription(
          `• **Role Discord:** <@&${role.id}>\n` +
          `• **Kuota Kursi:** ${cfg.quota} Kursi\n` +
          `• **Durasi Tahta:** Permanen (Tanpa batas waktu)\n` +
          `• **Mekanisme:** Clash of Thrones 2.0 (12 Jam)\n\n` +
          `*Role ini akan otomatis diberikan dan diperebutkan saat member memperoleh kartu ${tier}.*`
        )
        .setFooter({ text: 'Gunakan /gacha listroles untuk melihat status tahta' });

      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });
    }

    // === SUBCOMMAND: LISTROLES ===
    if (sub === 'listroles') {
      const gachaRoles = settingsData[guildId].gachaRoles || {};
      const gachaData = storage.read('gacha_data');
      const guildUsers = gachaData[guildId] || {};

      // Cari pemegang tahta aktif (Permanen)
      const mythicHolders = [];
      const legHolders = [];

      for (const [uId, uData] of Object.entries(guildUsers)) {
        if (uData.activeRole && uData.activeRole.roleId) {
          const streakText = uData.duelDefenseStreak ? ` *(Pertahanan: ${uData.duelDefenseStreak}x)*` : ' *(Permanen)*';
          if (uData.activeRole.tier === 'MYTHIC') {
            mythicHolders.push(`<@${uId}>${streakText}`);
          } else if (uData.activeRole.tier === 'LEGENDARY') {
            legHolders.push(`<@${uId}>${streakText}`);
          }
        }
      }

      const mythicRoleText = gachaRoles.MYTHIC
        ? `<@&${gachaRoles.MYTHIC}>\n**Kursi (${mythicHolders.length}/3 Terisi):**\n${mythicHolders.length > 0 ? mythicHolders.map((h, i) => `${i + 1}. ${h}`).join('\n') : '_Kursi Tahta Kosong_'}`
        : '_Role belum diatur_';

      const legRoleText = gachaRoles.LEGENDARY
        ? `<@&${gachaRoles.LEGENDARY}>\n**Kursi (${legHolders.length}/5 Terisi):**\n${legHolders.length > 0 ? legHolders.map((h, i) => `${i + 1}. ${h}`).join('\n') : '_Kursi Tahta Kosong_'}`
        : '_Role belum diatur_';

      const gChannels = settingsData[guildId].gachaChannels || {};
      const pullChText = gChannels.pull ? `<#${gChannels.pull}>` : (gChannels.play ? `<#${gChannels.play}> (Umum)` : '_Bebas_');
      const dailyChText = gChannels.daily ? `<#${gChannels.daily}>` : (gChannels.play ? `<#${gChannels.play}> (Umum)` : '_Bebas_');
      const playChText = gChannels.play ? `<#${gChannels.play}>` : '_Semua Channel (Bebas)_';
      const resultChText = gChannels.result ? `<#${gChannels.result}>` : '_Tidak aktif (publik di channel play)_';
      const duelChText = gChannels.duel ? `<#${gChannels.duel}>` : '_Sesuai Channel Gacha_';
      const bcastChText = (gChannels.broadcast || settingsData[guildId].gachaChannel) ? `<#${gChannels.broadcast || settingsData[guildId].gachaChannel}>` : '_Belum diatur_';
      const channelsSummary = `• Tarik Gacha: ${pullChText}\n• Hadiah Harian: ${dailyChText}\n• Saluran Umum: ${playChText}\n• Hasil Tarikan: ${resultChText}\n• Arena Duel: ${duelChText}\n• Jackpot Alert: ${bcastChText}`;

      // Cek duel aktif & antrean tahta
      const { guildData: guildThrone } = getGuildThroneData(guildId);
      const activeDuelsList = Object.values(guildThrone.activeDuels || {}).filter(d => d.status === 'WAITING_TACTICS');

      const activeDuelText = activeDuelsList.length > 0
        ? activeDuelsList.map(d => {
            const cR = d.tactics?.challenger ? 'Siap' : 'Belum';
            const dR = d.tactics?.defender ? 'Siap' : 'Belum';
            const expUnix = Math.floor(d.expiresAt / 1000);
            return `• <@${d.challengerId}> (${cR}) vs <@${d.defenderId}> (${dR}) — **${d.itemTier}** (Batas waktu: <t:${expUnix}:R>)`;
          }).join('\n')
        : '_Tidak ada duel aktif saat ini_';

      // Antrean Penantang Tahta
      const mythicQ = (guildThrone.queues?.MYTHIC || []).map((q, i) => `${i + 1}. <@${q.challengerId}> (MYTHIC)`).join('\n');
      const legQ = (guildThrone.queues?.LEGENDARY || []).map((q, i) => `${i + 1}. <@${q.challengerId}> (LEGENDARY)`).join('\n');
      let queueText = '_Antrean kosong_';
      if (mythicQ || legQ) {
        queueText = `${mythicQ ? `**MYTHIC:**\n${mythicQ}\n` : ''}${legQ ? `**LEGENDARY:**\n${legQ}` : ''}`;
      }

      const allDuelHistory = [];
      for (const [uId, uData] of Object.entries(guildUsers)) {
        if (uData.duelHistory) {
          for (const dh of uData.duelHistory) {
            if (dh.role === 'challenger') allDuelHistory.push({ ...dh, challengerId: uId });
          }
        }
      }
      allDuelHistory.sort((a, b) => (b.date || 0) - (a.date || 0));
      const recentDuels = allDuelHistory.slice(0, 5);
      const recentDuelText = recentDuels.length > 0
        ? recentDuels.map(d => {
          const text = d.result === 'win' ? 'Penantang Menang' : 'Defender Menang';
          return `• <@${d.challengerId}> vs <@${d.opponent}> [${d.tier}] — *${text}*`;
        }).join('\n')
        : '_Belum ada riwayat duel_';

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('Status Kursi Tahta & Clash of Thrones')
        .setDescription(
          `Hanya **Tier Tertinggi** yang memiliki Role Discord eksklusif dengan kuota kursi terbatas.\n` +
          `Jika kursi penuh, penantang harus bertarung dalam duel strategi **Best of 3 (12 Jam)** untuk merebut tahta!\n\n`
        )
        .addFields(
          { name: 'Tahta MYTHIC (Maks 3 Kursi • 7 Hari)', value: mythicRoleText, inline: false },
          { name: 'Tahta LEGENDARY (Maks 5 Kursi • 3 Hari)', value: legRoleText, inline: false },
          { name: 'Duel Tahta Aktif', value: activeDuelText, inline: false },
          { name: 'Antrean Penantang Tahta', value: queueText, inline: false },
          { name: 'Riwayat Duel Terakhir', value: recentDuelText, inline: false },
          { name: 'Konfigurasi Channel Gacha', value: channelsSummary, inline: false }
        )
        .setFooter({ text: 'Gunakan /gacha setrole atau /gacha setchannel untuk mengubah konfigurasi' });

      return interaction.reply({ embeds: [embed] });
    }

    // === SUBCOMMAND: PANEL (Admin Only) ===
    if (sub === 'panel') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized) {
        return interaction.reply({
          content: 'Perintah ini hanya bisa digunakan oleh **Owner Bot** atau **Moderator/Admin**.',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const panelType = interaction.options.getString('type');
      const targetChannelOpt = interaction.options.getChannel('channel');

      const results = [];
      if (panelType === 'daily' || panelType === 'both') {
        let ch = targetChannelOpt;
        if (!ch && settingsData[guildId]?.gachaChannels?.daily) {
          ch = await interaction.guild.channels.fetch(settingsData[guildId].gachaChannels.daily).catch(() => null);
        }
        if (!ch) ch = interaction.channel;

        if (ch && ch.isTextBased() && !ch.isThread()) {
          const msg = await deployGachaPanel(interaction.guild, ch, 'daily', client);
          if (msg) results.push(`• **Panel Hadiah Harian:** Berhasil dipasang di <#${ch.id}>`);
          else results.push(`• **Panel Hadiah Harian:** Gagal dipasang di <#${ch.id}>`);
        } else {
          results.push(`• **Panel Hadiah Harian:** Channel tidak valid atau bukan text channel.`);
        }
      }

      if (panelType === 'pull' || panelType === 'both') {
        let ch = targetChannelOpt;
        if (!ch && settingsData[guildId]?.gachaChannels?.pull) {
          ch = await interaction.guild.channels.fetch(settingsData[guildId].gachaChannels.pull).catch(() => null);
        }
        if (!ch) ch = interaction.channel;

        if (ch && ch.isTextBased() && !ch.isThread()) {
          const msg = await deployGachaPanel(interaction.guild, ch, 'pull', client);
          if (msg) results.push(`• **Panel Tarik Gacha:** Berhasil dipasang di <#${ch.id}>`);
          else results.push(`• **Panel Tarik Gacha:** Gagal dipasang di <#${ch.id}>`);
        } else {
          results.push(`• **Panel Tarik Gacha:** Channel tidak valid atau bukan text channel.`);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('Pemasangan Panel Interaktif Selesai')
        .setDescription(results.join('\n') + '\n\n*Member cukup menekan tombol pada panel untuk berinteraksi secara privat (ephemeral).*');

      return interaction.editReply({ embeds: [embed] });
    }

    // === SUBCOMMAND: AWARD (Admin Giveaway / Reward Event) ===
    if (sub === 'award') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized) {
        return interaction.reply({
          content: 'Perintah ini hanya bisa digunakan oleh **Owner Bot** atau **Moderator/Admin**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const targetUser = interaction.options.getUser('user');
      const ticketsToAdd = interaction.options.getInteger('tickets') || 0;
      const stardustToAdd = interaction.options.getInteger('stardust') || 0;
      const reason = interaction.options.getString('reason') || 'Hadiah Event / Server Reward';

      if (ticketsToAdd <= 0 && stardustToAdd <= 0) {
        return interaction.reply({
          content: 'Harap tentukan minimal salah satu reward: `tickets` atau `stardust` yang lebih dari 0.',
          flags: MessageFlags.Ephemeral
        });
      }

      const gachaData = storage.read('gacha_data');
      const userData = getOrInitUserData(gachaData, guildId, targetUser.id);

      userData.tickets = (userData.tickets || 0) + ticketsToAdd;
      userData.stardust = (userData.stardust || 0) + stardustToAdd;
      storage.write('gacha_data', gachaData);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Hadiah Gacha Berhasil Diberikan')
        .setDescription(
          `Admin <@${interaction.user.id}> telah memberikan reward gacha kepada <@${targetUser.id}>!\n\n` +
          `**Bonus yang Diberikan:**\n` +
          (ticketsToAdd > 0 ? `• **+${ticketsToAdd} Tiket Gacha**\n` : '') +
          (stardustToAdd > 0 ? `• **+${stardustToAdd} Stardust**\n` : '') +
          `• **Alasan:** *${reason}*\n\n` +
          `**Saldo Terbaru <@${targetUser.id}>:**\n` +
          `• **${userData.tickets} Tiket** • **${userData.stardust} Stardust**`
        )
        .setFooter({ text: `${interaction.guild.name} • Server Event Reward` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // === SUBCOMMAND: CHALLENGE ===
    if (sub === 'challenge') {
      return executeGachaChallenge(interaction, client);
    }

    // === SUBCOMMAND: PULL ===
    if (sub === 'pull') {
      const amount = interaction.options.getInteger('amount') || 1;
      const hasResultCh = !!settingsData[guildId]?.gachaChannels?.result;
      await interaction.deferReply({ flags: hasResultCh ? MessageFlags.Ephemeral : undefined });
      return executeGachaPull(interaction, client, amount);
    }

    // === SUBCOMMAND: DAILY ===
    if (sub === 'daily') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      return executeGachaDaily(interaction);
    }

    // === SUBCOMMAND: INVENTORY ===
    if (sub === 'inventory') {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      return executeGachaInventory(interaction, targetUser);
    }

    // === SUBCOMMAND: EQUIP (Pasang Gelar Utama) ===
    if (sub === 'equip') {
      const titleInput = interaction.options.getString('title').trim();
      const gachaData = storage.read('gacha_data');
      const userData = getOrInitUserData(gachaData, guildId, userId);

      const foundTitle = userData.titles.find(t => t.toLowerCase() === titleInput.toLowerCase());
      if (!foundTitle) {
        const ownedList = userData.titles.length > 0
          ? userData.titles.map(t => `• \`"${t}"\``).join('\n')
          : '_Kamu belum memiliki gelar apapun._';
        return interaction.reply({
          content: `Kamu tidak memiliki gelar bernama **"${titleInput}"**.\n\n**Daftar gelar milikmu:**\n${ownedList}`,
          flags: MessageFlags.Ephemeral
        });
      }

      userData.equippedTitle = foundTitle;
      storage.write('gacha_data', gachaData);

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('Gelar Utama Berhasil Dipasang')
        .setDescription(
          `Gelar **"${foundTitle}"** sekarang dipasang sebagai gelar resmi profilmu.\n\n` +
          `Gelar ini akan tampil pada kartu profil \`/card\` dan \`/userinfo\`.`
        )
        .setFooter({ text: 'Gunakan /card untuk melihat kartu profil' });

      return interaction.reply({ embeds: [embed] });
    }

    // === SUBCOMMAND: UNEQUIP ===
    if (sub === 'unequip') {
      const gachaData = storage.read('gacha_data');
      const userData = getOrInitUserData(gachaData, guildId, userId);

      if (!userData.equippedTitle) {
        return interaction.reply({ content: 'Kamu sedang tidak memasang gelar utama apapun.', flags: MessageFlags.Ephemeral });
      }

      const prev = userData.equippedTitle;
      userData.equippedTitle = null;
      storage.write('gacha_data', gachaData);

      return interaction.reply({
        content: `Berhasil mencopot Gelar Utama **"${prev}"**.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // === SUBCOMMAND: FUSE (Alkimia Tempa Relik) ===
    if (sub === 'fuse') {
      const sourceTier = interaction.options.getString('tier');
      const nextTierMap = {
        COMMON: 'RARE',
        RARE: 'EPIC',
        EPIC: 'LEGENDARY',
        LEGENDARY: 'MYTHIC'
      };
      const targetTier = nextTierMap[sourceTier];
      if (!targetTier) {
        return interaction.reply({ content: 'Tier ini tidak dapat ditempa lebih tinggi.', flags: MessageFlags.Ephemeral });
      }

      const gachaData = storage.read('gacha_data');
      const userData = getOrInitUserData(gachaData, guildId, userId);

      const candidateItems = userData.inventory.filter(name => {
        const itemObj = GACHA_ITEMS.find(g => g.name === name);
        return itemObj && itemObj.tier === sourceTier;
      });

      if (candidateItems.length < 3) {
        return interaction.reply({
          content: `Bahan alkimia kurang. Dibutuhkan minimal **3 Relik [${sourceTier}]** untuk ditempa menjadi **1 Relik [${targetTier}]**.\n\nSaat ini kamu memiliki **${candidateItems.length} Relik [${sourceTier}]** di inventaris.`,
          flags: MessageFlags.Ephemeral
        });
      }

      // Ambil 3 item pertama dari candidate
      const itemsToSacrifice = candidateItems.slice(0, 3);
      for (const sacName of itemsToSacrifice) {
        const idx = userData.inventory.indexOf(sacName);
        if (idx !== -1) userData.inventory.splice(idx, 1);
      }

      // Pilih 1 item baru secara acak dari targetTier
      const targetCandidates = GACHA_ITEMS.filter(g => g.tier === targetTier);
      const forgedItem = targetCandidates[Math.floor(Math.random() * targetCandidates.length)];

      const isDuplicate = userData.inventory.includes(forgedItem.name);
      if (!isDuplicate) {
        userData.inventory.push(forgedItem.name);
      }
      if (forgedItem.badge && !userData.badges.includes(forgedItem.badge)) {
        userData.badges.push(forgedItem.badge);
      }
      if (forgedItem.title && !userData.titles.includes(forgedItem.title)) {
        userData.titles.push(forgedItem.title);
      }

      let extraDust = 0;
      if (isDuplicate) {
        extraDust = forgedItem.recycleStardust || 25;
        userData.stardust += extraDust;
      }

      // Throne role update jika hasil tempa adalah MYTHIC atau LEGENDARY
      const roleResultText = await applySmartGachaRole(interaction.guild, interaction.member, forgedItem.tier, userData, gachaData, interaction.channel, client);
      storage.write('gacha_data', gachaData);

      // Broadcast if Mythic or Legendary
      if (forgedItem.tier === 'MYTHIC' || forgedItem.tier === 'LEGENDARY') {
        broadcastJackpot(interaction.guild, interaction.member, forgedItem, client);
      }

      const embed = new EmbedBuilder()
        .setColor(forgedItem.color)
        .setAuthor({
          name: 'Alkimia Tempa Relik',
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTitle(`${forgedItem.name} [${forgedItem.tier}]`)
        .setDescription(
          `Pengorbanan 3 relik **[${sourceTier}]**:\n` +
          `${itemsToSacrifice.map(s => `• ~~*${s}*~~`).join('\n')}\n\n` +
          `Berhasil ditempa menjadi relik bertier lebih tinggi: **${forgedItem.name}** (${forgedItem.stars})\n` +
          `*${forgedItem.desc}*\n\n` +
          (forgedItem.badge ? `• **Badge:** \`${forgedItem.badge}\`\n` : '') +
          (forgedItem.title ? `• **Gelar:** \`"${forgedItem.title}"\`\n` : '') +
          (isDuplicate ? `• *(Duplikat dikonversi menjadi +${extraDust} Stardust)*\n` : '') +
          roleResultText
        )
        .setFooter({ text: 'Gunakan /gacha inventory untuk melihat koleksi' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // === SUBCOMMAND: ALBUM ===
    if (sub === 'album') {
      const gachaData = storage.read('gacha_data');
      const userData = getOrInitUserData(gachaData, guildId, userId);

      const tiers = ['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'COMMON'];
      const tierHeaders = {
        MYTHIC: 'MYTHIC (3%)',
        LEGENDARY: 'LEGENDARY (10%)',
        EPIC: 'EPIC (20%)',
        RARE: 'RARE (32%)',
        COMMON: 'COMMON (35%)'
      };

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('Album Koleksi Relik Server')
        .setDescription(
          `Daftar seluruh relik yang tersedia di server **${interaction.guild.name}**.\n\n` +
          `**Koleksi Saat Ini:** **${userData.inventory.length}/${GACHA_ITEMS.length} Item** (${Math.round((userData.inventory.length / GACHA_ITEMS.length) * 100)}%)`
        );

      tiers.forEach(tier => {
        const items = GACHA_ITEMS.filter(i => i.tier === tier);
        const list = items.map(item => {
          const has = userData.inventory.includes(item.name);
          const icon = has ? '[✓]' : '[ ]';
          return `${icon} **${item.name}**`;
        }).join('\n');

        embed.addFields({
          name: `${tierHeaders[tier]} (${items.length} Item)`,
          value: list,
          inline: false
        });
      });

      embed.setFooter({ text: 'Gunakan /gacha pull untuk membuka relik baru' });
      return interaction.reply({ embeds: [embed] });
    }

    // === SUBCOMMAND: SHOP ===
    if (sub === 'shop') {
      const gachaData = storage.read('gacha_data');
      const userData = getOrInitUserData(gachaData, guildId, userId);

      const shopList = GACHA_SHOP_ITEMS.map((item, idx) => {
        return `\`#${idx + 1}\` **${item.name}** — **${item.cost} Dust**\n*${item.desc}*`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('Toko Stardust Gacha')
        .setDescription(
          `Gunakan Stardust hasil daur ulang relik duplikat untuk membeli tiket dan gelar.\n\n` +
          `• **Saldo Stardust:** **${userData.stardust} Dust**\n` +
          `• **Saldo Tiket:** **${userData.tickets} Tiket**\n\n` +
          `**Katalog Barang:**\n\n${shopList}`
        )
        .setFooter({ text: 'Gunakan /gacha buy [item] untuk membeli' });

      return interaction.reply({ embeds: [embed] });
    }

    // === SUBCOMMAND: BUY ===
    if (sub === 'buy') {
      const itemId = interaction.options.getString('item');
      const shopItem = GACHA_SHOP_ITEMS.find(i => i.id === itemId);

      if (!shopItem) {
        return interaction.reply({ content: 'Barang tidak ditemukan di toko.', flags: MessageFlags.Ephemeral });
      }

      const gachaData = storage.read('gacha_data');
      const userData = getOrInitUserData(gachaData, guildId, userId);

      if (userData.stardust < shopItem.cost) {
        return interaction.reply({
          content: `Stardust tidak mencukupi. Dibutuhkan **${shopItem.cost} Dust**, kamu saat ini memiliki **${userData.stardust} Dust**.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (shopItem.type === 'title_badge') {
        if (userData.titles.includes(shopItem.title)) {
          return interaction.reply({
            content: `Kamu sudah memiliki gelar **"${shopItem.title}"**.`,
            flags: MessageFlags.Ephemeral
          });
        }
      }

      userData.stardust -= shopItem.cost;

      let rewardText = '';
      if (shopItem.type === 'ticket') {
        userData.tickets += shopItem.amount;
        rewardText = `• **+${shopItem.amount} Tiket Gacha** ditambahkan ke akunmu.`;
      } else if (shopItem.type === 'title_badge') {
        if (!userData.titles.includes(shopItem.title)) userData.titles.push(shopItem.title);
        if (!userData.badges.includes(shopItem.badge)) userData.badges.push(shopItem.badge);
        rewardText = `• Gelar & Lencana Terbuka: \`"${shopItem.title}"\` & \`${shopItem.badge}\``;
      }

      storage.write('gacha_data', gachaData);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Pembelian Berhasil')
        .setDescription(
          `Kamu telah membeli **${shopItem.name}** seharga **${shopItem.cost} Stardust**.\n\n` +
          `${rewardText}\n\n` +
          `• **Sisa Stardust:** **${userData.stardust} Dust**\n` +
          `• **Sisa Tiket:** **${userData.tickets} Tiket**`
        )
        .setFooter({ text: 'Gunakan /gacha inventory untuk melihat inventaris' });

      return interaction.reply({ embeds: [embed] });
    }

    // === SUBCOMMAND: GIFT ===
    if (sub === 'gift') {
      const targetUser = interaction.options.getUser('user');
      const itemName = interaction.options.getString('item_name').trim();

      if (targetUser.id === userId) {
        return interaction.reply({ content: 'Kamu tidak bisa memberikan hadiah ke dirimu sendiri.', flags: MessageFlags.Ephemeral });
      }
      if (targetUser.bot) {
        return interaction.reply({ content: 'Kamu tidak bisa memberikan relik ke bot.', flags: MessageFlags.Ephemeral });
      }

      const gachaData = storage.read('gacha_data');
      const senderData = getOrInitUserData(gachaData, guildId, userId);
      const receiverData = getOrInitUserData(gachaData, guildId, targetUser.id);

      const itemIdx = senderData.inventory.findIndex(it => it.toLowerCase() === itemName.toLowerCase());
      if (itemIdx === -1) {
        return interaction.reply({
          content: `Kamu tidak memiliki relik bernama **"${itemName}"** di inventarismu. Silakan cek nama di \`/gacha inventory\`.`,
          flags: MessageFlags.Ephemeral
        });
      }

      const exactItemName = senderData.inventory[itemIdx];
      const relicObj = GACHA_ITEMS.find(g => g.name === exactItemName);

      senderData.inventory.splice(itemIdx, 1);

      let receiverNotes = '';
      if (receiverData.inventory.includes(exactItemName)) {
        const dustGained = relicObj ? (relicObj.recycleStardust || 25) : 25;
        receiverData.stardust += dustGained;
        receiverNotes = `*(Karena <@${targetUser.id}> sudah memiliki relik ini, otomatis dikonversi menjadi **+${dustGained} Stardust**)*`;
      } else {
        receiverData.inventory.push(exactItemName);
        if (relicObj?.badge && !receiverData.badges.includes(relicObj.badge)) {
          receiverData.badges.push(relicObj.badge);
        }
        if (relicObj?.title && !receiverData.titles.includes(relicObj.title)) {
          receiverData.titles.push(relicObj.title);
        }
      }

      storage.write('gacha_data', gachaData);

      const embed = new EmbedBuilder()
        .setColor(relicObj ? relicObj.color : 0x57F287)
        .setAuthor({
          name: 'Hadiah Relik Diterima',
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTitle('Pengiriman Hadiah Relik Berhasil')
        .setDescription(
          `<@${userId}> memberikan **${exactItemName}** kepada <@${targetUser.id}>.\n\n` +
          `*${relicObj ? relicObj.desc : 'Relik penuh kenangan persahabatan.'}*\n\n` +
          receiverNotes
        )
        .setFooter({ text: 'Gunakan /gacha inventory untuk melihat koleksi' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // === SUBCOMMAND: LEADERBOARD ===
    if (sub === 'leaderboard') {
      const category = interaction.options.getString('category') || 'collector';
      const gachaData = storage.read('gacha_data');
      const guildUsers = gachaData[guildId] || {};

      const userEntries = Object.entries(guildUsers);
      if (userEntries.length === 0) {
        return interaction.reply({
          content: 'Belum ada data gacha di server ini. Ketik `/gacha pull` untuk memulai.',
          flags: MessageFlags.Ephemeral
        });
      }

      let title = '';
      let descHeader = '';

      if (category === 'collector') {
        title = 'Klasemen Top Collector';
        descHeader = 'Peringkat anggota dengan koleksi relik terbanyak:';
        userEntries.sort((a, b) => (b[1].inventory?.length || 0) - (a[1].inventory?.length || 0));
      } else if (category === 'pulls') {
        title = 'Klasemen Total Tarikan Gacha';
        descHeader = 'Peringkat anggota dengan tarikan gacha terbanyak:';
        userEntries.sort((a, b) => (b[1].pulls || 0) - (a[1].pulls || 0));
      } else if (category === 'luck') {
        title = 'Klasemen Relik Langka (Mythic & Legendary)';
        descHeader = 'Peringkat anggota pemilik relik Mythic & Legendary terbanyak:';
        userEntries.sort((a, b) => {
          const countA = (a[1].inventory || []).filter(name => {
            const found = GACHA_ITEMS.find(g => g.name === name);
            return found && (found.tier === 'MYTHIC' || found.tier === 'LEGENDARY');
          }).length;
          const countB = (b[1].inventory || []).filter(name => {
            const found = GACHA_ITEMS.find(g => g.name === name);
            return found && (found.tier === 'MYTHIC' || found.tier === 'LEGENDARY');
          }).length;
          return countB - countA;
        });
      } else if (category === 'defense') {
        title = 'Klasemen Pertahanan Tahta (Top Defenders)';
        descHeader = 'Peringkat pemegang tahta dengan pertahanan beruntun terbanyak:';
        userEntries.sort((a, b) => (b[1].duelDefenseStreak || 0) - (a[1].duelDefenseStreak || 0));
      }

      const top10 = userEntries.slice(0, 10);

      const listRows = top10.map(([uId, data], idx) => {
        const rankNum = `${idx + 1}.`;
        if (category === 'collector') {
          return `${rankNum} <@${uId}> — **${data.inventory?.length || 0}/${GACHA_ITEMS.length} Item** (${data.pulls || 0} tarikan)`;
        } else if (category === 'pulls') {
          return `${rankNum} <@${uId}> — **${data.pulls || 0}x Tarikan** (${data.inventory?.length || 0} item)`;
        } else if (category === 'defense') {
          const streak = data.duelDefenseStreak || 0;
          const roleText = data.activeRole ? ` [${data.activeRole.tier}]` : '';
          return `${rankNum} <@${uId}> — **${streak}x Pertahanan Beruntun**${roleText}`;
        } else {
          const legCount = (data.inventory || []).filter(name => {
            const found = GACHA_ITEMS.find(g => g.name === name);
            return found && (found.tier === 'MYTHIC' || found.tier === 'LEGENDARY');
          }).length;
          return `${rankNum} <@${uId}> — **${legCount} Relik Mythic/Legendary** (${data.inventory?.length || 0} total item)`;
        }
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle(title)
        .setDescription(`${descHeader}\n\n${listRows}`)
        .setFooter({ text: `${interaction.guild.name} • Peringkat Gacha` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};
