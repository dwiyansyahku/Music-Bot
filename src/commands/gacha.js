const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
 * Master Loot Table (32 Collectible Artifacts across 5 Tiers)
 */
const GACHA_ITEMS = [
  // ✦ MYTHIC (1% Drop Rate — 5 Stars)
  {
    id: 'mythic_aegis',
    tier: 'MYTHIC',
    rate: 1,
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
    rate: 1,
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
    rate: 1,
    stars: '★★★★★',
    tag: '✦',
    color: 0xFF007F,
    name: 'Genesis Vinyl of Eternity',
    badge: '✦ Master of Harmonies',
    title: 'Eternal Maestro',
    desc: 'Piringan hitam mitos yang memutar melodi awal mula alam semesta.',
    recycleStardust: 500
  },

  // 🟡 LEGENDARY (4% Drop Rate — 5 Stars)
  {
    id: 'leg_crown',
    tier: 'LEGENDARY',
    rate: 4,
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
    rate: 4,
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
    rate: 4,
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
    rate: 4,
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
    rate: 4,
    stars: '★★★★★',
    tag: '✧',
    color: 0xFEE75C,
    name: 'Chrono Scepter',
    badge: '✦ Time Traveler',
    title: 'Master of Chronos',
    desc: 'Tongkat pengendali waktu yang membekukan detik-detik keberuntunganmu.',
    recycleStardust: 200
  },

  // 🟣 EPIC (15% Drop Rate — 4 Stars)
  {
    id: 'epic_orb',
    tier: 'EPIC',
    rate: 15,
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
    rate: 15,
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
    rate: 15,
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
    rate: 15,
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
    rate: 15,
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
    rate: 15,
    stars: '★★★★☆',
    tag: '◈',
    color: 0x9B59B6,
    name: 'Thunderstorm Harp',
    badge: '◈ Storm Bard',
    title: 'Thunderstruck',
    desc: 'Harpa petir yang menghasilkan alunan musik berdentum dahsyat.',
    recycleStardust: 75
  },

  // 🔵 RARE (30% Drop Rate — 3 Stars)
  {
    id: 'rare_clover',
    tier: 'RARE',
    rate: 30,
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
    rate: 30,
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
    rate: 30,
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
    rate: 30,
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
    rate: 30,
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
    rate: 30,
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
    rate: 30,
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
    rate: 30,
    stars: '★★★☆☆',
    tag: '◇',
    color: 0x3498DB,
    name: 'Prismatic Crystal Shard',
    badge: '◇ Prism Weaver',
    title: 'Spectrum Artist',
    desc: 'Prisma kristal yang membiaskan cahaya redup menjadi pelangi memukau.',
    recycleStardust: 25
  },

  // ⚪ COMMON (50% Drop Rate — 2 Stars)
  {
    id: 'com_fishbone',
    tier: 'COMMON',
    rate: 50,
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
    rate: 50,
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
    rate: 50,
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
    rate: 50,
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
    rate: 50,
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
    rate: 50,
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
    rate: 50,
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
    rate: 50,
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
    rate: 50,
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
    rate: 50,
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
    durationHours: 7 * 24, // 7 Hari
    days: 7,
    tierRank: 4
  },
  LEGENDARY: {
    name: 'Tahta Sultan Server (LEGENDARY)',
    quota: 5,           // Maksimal 5 orang di server
    durationHours: 3 * 24, // 3 Hari
    days: 3,
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
      duelHistory: []
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
 * Sistem Tahta Terbatas & Kudeta (Throne Usurpation)
 */
async function applySmartGachaRole(guild, member, itemTier, userData, gachaData, channel = null, client = null) {
  const config = THRONE_CONFIG[itemTier];
  if (!config) return ''; // Hanya Mythic dan Legendary yang mendapatkan Role

  const guildId = guild.id;
  const settingsData = storage.read('settings');
  const configuredRoleId = settingsData[guildId]?.gachaRoles?.[itemTier];
  if (!configuredRoleId) return '';

  const tierDurationMs = config.durationHours * 60 * 60 * 1000;
  const now = Date.now();

  // 1. Cek semua pemegang tahta aktif saat ini di server untuk tier ini
  const guildUsers = gachaData[guildId] || {};
  const activeHolders = [];

  for (const [uId, uData] of Object.entries(guildUsers)) {
    if (uData.activeRole && uData.activeRole.tier === itemTier && uData.activeRole.expiresAt > now) {
      activeHolders.push({
        userId: uId,
        userData: uData,
        expiresAt: uData.activeRole.expiresAt
      });
    }
  }

  // Case A: Member ini SUDAH memegang tahta tier ini -> STACK / EXTEND DURASI
  if (userData.activeRole && userData.activeRole.tier === itemTier && userData.activeRole.expiresAt > now) {
    userData.activeRole.expiresAt += tierDurationMs;
    try {
      if (!member.roles.cache.has(configuredRoleId)) {
        await member.roles.add(configuredRoleId);
      }
    } catch (_) {}
    const rem = formatTimeRemaining(userData.activeRole.expiresAt - now);
    return `\n• **Durasi Tahta Diperpanjang (+${config.days} Hari)**\nMasa tahta aktif: **${rem}**`;
  }

  // Case B: Member sedang punya role tier LEBIH TINGGI (misal punya Mythic, dapat Legendary) -> Jangan turunkan kasta!
  const currentRank = userData.activeRole ? (TIER_RANK[userData.activeRole.tier] || 0) : 0;
  if (currentRank > config.tierRank && userData.activeRole.expiresAt > now) {
    const remHigh = formatTimeRemaining(userData.activeRole.expiresAt - now);
    return `\n• *Mempertahankan tahta kasta tertinggi <@&${userData.activeRole.roleId}> (${remHigh} tersisa).*`;
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
        expiresAt: now + tierDurationMs
      };
      const seatsUsed = activeHolders.length + 1;
      return `\n• **Tahta ${itemTier} Diperoleh (${seatsUsed}/${config.quota} Kursi Terisi)**\nRole <@&${configuredRoleId}> aktif selama **${config.days} Hari**.`;
    } catch (err) {
      console.error('[Gacha Throne Assign Error]:', err.message);
      return '';
    }
  }

  // Case D: KURSI TAHTA PENUH! (>= Quota) -> CLASH OF THRONES 2.0
  activeHolders.sort((a, b) => a.expiresAt - b.expiresAt);

  const { allData: throneAll, guildData: throneGuild } = getGuildThroneData(guildId);

  // Cari defender yang sedang TIDAK bertarung dalam duel aktif untuk tier ini
  const busyDefenderIds = new Set(
    Object.values(throneGuild.activeDuels || {})
      .filter(d => d.itemTier === itemTier && d.status === 'WAITING_TACTICS')
      .map(d => d.defenderId)
  );

  // Cari defender dengan sisa waktu paling sedikit yang belum diserang
  const targetDefender = activeHolders.find(h => !busyDefenderIds.has(h.userId));

  // Jika SEMUA kursi tahta tier ini sedang diduelkan -> Masuk Antrean (Queue)
  if (!targetDefender) {
    const existingQueueIdx = throneGuild.queues[itemTier].findIndex(q => q.challengerId === member.id);
    if (existingQueueIdx !== -1) {
      return `\n• *Kamu sudah berada di Antrean Penantang Tahta ${itemTier} (Posisi: #${existingQueueIdx + 1}). Kartu tetap aman di inventaris.*`;
    }

    throneGuild.queues[itemTier].push({
      challengerId: member.id,
      itemTier,
      configuredRoleId,
      channelId: channel ? channel.id : null,
      queuedAt: now
    });
    saveThroneStorage(throneAll);
    const queuePos = throneGuild.queues[itemTier].length;
    return (
      `\n• **Semua Kursi Tahta ${itemTier} Sedang Bertarung**\n` +
      `<@${member.id}> ditempatkan pada **Antrean Penantang Tahta (Posisi: #${queuePos})**.\n` +
      `Pertarunganmu akan otomatis dipanggil saat duel selesai.`
    );
  }

  // Fallback auto-kudeta jika channel/client tidak tersedia
  if (!channel || !client) {
    try {
      const usurpedMember = await guild.members.fetch(targetDefender.userId).catch(() => null);
      if (usurpedMember && usurpedMember.roles.cache.has(configuredRoleId)) {
        await usurpedMember.roles.remove(configuredRoleId).catch(() => {});
      }
      targetDefender.userData.activeRole = null;
      targetDefender.userData.stardust = (targetDefender.userData.stardust || 0) + 250;

      await member.roles.add(configuredRoleId);
      userData.activeRole = {
        tier: itemTier,
        roleId: configuredRoleId,
        expiresAt: now + tierDurationMs
      };

      return (
        `\n• **Kudeta Tahta ${itemTier}**\n` +
        `<@${member.id}> merebut kursi tahta dari <@${targetDefender.userId}> (Kompensasi: +250 Stardust).\n` +
        `Role <@&${configuredRoleId}> aktif selama **${config.days} Hari**.`
      );
    } catch (kudetaErr) {
      console.error('[Gacha Kudeta Error]:', kudetaErr.message);
      return '';
    }
  }

  // INITIATE 12-HOUR 3-TACTIC DUEL
  try {
    let duelTargetChannel = channel;
    const arenaChannelId = settingsData[guildId]?.gachaChannels?.duel;
    if (arenaChannelId && client) {
      const arenaCh = await client.channels.fetch(arenaChannelId).catch(() => null);
      if (arenaCh) duelTargetChannel = arenaCh;
    }

    const duelData = await initiateThroneDuel({
      guildId,
      challengerId: member.id,
      targetDefender,
      itemTier,
      configuredRoleId,
      channel: duelTargetChannel,
      client
    });

    const expiresAt = duelData.expiresAt;
    const arenaText = (channel && duelTargetChannel.id !== channel.id)
      ? `\n• Arena: <#${duelTargetChannel.id}>`
      : '';

    return (
      `\n• **Tantangan Tahta ${itemTier} Dimulai (12 Jam)**\n` +
      `<@${member.id}> menantang <@${targetDefender.userId}> dalam duel strategi **Best of 3**.\n` +
      `Batas waktu: **12 Jam** (hingga <t:${Math.floor(expiresAt / 1000)}:R>).` +
      arenaText +
      `\n*Silakan pasang strategi pilihanmu melalui tombol di bawah.*`
    );
  } catch (duelErr) {
    console.error('[Duel Init Error]:', duelErr.message);
    return '';
  }
}

/**
 * Worker: Pengecekan otomatis role gacha yang sudah kadaluarsa (dijalankan di ready.js)
 */
async function checkAndExpireGachaRoles(client) {
  const gachaData = storage.read('gacha_data');
  const now = Date.now();
  let modified = false;

  for (const [guildId, guildUsers] of Object.entries(gachaData)) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;

    for (const [userId, userData] of Object.entries(guildUsers)) {
      if (userData.activeRole && userData.activeRole.expiresAt && userData.activeRole.expiresAt <= now) {
        const expiredRoleId = userData.activeRole.roleId;
        const expiredTier = userData.activeRole.tier;
        userData.activeRole = null;
        modified = true;

        try {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (member && expiredRoleId && member.roles.cache.has(expiredRoleId)) {
            await member.roles.remove(expiredRoleId).catch(() => {});
            console.log(`⏱️ [Gacha Expiry] Mencabut role ${expiredTier} dari ${member.user.tag} di ${guild.name} (Masa tahta habis).`);
          }
        } catch (expErr) {
          console.error(`[Gacha Expiry Error] User ${userId}:`, expErr.message);
        }
      }
    }
  }

  if (modified) {
    storage.write('gacha_data', gachaData);
  }
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
  const tierDurationMs = config.durationHours * 60 * 60 * 1000;
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
      expiresAt: now + tierDurationMs
    };

    resultTitle = `Tahta ${duel.itemTier} Berpindah Tangan`;
    resultDesc = (
      `<@${duel.challengerId}> berhasil mengungguli <@${duel.defenderId}> dalam duel strategi.\n\n` +
      `• Pemegang Tahta Baru: **<@${duel.challengerId}>** (${config.name}, ${config.days} Hari)\n` +
      `• Kompensasi: **<@${duel.defenderId}>** (+250 Stardust)`
    );
  } else {
    // DEFENDER MENANG (atau SERI)
    const bonusDurationMs = 24 * 60 * 60 * 1000;
    if (defenderData.activeRole && defenderData.activeRole.expiresAt > now) {
      defenderData.activeRole.expiresAt += bonusDurationMs;
    }
    defenderData.duelDefenseStreak = (defenderData.duelDefenseStreak || 0) + 1;

    let streakText = '';
    if (defenderData.duelDefenseStreak >= 3 && !defenderData.badges.includes('✦ Unshakeable Sovereign')) {
      defenderData.badges.push('✦ Unshakeable Sovereign');
      streakText = `\n• Lencana Terbuka: \`Unshakeable Sovereign\` (${defenderData.duelDefenseStreak}x Pertahanan Berturut-turut)`;
    } else if (defenderData.duelDefenseStreak >= 2) {
      streakText = `\n• Pertahanan Beruntun: ${defenderData.duelDefenseStreak}x`;
    }

    const rem = defenderData.activeRole ? formatTimeRemaining(defenderData.activeRole.expiresAt - now) : '-';
    resultTitle = `Tahta ${duel.itemTier} Berhasil Dipertahankan`;
    resultDesc = (
      `<@${duel.defenderId}> berhasil mempertahankan posisinya dari tantangan <@${duel.challengerId}>.\n\n` +
      `• Status: **<@${duel.defenderId}>** tetap menduduki tahta (+1 Hari bonus, sisa: **${rem}**)` +
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
      expiresAt: now + tierDurationMs
    };

    tierColor = 0xFF007F;
    resultTitle = `Tahta ${duel.itemTier} Direbut (Defender Tidak Merespon)`;
    resultDesc = (
      `<@${duel.defenderId}> tidak memasang taktik dalam batas waktu 12 Jam.\n\n` +
      `• Pemegang Tahta Baru: **<@${duel.challengerId}>** (${config.name}, ${config.days} Hari)\n` +
      `• Kompensasi: **<@${duel.defenderId}>** (+250 Stardust)`
    );
  } else if (!cHasTactics && dHasTactics) {
    // Challenger AFK > 12 Jam -> Defender Menang Default!
    const bonusDurationMs = 24 * 60 * 60 * 1000;
    if (defenderData.activeRole && defenderData.activeRole.expiresAt > now) {
      defenderData.activeRole.expiresAt += bonusDurationMs;
    }
    defenderData.duelDefenseStreak = (defenderData.duelDefenseStreak || 0) + 1;

    const rem = defenderData.activeRole ? formatTimeRemaining(defenderData.activeRole.expiresAt - now) : '-';
    tierColor = 0x57F287;
    resultTitle = `Tahta ${duel.itemTier} Dipertahankan (Penantang Tidak Merespon)`;
    resultDesc = (
      `<@${duel.challengerId}> tidak memasang taktik dalam batas waktu 12 Jam.\n\n` +
      `• Status: **<@${duel.defenderId}>** tetap menduduki tahta (+1 Hari bonus, sisa: **${rem}**)\n` +
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
    if (uData.activeRole && uData.activeRole.tier === itemTier && uData.activeRole.expiresAt > now) {
      activeHolders.push({ userId: uId, userData: uData, expiresAt: uData.activeRole.expiresAt });
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
      const tierDurationMs = config.durationHours * 60 * 60 * 1000;
      uData.activeRole = {
        tier: itemTier,
        roleId: nextQ.configuredRoleId,
        expiresAt: now + tierDurationMs
      };
      storage.write('gacha_data', gachaData);

      if (nextQ.channelId) {
        const ch = await client.channels.fetch(nextQ.channelId).catch(() => null);
        if (ch) {
          ch.send(`Kursi tahta kosong tersedia. <@${nextQ.challengerId}> dari antrean resmi menduduki kursi tahta **${config.name}**.`);
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

  activeHolders.sort((a, b) => a.expiresAt - b.expiresAt);
  const targetDefender = activeHolders.find(h => !busyDefenderIds.has(h.userId));

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

  // 1. HARD PITY TRIGGER (30 Pulls for Legendary+, 10 Pulls for Epic+)
  if (pityLeg >= 29) {
    targetTier = Math.random() < 0.2 ? 'MYTHIC' : 'LEGENDARY';
  } else if (pityEpic >= 9) {
    const subRand = Math.random() * 100;
    if (subRand < 5) targetTier = 'MYTHIC';
    else if (subRand < 30) targetTier = 'LEGENDARY';
    else targetTier = 'EPIC';
  } else {
    // Normal Probabilities
    if (rand < 1) targetTier = 'MYTHIC';          // 1%
    else if (rand < 5) targetTier = 'LEGENDARY';   // 4%
    else if (rand < 20) targetTier = 'EPIC';       // 15%
    else if (rand < 50) targetTier = 'RARE';       // 30%
    else targetTier = 'COMMON';                    // 50%
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
 * Handle Single / Multi Pull Execution Logic
 */
async function executeGachaPull(interaction, client, amount = 1) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const member = interaction.member;

  const gachaData = storage.read('gacha_data');
  const userData = getOrInitUserData(gachaData, guildId, userId);

  if (userData.tickets < amount) {
    const embedNoTickets = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('Tiket Gacha Tidak Mencukupi')
      .setDescription(
        `Kamu membutuhkan **${amount} Tiket**, saat ini hanya memiliki **${userData.tickets} Tiket**.\n\n` +
        `**Cara Mendapatkan Tiket:**\n` +
        `• Klaim harian gratis di \`/gacha daily\`\n` +
        `• Tukar Stardust di \`/gacha shop\`\n` +
        `• Ikuti kuis di \`/musicquiz\` atau aktif di Voice Channel`
      )
      .setFooter({ text: `Tiket: ${userData.tickets} • Stardust: ${userData.stardust}` });

    const rowDaily = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('gacha_btn_daily')
        .setLabel('Klaim Harian')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('gacha_btn_inv')
        .setLabel('Inventory')
        .setStyle(ButtonStyle.Secondary)
    );

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
    const roleResultText = await applySmartGachaRole(interaction.guild, member, item.tier, userData, gachaData, interaction.channel, client);
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
          value: `Epic: **${10 - (userData.pityEpic || 0)}x**\nLegendary: **${30 - (userData.pityLegendary || 0)}x**`,
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

    if (interaction.replied || interaction.deferred) {
      return interaction.editReply({ content: null, embeds: [embed], components: [row] });
    }
    return interaction.reply({ embeds: [embed], components: [row] });
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
  if (highestItem) {
    multiRoleText = await applySmartGachaRole(interaction.guild, member, highestItem.tier, userData, gachaData, interaction.channel, client);
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
        value: `Epic: **${10 - (userData.pityEpic || 0)}x**\nLegendary: **${30 - (userData.pityLegendary || 0)}x**`,
        inline: true
      }
    )
    .setFooter({ text: 'Gunakan /gacha inventory untuk melihat koleksi' })
    .setTimestamp();

  const row = createGachaActionRow();

  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({ content: null, embeds: [multiEmbed], components: [row] });
  }
  return interaction.reply({ embeds: [multiEmbed], components: [row] });
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

  if (timeSinceLast < cooldownMs) {
    const remainingMs = cooldownMs - timeSinceLast;
    const remHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    const cdEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('Hadiah Harian Belum Siap')
      .setDescription(
        `Kamu sudah mengklaim hadiah harian sebelumnya.\n` +
        `Silakan kembali lagi dalam **${remHours} jam ${remMins} menit**.\n\n` +
        `• **Streak Saat Ini:** Hari ke-${userData.streak || 1}\n` +
        `• **Saldo:** **${userData.tickets} Tiket** • **${userData.stardust} Stardust**`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('gacha_btn_pull_1')
        .setLabel('Tarik Gacha')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('gacha_btn_inv')
        .setLabel('Inventory')
        .setStyle(ButtonStyle.Secondary)
    );

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
      `• **${userData.tickets} Tiket** • **${userData.stardust} Stardust**`
    )
    .setFooter({ text: 'Klaim setiap hari untuk mempertahankan streak hadiah' })
    .setTimestamp();

  const row = createGachaActionRow();

  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({ embeds: [embed], components: [row] });
  }
  return interaction.reply({ embeds: [embed], components: [row] });
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
  if (targetData.activeRole && targetData.activeRole.expiresAt > Date.now()) {
    const rem = formatTimeRemaining(targetData.activeRole.expiresAt - Date.now());
    activeRoleDisplay = `<@&${targetData.activeRole.roleId}> [${targetData.activeRole.tier}] — Sisa Tahta: **${rem}**`;
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
        value: `Epic: **${10 - (targetData.pityEpic || 0)}x** | Leg: **${30 - (targetData.pityLegendary || 0)}x**`,
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
    .setFooter({ text: 'Gunakan /gacha pull untuk membuka relik baru' })
    .setTimestamp();

  const row = createGachaActionRow();

  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({ embeds: [embed], components: [row] });
  }
  return interaction.reply({ embeds: [embed], components: [row] });
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
      `• **MYTHIC (1%):** Tahta **3 Kursi Maksimal** • Durasi **7 Hari** • Daur ulang: +500 Dust\n` +
      `• **LEGENDARY (4%):** Tahta **5 Kursi Maksimal** • Durasi **3 Hari** • Daur ulang: +200 Dust\n` +
      `• **EPIC (15%):** Relik Koleksi & Lencana • Daur ulang: +75 Dust\n` +
      `• **RARE (30%):** Relik Koleksi • Daur ulang: +25 Dust\n` +
      `• **COMMON (50%):** Benda santai • Daur ulang: +10 Dust\n\n` +
      `**Sistem Duel Perebutan Tahta (12 Jam):**\n` +
      `• Jika kuota kursi Mythic (3/3) atau Legendary (5/5) telah penuh, penantang akan bertarung dalam duel strategi **Best of 3** melawan pemegang tahta.\n` +
      `• Pemain yang kalah menerima kompensasi **+250 Stardust**.\n\n` +
      `**Garansi Pity System:**\n` +
      `• **Epic Guarantee:** Minimal 1 item **EPIC+** setiap **10 pull**.\n` +
      `• **Legendary Guarantee:** Minimal 1 item **LEGENDARY+** pada pull ke-**30**.\n\n` +
      `**Status Pity Akunmu:**\n` +
      `• Garansi Epic berikutnya dalam: **${10 - (userData.pityEpic || 0)}x tarikan**\n` +
      `• Garansi Legendary berikutnya dalam: **${30 - (userData.pityLegendary || 0)}x tarikan**`
    )
    .setFooter({ text: 'Daur ulang duplikat menghasilkan Stardust untuk dibelanjakan di /gacha shop' });

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
              { name: '3x EPIC -> 1x LEGENDARY', value: 'EPIC' }
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
              { name: 'Relik Langka (Mythic & Legendary)', value: 'luck' }
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
              { name: 'Channel Main Gacha (Batasi command gacha hanya di channel ini)', value: 'play' },
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
    // Subcommand: setrole (Admin only)
    .addSubcommand(sub =>
      sub
        .setName('setrole')
        .setDescription('Atur Role Discord Tahta untuk Mythic (3 Kursi/7H) atau Legendary (5 Kursi/3H) (Admin Only)')
        .addStringOption(opt =>
          opt
            .setName('tier')
            .setDescription('Tingkat kelangkaan Tahta')
            .setRequired(true)
            .addChoices(
              { name: 'MYTHIC (Maksimal 3 Kursi • Durasi 7 Hari)', value: 'MYTHIC' },
              { name: 'LEGENDARY (Maksimal 5 Kursi • Durasi 3 Hari)', value: 'LEGENDARY' }
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
    ),

  // Export internal helpers for interactionCreate and ready.js
  executeGachaPull,
  executeGachaDaily,
  executeGachaInventory,
  executeGachaRates,
  checkAndExpireGachaRoles,
  checkAndExpireThroneDuels,
  processDuelButton,
  activeDuels,
  GACHA_ITEMS,

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
        duel: null,
        broadcast: settingsData[guildId].gachaChannel || null
      };
    }

    // Pembatasan Channel Main Gacha (Kecuali command Admin: setchannel, setrole, listroles)
    const playChannelId = settingsData[guildId].gachaChannels.play;
    const adminSubs = ['setchannel', 'setrole', 'listroles'];
    if (playChannelId && !adminSubs.includes(sub) && interaction.channelId !== playChannelId) {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized) {
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Saluran Tidak Sesuai')
          .setDescription(`Command Gacha hanya dapat digunakan di saluran <#${playChannelId}>.`);
        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral
        });
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
        play: 'Main Gacha',
        duel: 'Arena Duel Tahta',
        broadcast: 'Broadcast Jackpot'
      };
      const label = typeLabels[type] || type;

      if (channel) {
        settingsData[guildId].gachaChannels[type] = channel.id;
        if (type === 'broadcast') settingsData[guildId].gachaChannel = channel.id;
        storage.write('settings', settingsData);

        let desc = '';
        if (type === 'play') {
          desc = `Command \`/gacha\` kini dibatasi penggunaannya di <#${channel.id}> agar percakapan server tetap rapi.`;
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
        if (type === 'play') {
          resetDesc = 'Pembatasan saluran dihapus. Member dapat bermain gacha di seluruh channel server.';
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
          `• **Durasi Tahta:** ${cfg.days} Hari\n` +
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
      const now = Date.now();

      // Cari pemegang tahta aktif
      const mythicHolders = [];
      const legHolders = [];

      for (const [uId, uData] of Object.entries(guildUsers)) {
        if (uData.activeRole && uData.activeRole.expiresAt > now) {
          const remText = formatTimeRemaining(uData.activeRole.expiresAt - now);
          if (uData.activeRole.tier === 'MYTHIC') {
            mythicHolders.push(`<@${uId}> *(Sisa: ${remText})*`);
          } else if (uData.activeRole.tier === 'LEGENDARY') {
            legHolders.push(`<@${uId}> *(Sisa: ${remText})*`);
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
      const playChText = gChannels.play ? `<#${gChannels.play}>` : '_Semua Channel (Bebas)_';
      const duelChText = gChannels.duel ? `<#${gChannels.duel}>` : '_Sesuai Channel Gacha_';
      const bcastChText = (gChannels.broadcast || settingsData[guildId].gachaChannel) ? `<#${gChannels.broadcast || settingsData[guildId].gachaChannel}>` : '_Belum diatur_';
      const channelsSummary = `• Main Gacha: ${playChText}\n• Arena Duel: ${duelChText}\n• Jackpot Alert: ${bcastChText}`;

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

    // === SUBCOMMAND: PULL ===
    if (sub === 'pull') {
      const amount = interaction.options.getInteger('amount') || 1;
      await interaction.deferReply();
      return executeGachaPull(interaction, client, amount);
    }

    // === SUBCOMMAND: DAILY ===
    if (sub === 'daily') {
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
        EPIC: 'LEGENDARY'
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

      // Throne role update jika hasil tempa adalah LEGENDARY
      const roleResultText = await applySmartGachaRole(interaction.guild, interaction.member, forgedItem.tier, userData, gachaData, interaction.channel, client);
      storage.write('gacha_data', gachaData);

      // Broadcast if Legendary
      if (forgedItem.tier === 'LEGENDARY') {
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
        MYTHIC: 'MYTHIC (1%)',
        LEGENDARY: 'LEGENDARY (4%)',
        EPIC: 'EPIC (15%)',
        RARE: 'RARE (30%)',
        COMMON: 'COMMON (50%)'
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
      }

      const top10 = userEntries.slice(0, 10);

      const listRows = top10.map(([uId, data], idx) => {
        const rankNum = `${idx + 1}.`;
        if (category === 'collector') {
          return `${rankNum} <@${uId}> — **${data.inventory?.length || 0}/${GACHA_ITEMS.length} Item** (${data.pulls || 0} tarikan)`;
        } else if (category === 'pulls') {
          return `${rankNum} <@${uId}> — **${data.pulls || 0}x Tarikan** (${data.inventory?.length || 0} item)`;
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
