const storage = require('./storage');
const { generateStreakBanner, getStreakTier, isMilestoneDay } = require('./streakCanvas');
const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

// Dedicated Leaderboard Channel & Milestone Role Configuration
const STREAK_LEADERBOARD_GUILD_ID = '1396245234693963878';
const STREAK_LEADERBOARD_CHANNEL_ID = '1563045564021608548';
const STREAK_MILESTONE_ROLE_ID = '1396396538686607410'; // Role pengumuman mirip everyone

/**
 * Buat pair key unik & konsisten terlepas dari urutan user
 */
function getPairKey(user1Id, user2Id) {
  return [user1Id, user2Id].sort().join('_');
}

/**
 * Ambil tanggal dan waktu otomatis berdasarkan Waktu Indonesia Barat (WIB / UTC+7).
 */
function getTimezoneInfo() {
  const offsetHours = 7; // WIB (UTC+7)

  const nowUTC = new Date();
  const localTime = new Date(nowUTC.getTime() + offsetHours * 60 * 60 * 1000);

  const year = localTime.getUTCFullYear();
  const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localTime.getUTCDate()).padStart(2, '0');
  const hour = localTime.getUTCHours();
  const minute = localTime.getUTCMinutes();

  const todayStr = `${year}-${month}-${day}`;
  const yearMonth = `${year}-${month}`;

  // Hitung kemarin
  const yesterday = new Date(localTime.getTime() - 24 * 60 * 60 * 1000);
  const yYear = yesterday.getUTCFullYear();
  const yMonth = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
  const yDay = String(yesterday.getUTCDate()).padStart(2, '0');
  const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;

  return {
    timezone: 'WIB',
    offsetHours: 7,
    todayStr,
    yesterdayStr,
    yearMonth,
    hour,
    minute
  };
}

/**
 * Baca semua streaks dari storage
 */
function getAllStreaks() {
  return storage.read('streaks') || {};
}

/**
 * Simpan seluruh objek streaks ke storage
 */
function saveAllStreaks(data) {
  storage.write('streaks', data);
}

/**
 * Dapatkan data streak spesifik antara dua user
 */
function getStreak(user1Id, user2Id) {
  const streaks = getAllStreaks();
  const pairKey = getPairKey(user1Id, user2Id);
  return streaks[pairKey] || null;
}

/**
 * Dapatkan seluruh streak milik seorang user
 */
function getUserStreaks(userId) {
  const streaks = getAllStreaks();
  const results = [];
  for (const item of Object.values(streaks)) {
    if (item.user1Id === userId || item.user2Id === userId) {
      results.push(item);
    }
  }
  return results;
}

/**
 * Cek dan perbarui kuota 5x pemulihan bulanan per pasangan
 */
function getMonthlyRevives(streak, currentYearMonth) {
  if (streak.lastReviveMonth !== currentYearMonth) {
    streak.monthlyRevivesLeft = 5;
    streak.lastReviveMonth = currentYearMonth;
  }
  if (streak.monthlyRevivesLeft === undefined || streak.monthlyRevivesLeft === null) {
    streak.monthlyRevivesLeft = 5;
  }
  return streak.monthlyRevivesLeft;
}

/**
 * Berikan benefit Stardust & Tiket Gacha ke user
 */
function awardStreakRewards(guildId, userId, streakDays, isRevive = false, isMilestone = false) {
  try {
    const gachaData = storage.read('gacha_data') || {};
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
        titles: []
      };
    }

    const tier = getStreakTier(streakDays);
    let dust = 30 + (tier.id - 1) * 20;
    let tickets = Math.min(5, Math.floor(1 + (tier.id - 1) * 0.7));

    if (isRevive) {
      dust += 75;
      tickets += 1;
    }

    if (isMilestone) {
      dust += 500; // Bonus Jackpot Milestone Spesial
      tickets += 5;
    }

    const u = gachaData[guildId][userId];
    u.stardust = (u.stardust || 0) + dust;
    u.tickets = (u.tickets || 0) + tickets;
    storage.write('gacha_data', gachaData);

    return { dust, tickets };
  } catch (err) {
    console.warn('[Streak Reward] Gagal memberikan reward:', err.message);
    return { dust: 0, tickets: 0 };
  }
}

/**
 * Buat undangan streak baru
 */
function createInvite({ guildId, inviterId, targetId, channelId = null }) {
  const streaks = getAllStreaks();
  const pairKey = getPairKey(inviterId, targetId);

  if (streaks[pairKey] && streaks[pairKey].status === 'active') {
    return { success: false, reason: 'ALREADY_ACTIVE', streak: streaks[pairKey] };
  }

  const tzInfo = getTimezoneInfo();

  const newStreak = {
    pairKey,
    guildId,
    user1Id: inviterId,
    user2Id: targetId,
    targetUserId: targetId,
    timezone: 'WIB',
    streakCount: 0,
    previousStreakCount: 0,
    highestStreak: 0,
    status: 'pending',
    invitedBy: inviterId,
    createdAt: Date.now(),
    lastChannelId: channelId,
    lastLitDate: null,
    todayInitiatorId: null,
    todayInitiatedDate: null,
    remindedToday: false,
    monthlyRevivesLeft: 5,
    lastReviveMonth: tzInfo.yearMonth,
    user1Chats: 0,
    user2Chats: 0,
    totalPairMessages: 0
  };

  streaks[pairKey] = newStreak;
  saveAllStreaks(streaks);
  return { success: true, streak: newStreak };
}

/**
 * Konfirmasi penerimaan undangan streak.
 * Saat diterima, api langsung RESMI MENYALA di Hari ke-1 (tanpa perlu chat lagi hari ini),
 * reward harian langsung diberikan, dan banner Hari ke-1 langsung dirender.
 */
async function acceptInvite(pairKey, acceptingUserId, guild = null, client = null) {
  const streaks = getAllStreaks();
  const streak = streaks[pairKey];

  if (!streak) return { success: false, reason: 'NOT_FOUND' };
  if (streak.status === 'active') return { success: false, reason: 'ALREADY_ACTIVE' };

  const targetUserId = streak.targetUserId || (streak.invitedBy === streak.user1Id ? streak.user2Id : streak.user1Id);

  // Verifikasi hanya orang yang diajak / diundang yang boleh menerima
  if (acceptingUserId !== targetUserId) {
    if (streak.invitedBy === acceptingUserId) {
      return { success: false, reason: 'CANNOT_ACCEPT_OWN', targetUserId };
    }
    return { success: false, reason: 'NOT_INVITED_USER', targetUserId };
  }

  const tzInfo = getTimezoneInfo();

  streak.status = 'active';
  streak.startDate = Date.now();
  streak.streakCount = 1; // Langsung Hari ke-1!
  streak.highestStreak = Math.max(streak.highestStreak || 0, 1);
  streak.previousStreakCount = 0;
  streak.lastLitDate = tzInfo.todayStr; // Langsung menyala hari ini!
  streak.lastLitTime = Date.now();
  streak.todayInitiatorId = null;
  streak.todayInitiatedDate = null;
  streak.remindedToday = false;
  streak.monthlyRevivesLeft = 5;
  streak.lastReviveMonth = tzInfo.yearMonth;
  streak.user1Chats = streak.user1Chats || 0;
  streak.user2Chats = streak.user2Chats || 0;
  streak.totalPairMessages = streak.totalPairMessages || 0;

  // Berikan reward harian awal untuk kedua belah pihak
  const reward1 = awardStreakRewards(streak.guildId, streak.user1Id, 1, false, false);
  const reward2 = awardStreakRewards(streak.guildId, streak.user2Id, 1, false, false);

  saveAllStreaks(streaks);

  // Perbarui leaderboard jika client tersedia
  if (client) {
    updateLiveStreakLeaderboard(client, streak.guildId).catch(() => {});
  }

  // Render canvas banner Hari ke-1 jika guild tersedia
  let bannerBuffer = null;
  if (guild) {
    try {
      const member1 = await guild.members.fetch(streak.user1Id).catch(() => null);
      const member2 = await guild.members.fetch(streak.user2Id).catch(() => null);

      const u1Name = member1?.displayName || member1?.user?.username || 'User 1';
      const u1Tag = member1?.user?.username || 'user1';
      const u1Avatar = member1?.user?.displayAvatarURL({ extension: 'png', size: 128 });

      const u2Name = member2?.displayName || member2?.user?.username || 'User 2';
      const u2Tag = member2?.user?.username || 'user2';
      const u2Avatar = member2?.user?.displayAvatarURL({ extension: 'png', size: 128 });

      bannerBuffer = await generateStreakBanner({
        days: 1,
        user1: { name: u1Name, tag: u1Tag, avatarUrl: u1Avatar, chatCount: streak.user1Chats || 0 },
        user2: { name: u2Name, tag: u2Tag, avatarUrl: u2Avatar, chatCount: streak.user2Chats || 0 },
        totalPairChats: streak.totalPairMessages || 0,
        timezone: 'WIB',
        statusText: 'HARI INI RESMI MENYALA • RESET 00:00 WIB'
      });
    } catch (bErr) {
      console.warn('[Streak Banner Day 1] Gagal generate:', bErr.message);
    }
  }

  return { success: true, streak, reward: reward1, bannerBuffer };
}

/**
 * Tolak atau batalkan undangan streak
 */
function declineInvite(pairKey, userId = null) {
  const streaks = getAllStreaks();
  const streak = streaks[pairKey];
  if (!streak || streak.status !== 'pending') return { success: false, reason: 'NOT_FOUND' };

  const targetUserId = streak.targetUserId || (streak.invitedBy === streak.user1Id ? streak.user2Id : streak.user1Id);
  if (userId && userId !== targetUserId && userId !== streak.invitedBy) {
    return { success: false, reason: 'UNAUTHORIZED', targetUserId };
  }

  delete streaks[pairKey];
  saveAllStreaks(streaks);
  return { success: true, targetUserId, invitedBy: streak.invitedBy };
}

/**
 * Akhiri/putus koneksi streak
 */
function endStreak(pairKey) {
  const streaks = getAllStreaks();
  if (streaks[pairKey]) {
    delete streaks[pairKey];
    saveAllStreaks(streaks);
    return true;
  }
  return false;
}

/**
 * Bangun Embed Papan Klasemen
 */
function buildStreakLeaderboardEmbed(guildId) {
  const allStreaks = Object.values(getAllStreaks()).filter(
    s => (s.guildId === guildId || !guildId || s.guildId === STREAK_LEADERBOARD_GUILD_ID) &&
         (s.status === 'active' || s.status === 'broken')
  );

  allStreaks.sort((a, b) => {
    const countA = a.status === 'active' ? (a.streakCount || 0) : (a.previousStreakCount || a.streakCount || 0);
    const countB = b.status === 'active' ? (b.streakCount || 0) : (b.previousStreakCount || b.streakCount || 0);
    return countB - countA;
  });

  const tzInfo = getTimezoneInfo();
  const top10 = allStreaks.slice(0, 10);

  let listText = '';
  if (top10.length === 0) {
    listText = '*Belum ada pasangan streak terdaftar di server ini. Ketik `/streak ajak @partner` untuk memulai!*';
  } else {
    listText = top10.map((s, idx) => {
      const days = s.status === 'active' ? (s.streakCount || 0) : (s.previousStreakCount || s.streakCount || 0);
      const tier = getStreakTier(days);
      const isLitToday = s.lastLitDate === tzInfo.todayStr;

      let medal = `\`${String(idx + 1).padStart(2, '0')}.\``;
      if (idx === 0) medal = '🥇 **1.**';
      if (idx === 1) medal = '🥈 **2.**';
      if (idx === 2) medal = '🥉 **3.**';

      const statusBadge = s.status === 'broken'
        ? '🥀 *Padam (Bisa Dipulihkan)*'
        : isLitToday
          ? '✦ *Menyala Hari Ini*'
          : s.todayInitiatorId
            ? '⏳ *Menunggu Balasan Partner*'
            : '⏳ *Menunggu Chat Teks*';

      const totalChats = (s.totalPairMessages || 0).toLocaleString('id-ID');

      return `${medal} <@${s.user1Id}> & <@${s.user2Id}> — **${days} Hari**\n` +
             `    ┗ **${tier.tierLabel} • ${tier.name}**  ·  💬 ${totalChats} Chat  ·  ${statusBadge}`;
    }).join('\n\n');
  }

  const embed = new EmbedBuilder()
    .setColor('#F59E0B')
    .setTitle('✦ PAPAN KLASEMEN FLAME STREAK ✦')
    .setDescription(
      `🏆 **TOP 10 KONEKSI STREAK TERTINGGI SERVER**\n` +
      `*Nyalakan api setiap hari dengan saling chat & balas di channel teks server!*\n\n` +
      `${listText}\n\n` +
      `────────────────────────────────\n` +
      `✦ **Panduan & Informasi Sistem:**\n` +
      `• **Mulai Streak:** Gunakan perintah \`/streak ajak @partner\`\n` +
      `• **Menyalakan Api (2 Arah):** Chat saling tag / reply satu sama lain setiap hari\n` +
      `• **Waktu Reset:** Pukul **00:00 WIB** (Pengingat otomatis pukul **21:00 WIB**)\n` +
      `• **Kuota Pemulihan:** **5x per bulan** jika streak padam (angka kembali utuh)\n` +
      `• **Hadiah Milestone:** Mention role perayaan + Jackpot Stardust & Tiket!`
    )
    .setFooter({ text: 'Otomatis diperbarui secara realtime • Waktu Indonesia Barat (WIB)' })
    .setTimestamp();

  return embed;
}

/**
 * Update Papan Klasemen Realtime di channel khusus
 */
async function updateLiveStreakLeaderboard(client, targetGuildId = STREAK_LEADERBOARD_GUILD_ID) {
  if (!client) return;

  try {
    const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);
    if (!guild) return;

    const settings = storage.read('settings') || {};
    const channelId = settings[targetGuildId]?.streakLeaderboardChannel || STREAK_LEADERBOARD_CHANNEL_ID;

    const channel = guild.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const embed = buildStreakLeaderboardEmbed(targetGuildId);
    const existingMsgId = settings[targetGuildId]?.streakLeaderboardMsgId;

    let targetMsg = null;
    if (existingMsgId) {
      targetMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
    }

    if (!targetMsg) {
      const recent = await channel.messages.fetch({ limit: 10 }).catch(() => null);
      if (recent) {
        targetMsg = recent.find(m =>
          m.author.id === client.user.id &&
          m.embeds.some(e => e.title && e.title.includes('PAPAN KLASEMEN FLAME STREAK'))
        );
      }
    }

    if (targetMsg) {
      await targetMsg.edit({ embeds: [embed] }).catch(() => {});
      if (!settings[targetGuildId]) settings[targetGuildId] = {};
      settings[targetGuildId].streakLeaderboardMsgId = targetMsg.id;
      settings[targetGuildId].streakLeaderboardChannel = channelId;
      storage.write('settings', settings);
    } else {
      const newMsg = await channel.send({ embeds: [embed] }).catch(() => null);
      if (newMsg) {
        if (!settings[targetGuildId]) settings[targetGuildId] = {};
        settings[targetGuildId].streakLeaderboardMsgId = newMsg.id;
        settings[targetGuildId].streakLeaderboardChannel = channelId;
        storage.write('settings', settings);
      }
    }
  } catch (err) {
    console.warn('[Streak Leaderboard Update] Error:', err.message);
  }
}

/**
 * Pulihkan streak yang mati/padam menggunakan kuota 5x bulanan.
 */
async function reviveStreak(pairKey, reviverUserId, guild, client = null) {
  const streaks = getAllStreaks();
  const streak = streaks[pairKey];

  if (!streak) return { success: false, reason: 'NOT_FOUND' };
  if (streak.status === 'active') return { success: false, reason: 'ALREADY_ACTIVE' };
  if (streak.user1Id !== reviverUserId && streak.user2Id !== reviverUserId) {
    return { success: false, reason: 'NOT_PARTNER' };
  }

  const tzInfo = getTimezoneInfo();
  const revivesLeft = getMonthlyRevives(streak, tzInfo.yearMonth);

  if (revivesLeft <= 0) {
    return { success: false, reason: 'NO_REVIVES_LEFT', revivesLeft: 0 };
  }

  streak.monthlyRevivesLeft = revivesLeft - 1;
  const restoredDays = Math.max(1, streak.previousStreakCount || streak.streakCount || 1);
  streak.streakCount = restoredDays;
  streak.status = 'active';
  streak.lastLitDate = tzInfo.todayStr;
  streak.lastLitTime = Date.now();
  streak.todayInitiatorId = null;
  streak.todayInitiatedDate = null;
  streak.remindedToday = false;

  saveAllStreaks(streaks);

  const reviverReward = awardStreakRewards(guild.id, reviverUserId, restoredDays, true);
  const otherUserId = streak.user1Id === reviverUserId ? streak.user2Id : streak.user1Id;
  awardStreakRewards(guild.id, otherUserId, restoredDays, false);

  if (client) {
    updateLiveStreakLeaderboard(client, guild.id).catch(() => {});
  }

  const member1 = await guild.members.fetch(streak.user1Id).catch(() => null);
  const member2 = await guild.members.fetch(streak.user2Id).catch(() => null);

  const u1Name = member1?.displayName || member1?.user?.username || 'User 1';
  const u1Tag = member1?.user?.username || 'user1';
  const u1Avatar = member1?.user?.displayAvatarURL({ extension: 'png', size: 128 });

  const u2Name = member2?.displayName || member2?.user?.username || 'User 2';
  const u2Tag = member2?.user?.username || 'user2';
  const u2Avatar = member2?.user?.displayAvatarURL({ extension: 'png', size: 128 });

  const bannerBuffer = await generateStreakBanner({
    days: streak.streakCount,
    user1: { name: u1Name, tag: u1Tag, avatarUrl: u1Avatar, chatCount: streak.user1Chats || 0 },
    user2: { name: u2Name, tag: u2Tag, avatarUrl: u2Avatar, chatCount: streak.user2Chats || 0 },
    totalPairChats: streak.totalPairMessages || 0,
    timezone: 'WIB',
    statusText: `DIPULIHKAN (${streak.streakCount} HARI) • SISA KUOTA: ${streak.monthlyRevivesLeft}/5`
  });

  return {
    success: true,
    streak,
    bannerBuffer,
    restoredDays,
    revivesLeft: streak.monthlyRevivesLeft,
    reward: reviverReward
  };
}

/**
 * Handler pesan teks: Mendukung Saling Balas (Two-Way Mutual Chat) & Deteksi Tag/Reply.
 * Dipanggil dari messageCreate.js
 */
async function handleMessageStreak(message, client = null) {
  if (message.author.bot || !message.guild) return null;
  if (message.channel.isVoiceBased && message.channel.isVoiceBased()) return null;

  const authorId = message.author.id;
  const streaks = getAllStreaks();

  // Kumpulkan target partner dari Mention manual dan Discord Reply reference
  const targetUserIds = new Set();
  if (message.mentions.users && message.mentions.users.size > 0) {
    for (const [uid, user] of message.mentions.users.entries()) {
      if (uid !== authorId && !user.bot) targetUserIds.add(uid);
    }
  }

  // Cek jika pesan ini adalah balasan (Reply) ke chat orang lain
  if (message.reference && message.reference.messageId) {
    try {
      const refMsg = message.channel.messages.cache.get(message.reference.messageId) ||
        await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (refMsg && refMsg.author && !refMsg.author.bot && refMsg.author.id !== authorId) {
        targetUserIds.add(refMsg.author.id);
      }
    } catch (_) {}
  }

  if (targetUserIds.size === 0) return null;

  let processedCount = 0;
  const tzInfo = getTimezoneInfo();

  for (const targetId of targetUserIds) {
    const pairKey = getPairKey(authorId, targetId);
    const streak = streaks[pairKey];

    if (!streak || streak.status !== 'active') continue;

    // Catat statistik chat di server
    if (streak.user1Id === authorId) {
      streak.user1Chats = (streak.user1Chats || 0) + 1;
    } else {
      streak.user2Chats = (streak.user2Chats || 0) + 1;
    }
    streak.totalPairMessages = (streak.totalPairMessages || 0) + 1;

    // JIKA HARI INI SUDAH RESMI MENYALA LENGKAP:
    // Cukup simpan penambahan chat, tidak perlu mengirim pengumuman ganda
    if (streak.lastLitDate === tzInfo.todayStr) {
      saveAllStreaks(streaks);
      processedCount++;
      continue;
    }

    // ============================================================
    // LANGKAH 1: ORANG PERTAMA MEMULAI CHAT HARI INI
    // ============================================================
    if (streak.todayInitiatedDate !== tzInfo.todayStr) {
      streak.todayInitiatedDate = tzInfo.todayStr;
      streak.todayInitiatorId = authorId;
      streak.lastChannelId = message.channel.id;
      saveAllStreaks(streaks);

      const nextDayPreview = streak.lastLitDate === tzInfo.yesterdayStr ? (streak.streakCount || 0) + 1 : 1;

      // Kirim pesan pemicu agar partner datang ke channel teks dan membalas
      const waitEmbed = new EmbedBuilder()
        .setColor('#F59E0B')
        .setDescription(
          `💬 **Langkah 1 Selesai: Sapaan Dikirim!**\n` +
          `<@${authorId}> telah menyapa <@${targetId}> di channel ini!\n\n` +
          `> ⏳ Tinggal 1 langkah lagi: <@${targetId}> wajib **membalas / me-reply** chat ini untuk menyalakan api (**Hari ke-${nextDayPreview}**) sebelum 00:00 WIB.`
        );

      await message.reply({ embeds: [waitEmbed] }).catch(() => {});
      processedCount++;
      continue;
    }

    // ============================================================
    // LANGKAH 2: CEK BALASAN DARI PARTNER (TWO-WAY COMPLETION)
    // ============================================================
    if (streak.todayInitiatedDate === tzInfo.todayStr) {
      // Jika yang chat adalah orang yang sama lagi (belum dibalas partner)
      if (streak.todayInitiatorId === authorId) {
        saveAllStreaks(streaks);
        processedCount++;
        continue;
      }

      // HORE! Partner telah membalas chat! API RESMI MENYALA!
      if (streak.lastLitDate === tzInfo.yesterdayStr) {
        streak.streakCount = (streak.streakCount || 0) + 1;
      } else {
        streak.streakCount = 1;
      }

      streak.highestStreak = Math.max(streak.highestStreak || 0, streak.streakCount);
      streak.lastLitDate = tzInfo.todayStr;
      streak.lastLitTime = Date.now();
      streak.lastChannelId = message.channel.id;
      streak.todayInitiatorId = null;
      streak.remindedToday = false;

      const isMilestone = isMilestoneDay(streak.streakCount);

      // Berikan reward harian (atau reward jackpot jika milestone)
      const authorReward = awardStreakRewards(message.guild.id, authorId, streak.streakCount, false, isMilestone);
      const partnerReward = awardStreakRewards(message.guild.id, targetId, streak.streakCount, false, isMilestone);

      saveAllStreaks(streaks);

      // Update Papan Klasemen Realtime
      const botClient = client || message.client;
      if (botClient) {
        updateLiveStreakLeaderboard(botClient, message.guild.id).catch(() => {});
      }

      // Ambil data avatar kedua user
      const member1 = await message.guild.members.fetch(streak.user1Id).catch(() => null);
      const member2 = await message.guild.members.fetch(streak.user2Id).catch(() => null);

      const u1Name = member1?.displayName || member1?.user?.username || 'User 1';
      const u1Tag = member1?.user?.username || 'user1';
      const u1Avatar = member1?.user?.displayAvatarURL({ extension: 'png', size: 128 });

      const u2Name = member2?.displayName || member2?.user?.username || 'User 2';
      const u2Tag = member2?.user?.username || 'user2';
      const u2Avatar = member2?.user?.displayAvatarURL({ extension: 'png', size: 128 });

      // Render Canvas Ultra-Wide Resolusi Penuh Discord (1280 x 520 px)
      const bannerBuffer = await generateStreakBanner({
        days: streak.streakCount,
        user1: { name: u1Name, tag: u1Tag, avatarUrl: u1Avatar, chatCount: streak.user1Chats || 0 },
        user2: { name: u2Name, tag: u2Tag, avatarUrl: u2Avatar, chatCount: streak.user2Chats || 0 },
        totalPairChats: streak.totalPairMessages || 0,
        timezone: 'WIB',
        statusText: `HARI INI RESMI MENYALA • RESET 00:00 WIB`,
        isMilestone
      });

      const tier = getStreakTier(streak.streakCount);
      const attachment = new AttachmentBuilder(bannerBuffer, { name: `streak_${streak.streakCount}d.png` });

      // ============================================================
      // CELEBRATION & MILESTONE ROLE MENTION (Tanpa Embed untuk Tampilan Penuh)
      // ============================================================
      if (isMilestone) {
        // PENGUMUMAN MILESTONE SPESIAL DENGAN MENTION ROLE (teks ringkas)
        const milestoneContent =
          `<@&${STREAK_MILESTONE_ROLE_ID}>\n\n` +
          `🎉 **MILESTONE! ${streak.streakCount} HARI STREAK** — <@${streak.user1Id}> & <@${streak.user2Id}> · **${tier.tierLabel} • ${tier.name}**\n` +
          `> 🎁 Jackpot: **+${authorReward.dust} Stardust** & **+${authorReward.tickets} Tiket Gacha** untuk mereka berdua!`;

        await message.channel.send({
          content: milestoneContent,
          files: [attachment],
          allowedMentions: { roles: [STREAK_MILESTONE_ROLE_ID] }
        }).catch(err => console.warn('[Streak Milestone] Gagal kirim:', err.message));
      } else {
        // PENYALAAN NORMAL HARIAN (Full-width attachment, teks ringkas)
        const streakContent =
          `✦ **Api Streak Resmi Menyala!** · <@${authorId}> & <@${targetId}> — **Hari ke-${streak.streakCount}** · **${tier.tierLabel} • ${tier.name}**\n` +
          `> 🎁 **+${authorReward.dust} Stardust** & **+${authorReward.tickets} Tiket Gacha** untuk kalian berdua!`;

        await message.reply({
          content: streakContent,
          files: [attachment]
        }).catch(err => console.warn('[Streak] Gagal kirim banner:', err.message));
      }

      processedCount++;
    }
  }

  return processedCount > 0 ? { success: true } : null;
}

/**
 * Bangun data daftar seluruh streak yang melibatkan seorang user (aktif, padam, maupun pending).
 */
function buildUserStreakList(userId) {
  const streaks = getAllStreaks();
  const tzInfo = getTimezoneInfo();

  const active = [];
  const broken = [];
  const pendingSent = [];
  const pendingReceived = [];

  for (const s of Object.values(streaks)) {
    if (s.user1Id !== userId && s.user2Id !== userId) continue;

    const partnerId = s.user1Id === userId ? s.user2Id : s.user1Id;

    if (s.status === 'active') {
      const isLitToday = s.lastLitDate === tzInfo.todayStr;
      const tier = getStreakTier(s.streakCount || 1);
      let statusToday = '';

      if (isLitToday) {
        statusToday = '🔥 **Sudah Menyala** (Aman sampai reset 00:00 WIB)';
      } else if (s.todayInitiatedDate === tzInfo.todayStr && s.todayInitiatorId === userId) {
        statusToday = `⏳ **Menunggu balasan partner** (Kamu sudah chat, <@${partnerId}> belum membalas)`;
      } else if (s.todayInitiatedDate === tzInfo.todayStr && s.todayInitiatorId === partnerId) {
        statusToday = `⚠️ **Menunggu balasanmu!** (<@${partnerId}> sudah chat, balas sebelum 00:00 WIB!)`;
      } else {
        statusToday = '⏳ **Belum Menyala!** (Kalian berdua belum saling chat hari ini)';
      }

      active.push({
        partnerId,
        days: s.streakCount || 1,
        tier,
        isLitToday,
        statusToday,
        totalChats: s.totalPairMessages || 0
      });
    } else if (s.status === 'broken') {
      const revivesLeft = getMonthlyRevives(s, tzInfo.yearMonth);
      broken.push({
        partnerId,
        days: s.previousStreakCount || 1,
        revivesLeft
      });
    } else if (s.status === 'pending') {
      if (s.invitedBy === userId) {
        pendingSent.push({ partnerId });
      } else {
        pendingReceived.push({ partnerId });
      }
    }
  }

  return {
    userId,
    active,
    broken,
    pendingSent,
    pendingReceived,
    tzInfo
  };
}

/**
 * Format embed tampilan daftar partner streak realtime untuk slash command /streak list
 */
function formatUserStreakListEmbed(userId) {
  const data = buildUserStreakList(userId);
  const totalActive = data.active.length;
  const totalLit = data.active.filter(a => a.isLitToday).length;

  let activeText = '';
  if (totalActive === 0) {
    activeText = '*Kamu belum memiliki partner streak yang aktif.*\n*Gunakan `/streak ajak @partner` untuk memulai!*';
  } else {
    activeText = data.active.map(a => {
      return `• <@${a.partnerId}> — **${a.days} Hari** (${a.tier.tierLabel} • ${a.tier.name})\n  ┗ Status: ${a.statusToday}`;
    }).join('\n\n');
  }

  let brokenText = '';
  if (data.broken.length > 0) {
    brokenText = data.broken.map(b => {
      return `• <@${b.partnerId}> — **Padam di Hari ke-${b.days}** (Sisa Kuota: **${b.revivesLeft}/5**)\n  ┗ *Gunakan \`/streak pulihkan\` untuk menghidupkan kembali!*`;
    }).join('\n');
  }

  let pendingText = '';
  if (data.pendingSent.length > 0) {
    pendingText += data.pendingSent.map(p => `• Menunggu konfirmasi dari <@${p.partnerId}>`).join('\n') + '\n';
  }
  if (data.pendingReceived.length > 0) {
    pendingText += data.pendingReceived.map(p => `• Undangan masuk dari <@${p.partnerId}> — *Cek chat server untuk menerima!*`).join('\n');
  }

  const embed = new EmbedBuilder()
    .setColor(totalActive > 0 && totalLit === totalActive ? '#10B981' : '#F59E0B')
    .setTitle('✦ DAFTAR PARTNER FLAME STREAK KAMU ✦')
    .setDescription(
      `👤 **Status Streak untuk:** <@${userId}>\n` +
      `> 📊 Total Pasangan Aktif: **${totalActive} Partner**\n` +
      `> 🔥 Status Hari Ini: **${totalLit}/${totalActive} Menyala**\n` +
      `> ⏰ Waktu Reset: Pukul **00:00 WIB** (Pengingat harian otomatis via DM)\n\n` +
      `───────────────────────────────\n` +
      `**DAFTAR PARTNER AKTIF:**\n` +
      `${activeText}\n\n` +
      (brokenText ? `───────────────────────────────\n🥀 **STREAK PADAM (DAPAT DIPULIHKAN):**\n${brokenText}\n\n` : '') +
      (pendingText ? `───────────────────────────────\n📩 **UNDANGAN STREAK MENUNGGU:**\n${pendingText}\n\n` : '') +
      `───────────────────────────────\n` +
      `💡 *Cara menyalakan api: Cukup saling chat & reply partner kamu di channel teks server setiap hari!*`
    )
    .setFooter({ text: 'Realtime Status • Zona Waktu Indonesia Barat (WIB)' })
    .setTimestamp();

  return embed;
}

/**
 * Mengirimkan reminder pribadi (DM) harian setiap pukul 21:00 WIB
 * ke setiap user yang memiliki streak yang BELUM menyala hari ini.
 * Ditandai secara jelas mana yang sudah nyala dan mana yang belum.
 */
async function sendDailyPersonalStreakReminders(client) {
  if (!client) return;
  const streaks = getAllStreaks();
  const tzInfo = getTimezoneInfo();

  // Kumpulkan semua user unik yang memiliki streak aktif
  const userMap = new Map();

  for (const s of Object.values(streaks)) {
    if (s.status !== 'active') continue;
    if (!userMap.has(s.user1Id)) userMap.set(s.user1Id, []);
    if (!userMap.has(s.user2Id)) userMap.set(s.user2Id, []);

    userMap.get(s.user1Id).push(s);
    userMap.get(s.user2Id).push(s);
  }

  for (const [userId, userStreaks] of userMap.entries()) {
    // Cek apakah ada streak yang belum menyala hari ini
    const unlitStreaks = userStreaks.filter(s => s.lastLitDate !== tzInfo.todayStr);
    if (unlitStreaks.length === 0) {
      // Semua streak user ini sudah menyala hari ini
      continue;
    }

    // Bangun daftar status per partner
    const items = userStreaks.map(s => {
      const partnerId = s.user1Id === userId ? s.user2Id : s.user1Id;
      const isLit = s.lastLitDate === tzInfo.todayStr;
      const tier = getStreakTier(s.streakCount || 1);

      if (isLit) {
        return `• <@${partnerId}>: ✅ **Sudah Menyala** (${s.streakCount} Hari • ${tier.name})`;
      } else if (s.todayInitiatedDate === tzInfo.todayStr && s.todayInitiatorId === partnerId) {
        return `• <@${partnerId}>: ⚠️ **Menunggu Balasanmu!** (<@${partnerId}> sudah menyapa di server, segera balas!)`;
      } else if (s.todayInitiatedDate === tzInfo.todayStr && s.todayInitiatorId === userId) {
        return `• <@${partnerId}>: ⏳ **Menunggu Balasan Partner** (Kamu sudah menyapa, ingatkan <@${partnerId}>!)`;
      } else {
        return `• <@${partnerId}>: 🔥 **Belum Menyala!** (${s.streakCount} Hari — Segera saling chat di channel teks!)`;
      }
    });

    const dmContent =
      `🔔 **PENGINGAT FLAME STREAK HARIAN (Pukul 21:00 WIB)**\n` +
      `Halo <@${userId}>! Sisa waktu **~3 jam lagi** sebelum api streak direset pada pukul **00:00 WIB**.\n\n` +
      `📊 **Status Seluruh Partner Streak Kamu Hari Ini:**\n` +
      items.join('\n') + `\n\n` +
      `⚠️ *Jangan biarkan api streak kalian padam! Segera buka server dan saling chat/reply di channel teks sebelum tengah malam!*\n` +
      `*(Ketik \`/streak list\` di server untuk memantau status realtime kapan saja)*`;

    try {
      const user = client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);
      if (user) {
        await user.send({ content: dmContent }).catch(() => {});
      }
    } catch (_) {}
  }
}

/**
 * Kirimkan pesan pemberitahuan satu kali ke DM seluruh member yang memiliki streak aktif/terdaftar
 * setelah bot di-update dengan fitur baru.
 */
async function broadcastStreakUpdate(client) {
  if (!client) return;

  const settings = storage.read('settings') || {};
  if (settings.streakUpdateNotified_v3) return; // Sudah dikirim sebelumnya

  const streaks = getAllStreaks();
  const tzInfo = getTimezoneInfo();

  const userMap = new Map();
  for (const s of Object.values(streaks)) {
    if (!userMap.has(s.user1Id)) userMap.set(s.user1Id, []);
    if (!userMap.has(s.user2Id)) userMap.set(s.user2Id, []);
    userMap.get(s.user1Id).push(s);
    userMap.get(s.user2Id).push(s);
  }

  if (userMap.size === 0) {
    settings.streakUpdateNotified_v3 = true;
    storage.write('settings', settings);
    return;
  }

  console.log(`[Streak Update Broadcast] Mengirim pesan pembaruan ke ${userMap.size} user streak...`);

  for (const [userId, userStreaks] of userMap.entries()) {
    const items = userStreaks.map(s => {
      const partnerId = s.user1Id === userId ? s.user2Id : s.user1Id;
      const isLit = s.lastLitDate === tzInfo.todayStr;
      const days = s.status === 'active' ? s.streakCount : (s.previousStreakCount || 1);
      const tier = getStreakTier(days);
      const statusIcon = s.status === 'broken' ? '🥀 Padam' : isLit ? '✅ Sudah Menyala' : '⏳ Belum Menyala';

      return `• <@${partnerId}>: ${statusIcon} (${days} Hari • ${tier.name})`;
    });

    const updateMessage =
      `✨ **PEMBARUAN SISTEM FLAME STREAK DISCORD!**\n` +
      `Halo <@${userId}>! Sistem Streak server telah diperbarui dengan fitur baru yang jauh lebih mudah:\n\n` +
      `🔥 **1. Terima Undangan = Api Langsung Menyala!**\n` +
      `Saat kamu atau partner menerima ajakan streak, api **Hari ke-1 langsung resmi menyala** dan reward harian (+30 Stardust & +1 Tiket Gacha) langsung masuk, tanpa perlu bingung chat lagi di hari pertama!\n\n` +
      `📋 **2. Perintah Baru \`/streak list\`**\n` +
      `Gunakan perintah \`/streak list\` di server untuk memantau seluruh partner kamu beserta status apinya hari ini secara realtime.\n\n` +
      `🔔 **3. Pengingat Harian Otomatis via DM**\n` +
      `Setiap malam pukul 21:00 WIB, bot akan otomatis mengirimkan pengingat ke DM kamu jika ada streak yang belum dinyalakan.\n\n` +
      `📊 **Status Streak Kamu Saat Ini:**\n` +
      items.join('\n') + `\n\n` +
      `*Selamat melanjutkan petualangan streak bersama partnermu! 🔥*`;

    try {
      const user = client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);
      if (user) {
        await user.send({ content: updateMessage }).catch(() => {});
      }
    } catch (_) {}
  }

  settings.streakUpdateNotified_v3 = true;
  storage.write('settings', settings);
  console.log('[Streak Update Broadcast] Berhasil diselesaikan.');
}

/**
 * Pengecekan Pengingat 3 Jam Sebelum Reset (Jam 21:00 WIB via DM) & Rollover 00:00 WIB
 */
async function checkStreakScheduler(client) {
  const streaks = getAllStreaks();
  let changed = false;
  const tzInfo = getTimezoneInfo();

  // 1. Pengingat Jam 21:00 WIB via Pesan Pribadi (DM)
  if (tzInfo.hour === 21 && tzInfo.minute === 0) {
    let shouldSendDM = false;
    for (const streak of Object.values(streaks)) {
      if (streak.status !== 'active') continue;
      if (!streak.remindedToday) {
        streak.remindedToday = true;
        changed = true;
        shouldSendDM = true;
      }
    }
    if (shouldSendDM) {
      await sendDailyPersonalStreakReminders(client).catch(() => {});
    }
  }

  for (const streak of Object.values(streaks)) {
    if (streak.status !== 'active') continue;

    // 2. Rollover Jam 00:00 WIB (Pergantian Hari)
    if (tzInfo.hour === 0 && tzInfo.minute === 0) {
      if (streak.remindedToday) {
        streak.remindedToday = false;
        changed = true;
      }

      // Reset inisiasi harian
      streak.todayInitiatorId = null;
      streak.todayInitiatedDate = null;

      const revivesLeft = getMonthlyRevives(streak, tzInfo.yearMonth);

      // Jika kemarin tidak dinyalakan sama sekali dan streak sebelumnya > 0
      if (streak.lastLitDate && streak.lastLitDate !== tzInfo.yesterdayStr && streak.lastLitDate !== tzInfo.todayStr && streak.streakCount > 0) {
        streak.previousStreakCount = streak.streakCount;
        streak.streakCount = 0;
        streak.status = 'broken';
        changed = true;

        try {
          const guild = client.guilds.cache.get(streak.guildId);
          if (guild && streak.lastChannelId) {
            const ch = guild.channels.cache.get(streak.lastChannelId) || await guild.channels.fetch(streak.lastChannelId).catch(() => null);
            if (ch && ch.isTextBased()) {
              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`streak_revive_${streak.pairKey}`)
                  .setLabel(`✦ Pulihkan Streak (${revivesLeft}/5 Tersedia)`)
                  .setStyle(ButtonStyle.Success)
              );

              await ch.send({
                content: `<@${streak.user1Id}> <@${streak.user2Id}>`,
                embeds: [
                  new EmbedBuilder()
                    .setColor('#EF4444')
                    .setDescription(
                      `🥀 **Api Streak Padam**\n` +
                      `Streak antara <@${streak.user1Id}> dan <@${streak.user2Id}> padam pada **Hari ke-${streak.previousStreakCount}** karena tidak saling berbalas sebelum 00:00 WIB.\n\n` +
                      `> Kuota Pemulihan Bulan Ini: **${revivesLeft}/5 Kali**\n` +
                      `Cukup **salah satu dari kalian** klik tombol di bawah untuk menghidupkan kembali streak dari **Hari ke-${streak.previousStreakCount}** dan mendapatkan bonus Stardust & Tiket!`
                    ),
                ],
                components: revivesLeft > 0 ? [row] : []
              }).catch(() => {});
            }
          }
        } catch (_) {}
      }
    }
  }

  if (changed) {
    saveAllStreaks(streaks);
    updateLiveStreakLeaderboard(client).catch(() => {});
  }
}

module.exports = {
  STREAK_LEADERBOARD_GUILD_ID,
  STREAK_LEADERBOARD_CHANNEL_ID,
  STREAK_MILESTONE_ROLE_ID,
  getPairKey,
  getTimezoneInfo,
  getAllStreaks,
  saveAllStreaks,
  getStreak,
  getUserStreaks,
  getMonthlyRevives,
  awardStreakRewards,
  createInvite,
  acceptInvite,
  declineInvite,
  endStreak,
  reviveStreak,
  handleMessageStreak,
  checkStreakScheduler,
  buildStreakLeaderboardEmbed,
  updateLiveStreakLeaderboard,
  buildUserStreakList,
  formatUserStreakListEmbed,
  sendDailyPersonalStreakReminders,
  broadcastStreakUpdate
};
