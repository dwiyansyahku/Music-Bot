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
 * Multiplier Relik yang di-equip pemain
 */
const RELIC_STAT_BONUS = {
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
 * Hitung target waktu kemunculan Boss berikutnya (21:00 WIB)
 */
function getNextBossSpawnTime() {
  const wib = getWIBDate();
  const target = new Date(wib);
  target.setHours(21, 0, 0, 0);

  // Jika hari ini sudah lewat jam 21:00, target spawn berikutnya adalah besok jam 21:00
  if (wib.getTime() >= target.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const diffMs = target.getTime() - wib.getTime();
  const nextTimestamp = Date.now() + diffMs;
  return {
    timestamp: nextTimestamp,
    unix: Math.floor(nextTimestamp / 1000)
  };
}

/**
 * Cek apakah jendela Boss Raid sedang dibuka saat ini
 * - Jam 21:00 WIB s/d 23:59 WIB
 * - Atau jika status forceSpawned aktif (Bypass Admin)
 */
function isBossRaidOpen(guildId) {
  const allBoss = getBossStorage();
  const activeBoss = allBoss[guildId]?.activeBoss;
  if (activeBoss?.forceSpawned) return true;

  const wib = getWIBDate();
  const hour = wib.getHours();
  // Jendela Raid dibuka mulai pukul 21:00 WIB
  return hour >= 21;
}

/**
 * Tentukan tier boss yang terjadwal
 * - Minggu Terakhir Tiap Bulan: MONTHLY
 * - Sabtu: WEEKLY
 * - Hari Lain: DAILY
 */
function getScheduledBossTier() {
  const wib = getWIBDate();
  const dayOfWeek = wib.getDay(); // 0 = Minggu, 6 = Sabtu
  const date = wib.getDate();
  const month = wib.getMonth();
  const year = wib.getFullYear();

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const isLastSunday = dayOfWeek === 0 && (lastDayOfMonth - date < 7);

  if (isLastSunday) return 'MONTHLY';
  if (dayOfWeek === 6) return 'WEEKLY';
  return 'DAILY';
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
 * Inisialisasi atau Ambil State Boss untuk Guild
 */
function getGuildBossState(guildId, tier = 'DAILY') {
  const allBoss = getBossStorage();
  if (!allBoss[guildId]) {
    allBoss[guildId] = {};
  }

  let activeBoss = allBoss[guildId].activeBoss;
  if (!activeBoss) {
    const config = BOSS_CONFIGS[tier] || BOSS_CONFIGS.DAILY;
    activeBoss = {
      id: `boss_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      guildId,
      tier: config.tier,
      name: config.name,
      title: config.title,
      color: config.color,
      maxHp: config.maxHp,
      currentHp: config.maxHp, // Persistent!
      status: 'ACTIVE',
      spawnedAt: Date.now(),
      defeatedAt: null,
      forceSpawned: false,
      parties: {}, // partyId -> PartyObject
      playerStats: {}, // userId -> PlayerStat
      activeCombat: null, // Combat state
      history: []
    };
    allBoss[guildId].activeBoss = activeBoss;
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
 * Buat Party Baru (1 Player = Max 1 Party)
 */
function createBossParty(guildId, userId, username) {
  // Guard: Cek apakah waktu raid sedang dibuka (21:00 WIB)
  if (!isBossRaidOpen(guildId)) {
    const nextSpawn = getNextBossSpawnTime();
    return {
      success: false,
      message: `Boss Raid belum dibuka! Pembuatan party hanya dibuka mulai pukul **21:00 WIB** (<t:${nextSpawn.unix}:R>).`
    };
  }

  const { allData, boss } = getGuildBossState(guildId);

  // Guard: Cek apakah user sudah punya party
  const existing = getUserActiveParty(guildId, userId);
  if (existing) {
    return { success: false, message: 'Kamu sudah terdaftar di party lain. Keluar terlebih dahulu untuk membuat party baru.' };
  }

  const partyCount = Object.keys(boss.parties || {}).length + 1;
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
      message: `Boss Raid belum dibuka! Bergabung ke party hanya dibuka mulai pukul **21:00 WIB** (<t:${nextSpawn.unix}:R>).`
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
 * Mulai Pertarungan Party (Dapat Dimulai Solo 1-4 Orang)
 */
async function startPartyCombat(guildId, partyId, channel, client) {
  if (!isBossRaidOpen(guildId)) {
    const nextSpawn = getNextBossSpawnTime();
    return {
      success: false,
      message: `Boss belum bangkit! Penyerangan hanya diperbolehkan mulai pukul **21:00 WIB** (<t:${nextSpawn.unix}:R>).`
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
  boss.activeCombat = {
    partyId,
    threadId: thread?.id || null,
    parentChannelId: channel.id,
    round: 1,
    maxRounds: 5,
    bossStance,
    playerStances: {}, // userId -> stance
    roundDamages: {},
    roundLogs: []
  };

  saveBossStorage(allData);

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
      `*Pilih taktikmu di bawah sebelum waktu habis! Pilihan bersifat rahasia.*`
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

  // Cek apakah seluruh anggota yang masih hidup sudah memilih
  const livingMembers = party.members.filter(id => !boss.playerStats[id]?.isKnockedOut);
  const allLivingChosen = livingMembers.every(id => !!combat.playerStances[id]);

  if (allLivingChosen) {
    // Selesaikan kalkulasi ronde!
    await resolveCombatRound(guildId, partyId, client);
  }
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

    // Bersihkan sesi aktif
    boss.activeCombat = null;
    saveBossStorage(allData);

    // Auto-update Papan Klasemen Live di channel #papan-klasemen!
    if (client) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        updateLiveLeaderboardChannel(guild, client).catch(() => {});
      }
    }

    return;
  }

  // Jika belum selesai, lanjut ke ronde berikutnya!
  combat.round += 1;
  combat.bossStance = pickRandomBossStance();
  combat.playerStances = {}; // Reset pilihan ronde baru
  saveBossStorage(allData);

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
      .setTitle(`🏆 BOSS TELAH DIKALAHKAN HARI INI • ${boss.name}`)
      .setDescription(
        `> **${boss.name}** [${boss.tier} RAID]\n` +
        `> *${boss.title}*\n\n` +
        `🎉 **Selamat!** Seluruh squad pejuang server telah menaklukkan Boss Raid hari ini.\n` +
        `Hadiah Stardust dan Tiket telah dibagikan kepada seluruh partisipan.\n\n` +
        `• **Boss Baru Bangkit:** <t:${nextSpawn.unix}:F> (<t:${nextSpawn.unix}:R>)\n` +
        `• **Jadwal Tempur:** Setiap malam pukul **21:00 WIB**\n\n` +
        `*Silakan kembali lagi besok malam untuk tantangan selanjutnya!*`
      )
      .setImage(BOSS_VISUALS.VICTORY)
      .setFooter({ text: 'Boss Raid selesai hari ini • Kembali besok pukul 21:00 WIB' });
  } else if (!isOpen) {
    embed
      .setTitle(`⏳ LOBI BOSS RAID • SEDANG BERSEMAYAM`)
      .setDescription(
        `> **${boss.name}** [${boss.tier} RAID]\n` +
        `> *${boss.title}*\n\n` +
        `🌌 **Status:** Boss sedang bersemayam di alam bayangan.\n` +
        `Pintu Dungeon dan penyerangan baru dibuka malam ini tepat pukul **21:00 WIB**!\n\n` +
        `• **Waktu Kemunculan:** <t:${nextSpawn.unix}:F> (<t:${nextSpawn.unix}:R>)\n` +
        `• **Darah Tersimpan (Persistent):** \`[${hpBar}]\` **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP** (${hpPercent}%)\n` +
        `• **Jadwal Tempur:** Pukul **21:00 WIB - 23:59 WIB**\n\n` +
        `💡 **Persiapan:** Pasang relik terbaikmu di \`/gacha inventory\` agar mendapat bonus ATK dan HP!`
      )
      .setImage(BOSS_VISUALS.STANCE[boss.tier] || BOSS_VISUALS.STANCE.DAILY)
      .setFooter({ text: 'Boss Raid terkunci • Dibuka pukul 21:00 WIB' });
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
        `• Darah boss **tidak akan hilang/reset**. Damage setiap party tersimpan permanen!\n` +
        `• Cek papan klasemen live real-time di channel **#papan-klasemen**.`
      )
      .setImage(BOSS_VISUALS.STANCE[boss.tier] || BOSS_VISUALS.STANCE.DAILY)
      .setFooter({ text: 'Klik tombol di bawah untuk berpartisipasi' });
  }

  const buttonsRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('boss_btn_start')
      .setLabel(!isOpen || isDefeated ? 'Mulai Raid (21:00 WIB)' : 'Mulai Raid')
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
 * Buat 2 Embed Live Klasemen untuk #papan-klasemen
 */
function buildLiveLeaderboardEmbeds(guildId) {
  const { boss } = getGuildBossState(guildId);
  const hpBar = generateHpBar(boss.currentHp, boss.maxHp, 14);
  const hpPercent = Math.max(0, Math.round((boss.currentHp / boss.maxHp) * 100));

  // Top Parties by Damage
  const sortedParties = Object.values(boss.parties || {})
    .filter(p => (p.totalDamage || 0) > 0)
    .sort((a, b) => (b.totalDamage || 0) - (a.totalDamage || 0))
    .slice(0, 5);

  let topPartiesText = '_Belum ada damage party yang masuk_';
  if (sortedParties.length > 0) {
    topPartiesText = sortedParties.map((p, i) => {
      const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
      const pct = boss.maxHp > 0 ? ((p.totalDamage / boss.maxHp) * 100).toFixed(1) : '0';
      return `${medals[i]} **${p.name}** — **${p.totalDamage.toLocaleString('id-ID')} DMG** (${pct}%)`;
    }).join('\n');
  }

  // Top Solo Players by Damage
  const sortedPlayers = Object.values(boss.playerStats || {})
    .filter(p => (p.totalDamage || 0) > 0)
    .sort((a, b) => (b.totalDamage || 0) - (a.totalDamage || 0))
    .slice(0, 5);

  let topPlayersText = '_Belum ada kontribusi damage individu_';
  if (sortedPlayers.length > 0) {
    topPlayersText = sortedPlayers.map((p, i) => {
      const relicInfo = p.relicName ? ` *(Equip: ${p.relicName})*` : '';
      return `${i + 1}. <@${p.userId}> — **${p.totalDamage.toLocaleString('id-ID')} DMG**${relicInfo}`;
    }).join('\n');
  }

  const raidEmbed = new EmbedBuilder()
    .setColor(boss.color || 0x9B59B6)
    .setTitle(`LIVE RAID BOSS STATUS • ${boss.name}`)
    .setDescription(
      `> **${boss.name}** [${boss.tier} RAID]\n` +
      `> *${boss.title}*\n\n` +
      `**Darah Boss:** \`[${hpBar}]\` **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP** (${hpPercent}%)\n` +
      `**Status:** ${boss.status === 'ACTIVE' ? '⚔️ **AKTIF SEDANG DISERANG**' : '🏆 **TELAH TERKALAHKAN**'}\n\n` +
      `**🏆 Klasemen Top Damage Party:**\n${topPartiesText}\n\n` +
      `**💥 Top Damager Individu:**\n${topPlayersText}`
    )
    .setFooter({ text: 'Papan skor terupdate otomatis secara real-time' })
    .setTimestamp();

  // Embed 2: Hall of Fame Gacha & Musim
  const gachaData = storage.read('gacha_data') || {};
  const guildUsers = Object.entries(gachaData[guildId] || {});
  const { GACHA_ITEMS } = require('../commands/gacha');

  // Top Limited Holders (Ancient & Mythic)
  const topLimitedUsers = [...guildUsers]
    .map(([uId, data]) => {
      const ancients = (data.inventory || []).filter(name => {
        const item = GACHA_ITEMS.find(g => g.name === name);
        return item && (item.tier === 'ANCIENT' || item.tier === 'MYTHIC');
      });
      return { uId, count: ancients.length, list: ancients };
    })
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  let topLimitedText = '_Belum ada pemilik relik Ancient/Mythic_';
  if (topLimitedUsers.length > 0) {
    topLimitedText = topLimitedUsers.map((x, i) => {
      return `${i + 1}. <@${x.uId}> — **${x.count} Relik Limited** (${x.list.slice(0, 2).join(', ')}${x.list.length > 2 ? '...' : ''})`;
    }).join('\n');
  }

  // Top Defense Streak Tahta
  const topDefenders = [...guildUsers]
    .filter(([_, d]) => (d.duelDefenseStreak || 0) > 0)
    .sort((a, b) => (b[1].duelDefenseStreak || 0) - (a[1].duelDefenseStreak || 0))
    .slice(0, 5);

  let topDefenseText = '_Belum ada rekor pertahanan tahta_';
  if (topDefenders.length > 0) {
    topDefenseText = topDefenders.map(([uId, d], i) => {
      const tierTag = d.activeRole?.tier ? ` [${d.activeRole.tier}]` : '';
      return `${i + 1}. <@${uId}> — **${d.duelDefenseStreak}x Pertahanan Beruntun**${tierTag}`;
    }).join('\n');
  }

  const fameEmbed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('HALL OF FAME • KLASEMEN GACHA & TAHTA')
    .setDescription(
      `Papan peringkat kasta tertinggi dan rekor pertempuran tahta server:\n\n` +
      `**👑 Top Pemilik Relik Limited (Ancient & Mythic):**\n${topLimitedText}\n\n` +
      `**🛡️ Top Pertahanan Tahta (Duel Defense Streak):**\n${topDefenseText}`
    )
    .setFooter({ text: 'Hall of Fame Server • Terupdate Otomatis' })
    .setTimestamp();

  return [raidEmbed, fameEmbed];
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

    const embeds = buildLiveLeaderboardEmbeds(guild.id);
    const existingMsgId = settingsData[guild.id]?.gachaPanels?.leaderboard_msg;

    if (existingMsgId) {
      const msg = await channel.messages.fetch(existingMsgId).catch(() => null);
      if (msg) {
        await msg.edit({ embeds }).catch(() => {});
        return;
      }
    }

    const newMsg = await channel.send({ embeds }).catch(() => null);
    if (newMsg) {
      if (!settingsData[guild.id].gachaPanels) settingsData[guild.id].gachaPanels = {};
      settingsData[guild.id].gachaPanels.leaderboard_msg = newMsg.id;
      storage.write('settings', settingsData);
    }
  } catch (err) {
    console.error('[updateLiveLeaderboardChannel Error]:', err.message);
  }
}

/**
 * Cek dan siarkan pengumuman spawn World Boss di jam 21:00 WIB
 */
async function checkAndBroadcastBossSpawn(client) {
  if (!client) return;
  const allBoss = getBossStorage();
  const scheduledTier = getScheduledBossTier();

  for (const guild of client.guilds.cache.values()) {
    try {
      if (!allBoss[guild.id]) allBoss[guild.id] = {};
      let boss = allBoss[guild.id].activeBoss;

      // Jika boss belum ada atau sudah kalah hari sebelumnya, ciptakan boss baru sesuai tier terjadwal
      if (!boss || boss.status === 'DEFEATED') {
        const config = BOSS_CONFIGS[scheduledTier] || BOSS_CONFIGS.DAILY;
        boss = {
          id: `boss_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          guildId: guild.id,
          tier: config.tier,
          name: config.name,
          title: config.title,
          color: config.color,
          maxHp: config.maxHp,
          currentHp: config.maxHp,
          status: 'ACTIVE',
          spawnedAt: Date.now(),
          defeatedAt: null,
          forceSpawned: false,
          parties: {},
          playerStats: {},
          activeCombat: null,
          history: []
        };
        allBoss[guild.id].activeBoss = boss;
        saveBossStorage(allBoss);
      } else {
        boss.status = 'ACTIVE';
        saveBossStorage(allBoss);
      }

      // Ambil channel pengumuman
      const settingsData = storage.read('settings') || {};
      const gCh = settingsData[guild.id]?.gachaChannels || {};
      const targetChannelId = gCh.feed || gCh.announce || gCh.hub || gCh.play || gCh.broadcast;
      if (!targetChannelId) continue;

      const targetChannel = await client.channels.fetch(targetChannelId).catch(() => null);
      if (!targetChannel || !targetChannel.isTextBased()) continue;

      const loungeChId = gCh.hub || gCh.play;
      const loungeText = loungeChId ? `<#${loungeChId}>` : 'Channel Lounge';

      const spawnEmbed = new EmbedBuilder()
        .setColor(boss.color || 0x9B59B6)
        .setTitle(`🚨 WORLD BOSS RAID TELAH BANGKIT! (21:00 WIB)`)
        .setDescription(
          `Gerbang dimensi telah terbuka! **${boss.name}** [${boss.tier} RAID] muncul di server!\n\n` +
          `> *“${boss.title}”*\n\n` +
          `• **Kasta Boss:** \`${boss.tier}\`\n` +
          `• **Darah Boss:** **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP**\n` +
          `• **Waktu Tempur:** Pukul **21:00 WIB - 23:59 WIB**\n\n` +
          `⚔️ Segera bentuk partymu di ${loungeText} dan serang bersama seluruh squad server!`
        )
        .setImage(BOSS_VISUALS.STANCE[boss.tier] || BOSS_VISUALS.STANCE.DAILY)
        .setFooter({ text: `${guild.name} • World Boss Raid 21:00 WIB` })
        .setTimestamp();

      await targetChannel.send({ embeds: [spawnEmbed] }).catch(() => {});

      // Auto update live leaderboard di #papan-klasemen
      await updateLiveLeaderboardChannel(guild, client).catch(() => {});
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
          `• **Waktu Kemunculan:** Tepat pukul **21:00 WIB** (Tersisa **${minutesLeft} Menit** lagi)\n` +
          `• **Total Darah Boss:** **${config.maxHp.toLocaleString('id-ID')} HP**\n\n` +
          `🛡️ **Persiapan Pra-Tempur:**\n` +
          `1. Buka \`/gacha inventory\` dan pasang (*Equip*) relik bertier tinggi untuk bonus ATK dan HP.\n` +
          `2. Ajak rekan-rekanmu bersiap di ${loungeText} untuk membentuk squad party saat jam 21:00 WIB tiba!`
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

module.exports = {
  BOSS_CONFIGS,
  STANCES,
  getWIBDate,
  getNextBossSpawnTime,
  isBossRaidOpen,
  getScheduledBossTier,
  toggleAdminForceBossRaid,
  checkAndBroadcastBossSpawn,
  checkAndBroadcastBossWarning,
  getGuildBossState,
  getPlayerRelicBonus,
  getUserActiveParty,
  createBossParty,
  joinBossParty,
  quickJoinBossParty,
  leaveBossParty,
  startPartyCombat,
  handlePlayerBossStance,
  buildCombatTurnPayload,
  buildBossLobbyPayload,
  buildLiveLeaderboardEmbeds,
  updateLiveLeaderboardChannel
};
