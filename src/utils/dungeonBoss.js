const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChannelType
} = require('discord.js');
const storage = require('./storage');
const { BOSS_VISUALS } = require('./visualEffects');

/**
 * Konfigurasi Stance Segitiga Taktis
 * Serang mengalahkan Jurus
 * Bertahan mengalahkan Serang
 * Jurus mengalahkan Bertahan
 */
const STANCES = {
  attack: {
    id: 'attack',
    label: 'Serang',
    emoji: '⚔️',
    beats: 'special',
    losesTo: 'defend'
  },
  defend: {
    id: 'defend',
    label: 'Bertahan',
    emoji: '🛡️',
    beats: 'attack',
    losesTo: 'special'
  },
  special: {
    id: 'special',
    label: 'Jurus',
    emoji: '⚡',
    beats: 'defend',
    losesTo: 'attack'
  }
};

/**
 * Konfigurasi Boss per Tier
 */
const BOSS_CONFIGS = {
  DAILY: {
    tier: 'DAILY',
    name: 'Ancient Void Devourer',
    title: 'Penelan Kegelapan Semesta',
    color: 0x9B59B6,
    maxHp: 25000,
    baseRewardDust: 250,
    baseRewardTickets: 2,
    basePlayerAtk: 1800,
    bossCounterDmg: 35
  },
  WEEKLY: {
    tier: 'WEEKLY',
    name: 'Colossal Titan of Oblivion',
    title: 'Raksasa Kehancuran Dimensi',
    color: 0xE67E22,
    maxHp: 80000,
    baseRewardDust: 750,
    baseRewardTickets: 6,
    basePlayerAtk: 2200,
    bossCounterDmg: 40
  },
  MONTHLY: {
    tier: 'MONTHLY',
    name: 'Omnipresent Cosmic Sovereign',
    title: 'Penguasa Takdir Semesta Purba',
    color: 0xE91E63,
    maxHp: 250000,
    baseRewardDust: 2500,
    baseRewardTickets: 15,
    basePlayerAtk: 2800,
    bossCounterDmg: 45
  }
};

/**
 * Rotasi Pool World Boss Mingguan (WEEKLY) & Bulanan (MONTHLY)
 * Setiap minggu darah, nama boss, dan tema akan di-reset otomatis.
 */
const WEEKLY_BOSS_POOL = [
  {
    name: 'Colossal Titan of Oblivion',
    title: 'Raksasa Kehancuran Dimensi Purba',
    color: 0xE67E22,
    maxHp: 80000,
    baseRewardDust: 750,
    baseRewardTickets: 6,
    basePlayerAtk: 2200,
    bossCounterDmg: 40
  },
  {
    name: 'Abyssal Leviathan of the Deep',
    title: 'Penguasa Samudra Kegelapan Abadi',
    color: 0x1ABC9C,
    maxHp: 80000,
    baseRewardDust: 750,
    baseRewardTickets: 6,
    basePlayerAtk: 2200,
    bossCounterDmg: 40
  },
  {
    name: 'Primordial Inferno Behemoth',
    title: 'Monster Kobaran Api Pemusnah Semesta',
    color: 0xE74C3C,
    maxHp: 80000,
    baseRewardDust: 750,
    baseRewardTickets: 6,
    basePlayerAtk: 2200,
    bossCounterDmg: 40
  },
  {
    name: 'Astral Eclipse Dragon',
    title: 'Naga Pemakan Cahaya Bintang & Ruang Kosong',
    color: 0x9B59B6,
    maxHp: 80000,
    baseRewardDust: 750,
    baseRewardTickets: 6,
    basePlayerAtk: 2200,
    bossCounterDmg: 40
  },
  {
    name: 'Celestial Arbiter of Ruin',
    title: 'Hakim Penghancur Keseimbangan Galaksi',
    color: 0xF39C12,
    maxHp: 80000,
    baseRewardDust: 750,
    baseRewardTickets: 6,
    basePlayerAtk: 2200,
    bossCounterDmg: 40
  },
  {
    name: 'Void Herald of Calamity',
    title: 'Pemberita Petaka Ruang Kosong Astral',
    color: 0x34495E,
    maxHp: 80000,
    baseRewardDust: 750,
    baseRewardTickets: 6,
    basePlayerAtk: 2200,
    bossCounterDmg: 40
  }
];

const MONTHLY_BOSS_POOL = [
  {
    name: 'Omnipresent Cosmic Sovereign',
    title: 'Penguasa Takdir Semesta Purba',
    color: 0xE91E63,
    maxHp: 250000,
    baseRewardDust: 2500,
    baseRewardTickets: 15,
    basePlayerAtk: 2800,
    bossCounterDmg: 45
  },
  {
    name: 'Chronos Emperor of Eternity',
    title: 'Kaisar Abadi Penakluk Waktu & Garis Dimensi',
    color: 0x8E44AD,
    maxHp: 250000,
    baseRewardDust: 2500,
    baseRewardTickets: 15,
    basePlayerAtk: 2800,
    bossCounterDmg: 45
  }
];

/**
 * Multiplier Relik yang di-equip pemain
 */
const RELIC_STAT_BONUS = {
  TRANSCENDENT: { dmgMultiplier: 0.75, hpBonus: 50 },
  ANCIENT: { dmgMultiplier: 0.50, hpBonus: 30 },
  MYTHIC: { dmgMultiplier: 0.30, hpBonus: 20 },
  LEGENDARY: { dmgMultiplier: 0.20, hpBonus: 10 },
  EPIC: { dmgMultiplier: 0.10, hpBonus: 0 },
  RARE: { dmgMultiplier: 0.05, hpBonus: 0 },
  COMMON: { dmgMultiplier: 0.0, hpBonus: 0 }
};

/**
 * Helper: Ambil Database Boss
 */
function getBossStorage() {
  return storage.read('boss_data') || {};
}

/**
 * Helper: Simpan Database Boss
 */
function saveBossStorage(data) {
  storage.write('boss_data', data);
}

/**
 * Helper to get current Date in Western Indonesia Time (WIB / UTC+7)
 */
function getWIBDate() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (7 * 3600000));
}

/**
 * Hitung target waktu kemunculan Boss berikutnya (Setiap Sabtu pukul 19:00 WIB)
 */
function getNextBossSpawnTime() {
  const wib = getWIBDate();
  const day = wib.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  const hour = wib.getHours();

  const target = new Date(wib);
  target.setHours(19, 0, 0, 0);

  let daysUntilSaturday = (6 - day + 7) % 7;

  if (daysUntilSaturday === 0) {
    // Hari ini adalah Sabtu
    if (hour >= 24 || (hour === 23 && wib.getMinutes() >= 59)) {
      daysUntilSaturday = 7;
    } else if (hour >= 19) {
      // Sedang berlangsung sekarang!
      daysUntilSaturday = 7;
    }
  }

  target.setDate(target.getDate() + daysUntilSaturday);

  const diffMs = target.getTime() - wib.getTime();
  const nextTimestamp = Date.now() + Math.max(0, diffMs);
  return {
    timestamp: nextTimestamp,
    unix: Math.floor(nextTimestamp / 1000)
  };
}

/**
 * Cek apakah jendela Boss Raid sedang dibuka saat ini
 * - Seminggu sekali setiap hari Sabtu pukul 19:00 WIB s/d 23:59 WIB
 * - Atau jika status forceSpawned aktif (Bypass Admin)
 */
function isBossRaidOpen(guildId) {
  const allBoss = getBossStorage();
  const activeBoss = allBoss[guildId]?.activeBoss;
  if (activeBoss?.forceSpawned) return true;

  if (!activeBoss || activeBoss.status !== 'ACTIVE' || activeBoss.currentHp <= 0) {
    return false;
  }

  const wib = getWIBDate();
  const day = wib.getDay(); // 6 = Sabtu
  const hour = wib.getHours();
  // Jendela Raid dibuka setiap hari Sabtu pukul 19:00 WIB s/d 23:59 WIB
  return day === 6 && hour >= 19 && hour <= 23;
}

/**
 * Tentukan tier boss yang terjadwal
 * - Boss Raid Seminggu Sekali (Setiap Sabtu)
 * - Akhir Bulan: MONTHLY
 * - Hari Lain: WEEKLY
 */
function getScheduledBossTier() {
  const wib = getWIBDate();
  const date = wib.getDate();
  const month = wib.getMonth();
  const year = wib.getFullYear();

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const isLastWeekOfMonth = date >= lastDayOfMonth - 6;

  if (isLastWeekOfMonth) return 'MONTHLY';
  return 'WEEKLY';
}

/**
 * Toggle Admin Force Spawn (Buka / Kunci Paksa Raid untuk Pengujian)
 */
function toggleAdminForceBossRaid(guildId) {
  const allBoss = getBossStorage();
  if (!allBoss[guildId]) allBoss[guildId] = {};
  if (!allBoss[guildId].activeBoss) {
    getGuildBossState(guildId);
  }
  const boss = allBoss[guildId].activeBoss;
  boss.forceSpawned = !boss.forceSpawned;
  if (boss.forceSpawned) {
    boss.status = 'ACTIVE';
  }
  saveBossStorage(allBoss);
  return { isOpen: boss.forceSpawned, boss };
}

/**
 * Helper: Ambil kunci minggu WIB (YYYY-Wxx) untuk melacak rotasi mingguan
 */
function getWIBWeekKey(wibDate = null) {
  const wib = wibDate || getWIBDate();
  const d = new Date(Date.UTC(wib.getFullYear(), wib.getMonth(), wib.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Reset Darah, Nama Boss, dan Timer Spawn untuk Siklus Mingguan Baru
 * Memilih nama boss dari pool rotasi, mengembalikan HP 100%,
 * mereset party dan combat state untuk sesi baru.
 */
function resetWeeklyBossState(guildId, forceTier = null, forceNewBoss = false) {
  const allBoss = getBossStorage();
  if (!allBoss[guildId]) allBoss[guildId] = {};

  const currentWeekKey = getWIBWeekKey();
  const scheduledTier = forceTier || getScheduledBossTier();
  const pool = scheduledTier === 'MONTHLY' ? MONTHLY_BOSS_POOL : WEEKLY_BOSS_POOL;

  const currentBoss = allBoss[guildId].activeBoss;
  let availablePool = pool;
  if (currentBoss && pool.length > 1) {
    availablePool = pool.filter(b => b.name !== currentBoss.name);
    if (availablePool.length === 0) availablePool = pool;
  }
  const chosenConfig = availablePool[Math.floor(Math.random() * availablePool.length)] || pool[0];

  const wib = getWIBDate();
  const isCurrentlyRaidOpen = (wib.getDay() === 6 && wib.getHours() >= 19 && wib.getHours() <= 23);

  const newBoss = {
    id: `boss_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    guildId,
    tier: scheduledTier,
    name: chosenConfig.name,
    title: chosenConfig.title,
    color: chosenConfig.color,
    maxHp: chosenConfig.maxHp,
    currentHp: chosenConfig.maxHp, // Darah di-reset 100% penuh!
    status: isCurrentlyRaidOpen ? 'ACTIVE' : 'WAITING',
    weekKey: currentWeekKey,
    spawnedAt: isCurrentlyRaidOpen ? Date.now() : null,
    defeatedAt: null,
    fledAt: null,
    forceSpawned: false,
    parties: {},
    createdPartiesBy: {},
    partyHistory: [],
    playerStats: {},
    activeCombat: null,
    history: currentBoss?.history ? currentBoss.history.slice(-10) : [],
    spawnChannelId: null,
    spawnMessageId: null
  };

  allBoss[guildId].activeBoss = newBoss;
  saveBossStorage(allBoss);
  return newBoss;
}

/**
 * Inisialisasi atau Ambil State Boss untuk Guild
 */
function getGuildBossState(guildId, tier = 'DAILY') {
  const allBoss = getBossStorage();
  if (!allBoss[guildId]) {
    allBoss[guildId] = {};
  }

  let activeBoss = allBoss[guildId].activeBoss;
  const currentWeekKey = getWIBWeekKey();
  const isOpen = isBossRaidOpen(guildId);

  // Jika belum ada boss, atau boss lama belum punya weekKey, atau minggu sudah berganti: reset siklus baru
  if (!activeBoss || (!activeBoss.weekKey && !activeBoss.forceSpawned) || (activeBoss.weekKey && activeBoss.weekKey !== currentWeekKey && !activeBoss.forceSpawned)) {
    activeBoss = resetWeeklyBossState(guildId);
  } else if (!isOpen && activeBoss.status === 'ACTIVE' && !activeBoss.forceSpawned) {
    // Di luar jadwal raid tapi status masih ACTIVE: ubah ke FLED/istirahat
    activeBoss.status = activeBoss.currentHp <= 0 ? 'DEFEATED' : 'FLED';
    activeBoss.fledAt = activeBoss.fledAt || Date.now();
    saveBossStorage(allBoss);
  }

  return { allData: allBoss, boss: activeBoss };
}

/**
 * Hitung Bonus Stat Pemain Berdasarkan Relik yang Di-Equip
 */
function getPlayerRelicBonus(guildId, userId) {
  const gachaData = storage.read('gacha_data') || {};
  const userData = gachaData[guildId]?.[userId] || {};
  const equippedName = userData.equippedRelic || null;

  if (!equippedName) {
    return {
      equippedName: null,
      tier: 'NONE',
      dmgMultiplier: 0,
      hpBonus: 0,
      totalMaxHp: 100
    };
  }

  // Cari di catalog
  const { GACHA_ITEMS } = require('../commands/gacha');
  const relic = GACHA_ITEMS.find(g => g.name === equippedName);
  const tier = relic?.tier || 'COMMON';
  const bonus = RELIC_STAT_BONUS[tier] || { dmgMultiplier: 0, hpBonus: 0 };

  return {
    equippedName,
    tier,
    dmgMultiplier: bonus.dmgMultiplier,
    hpBonus: bonus.hpBonus,
    totalMaxHp: 100 + bonus.hpBonus
  };
}

/**
 * Cek Apakah User Sudah Berada dalam Party
 */
function getUserActiveParty(guildId, userId) {
  const { boss } = getGuildBossState(guildId);
  for (const [partyId, party] of Object.entries(boss.parties || {})) {
    if (party.members.includes(userId)) {
      return { partyId, party };
    }
  }
  return null;
}

/**
 * Buat Party Baru (1 Player = Max 1 Party per Sesi)
 */
function createBossParty(guildId, userId, username) {
  // Guard: Cek apakah waktu raid sedang dibuka (Sabtu 19:00 - 23:59 WIB)
  if (!isBossRaidOpen(guildId)) {
    const nextSpawn = getNextBossSpawnTime();
    return {
      success: false,
      message: `Boss Raid belum dibuka! Pembuatan party hanya dibuka seminggu sekali setiap hari **Sabtu pukul 19:00 - 23:59 WIB** (<t:${nextSpawn.unix}:R>).`
    };
  }

  const { allData, boss } = getGuildBossState(guildId);

  // Guard: Limit 1 orang hanya bisa membuat party 1x per sesi raid boss
  if (boss.createdPartiesBy && boss.createdPartiesBy[userId]) {
    return {
      success: false,
      message: 'Kamu sudah pernah membuat party pada sesi Raid Boss ini. Setiap member hanya dapat membuat party sebanyak 1 kali per sesi!'
    };
  }

  // Guard: Cek apakah user sudah punya party aktif
  const existing = getUserActiveParty(guildId, userId);
  if (existing) {
    return { success: false, message: 'Kamu sudah terdaftar di party lain. Keluar terlebih dahulu untuk membuat party baru.' };
  }

  if (!boss.createdPartiesBy) boss.createdPartiesBy = {};
  boss.createdPartiesBy[userId] = true;

  const partyCount = (boss.partyHistory?.length || 0) + Object.keys(boss.parties || {}).length + 1;
  const partyId = `party_${Date.now()}_${userId.slice(-4)}`;
  const partyName = `Party #${partyCount} (${username})`;

  const playerBonus = getPlayerRelicBonus(guildId, userId);

  boss.parties[partyId] = {
    id: partyId,
    name: partyName,
    leaderId: userId,
    members: [userId],
    status: 'WAITING', // WAITING | IN_COMBAT | SURVIVED | WIPEOUT
    totalDamage: 0,
    createdAt: Date.now()
  };

  // Set HP & Stat awal pemain
  if (!boss.playerStats[userId]) {
    boss.playerStats[userId] = {
      userId,
      username,
      totalDamage: 0,
      maxHp: playerBonus.totalMaxHp,
      currentHp: playerBonus.totalMaxHp,
      isKnockedOut: false,
      relicTier: playerBonus.tier,
      relicName: playerBonus.equippedName
    };
  } else {
    // Reset HP untuk raid sesi baru
    boss.playerStats[userId].maxHp = playerBonus.totalMaxHp;
    boss.playerStats[userId].currentHp = playerBonus.totalMaxHp;
    boss.playerStats[userId].isKnockedOut = false;
  }

  saveBossStorage(allData);
  return { success: true, party: boss.parties[partyId] };
}

/**
 * Gabung ke Party Tertentu
 */
function joinBossParty(guildId, partyId, userId, username) {
  if (!isBossRaidOpen(guildId)) {
    const nextSpawn = getNextBossSpawnTime();
    return {
      success: false,
      message: `Boss Raid belum dibuka! Bergabung ke party hanya dibuka seminggu sekali setiap hari **Sabtu pukul 19:00 - 23:59 WIB** (<t:${nextSpawn.unix}:R>).`
    };
  }

  const { allData, boss } = getGuildBossState(guildId);

  const existing = getUserActiveParty(guildId, userId);
  if (existing) {
    return { success: false, message: 'Kamu sudah berada di party lain. Keluar terlebih dahulu!' };
  }

  const party = boss.parties?.[partyId];
  if (!party) {
    return { success: false, message: 'Party tidak ditemukan atau telah dibubarkan.' };
  }

  if (party.status !== 'WAITING') {
    return { success: false, message: 'Party ini sudah atau sedang bertarung.' };
  }

  if (party.members.length >= 4) {
    return { success: false, message: 'Party ini sudah penuh (Maksimal 4 orang).' };
  }

  party.members.push(userId);
  const playerBonus = getPlayerRelicBonus(guildId, userId);

  boss.playerStats[userId] = {
    userId,
    username,
    totalDamage: 0,
    maxHp: playerBonus.totalMaxHp,
    currentHp: playerBonus.totalMaxHp,
    isKnockedOut: false,
    relicTier: playerBonus.tier,
    relicName: playerBonus.equippedName
  };

  saveBossStorage(allData);
  return { success: true, party };
}

/**
 * Quick Join ke Party yang Memiliki Slot Terbuka
 */
function quickJoinBossParty(guildId, userId, username) {
  const { allData, boss } = getGuildBossState(guildId);

  const existing = getUserActiveParty(guildId, userId);
  if (existing) {
    return { success: false, message: 'Kamu sudah terdaftar dalam party!' };
  }

  for (const [partyId, party] of Object.entries(boss.parties || {})) {
    if (party.status === 'WAITING' && party.members.length < 4) {
      return joinBossParty(guildId, partyId, userId, username);
    }
  }

  // Jika tidak ada party terbuka, buat party baru otomatis
  return createBossParty(guildId, userId, username);
}

/**
 * Keluar dari Party
 */
function leaveBossParty(guildId, userId) {
  const { allData, boss } = getGuildBossState(guildId);
  const existing = getUserActiveParty(guildId, userId);
  if (!existing) {
    return { success: false, message: 'Kamu tidak sedang berada di party mana pun.' };
  }

  const { partyId, party } = existing;
  if (party.status === 'IN_COMBAT') {
    return { success: false, message: 'Pertarungan sedang berlangsung! Kamu tidak bisa melarikan diri.' };
  }

  party.members = party.members.filter(id => id !== userId);

  if (party.members.length === 0) {
    delete boss.parties[partyId];
  } else if (party.leaderId === userId) {
    // Alihkan kepemimpinan ke anggota pertama
    party.leaderId = party.members[0];
  }

  saveBossStorage(allData);
  return { success: true, message: 'Kamu berhasil keluar dari party.' };
}

/**
 * Format Progress Bar HP
 */
function generateHpBar(current, max, length = 12) {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Pilih Stance Acak untuk Boss
 */
function pickRandomBossStance() {
  const keys = ['attack', 'defend', 'special'];
  return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * ========================================================
 *  ⏳ SISTEM TIMER AFK (1 MENIT PER RONDE) & QUEUE PARTY
 * ========================================================
 */
const activeCombatAfkTimers = new Map();

function clearPartyAfkTimer(guildId, partyId, round) {
  const timerKey = `${guildId}_${partyId}_${round}`;
  if (activeCombatAfkTimers.has(timerKey)) {
    clearTimeout(activeCombatAfkTimers.get(timerKey));
    activeCombatAfkTimers.delete(timerKey);
  }
}

function schedulePartyAfkCheck(guildId, partyId, round, client) {
  clearPartyAfkTimer(guildId, partyId, round);
  const timerKey = `${guildId}_${partyId}_${round}`;
  const timer = setTimeout(async () => {
    activeCombatAfkTimers.delete(timerKey);
    try {
      await handlePartyAfkDisband(guildId, partyId, round, client);
    } catch (e) {
      console.error('[handlePartyAfkDisband Error]:', e.message);
    }
  }, 60_000); // 1 Menit batas waktu pemilihan taktik
  activeCombatAfkTimers.set(timerKey, timer);
}

/**
 * Otomatis bubarkan dan hapus party jika ada anggota yang AFK (tidak memilih dalam 1 menit)
 */
async function handlePartyAfkDisband(guildId, partyId, round, client) {
  const { allData, boss } = getGuildBossState(guildId);
  const combat = boss.activeCombat;
  if (!combat || combat.partyId !== partyId || combat.round !== parseInt(round, 10)) return;

  const party = boss.parties?.[partyId];
  if (!party) return;

  const livingMembers = party.members.filter(id => !boss.playerStats[id]?.isKnockedOut);
  const afkMembers = livingMembers.filter(id => !combat.playerStances[id]);

  if (afkMembers.length === 0) return; // Semua sudah memilih

  const afkMentions = afkMembers.map(m => `<@${m}>`).join(', ');

  const thread = combat.threadId && client ? await client.channels.fetch(combat.threadId).catch(() => null) : null;
  const combatChannel = thread || (client ? await client.channels.fetch(combat.parentChannelId).catch(() => null) : null);

  const disbandEmbed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle(`🛑 PARTY DIBUBARKAN KARENA AFK!`)
    .setDescription(
      `Waktu pertarungan **1 menit** telah habis!\n\n` +
      `• **Anggota Terdeteksi AFK:** ${afkMentions}\n` +
      `• Karena ada anggota yang tidak memilih taktik dalam 1 menit, party **${party.name}** resmi **DIBUBARKAN & DIHAPUS OTOMATIS**.\n\n` +
      `⏩ Pertarungan segera dialihkan kepada party berikutnya dalam antrean!`
    )
    .setImage(BOSS_VISUALS.WIPEOUT)
    .setFooter({ text: 'Auto-disband karena anggota AFK • Batas waktu 1 menit' })
    .setTimestamp();

  if (combatChannel) {
    await combatChannel.send({ embeds: [disbandEmbed] }).catch(() => {});
    if (thread && thread.isThread()) {
      setTimeout(async () => {
        try {
          await thread.delete('Auto-cleanup setelah party AFK dibubarkan').catch(async () => {
            await thread.setArchived(true).catch(() => {});
            await thread.setLocked(true).catch(() => {});
          });
        } catch (_) {}
      }, 30_000);
    }
  }

  // Hapus party dari storage dan bersihkan activeCombat
  delete boss.parties[partyId];
  boss.activeCombat = null;
  saveBossStorage(allData);

  // Auto-lanjutkan ke party berikutnya jika ada
  await processNextWaitingParty(guildId, client, combatChannel);
}

/**
 * Otomatis panggil dan mulai pertarungan untuk party antrean berikutnya yang berstatus WAITING
 */
async function processNextWaitingParty(guildId, client, fallbackChannel = null) {
  if (!client || !isBossRaidOpen(guildId)) return;
  const { allData, boss } = getGuildBossState(guildId);
  if (!boss || boss.status !== 'ACTIVE' || boss.currentHp <= 0) return;
  if (boss.activeCombat && boss.activeCombat.partyId) return;

  // Ambil party berikutnya yang berstatus WAITING, urutkan berdasarkan waktu buat
  const waitingParties = Object.values(boss.parties || {})
    .filter(p => p.status === 'WAITING')
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  if (waitingParties.length === 0) return;

  const nextParty = waitingParties[0];
  const settingsData = storage.read('settings') || {};
  const gCh = settingsData[guildId]?.gachaChannels || {};
  const targetChannelId = gCh.duel || gCh.live_duel || gCh.throne || gCh.hub || gCh.play;
  let arenaChannel = fallbackChannel;
  if (!arenaChannel && targetChannelId) {
    arenaChannel = await client.channels.fetch(targetChannelId).catch(() => null);
  }
  if (!arenaChannel) return;

  const res = await startPartyCombat(guildId, nextParty.id, arenaChannel, client);
  if (res && res.success) {
    const notifyChannel = res.thread || res.combatChannel || arenaChannel;
    const memberMentions = nextParty.members.map(m => `<@${m}>`).join(' ');
    await notifyChannel.send({
      content: `⚔️ **GILIRAN BERIKUTNYA TELAH TIBA!** ${memberMentions}\nParty **${nextParty.name}** resmi memasuki arena melawan **${boss.name}**! Kalian memiliki waktu **1 menit** untuk memasang taktik!`
    }).catch(() => {});
  }
}

/**
 * Mulai Pertarungan Party (Dapat Dimulai Solo 1-4 Orang)
 */
async function startPartyCombat(guildId, partyId, channel, client) {
  if (!isBossRaidOpen(guildId)) {
    const nextSpawn = getNextBossSpawnTime();
    return {
      success: false,
      message: `Boss belum bangkit! Penyerangan hanya dibuka seminggu sekali setiap hari **Sabtu pukul 19:00 - 23:59 WIB** (<t:${nextSpawn.unix}:R>).`
    };
  }

  const { allData, boss } = getGuildBossState(guildId);
  const party = boss.parties?.[partyId];

  if (!party) return { success: false, message: 'Party tidak ditemukan.' };
  if (party.status !== 'WAITING') return { success: false, message: 'Party tidak dalam status menunggu.' };
  if (boss.currentHp <= 0 || boss.status === 'DEFEATED') {
    return { success: false, message: 'Boss ini telah terkalahkan! Tunggu spawn berikutnya.' };
  }

  // Cek apakah ada party lain yang sedang bertarung
  if (boss.activeCombat && boss.activeCombat.partyId) {
    return { success: false, message: 'Arena sedang digunakan oleh party lain. Mohon tunggu giliranmu!' };
  }

  party.status = 'IN_COMBAT';

  // Buat Thread Khusus Pertarungan agar Chat Utama Bebas Spam
  let combatChannel = channel;
  let thread = null;
  if (channel && channel.threads && typeof channel.threads.create === 'function') {
    try {
      thread = await channel.threads.create({
        name: `⚔️-raid-${party.name.slice(0, 40)}`,
        autoArchiveDuration: 60,
        reason: 'Sesi Pertarungan Multi-Party Raid Boss'
      });
      combatChannel = thread;
    } catch (_) {
      combatChannel = channel;
    }
  }

  const bossStance = pickRandomBossStance();
  const turnDeadline = Date.now() + 60_000;
  boss.activeCombat = {
    partyId,
    threadId: thread?.id || null,
    parentChannelId: channel.id,
    round: 1,
    maxRounds: 5,
    bossStance,
    playerStances: {}, // userId -> stance
    roundDamages: {},
    roundLogs: [],
    turnDeadline
  };

  saveBossStorage(allData);

  // Jadwalkan timer AFK 1 menit
  if (client) {
    schedulePartyAfkCheck(guildId, partyId, 1, client);
  }

  // Buat Embed Pertarungan Ronde 1
  const combatPayload = buildCombatTurnPayload(boss, party);
  const combatMsg = await combatChannel.send(combatPayload).catch(() => null);

  if (combatMsg) {
    boss.activeCombat.messageId = combatMsg.id;
    saveBossStorage(allData);
  }

  return { success: true, thread, combatChannel };
}

/**
 * Build Payload Tampilan Ronde Pertarungan
 */
function buildCombatTurnPayload(boss, party) {
  const combat = boss.activeCombat;
  const hpBar = generateHpBar(boss.currentHp, boss.maxHp, 12);
  const hpPercent = Math.max(0, Math.round((boss.currentHp / boss.maxHp) * 100));
  const deadlineUnix = combat.turnDeadline ? Math.floor(combat.turnDeadline / 1000) : Math.floor((Date.now() + 60000) / 1000);

  const memberStatusList = party.members.map(userId => {
    const stat = boss.playerStats[userId] || { currentHp: 100, maxHp: 100, isKnockedOut: false };
    const pBonus = getPlayerRelicBonus(boss.guildId, userId);
    const relicTag = pBonus.equippedName ? ` [${pBonus.tier}]` : '';
    const statusText = stat.isKnockedOut ? '💀 **GUGUR**' : `❤️ **${stat.currentHp}/${stat.maxHp} HP**`;
    const chosenTag = combat.playerStances[userId] ? ' *(Taktik Terkunci 🔒)*' : ' *(Menunggu Pilihan...)*';
    return `• <@${userId}>${relicTag} — ${statusText}${stat.isKnockedOut ? '' : chosenTag}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setColor(boss.color || 0x9B59B6)
    .setTitle(`⚔️ Pertarungan Raid Boss — Ronde ${combat.round} / ${combat.maxRounds}`)
    .setDescription(
      `> **${boss.name}** [${boss.tier}]\n` +
      `> *${boss.title}*\n\n` +
      `**Darah Boss:** \`[${hpBar}]\` **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP** (${hpPercent}%)\n\n` +
      `**Status Pejuang Party:**\n${memberStatusList}\n\n` +
      `**Trilema Strategi:**\n` +
      `• ⚔️ **Serang** mengalahkan ⚡ Jurus\n` +
      `• 🛡️ **Bertahan** mengalahkan ⚔️ Serang\n` +
      `• ⚡ **Jurus** mengalahkan 🛡️ Bertahan\n\n` +
      `⏳ **Batas Waktu Ronde:** 1 Menit (<t:${deadlineUnix}:R>)\n` +
      `⚠️ *Pilih taktikmu di bawah sebelum waktu habis! Jika ada anggota yang AFK / tidak memilih dalam 1 menit, party akan otomatis DIBUBARKAN & DIHAPUS, lalu pertempuran dialihkan ke party berikutnya!*`
    )
    .setImage(BOSS_VISUALS.STANCE[boss.tier] || BOSS_VISUALS.STANCE.DAILY)
    .setFooter({ text: `${party.name} • Sisa Darah Boss tersimpan permanen` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`boss_pick:attack:${party.id}:${combat.round}`)
      .setLabel('Serang')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`boss_pick:defend:${party.id}:${combat.round}`)
      .setLabel('Bertahan')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`boss_pick:special:${party.id}:${combat.round}`)
      .setLabel('Jurus')
      .setEmoji('⚡')
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Handle Pemilihan Taktik oleh Pemain
 */
async function handlePlayerBossStance(interaction, client, stance, partyId, round) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const { allData, boss } = getGuildBossState(guildId);
  const combat = boss.activeCombat;

  if (!combat || combat.partyId !== partyId) {
    return interaction.reply({ content: 'Sesi pertarungan ini sudah berakhir atau tidak ditemukan.', flags: MessageFlags.Ephemeral });
  }

  if (combat.round !== parseInt(round, 10)) {
    return interaction.reply({ content: 'Ronde tersebut sudah selesai. Silakan pasang di ronde yang sedang berjalan.', flags: MessageFlags.Ephemeral });
  }

  const party = boss.parties?.[partyId];
  if (!party || !party.members.includes(userId)) {
    return interaction.reply({ content: 'Kamu bukan anggota dari party yang sedang bertarung ini!', flags: MessageFlags.Ephemeral });
  }

  const pStat = boss.playerStats[userId];
  if (pStat && pStat.isKnockedOut) {
    return interaction.reply({ content: 'Kamu telah gugur (Knocked Out) dalam pertempuran ini dan tidak bisa menyerang lagi.', flags: MessageFlags.Ephemeral });
  }

  if (combat.playerStances[userId]) {
    return interaction.reply({ content: `Kamu sudah mengunci taktik **${STANCES[combat.playerStances[userId]]?.label}** untuk ronde ini.`, flags: MessageFlags.Ephemeral });
  }

  // Simpan pilihan pemain
  combat.playerStances[userId] = stance;
  saveBossStorage(allData);

  await interaction.reply({
    content: `Taktikmu: **${STANCES[stance].emoji} ${STANCES[stance].label}** berhasil dikunci secara rahasia!`,
    flags: MessageFlags.Ephemeral
  });

  // Perbarui embed pesan pertarungan di thread agar status pemain langsung berubah jadi (Taktik Terkunci 🔒)
  try {
    const updatedPayload = buildCombatTurnPayload(boss, party);
    if (interaction.message) {
      await interaction.message.edit(updatedPayload).catch(async () => {
        if (combat.messageId && client) {
          const ch = await client.channels.fetch(interaction.channelId).catch(() => null);
          if (ch) {
            const msg = await ch.messages.fetch(combat.messageId).catch(() => null);
            if (msg) await msg.edit(updatedPayload).catch(() => {});
          }
        }
      });
    }
  } catch (_) {}

  // Cek apakah seluruh anggota yang masih hidup sudah memilih
  const livingMembers = party.members.filter(id => !boss.playerStats[id]?.isKnockedOut);
  const allLivingChosen = livingMembers.every(id => !!combat.playerStances[id]);

  if (allLivingChosen) {
    // Batalkan timer AFK karena seluruh anggota yang hidup sudah memilih
    clearPartyAfkTimer(guildId, partyId, combat.round);
    // Selesaikan kalkulasi ronde!
    await resolveCombatRound(guildId, partyId, client);
  }
}

/**
 * Paksa Putar Ronde Tempur (Beri otomatis taktik bagi member yang AFK / belum memilih)
 */
async function forceResolveCombatRound(interaction, client, partyId, round) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const { allData, boss } = getGuildBossState(guildId);
  const combat = boss.activeCombat;

  if (!combat || combat.partyId !== partyId) {
    return interaction.reply({ content: 'Sesi pertarungan ini sudah berakhir atau tidak ditemukan.', flags: MessageFlags.Ephemeral });
  }

  if (combat.round !== parseInt(round, 10)) {
    return interaction.reply({ content: 'Ronde tersebut sudah selesai.', flags: MessageFlags.Ephemeral });
  }

  const party = boss.parties?.[partyId];
  if (!party || !party.members.includes(userId)) {
    return interaction.reply({ content: 'Hanya anggota squad party yang dapat memutar ronde pertarungan!', flags: MessageFlags.Ephemeral });
  }

  const livingMembers = party.members.filter(id => !boss.playerStats[id]?.isKnockedOut);
  let autoFilledCount = 0;

  for (const id of livingMembers) {
    if (!combat.playerStances[id]) {
      const defaultStances = ['attack', 'defend', 'special'];
      combat.playerStances[id] = defaultStances[Math.floor(Math.random() * defaultStances.length)];
      autoFilledCount++;
    }
  }

  saveBossStorage(allData);

  await interaction.reply({
    content: `⏩ **Ronde diputar paksa!** ${autoFilledCount > 0 ? `(${autoFilledCount} member yang belum memilih otomatis diatur taktiknya)` : ''}`,
    flags: MessageFlags.Ephemeral
  });

  // Batalkan timer AFK dan selesaikan kalkulasi ronde!
  clearPartyAfkTimer(guildId, partyId, combat.round);
  await resolveCombatRound(guildId, partyId, client);
}

/**
 * Resolusi Hasil Ronde Pertarungan
 */
async function resolveCombatRound(guildId, partyId, client) {
  const { allData, boss } = getGuildBossState(guildId);
  const combat = boss.activeCombat;
  const party = boss.parties?.[partyId];
  if (!combat || !party) return;

  const bossStance = combat.bossStance;
  const bossConfig = BOSS_CONFIGS[boss.tier] || BOSS_CONFIGS.DAILY;
  const livingMembers = party.members.filter(id => !boss.playerStats[id]?.isKnockedOut);

  let totalRoundDmg = 0;
  const roundLogLines = [];
  let allLivingWon = livingMembers.length > 0;

  for (const userId of livingMembers) {
    const pStance = combat.playerStances[userId] || 'attack';
    const pStat = boss.playerStats[userId];
    const pBonus = getPlayerRelicBonus(guildId, userId);

    let dmgDealt = 0;
    let dmgTaken = 0;
    let outcomeText = '';

    if (STANCES[pStance].beats === bossStance) {
      // Menang Taktik -> Critical Strike, Kebal Balasan
      const baseAtk = bossConfig.basePlayerAtk + Math.floor(Math.random() * 800);
      dmgDealt = Math.round(baseAtk * 1.5 * (1 + pBonus.dmgMultiplier));
      dmgTaken = 0;
      outcomeText = `**Menang Taktik!** Critical Strike (${dmgDealt.toLocaleString('id-ID')} DMG)`;
    } else if (pStance === bossStance) {
      // Seri -> Saling Beradu
      const baseAtk = bossConfig.basePlayerAtk + Math.floor(Math.random() * 400);
      dmgDealt = Math.round(baseAtk * (1 + pBonus.dmgMultiplier));
      dmgTaken = 15;
      outcomeText = `**Seri Stance!** Saling beradu (${dmgDealt.toLocaleString('id-ID')} DMG, -15 HP)`;
      allLivingWon = false;
    } else {
      // Kalah Taktik -> Serangan Dipatahkan
      dmgDealt = Math.round(500 * (1 + pBonus.dmgMultiplier));
      dmgTaken = bossConfig.bossCounterDmg + Math.floor(Math.random() * 10);
      outcomeText = `**Kalah Taktik!** Serangan dipatahkan (${dmgDealt.toLocaleString('id-ID')} DMG, -${dmgTaken} HP)`;
      allLivingWon = false;
    }

    pStat.currentHp = Math.max(0, pStat.currentHp - dmgTaken);
    if (pStat.currentHp <= 0) {
      pStat.isKnockedOut = true;
      outcomeText += ' 💀 *Gugur!*';
    }

    pStat.totalDamage = (pStat.totalDamage || 0) + dmgDealt;
    totalRoundDmg += dmgDealt;

    roundLogLines.push(`• <@${userId}> [${STANCES[pStance].label} vs ${STANCES[bossStance].label}]: ${outcomeText}`);
  }

  // Bonus Party Combo jika ada 4 orang dan semua menang
  let comboBonusText = '';
  if (party.members.length === 4 && allLivingWon && livingMembers.length === 4) {
    const comboDmg = Math.round(totalRoundDmg * 0.50);
    totalRoundDmg += comboDmg;
    comboBonusText = `\n🔥 **PARTY COMBO FINISH ACTIVATED!** (+${comboDmg.toLocaleString('id-ID')} Bonus DMG)\n`;
  }

  // Kurangi Darah Boss Secara Permanen!
  boss.currentHp = Math.max(0, boss.currentHp - totalRoundDmg);
  party.totalDamage = (party.totalDamage || 0) + totalRoundDmg;

  // Catat riwayat ronde
  const roundSummary = {
    round: combat.round,
    bossStance,
    totalRoundDmg,
    logs: roundLogLines
  };
  combat.roundLogs.push(roundSummary);

  // Ambil Channel/Thread Pertarungan
  const thread = combat.threadId && client ? await client.channels.fetch(combat.threadId).catch(() => null) : null;
  const combatChannel = thread || (client ? await client.channels.fetch(combat.parentChannelId).catch(() => null) : null);

  // Cek Kondisi Kemenangan / Gugur / Selesai
  const stillLiving = party.members.filter(id => !boss.playerStats[id]?.isKnockedOut);
  const isBossDefeated = boss.currentHp <= 0;
  const isWipeout = stillLiving.length === 0;
  const isMaxRoundsReached = combat.round >= combat.maxRounds;

  if (isBossDefeated || isWipeout || isMaxRoundsReached) {
    // Sesi Pertarungan Berakhir!
    party.status = isBossDefeated ? 'SURVIVED' : isWipeout ? 'WIPEOUT' : 'SURVIVED';
    let endTitle = '';
    let endDesc = '';
    let endColor = 0x57F287;

    if (isBossDefeated) {
      boss.status = 'DEFEATED';
      boss.defeatedAt = Date.now();
      endTitle = `🎉 VICTORY! ${boss.name} TELAH TERKALAHKAN!`;
      endColor = 0xFEE75C;
      endDesc = (
        `Selamat kepada **${party.name}** yang berhasil memberikan **Pukulan Terakhir (Last Hit Slayer)**!\n\n` +
        `• Total Damage Party: **${party.totalDamage.toLocaleString('id-ID')} DMG**\n` +
        `• Darah Boss: **0 / ${boss.maxHp.toLocaleString('id-ID')} HP**\n\n` +
        `Hadiah dan trofi keberhasilan raid telah dibagikan ke seluruh peserta!`
      );
      // Bagikan reward ke seluruh kontributor
      distributeRaidRewards(guildId, boss);
    } else if (isWipeout) {
      endTitle = `💀 PARTY WIPEOUT! SELURUH ANGGOTA GUGUR!`;
      endColor = 0xED4245;
      endDesc = (
        `Seluruh anggota **${party.name}** telah kehabisan HP dan gugur di medan tempur.\n\n` +
        `• Akumulasi Damage Party: **${party.totalDamage.toLocaleString('id-ID')} DMG**\n` +
        `• Sisa Darah Boss: **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP**\n\n` +
        `*Damage yang dihasilkan tetap PERMANEN mengurangi darah boss. Party berikutnya dapat melanjutkan perjuangan ini!*`
      );
    } else {
      endTitle = `🛡️ PARTY BERHASIL BERTAHAN (5 RONDE TUNTAS)`;
      endColor = 0x5865F2;
      endDesc = (
        `Stamina pertempuran selesai! **${party.name}** berhasil bertahan hingga ronde akhir dan mundur dengan selamat.\n\n` +
        `• Total Damage Party: **${party.totalDamage.toLocaleString('id-ID')} DMG**\n` +
        `• Sisa Darah Boss: **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP**\n\n` +
        `*Darah boss tersisa dan siap dilanjutkan oleh party berikutnya.*`
      );
    }

    const endEmbed = new EmbedBuilder()
      .setColor(endColor)
      .setTitle(endTitle)
      .setDescription(
        `**Rekapitulasi Ronde ${combat.round}:**\n` +
        `Boss menggunakan kuda-kuda **${STANCES[bossStance].emoji} ${STANCES[bossStance].label}**.\n\n` +
        roundLogLines.join('\n') +
        comboBonusText + '\n\n' +
        endDesc
      )
      .setImage(isBossDefeated ? BOSS_VISUALS.VICTORY : isWipeout ? BOSS_VISUALS.WIPEOUT : (BOSS_VISUALS.CLASH[bossStance] || BOSS_VISUALS.CLASH.attack))
      .setFooter({ text: 'Sesi pertempuran party ini telah selesai' })
      .setTimestamp();

    if (combatChannel) {
      await combatChannel.send({ embeds: [endEmbed] }).catch(() => {});

      // Auto-hapus thread pertarungan setelah 60 detik agar channel tidak penuh
      if (thread && thread.isThread()) {
        await combatChannel.send({
          content: '⏳ Thread pertarungan ini akan otomatis dihapus dalam **60 detik**. Silakan baca hasil pertarungan di atas.'
        }).catch(() => {});
        setTimeout(async () => {
          try {
            // Coba delete, fallback ke archive + lock
            await thread.delete('Auto-cleanup setelah sesi pertarungan selesai').catch(async () => {
              await thread.setArchived(true).catch(() => {});
              await thread.setLocked(true).catch(() => {});
            });
          } catch (_) { /* ignore */ }
        }, 60_000);
      }
    }

    // Simpan data akumulasi pertempuran party ke partyHistory
    if (!boss.partyHistory) boss.partyHistory = [];
    boss.partyHistory.push({
      partyId,
      name: party.name,
      leaderId: party.leaderId,
      totalDamage: party.totalDamage || 0,
      status: party.status,
      members: [...party.members],
      finishedAt: Date.now()
    });

    // Batalkan timer AFK ronde ini
    clearPartyAfkTimer(guildId, partyId, combat.round);

    // Auto-hapus party secara otomatis setelah selesai bertarung
    delete boss.parties[partyId];
    boss.activeCombat = null;
    saveBossStorage(allData);

    // Auto-update Papan Klasemen Live di channel #papan-klasemen dan Lounge Hub!
    if (client) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        updateLiveLeaderboardChannel(guild, client).catch(() => {});
        try {
          const { updateHubPanelIfExists } = require('../commands/gacha');
          if (updateHubPanelIfExists) updateHubPanelIfExists(guild, client).catch(() => {});
        } catch (_) {}
      }
    }

    // Auto-lanjutkan ke party antrean berikutnya!
    if (client) {
      await processNextWaitingParty(guildId, client, combatChannel);
    }

    return;
  }

  // Jika belum selesai, lanjut ke ronde berikutnya!
  combat.round += 1;
  combat.bossStance = pickRandomBossStance();
  combat.playerStances = {}; // Reset pilihan ronde baru
  combat.turnDeadline = Date.now() + 60_000;
  saveBossStorage(allData);

  // Jadwalkan timer AFK 1 menit untuk ronde berikutnya
  if (client) {
    schedulePartyAfkCheck(guildId, partyId, combat.round, client);
  }

  // Update realtime status HP ke Papan Klasemen & Hub
  if (client) {
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      updateLiveLeaderboardChannel(guild, client).catch(() => {});
      try {
        const { updateHubPanelIfExists } = require('../commands/gacha');
        if (updateHubPanelIfExists) updateHubPanelIfExists(guild, client).catch(() => {});
      } catch (_) {}
    }
  }

  const nextTurnPayload = buildCombatTurnPayload(boss, party);
  if (combatChannel) {
    const roundRecapEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`Hasil Ronde ${combat.round - 1}:`)
      .setDescription(
        `Boss mengeksekusi kuda-kuda **${STANCES[bossStance].emoji} ${STANCES[bossStance].label}**!\n\n` +
        roundLogLines.join('\n') +
        comboBonusText + `\n` +
        `• Damage Ronde Ini: **+${totalRoundDmg.toLocaleString('id-ID')} DMG**\n` +
        `• Sisa Darah Boss: **${boss.currentHp.toLocaleString('id-ID')} HP**`
      )
      .setImage(BOSS_VISUALS.CLASH[bossStance] || BOSS_VISUALS.CLASH.attack);

    await combatChannel.send({ embeds: [roundRecapEmbed] }).catch(() => {});
    const nextMsg = await combatChannel.send(nextTurnPayload).catch(() => null);
    if (nextMsg) {
      combat.messageId = nextMsg.id;
      saveBossStorage(allData);
    }
  }
}

/**
 * Bagikan Hadiah Raid Setelah Boss Kalah
 */
function distributeRaidRewards(guildId, boss) {
  const gachaData = storage.read('gacha_data') || {};
  const guildUsers = gachaData[guildId] || {};
  const config = BOSS_CONFIGS[boss.tier] || BOSS_CONFIGS.DAILY;

  for (const [userId, pStat] of Object.entries(boss.playerStats || {})) {
    if (guildUsers[userId] && pStat.totalDamage > 0) {
      guildUsers[userId].stardust = (guildUsers[userId].stardust || 0) + config.baseRewardDust;
      guildUsers[userId].tickets = (guildUsers[userId].tickets || 0) + config.baseRewardTickets;

      // Bonus Top Damager
      guildUsers[userId].bossDamageLifetime = (guildUsers[userId].bossDamageLifetime || 0) + pStat.totalDamage;
    }
  }

  storage.write('gacha_data', gachaData);
}

/**
 * Buat Payload Lobi Boss Raid untuk #gacha-lounge
 */
function buildBossLobbyPayload(guildId, isOwnerOrAdmin = false) {
  const { boss } = getGuildBossState(guildId);
  const hpBar = generateHpBar(boss.currentHp, boss.maxHp, 14);
  const hpPercent = Math.max(0, Math.round((boss.currentHp / boss.maxHp) * 100));
  const isOpen = isBossRaidOpen(guildId);
  const isDefeated = boss.status === 'DEFEATED' && !boss.forceSpawned;
  const nextSpawn = getNextBossSpawnTime();

  const partiesList = Object.values(boss.parties || {});
  let partyStatusText = '_Belum ada party yang terdaftar. Buat party pertama sekarang!_';

  if (partiesList.length > 0) {
    partyStatusText = partiesList.map(p => {
      const memberTags = p.members.map(id => `<@${id}>`).join(', ');
      const statusLabel = p.status === 'IN_COMBAT' ? '⚔️ SEDANG BERTARUNG' : p.status === 'WIPEOUT' ? '💀 GUGUR' : p.status === 'SURVIVED' ? '🛡️ SELESAI' : '⏳ SIAP';
      return `• **${p.name}** [${p.members.length}/4] — ${statusLabel}\n  Anggota: ${memberTags}\n  Damage: **${(p.totalDamage || 0).toLocaleString('id-ID')} DMG**`;
    }).join('\n\n');
  }

  const embed = new EmbedBuilder()
    .setColor(boss.color || 0x9B59B6)
    .setTimestamp();

  if (isDefeated) {
    embed
      .setTitle(`🏆 BOSS TELAH DIKALAHKAN MINGGU INI • ${boss.name}`)
      .setDescription(
        `> **${boss.name}** [${boss.tier} RAID]\n` +
        `> *${boss.title}*\n\n` +
        `🎉 **Selamat!** Seluruh squad pejuang server telah menaklukkan Boss Raid minggu ini.\n` +
        `Hadiah Stardust dan Tiket telah dibagikan kepada seluruh partisipan.\n\n` +
        `• **Boss Baru Bangkit:** <t:${nextSpawn.unix}:F> (<t:${nextSpawn.unix}:R>)\n` +
        `• **Jadwal Tempur:** Setiap **Sabtu** pukul **19:00 - 23:59 WIB**\n\n` +
        `*Silakan kembali lagi Sabtu depan untuk tantangan selanjutnya!*`
      )
      .setImage(BOSS_VISUALS.VICTORY)
      .setFooter({ text: 'Boss Raid selesai minggu ini • Kembali Sabtu depan pukul 19:00 WIB' });
  } else if (!isOpen) {
    embed
      .setTitle(`⏳ LOBI BOSS RAID • SEDANG BERSEMAYAM`)
      .setDescription(
        `> **${boss.name}** [${boss.tier} RAID]\n` +
        `> *${boss.title}*\n\n` +
        `🌌 **Status:** Boss sedang bersemayam di alam bayangan.\n` +
        `Pintu Dungeon dan penyerangan baru dibuka pada hari **Sabtu** pukul **19:00 WIB**!\n\n` +
        `• **Waktu Kemunculan:** <t:${nextSpawn.unix}:F> (<t:${nextSpawn.unix}:R>)\n` +
        `• **Total Darah Boss:** \`[${hpBar}]\` **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP** (${hpPercent}%)\n` +
        `• **Siklus Mingguan:** Darah dan nama boss di-reset otomatis setiap minggu pada hari Sabtu pukul 19:00 WIB!\n` +
        `• **Jadwal Tempur:** Setiap **Sabtu** pukul **19:00 - 23:59 WIB**\n\n` +
        `💡 **Persiapan:** Pasang relik terbaikmu di \`/gacha inventory\` agar mendapat bonus ATK dan HP!`
      )
      .setImage(BOSS_VISUALS.STANCE[boss.tier] || BOSS_VISUALS.STANCE.DAILY)
      .setFooter({ text: 'Boss Raid terkunci • Dibuka Sabtu pukul 19:00 WIB' });
  } else {
    embed
      .setTitle(`⚔️ LOBI MULTI-PARTY BOSS RAID • ${boss.name}`)
      .setDescription(
        `> **${boss.name}** [${boss.tier} RAID]\n` +
        `> *${boss.title}*\n\n` +
        `**Darah Boss (Persistent Global HP):**\n` +
        `\`[${hpBar}]\` **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP** (${hpPercent}%)\n\n` +
        `**Daftar Party Raid Server:**\n${partyStatusText}\n\n` +
        `**Aturan Tempur:**\n` +
        `• Dapat mulai langsung **Solo (1 orang)** atau bersama squad hingga **4 orang**.\n` +
        `• Setiap pemain memiliki **100 HP Dasar** (+Bonus HP dari relik yang di-equip).\n` +
        `• Darah boss di-reset setiap minggu. Pertarungan berlangsung hingga Sabtu 23:59 WIB!\n` +
        `• Cek papan klasemen live real-time di channel **#papan-klasemen**.`
      )
      .setImage(BOSS_VISUALS.STANCE[boss.tier] || BOSS_VISUALS.STANCE.DAILY)
      .setFooter({ text: 'Klik tombol di bawah untuk berpartisipasi' });
  }

  const buttonsRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('boss_btn_start')
      .setLabel(!isOpen || isDefeated ? 'Mulai Raid (Sabtu 19:00)' : 'Mulai Raid')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!isOpen || isDefeated),
    new ButtonBuilder()
      .setCustomId('boss_btn_create_party')
      .setLabel(!isOpen || isDefeated ? 'Buat Party (Terkunci)' : 'Buat Party')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!isOpen || isDefeated),
    new ButtonBuilder()
      .setCustomId('boss_btn_quick_join')
      .setLabel(!isOpen || isDefeated ? 'Quick Join (Terkunci)' : 'Quick Join')
      .setEmoji('⚡')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!isOpen || isDefeated),
    new ButtonBuilder()
      .setCustomId('boss_btn_leave_party')
      .setLabel('Keluar Party')
      .setEmoji('🚪')
      .setStyle(ButtonStyle.Secondary)
  );

  const components = [buttonsRow1];

  // Tombol pintasan langsung ke arena pesan spawn saat boss sedang aktif
  if (isOpen) {
    const settingsData = storage.read('settings') || {};
    const gCh = settingsData[guildId]?.gachaChannels || {};
    const duelChId = gCh.duel || gCh.live_duel || gCh.throne;

    if (boss.spawnChannelId || duelChId) {
      const targetUrl = (boss.spawnChannelId && boss.spawnMessageId)
        ? `https://discord.com/channels/${guildId}/${boss.spawnChannelId}/${boss.spawnMessageId}`
        : `https://discord.com/channels/${guildId}/${boss.spawnChannelId || duelChId}`;

      const linkRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('⚔️ Lompat ke Pesan Spawn Boss ↗')
          .setStyle(ButtonStyle.Link)
          .setURL(targetUrl)
      );
      components.push(linkRow);
    }
  }

  // Tambahkan Tombol Bypass Khusus Admin/Owner jika memiliki hak akses
  if (isOwnerOrAdmin) {
    const adminRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('boss_btn_admin_force_spawn')
        .setLabel(boss.forceSpawned ? '🔒 [Admin] Kunci Kembali Raid' : '⚡ [Admin] Buka Paksa Raid (Test)')
        .setStyle(boss.forceSpawned ? ButtonStyle.Danger : ButtonStyle.Secondary)
    );
    components.push(adminRow);
  }

  return { embeds: [embed], components };
}

/**
 * Buat 1 Embed Live Klasemen Terpadu untuk #papan-klasemen (Top Global Dashboard)
 * Menggabungkan status Boss Raid realtime, Top 1 Sovereign ber-role eksklusif,
 * dan klasemen 10 besar berdasarkan Kelengkapan Relik & Damage Boss.
 */
function buildLiveLeaderboardEmbeds(guildId, guild = null) {
  const { boss } = getGuildBossState(guildId);
  const hpBar = generateHpBar(boss.currentHp, boss.maxHp, 12);
  const hpPercent = Math.max(0, Math.round((boss.currentHp / boss.maxHp) * 100));

  const settingsData = storage.read('settings') || {};
  const gCh = settingsData[guildId]?.gachaChannels || {};
  const duelChId = gCh.duel || gCh.live_duel || gCh.throne;

  // 1. Status Boss Raid Realtime Line
  let bossStatusLine = '';
  const nextSpawn = getNextBossSpawnTime();

  let spawnLinkText = '';
  if (boss.spawnChannelId && boss.spawnMessageId) {
    spawnLinkText = `\n  [Buka Pesan Spawn Boss di Arena Duel ↗](https://discord.com/channels/${guildId}/${boss.spawnChannelId}/${boss.spawnMessageId})`;
  } else if (duelChId) {
    spawnLinkText = `\n  **Arena Duel:** <#${duelChId}>`;
  }

  const isOpen = isBossRaidOpen(guildId);

  if (isOpen && boss.status === 'ACTIVE' && boss.currentHp > 0) {
    bossStatusLine = `**SEDANG BANGKIT & DISERANG**\n` +
      `• **Nama:** **${boss.name}** [Tier ${boss.tier}]\n` +
      `• **HP:** \`[${hpBar}]\` **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP** (${hpPercent}%)${spawnLinkText}`;
  } else if (boss.status === 'DEFEATED') {
    bossStatusLine = `**TELAH TERKALAHKAN PADA SESI INI**\n` +
      `• Bangkit kembali hari **Sabtu pukul 19:00 WIB** (<t:${nextSpawn.unix}:R>).\n` +
      `• **Boss Terakhir:** **${boss.name}** [Tier ${boss.tier}]`;
  } else {
    bossStatusLine = `**BELUM BANGKIT (ISTIRAHAT)**\n` +
      `• **Target Boss:** **${boss.name}** [Tier ${boss.tier}] (Total: **${boss.maxHp.toLocaleString('id-ID')} HP**)\n` +
      `• Jadwal spawn: Setiap hari **Sabtu pukul 19:00 - 23:59 WIB** (<t:${nextSpawn.unix}:R>) di ${duelChId ? `<#${duelChId}>` : 'Arena Duel'}.`;
  }

  // 2. Evaluasi Data Member untuk Top Global (Hanya Relik Terbanyak + Damage ke Boss)
  const gachaData = storage.read('gacha_data') || {};
  const guildUsers = Object.entries(gachaData[guildId] || {});

  const candidateUsers = [];

  for (const [uId, uData] of guildUsers) {
    const relicCount = (uData.inventory || []).length;
    const bossDamage = boss.playerStats?.[uId]?.totalDamage || (uData.bossDamageLifetime || 0);

    if (relicCount > 0 || bossDamage > 0) {
      candidateUsers.push({
        uId,
        relicCount,
        bossDamage
      });
    }
  }

  // Urutkan berdasarkan Relik terbanyak, jika sama urutkan berdasarkan Damage Boss tertinggi
  candidateUsers.sort((a, b) => b.relicCount - a.relicCount || b.bossDamage - a.bossDamage);

  const top1 = candidateUsers.length > 0 ? candidateUsers[0] : null;

  // Ambil Role Exclusive
  const specialRoleId = settingsData[guildId]?.gachaRoles?.CHAMPION ||
    guild?.roles?.cache?.find(r => r.name.toLowerCase().includes('god of qumpruy') || r.name.toLowerCase().includes('champion'))?.id ||
    '1547139921595203616';
  const roleTag = specialRoleId ? `<@&${specialRoleId}>` : '`[Role God of Qumpruy]`';

  const seasonData = storage.read('season_data') || {};
  const currentSeason = seasonData[guildId]?.currentSeason || 1;
  const currentChampionId = seasonData[guildId]?.currentChampionId || seasonData[guildId]?.lastChampionId;

  let top1Display = '_Belum ada data pejuang terdaftar_';
  if (top1) {
    top1Display = `**Kandidat Juara Season ${currentSeason}:** <@${top1.uId}>\n` +
      `• Koleksi Relik: **${top1.relicCount} Item**\n` +
      `• Damage Boss: **${top1.bossDamage.toLocaleString('id-ID')} DMG**\n` +
      `• Calon Penyandang: ${roleTag} *(Diberikan jika bertahan di Top 1 saat Season Reset)*` +
      (currentChampionId ? `\n• Juara Bertahan: <@${currentChampionId}>` : '');
  }

  // Top 10 List - Tampilan simpel & rapi tanpa emoji berlebih
  const top10 = candidateUsers.slice(0, 10);
  let top10Text = '_Belum ada pejuang di klasemen_';
  if (top10.length > 0) {
    top10Text = top10.map((u, idx) => {
      return `**${idx + 1}.** <@${u.uId}> — **${u.relicCount}** Relik • **${u.bossDamage.toLocaleString('id-ID')}** Damage Boss`;
    }).join('\n');
  }

  const unifiedEmbed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('PAPAN KLASEMEN TOP GLOBAL & WORLD BOSS')
    .setDescription(
      `Papan peringkat kasta tertinggi server berdasarkan **Koleksi Relik** dan **Damage ke World Boss**.\n` +
      `Member yang berhasil mempertahankan peringkat **Top 1 saat Season Reset bulanan** dinobatkan meraih **Role Eksklusif God of QUMPRUY**!\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**STATUS WORLD BOSS (REALTIME):**\n` +
      `${bossStatusLine}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**PEMEGANG GELAR TOP 1 GLOBAL:**\n` +
      `${top1Display}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**KLASEMEN 10 BESAR TOP GLOBAL:**\n` +
      `${top10Text}`
    )
    .setFooter({ text: 'Top Global Dashboard • Terupdate Otomatis Realtime • Juara Season Reset Memperoleh Role God of Qumpruy' })
    .setTimestamp();

  return [unifiedEmbed];
}

/**
 * Perbarui Live Embed di Channel #papan-klasemen
 */
async function updateLiveLeaderboardChannel(guild, client) {
  try {
    if (!guild || !client) return;
    const settingsData = storage.read('settings') || {};
    const leaderboardChId = settingsData[guild.id]?.gachaChannels?.leaderboard;
    if (!leaderboardChId) return;

    const channel = guild.channels?.cache?.get(leaderboardChId) ||
      await client.channels.fetch(leaderboardChId).catch(() => null);
    if (!channel || !channel.isTextBased() || channel.isThread()) return;

    const embeds = buildLiveLeaderboardEmbeds(guild.id, guild);
    const existingMsgId = settingsData[guild.id]?.gachaPanels?.leaderboard_msg || settingsData[guild.id]?.gachaPanels?.leaderboard;

    let targetMsg = null;
    if (existingMsgId) {
      targetMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
    }

    // Cari pesan-pesan bot di channel untuk mendeteksi panel lama dan mencegah pesan ganda
    const recentMessages = await channel.messages.fetch({ limit: 15 }).catch(() => null);
    if (recentMessages) {
      const botPanels = recentMessages.filter(m =>
        m.author.id === client.user.id &&
        m.embeds.some(e => e.title && e.title.includes('PAPAN KLASEMEN TOP GLOBAL'))
      );

      if (botPanels.size > 1) {
        // Ada lebih dari 1 panel ganda: simpan yang terbaru, hapus yang lama
        const sorted = Array.from(botPanels.values()).sort((a, b) => b.createdTimestamp - a.createdTimestamp);
        targetMsg = sorted[0];
        for (const duplicateMsg of sorted.slice(1)) {
          await duplicateMsg.delete().catch(() => {});
        }
      } else if (botPanels.size === 1 && !targetMsg) {
        targetMsg = botPanels.first();
      }
    }

    if (targetMsg) {
      await targetMsg.edit({ embeds }).catch(() => {});
      if (!settingsData[guild.id].gachaPanels) settingsData[guild.id].gachaPanels = {};
      settingsData[guild.id].gachaPanels.leaderboard_msg = targetMsg.id;
      settingsData[guild.id].gachaPanels.leaderboard = targetMsg.id;
      storage.write('settings', settingsData);
      return;
    }

    const newMsg = await channel.send({ embeds }).catch(() => null);
    if (newMsg) {
      if (!settingsData[guild.id].gachaPanels) settingsData[guild.id].gachaPanels = {};
      settingsData[guild.id].gachaPanels.leaderboard_msg = newMsg.id;
      settingsData[guild.id].gachaPanels.leaderboard = newMsg.id;
      storage.write('settings', settingsData);
    }
  } catch (err) {
    console.error('[updateLiveLeaderboardChannel Error]:', err.message);
  }
}

/**
 * Cek dan siarkan pengumuman spawn World Boss di hari Sabtu pukul 19:00 WIB
 */
async function checkAndBroadcastBossSpawn(client) {
  if (!client) return;
  const allBoss = getBossStorage();
  const scheduledTier = getScheduledBossTier();

  for (const guild of client.guilds.cache.values()) {
    try {
      if (!allBoss[guild.id]) allBoss[guild.id] = {};

      // Ciptakan/reset siklus mingguan baru: darah penuh 100%, rotasi nama boss, dan partylist bersih
      const boss = resetWeeklyBossState(guild.id, scheduledTier, true);
      boss.status = 'ACTIVE';
      boss.spawnedAt = Date.now();
      allBoss[guild.id].activeBoss = boss;
      saveBossStorage(allBoss);

      // Ambil channel Arena Duel untuk spawn World Boss
      const settingsData = storage.read('settings') || {};
      const gCh = settingsData[guild.id]?.gachaChannels || {};
      const targetChannelId = gCh.duel || gCh.live_duel || gCh.throne || gCh.feed || gCh.announce || gCh.hub || gCh.play || gCh.broadcast;
      if (!targetChannelId) continue;

      const targetChannel = await client.channels.fetch(targetChannelId).catch(() => null);
      if (!targetChannel || !targetChannel.isTextBased()) continue;

      const loungeChId = gCh.hub || gCh.play;
      const loungeText = loungeChId ? `<#${loungeChId}>` : 'Channel Lounge';

      const spawnEmbed = new EmbedBuilder()
        .setColor(boss.color || 0x9B59B6)
        .setTitle(`🚨 WORLD BOSS RAID TELAH BANGKIT! (19:00 WIB)`)
        .setDescription(
          `Gerbang dimensi telah terbuka! **${boss.name}** [${boss.tier} RAID] muncul di server!\n\n` +
          `> *“${boss.title}”*\n\n` +
          `• **Kasta Boss:** \`${boss.tier}\`\n` +
          `• **Darah Boss:** **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP** (100%)\n` +
          `• **Waktu Tempur:** Pukul **19:00 WIB - 23:59 WIB**\n` +
          `• **Arena Pertarungan:** <#${targetChannel.id}>\n\n` +
          `⚔️ Segera bentuk partymu di ${loungeText} dan serang bersama seluruh squad server!`
        )
        .setImage(BOSS_VISUALS.STANCE[boss.tier] || BOSS_VISUALS.STANCE.DAILY)
        .setFooter({ text: `${guild.name} • World Boss Raid 19:00 WIB` })
        .setTimestamp();

      const spawnComponents = [];
      if (loungeChId) {
        spawnComponents.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('🏰 Buka Lobi Party (Gacha Lounge) ↗')
              .setStyle(ButtonStyle.Link)
              .setURL(`https://discord.com/channels/${guild.id}/${loungeChId}`)
          )
        );
      }

      const spawnMsg = await targetChannel.send({ embeds: [spawnEmbed], components: spawnComponents }).catch(() => null);
      if (spawnMsg) {
        boss.spawnChannelId = targetChannel.id;
        boss.spawnMessageId = spawnMsg.id;
        saveBossStorage(allBoss);
      }

      // Auto update live leaderboard di #papan-klasemen dan panel lounge
      await updateLiveLeaderboardChannel(guild, client).catch(() => {});
      try {
        const { updateHubPanelIfExists } = require('../commands/gacha');
        if (updateHubPanelIfExists) updateHubPanelIfExists(guild, client).catch(() => {});
      } catch (_) {}
    } catch (gErr) {
      console.warn(`[Boss Spawn Broadcast] Guild ${guild.name} error:`, gErr.message);
    }
  }
}

/**
 * Siarkan pengumuman hitung mundur (Early Warning) menjelang Boss Raid spawn
 */
async function checkAndBroadcastBossWarning(client, minutesLeft = 15) {
  if (!client) return;
  const scheduledTier = getScheduledBossTier();
  const config = BOSS_CONFIGS[scheduledTier] || BOSS_CONFIGS.DAILY;

  for (const guild of client.guilds.cache.values()) {
    try {
      const settingsData = storage.read('settings') || {};
      const gCh = settingsData[guild.id]?.gachaChannels || {};
      const targetChannelId = gCh.feed || gCh.announce || gCh.hub || gCh.play || gCh.broadcast;
      if (!targetChannelId) continue;

      const targetChannel = await client.channels.fetch(targetChannelId).catch(() => null);
      if (!targetChannel || !targetChannel.isTextBased()) continue;

      const loungeChId = gCh.hub || gCh.play;
      const loungeText = loungeChId ? `<#${loungeChId}>` : 'Channel Lounge';

      const warningEmbed = new EmbedBuilder()
        .setColor(0xF1C40F) // Radiant warning gold
        .setTitle(`⏳ PERINGATAN BOSS RAID: ${minutesLeft} MENIT MENUJU KEBANGKITAN!`)
        .setDescription(
          `Aura kegelapan kosmik mulai menyelimuti server! Gerbang dimensi terdeteksi akan segera terbuka!\n\n` +
          `• **Target Boss:** **${config.name}** [${config.tier} RAID]\n` +
          `• **Waktu Kemunculan:** Tepat pukul **19:00 WIB** (Tersisa **${minutesLeft} Menit** lagi)\n` +
          `• **Total Darah Boss:** **${config.maxHp.toLocaleString('id-ID')} HP**\n\n` +
          `🛡️ **Persiapan Pra-Tempur:**\n` +
          `1. Buka \`/gacha inventory\` dan pasang (*Equip*) relik bertier tinggi untuk bonus ATK dan HP.\n` +
          `2. Ajak rekan-rekanmu bersiap di ${loungeText} untuk membentuk squad party saat jam 19:00 WIB tiba!`
        )
        .setImage(BOSS_VISUALS.STANCE[scheduledTier] || BOSS_VISUALS.STANCE.DAILY)
        .setFooter({ text: `${guild.name} • Peringatan Dini World Boss Raid` })
        .setTimestamp();

      await targetChannel.send({ embeds: [warningEmbed] }).catch(() => {});
    } catch (err) {
      console.warn(`[Boss Warning Broadcast] Guild ${guild.name} error:`, err.message);
    }
  }
}

/**
 * Cek apakah batas waktu jendela raid (pukul 23:59 WIB) telah terlampaui.
 * Jika boss belum dikalahkan, dia akan melarikan diri / menghilang otomatis.
 */
async function checkAndDespawnBoss(client) {
  if (!client) return;
  const allBoss = getBossStorage();
  let changed = false;

  for (const guild of client.guilds.cache.values()) {
    try {
      if (!allBoss[guild.id]) continue;
      const boss = allBoss[guild.id].activeBoss;
      if (!boss || boss.status !== 'ACTIVE' || boss.currentHp <= 0 || boss.forceSpawned) continue;

      if (!isBossRaidOpen(guild.id)) {
        boss.status = 'FLED';
        boss.fledAt = Date.now();
        changed = true;
        console.log(`[Boss Raid] ${boss.name} melarikan diri karena batas jendela 23:59 WIB telah berakhir.`);

        const settingsData = storage.read('settings') || {};
        const gCh = settingsData[guild.id]?.gachaChannels || {};
        const targetChannelId = gCh.feed || gCh.announce || gCh.hub || gCh.play || gCh.broadcast;
        if (targetChannelId) {
          const targetChannel = await client.channels.fetch(targetChannelId).catch(() => null);
          if (targetChannel && targetChannel.isTextBased()) {
            const fledEmbed = new EmbedBuilder()
              .setColor(0x747F8D)
              .setTitle(`🌑 WORLD BOSS TELAH MENGHILANG (WAKTU RAID BERAKHIR)`)
              .setDescription(
                `Waktu pertempuran telah habis! Pukul 23:59 WIB telah berakhir. **${boss.name}** [${boss.tier} RAID] telah melarikan diri ke kedalaman alam bayangan.\n\n` +
                `• **Sisa Darah Boss:** **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP**\n` +
                `• Boss tidak berhasil ditaklukkan malam ini dan telah menghilang.\n\n` +
                `*Nantikan kebangkitan boss raid berikutnya setiap hari Sabtu pukul 19:00 WIB!*`
              )
              .setFooter({ text: `${guild.name} • World Boss Despawn` })
              .setTimestamp();
            await targetChannel.send({ embeds: [fledEmbed] }).catch(() => {});
          }
        }

        await updateLiveLeaderboardChannel(guild, client).catch(() => {});
      }
    } catch (err) {
      console.warn(`[Boss Despawn Error] Guild ${guild.name}:`, err.message);
    }
  }

  if (changed) {
    saveBossStorage(allBoss);
  }
}

module.exports = {
  BOSS_CONFIGS,
  WEEKLY_BOSS_POOL,
  MONTHLY_BOSS_POOL,
  STANCES,
  RELIC_STAT_BONUS,
  getWIBDate,
  getWIBWeekKey,
  getNextBossSpawnTime,
  isBossRaidOpen,
  getScheduledBossTier,
  resetWeeklyBossState,
  toggleAdminForceBossRaid,
  checkAndBroadcastBossSpawn,
  checkAndBroadcastBossWarning,
  checkAndDespawnBoss,
  getGuildBossState,
  getPlayerRelicBonus,
  getUserActiveParty,
  createBossParty,
  joinBossParty,
  quickJoinBossParty,
  leaveBossParty,
  startPartyCombat,
  handlePlayerBossStance,
  forceResolveCombatRound,
  buildCombatTurnPayload,
  buildBossLobbyPayload,
  buildLiveLeaderboardEmbeds,
  updateLiveLeaderboardChannel
};
