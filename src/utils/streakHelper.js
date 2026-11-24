const storage = require('./storage');
const { generateStreakBanner, getStreakTier } = require('./streakCanvas');
const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

// Dedicated Leaderboard Channel Configuration
const STREAK_LEADERBOARD_GUILD_ID = '1396245234693963878';
const STREAK_LEADERBOARD_CHANNEL_ID = '1563045564021608548';

/**
 * Buat pair key unik & konsisten terlepas dari urutan user
 */
function getPairKey(user1Id, user2Id) {
  return [user1Id, user2Id].sort().join('_');
}

/**
 * Ambil tanggal dan waktu otomatis berdasarkan Waktu Indonesia Barat (WIB / UTC+7).
 * Sistem berjalan otomatis untuk seluruh member tanpa perlu memilih zona waktu manual.
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
 * Dapatkan seluruh streak (aktif & broken) milik seorang user
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
function awardStreakRewards(guildId, userId, streakDays, isRevive = false) {
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
      dust += 75; // Bonus ekstra pemulihan
      tickets += 1;
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
 * Buat undangan streak baru (Otomatis zona waktu WIB)
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
    timezone: 'WIB',
    streakCount: 0,
    previousStreakCount: 0,
    highestStreak: 0,
    status: 'pending',
    invitedBy: inviterId,
    createdAt: Date.now(),
    lastChannelId: channelId,
    lastLitDate: null,
    remindedToday: false,
    monthlyRevivesLeft: 5,
    lastReviveMonth: tzInfo.yearMonth
  };

  streaks[pairKey] = newStreak;
  saveAllStreaks(streaks);
  return { success: true, streak: newStreak };
}

/**
 * Konfirmasi penerimaan undangan streak
 */
function acceptInvite(pairKey, acceptingUserId) {
  const streaks = getAllStreaks();
  const streak = streaks[pairKey];

  if (!streak) return { success: false, reason: 'NOT_FOUND' };
  if (streak.status === 'active') return { success: false, reason: 'ALREADY_ACTIVE' };

  if (streak.invitedBy === acceptingUserId) {
    return { success: false, reason: 'CANNOT_ACCEPT_OWN' };
  }

  const tzInfo = getTimezoneInfo();

  streak.status = 'active';
  streak.startDate = Date.now();
  streak.streakCount = 0;
  streak.previousStreakCount = 0;
  streak.lastLitDate = null;
  streak.remindedToday = false;
  streak.monthlyRevivesLeft = 5;
  streak.lastReviveMonth = tzInfo.yearMonth;

  saveAllStreaks(streaks);
  return { success: true, streak };
}

/**
 * Tolak atau batalkan undangan streak
 */
function declineInvite(pairKey) {
  const streaks = getAllStreaks();
  if (streaks[pairKey] && streaks[pairKey].status === 'pending') {
    delete streaks[pairKey];
    saveAllStreaks(streaks);
    return { success: true };
  }
  return { success: false };
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
 * Bangun Embed Papan Klasemen (Leaderboard) yang elegan & rapi
 */
function buildStreakLeaderboardEmbed(guildId) {
  const allStreaks = Object.values(getAllStreaks()).filter(
    s => (s.guildId === guildId || !guildId || s.guildId === STREAK_LEADERBOARD_GUILD_ID) &&
         (s.status === 'active' || s.status === 'broken')
  );

  // Urutkan berdasarkan hari streak tertinggi
  allStreaks.sort((a, b) => {
    const countA = a.status === 'active' ? (a.streakCount || 0) : (a.previousStreakCount || a.streakCount || 0);
    const countB = b.status === 'active' ? (b.streakCount || 0) : (b.previousStreakCount || b.streakCount || 0);
    return countB - countA;
  });

  const tzInfo = getTimezoneInfo();
  const top15 = allStreaks.slice(0, 15);

  let listText = '';
  if (top15.length === 0) {
    listText = '*Belum ada pasangan streak terdaftar di server ini. Ketik `/streak ajak @partner` untuk memulai!*';
  } else {
    listText = top15.map((s, idx) => {
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
          : '⏳ *Menunggu Chat Teks*';

      return `${medal} <@${s.user1Id}> & <@${s.user2Id}> — **${days} Hari**\n` +
             `    ┗ **${tier.tierLabel} • ${tier.name}**  ·  ${statusBadge}`;
    }).join('\n\n');
  }

  const embed = new EmbedBuilder()
    .setColor('#F59E0B')
    .setTitle('✦ PAPAN KLASEMEN FLAME STREAK ✦')
    .setDescription(
      `🏆 **KONEKSI STREAK TERTINGGI SERVER**\n` +
      `*Pertahankan api harianmu dengan saling menge-tag partner di channel teks server!*\n\n` +
      `${listText}\n\n` +
      `────────────────────────────────\n` +
      `✦ **Panduan & Informasi Sistem:**\n` +
      `• **Mulai Streak:** Gunakan perintah \`/streak ajak @partner\`\n` +
      `• **Menyalakan Api:** Chat di channel teks sambil tag partner kamu setiap hari\n` +
      `• **Waktu Reset:** Pukul **00:00 WIB** (Pengingat otomatis pukul **21:00 WIB** / 22:00 WITA / 23:00 WIT)\n` +
      `• **Kuota Pemulihan:** **5x per bulan** jika streak padam (angka kembali utuh)\n` +
      `• **Reward Harian:** Bonus **Stardust** & **Tiket Gacha** setiap hari!`
    )
    .setFooter({ text: 'Otomatis diperbarui secara realtime • Waktu Indonesia Barat (WIB)' })
    .setTimestamp();

  return embed;
}

/**
 * Update Papan Klasemen Realtime di channel khusus:
 * https://discord.com/channels/1396245234693963878/1563045564021608548
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

    // Jika pesan lama tidak ditemukan lewat ID, scan 10 pesan terakhir di channel
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
 * Cukup salah satu user yang menjalankan ini, streak akan kembali ke angka sebelumnya!
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

  // Gunakan 1 kuota pemulihan
  streak.monthlyRevivesLeft = revivesLeft - 1;
  const restoredDays = Math.max(1, streak.previousStreakCount || streak.streakCount || 1);
  streak.streakCount = restoredDays;
  streak.status = 'active';
  streak.lastLitDate = tzInfo.todayStr;
  streak.lastLitTime = Date.now();
  streak.remindedToday = false;

  saveAllStreaks(streaks);

  // Berikan reward Stardust & Tiket
  const reviverReward = awardStreakRewards(guild.id, reviverUserId, restoredDays, true);
  const otherUserId = streak.user1Id === reviverUserId ? streak.user2Id : streak.user1Id;
  awardStreakRewards(guild.id, otherUserId, restoredDays, false);

  // Update Leaderboard realtime
  if (client) {
    updateLiveStreakLeaderboard(client, guild.id).catch(() => {});
  }

  // Ambil avatar kedua user
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
    user1: { name: u1Name, tag: u1Tag, avatarUrl: u1Avatar },
    user2: { name: u2Name, tag: u2Tag, avatarUrl: u2Avatar },
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
 * Handler pesan teks saat member menge-tag partner streak
 * Dipanggil dari messageCreate.js
 */
async function handleMessageStreak(message, client = null) {
  if (message.author.bot || !message.guild) return null;
  if (message.channel.isVoiceBased && message.channel.isVoiceBased()) return null;

  if (!message.mentions.users || message.mentions.users.size === 0) return null;

  const authorId = message.author.id;
  const streaks = getAllStreaks();

  for (const [mentionedId, targetUser] of message.mentions.users.entries()) {
    if (mentionedId === authorId || targetUser.bot) continue;

    const pairKey = getPairKey(authorId, mentionedId);
    const streak = streaks[pairKey];

    if (!streak || streak.status !== 'active') continue;

    const tzInfo = getTimezoneInfo();

    // Jika hari ini sudah dinyalakan, abaikan agar tidak spam banner
    if (streak.lastLitDate === tzInfo.todayStr) {
      continue;
    }

    // Periksa apakah kemarin dinyalakan (streak bertambah) atau sempat terputus
    if (streak.lastLitDate === tzInfo.yesterdayStr) {
      streak.streakCount = (streak.streakCount || 0) + 1;
    } else {
      streak.streakCount = 1;
    }

    streak.highestStreak = Math.max(streak.highestStreak || 0, streak.streakCount);
    streak.lastLitDate = tzInfo.todayStr;
    streak.lastLitTime = Date.now();
    streak.lastChannelId = message.channel.id;
    streak.remindedToday = false;

    saveAllStreaks(streaks);

    // Berikan reward Stardust & Tiket
    const authorReward = awardStreakRewards(message.guild.id, authorId, streak.streakCount, false);
    const partnerReward = awardStreakRewards(message.guild.id, mentionedId, streak.streakCount, false);

    // Update Leaderboard Channel otomatis
    const botClient = client || message.client;
    if (botClient) {
      updateLiveStreakLeaderboard(botClient, message.guild.id).catch(() => {});
    }

    // Ambil data avatar
    const member1 = await message.guild.members.fetch(streak.user1Id).catch(() => null);
    const member2 = await message.guild.members.fetch(streak.user2Id).catch(() => null);

    const u1Name = member1?.displayName || member1?.user?.username || 'User 1';
    const u1Tag = member1?.user?.username || 'user1';
    const u1Avatar = member1?.user?.displayAvatarURL({ extension: 'png', size: 128 });

    const u2Name = member2?.displayName || member2?.user?.username || 'User 2';
    const u2Tag = member2?.user?.username || 'user2';
    const u2Avatar = member2?.user?.displayAvatarURL({ extension: 'png', size: 128 });

    const bannerBuffer = await generateStreakBanner({
      days: streak.streakCount,
      user1: { name: u1Name, tag: u1Tag, avatarUrl: u1Avatar },
      user2: { name: u2Name, tag: u2Tag, avatarUrl: u2Avatar },
      timezone: 'WIB',
      statusText: `MENYALA HARI INI • RESET 00:00 WIB`
    });

    const tier = getStreakTier(streak.streakCount);
    const attachment = new AttachmentBuilder(bannerBuffer, { name: `streak_${streak.streakCount}d.png` });

    const embed = new EmbedBuilder()
      .setColor(tier.color)
      .setDescription(
        `✦ **Api Streak Dinyalakan**\n` +
        `Koneksi antara <@${streak.user1Id}> dan <@${streak.user2Id}> berhasil diperbarui untuk hari ini (**Hari ke-${streak.streakCount}**).\n` +
        `> Tingkatan: **${tier.tierLabel} • ${tier.name}**\n` +
        `> Reset harian berikutnya pukul **00:00 WIB**.\n` +
        `> 🎁 Reward Harian: **+${authorReward.dust} Stardust** & **+${authorReward.tickets} Tiket Gacha** untuk kalian!`
      )
      .setImage(`attachment://streak_${streak.streakCount}d.png`);

    await message.reply({
      embeds: [embed],
      files: [attachment]
    }).catch(err => {
      console.warn('[Streak] Gagal mengirim banner:', err.message);
    });

    return { success: true, streak };
  }

  return null;
}

/**
 * Pengecekan Pengingat 3 Jam Sebelum Reset (Jam 21:00 WIB) & Rollover 00:00 WIB
 * Dipanggil secara berkala (setiap menit) oleh scheduler di ready.js
 */
async function checkStreakScheduler(client) {
  const streaks = getAllStreaks();
  let changed = false;
  const tzInfo = getTimezoneInfo();

  for (const streak of Object.values(streaks)) {
    if (streak.status !== 'active') continue;

    // 1. Pengingat sebelum hari berganti (Pukul 21:00 WIB = 22:00 WITA = 23:00 WIT)
    if (tzInfo.hour === 21 && tzInfo.minute === 0) {
      if (streak.lastLitDate !== tzInfo.todayStr && !streak.remindedToday) {
        streak.remindedToday = true;
        changed = true;

        try {
          const guild = client.guilds.cache.get(streak.guildId);
          if (guild) {
            let targetChannel = null;
            if (streak.lastChannelId) {
              targetChannel = guild.channels.cache.get(streak.lastChannelId) || await guild.channels.fetch(streak.lastChannelId).catch(() => null);
            }
            if (!targetChannel) {
              targetChannel = guild.systemChannel;
            }

            if (targetChannel && targetChannel.isTextBased()) {
              const tier = getStreakTier(streak.streakCount || 1);
              const reminderEmbed = new EmbedBuilder()
                .setColor(tier.color)
                .setDescription(
                  `⏳ **Peringatan Streak Harian**\n` +
                  `Sisa waktu sebelum api streak antara <@${streak.user1Id}> dan <@${streak.user2Id}> padam pada pukul **00:00 WIB** (01:00 WITA / 02:00 WIT).\n\n` +
                  `Kirim pesan dengan menge-tag partner kamu di channel teks untuk menyalakan api hari ini dan mengklaim reward Stardust & Tiket.`
                );

              await targetChannel.send({
                content: `<@${streak.user1Id}> <@${streak.user2Id}>`,
                embeds: [reminderEmbed]
              }).catch(() => {});
            }
          }
        } catch (remErr) {
          console.warn('[Streak Reminder] Error:', remErr.message);
        }
      }
    }

    // 2. Rollover Jam 00:00 WIB (Pergantian Hari)
    if (tzInfo.hour === 0 && tzInfo.minute === 0) {
      if (streak.remindedToday) {
        streak.remindedToday = false;
        changed = true;
      }

      const revivesLeft = getMonthlyRevives(streak, tzInfo.yearMonth);

      // Jika kemarin tidak dinyalakan sama sekali dan streak sebelumnya > 0, streak padam
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
                      `Streak antara <@${streak.user1Id}> dan <@${streak.user2Id}> padam pada **Hari ke-${streak.previousStreakCount}** karena tidak dinyalakan sebelum 00:00 WIB.\n\n` +
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
    // Update leaderboard saat ada perubahan di 00:00
    updateLiveStreakLeaderboard(client).catch(() => {});
  }
}

module.exports = {
  STREAK_LEADERBOARD_GUILD_ID,
  STREAK_LEADERBOARD_CHANNEL_ID,
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
  updateLiveStreakLeaderboard
};
