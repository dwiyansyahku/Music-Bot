const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { isBotOwner } = require('./helpers');
const { sendModLog } = require('./modlog');

// Sliding window tracker: key = `${guildId}_${executorId}`
const nukeTracker = new Map();

// Ambang batas (threshold) dalam rentang 15 detik
const NUKE_THRESHOLDS = {
  channelDelete: 2, // Maksimal 2 channel dihapus dalam 15 detik
  roleDelete: 2,    // Maksimal 2 role dihapus dalam 15 detik
  ban: 3,           // Maksimal 3 member di-ban dalam 15 detik
  kick: 3           // Maksimal 3 member di-kick dalam 15 detik
};

// Izin berbahaya yang harus langsung dicabut saat Anti-Nuke terpicu
const DANGEROUS_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageWebhooks
];

/**
 * Bersihkan data tracking yang lebih lama dari 5 menit
 */
function cleanExpiredNukeRecords() {
  const now = Date.now();
  for (const [key, data] of nukeTracker.entries()) {
    if (now - (data.lastActivity || 0) > 5 * 60 * 1000) {
      nukeTracker.delete(key);
    }
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanExpiredNukeRecords, 3 * 60 * 1000).unref?.();
}

/**
 * Periksa dan tindak tegas aksi berbahaya massal (Anti-Nuke)
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').User} executor
 * @param {'channelDelete'|'roleDelete'|'ban'|'kick'} actionType
 * @param {string} targetName
 * @param {import('discord.js').Client} client
 */
async function checkAntiNuke(guild, executor, actionType, targetName, client) {
  if (!guild || !executor || !client) return;

  // Pengecualian mutlak: Server Owner, Bot Owner, dan Bot itu sendiri aman
  if (executor.id === client.user.id) return;
  if (guild.ownerId === executor.id) return;
  if (isBotOwner(executor.id)) return;

  const key = `${guild.id}_${executor.id}`;
  const now = Date.now();

  let record = nukeTracker.get(key);
  if (!record) {
    record = {
      channelDelete: [],
      roleDelete: [],
      ban: [],
      kick: [],
      punished: false,
      lastActivity: now
    };
    nukeTracker.set(key, record);
  }
  record.lastActivity = now;

  // Jika sudah dalam proses penindakan, cegah eksekusi berulang
  if (record.punished) return;

  // Simpan timestamp aksi dan bersihkan yang lebih dari 15 detik
  if (!record[actionType]) record[actionType] = [];
  record[actionType] = record[actionType].filter(t => now - t <= 15000);
  record[actionType].push(now);

  const count = record[actionType].length;
  const threshold = NUKE_THRESHOLDS[actionType] || 3;

  if (count >= threshold) {
    record.punished = true; // Kunci agar tidak trigger beruntun

    console.error(`🚨 [ANTI-NUKE TRIGGERED] ${executor.tag} (${executor.id}) melampaui batas ${actionType} (${count}x dalam 15s) di ${guild.name}!`);

    try {
      const member = await guild.members.fetch(executor.id).catch(() => null);
      let strippedRoles = [];
      let timeoutSuccess = false;

      if (member) {
        // 1. Cabut semua role yang memiliki izin berbahaya
        const dangerousRoles = member.roles.cache.filter(role =>
          DANGEROUS_PERMISSIONS.some(perm => role.permissions.has(perm)) &&
          role.id !== guild.id && // bukan @everyone
          role.editable
        );

        if (dangerousRoles.size > 0) {
          strippedRoles = dangerousRoles.map(r => r.name);
          await member.roles.remove(dangerousRoles, 'Anti-Nuke: Tindakan berbahaya massal terdeteksi').catch(err => {
            console.error('[Anti-Nuke] Gagal mencabut role:', err.message);
          });
        }

        // 2. Terapkan Timeout 24 jam untuk isolasi akun
        if (member.moderatable) {
          await member.timeout(24 * 60 * 60 * 1000, 'Anti-Nuke: Karantina darurat 24 jam').then(() => {
            timeoutSuccess = true;
          }).catch(err => {
            console.error('[Anti-Nuke] Gagal timeout member:', err.message);
          });
        }
      }

      const actionLabels = {
        channelDelete: 'Penghapusan Channel Massal',
        roleDelete: 'Penghapusan Role Massal',
        ban: 'Banned Member Massal',
        kick: 'Kick Member Massal'
      };

      const reasonStr = `Terdeteksi ${actionLabels[actionType] || actionType} (${count}x dalam 15 detik).`;

      // 3. Kirim Laporan Darurat ke Mod Log
      await sendModLog(guild, client, {
        action: 'ANTI_NUKE',
        moderator: { id: client.user.id, username: 'Anti-Nuke Guardian', tag: client.user.tag },
        target: executor,
        reason: reasonStr,
        details: `🚨 **PERINGATAN DARURAT: SISTEM ANTI-NUKE DIAKTIFKAN**\n` +
                 `• **Akun Pelaku:** <@${executor.id}> (\`${executor.tag}\`)\n` +
                 `• **Aksi Terdeteksi:** ${actionLabels[actionType] || actionType} (${count} aksi dalam 15 detik)\n` +
                 `• **Target Terakhir:** \`${targetName || '-'}\`\n` +
                 `• **Role Dicabut:** ${strippedRoles.length > 0 ? strippedRoles.map(r => `\`${r}\``).join(', ') : 'Tidak ada role yang bisa diedit'}\n` +
                 `• **Status Karantina:** ${timeoutSuccess ? '✅ Berhasil di-timeout 24 jam' : '⚠️ Gagal timeout (Role terlalu tinggi)'}`,
        color: 0xED4245
      });

      // 4. Kirim notifikasi darurat ke Saluran Sistem / Owner
      const alertEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({ name: `🚨 PERINGATAN DARURAT ANTI-NUKE — ${guild.name.toUpperCase()}` })
        .setTitle('Tindakan Berbahaya Massal Dicegah')
        .setDescription(
          `Sistem keamanan Anti-Nuke baru saja mendeteksi tindakan destruktif beruntun oleh moderator:\n\n` +
          `• **Pelaku:** <@${executor.id}> (\`${executor.tag}\`)\n` +
          `• **Aktivitas:** ${actionLabels[actionType] || actionType} (${count} kali dalam 15 detik)\n` +
          `• **Tindakan Perlindungan:** Seluruh role izin berbahaya telah **dicabut otomatis** dan akun di-timeout 24 jam.\n\n` +
          `⚠️ **Kepada Pemilik Server:** Harap segera periksa apakah akun moderator di atas mengalami kebocoran token / pembajakan akun!`
        )
        .setFooter({ text: 'Sistem Pertahanan Server Otomatis' })
        .setTimestamp();

      const notifChannel = guild.systemChannel;
      if (notifChannel && typeof notifChannel.send === 'function') {
        notifChannel.send({
          content: guild.ownerId ? `⚠️ <@${guild.ownerId}>, tindakan destruktif terdeteksi di server Anda!` : undefined,
          embeds: [alertEmbed]
        }).catch(() => {});
      }

    } catch (err) {
      console.error('[Anti-Nuke Execution Error]:', err.message);
    }
  }
}

module.exports = {
  checkAntiNuke,
  NUKE_THRESHOLDS
};
