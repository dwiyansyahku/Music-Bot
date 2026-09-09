const { EmbedBuilder } = require('discord.js');

// Kumpulan kalimat sambutan gaul (random tiap ada member baru)
const WELCOME_MESSAGES = [
  (name, server) => `Selamat datang **${name}** di **${server}**!\nSenang kamu bergabung, selamat menikmati obrolan di server.`,
  (name, server) => `Halo **${name}**! Selamat datang di **${server}**.\nJangan ragu untuk langsung bergabung dan menyapa di chatroom.`,
  (name, server) => `Selamat bergabung, **${name}** di **${server}**!\nSemoga betah dan seru-seruan bareng di sini.`,
  (name, server) => `Hai **${name}**! Selamat datang di keluarga besar **${server}**.\nYuk langsung kenalan dan ngobrol bareng member lainnya!`,
  (name, server) => `Welcome home, **${name}**!\nEnjoy your stay di **${server}**, semoga harimu menyenangkan.`,
  (name, server) => `Akhirnya yang ditunggu-tunggu hadir juga! Selamat datang **${name}** di **${server}**.`,
  (name, server) => `Hello **${name}**! Baru mendarat di **${server}** nih?\nYuk langsung ramaikan chatroom atau mabar game di voice channel.`
];

// Tracker lonjakan join massal per guild (in-memory)
const joinSpikeTracker = new Map();

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const guild = member.guild;
    const now = Date.now();

    // ─── 1. ANTI-RAID: PEMERIKSAAN UMUR AKUN MINIMAL (MIN 3 HARI / 72 JAM) ───
    const accountAgeMs = now - member.user.createdTimestamp;
    const minAgeMs = 3 * 24 * 60 * 60 * 1000; // 3 hari

    if (accountAgeMs < minAgeMs && !member.user.bot) {
      const ageHours = Math.max(1, Math.floor(accountAgeMs / (1000 * 60 * 60)));
      const ageDays = (accountAgeMs / (1000 * 60 * 60 * 24)).toFixed(1);

      console.warn(`🚨 [Anti-Raid] Akun baru bergabung di ${guild.name}: ${member.user.tag} (${member.id}) — Umur baru ${ageHours} jam.`);

      // Kirim pesan edukasi ke DM user sebelum di-kick
      try {
        await member.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle(`🛡️ Akses Server Ditolak — ${guild.name}`)
              .setDescription(
                `Halo **${member.user.username}**,\n\n` +
                `Demi menjaga keamanan komunitas dari serangan bot raid dan akun kloningan, server **${guild.name}** mewajibkan akun Discord berusia **minimal 3 hari (72 jam)**.\n\n` +
                `• **Umur Akunmu:** ${ageHours < 24 ? `${ageHours} jam` : `${ageDays} hari`}\n` +
                `• **Syarat Minimal:** 3 hari (72 jam)\n\n` +
                `Silakan bergabung kembali setelah akunmu melewati batas usia minimal ya. Terima kasih atas pengertiannya! 🙏`
              )
          ]
        }).catch(() => {});
      } catch (_) {}

      // Kick akun dari server
      let kickSuccess = false;
      if (member.kickable) {
        await member.kick('Anti-Raid: Umur akun < 3 hari (Pencegahan bot raid)').then(() => {
          kickSuccess = true;
        }).catch(err => {
          console.error('[Anti-Raid Kick Error]:', err.message);
        });
      }

      // Kirim log ke Mod Log
      const { sendModLog } = require('../utils/modlog');
      await sendModLog(guild, client, {
        action: 'ANTI_RAID',
        moderator: { id: client.user.id, username: 'Anti-Raid Gatekeeper', tag: client.user.tag },
        target: member.user,
        reason: `Akun baru berusia ${ageHours} jam (kurang dari 3 hari). Dikeluarkan otomatis.`,
        details: `• **Akun Terdeteksi:** <@${member.user.id}> (\`${member.user.tag}\`)\n` +
                 `• **Tanggal Dibuat:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>)\n` +
                 `• **Umur Akun:** ${ageHours < 24 ? `${ageHours} jam` : `${ageDays} hari`}\n` +
                 `• **Tindakan:** ${kickSuccess ? '✅ Berhasil di-KICK dari server' : '⚠️ Gagal kick (Role bot tidak mencukupi)'}`,
        color: 0xED4245
      });

      return; // Hentikan alur agar tidak kirim welcome embed
    }

    // ─── 2. ANTI-RAID: DETEKSI LONJAKAN MASS-JOIN (SPIKE DETECTION) ───
    let joinTimestamps = joinSpikeTracker.get(guild.id) || [];
    joinTimestamps = joinTimestamps.filter(t => now - t <= 10000); // 10 detik terakhir
    joinTimestamps.push(now);
    joinSpikeTracker.set(guild.id, joinTimestamps);

    if (joinTimestamps.length >= 5) {
      console.warn(`🚨 [Anti-Raid Spike] Terdeteksi ${joinTimestamps.length} member bergabung dalam 10 detik di ${guild.name}!`);
      const { sendModLog } = require('../utils/modlog');
      await sendModLog(guild, client, {
        action: 'ANTI_RAID',
        moderator: { id: client.user.id, username: 'Anti-Raid Sentinel', tag: client.user.tag },
        target: member.user,
        reason: 'Lonjakan Mass-Join Terdeteksi (Potensi Serangan Raid)',
        details: `⚠️ **PERINGATAN: LONJAKAN MEMBER BERGABUNG**\n` +
                 `• **Jumlah Akun Bergabung:** ${joinTimestamps.length} akun dalam 10 detik terakhir!\n` +
                 `• **Akun Terakhir:** <@${member.user.id}> (\`${member.user.tag}\`)\n` +
                 `• **Saran Staff:** Segera pantau saluran teks atau aktifkan Server Verification level tinggi jika terjadi spam.`,
        color: 0xED4245
      });
    }

    // ─── 3. WELCOME SYSTEM ───
    const config = client.welcomeSettings?.get(member.guild.id);
    if (!config || !config.channelId || !config.enabled) return;

    // Coba fetch channel — handle kalau channel sudah dihapus
    const channel = await member.guild.channels.fetch(config.channelId).catch(() => null);
    if (!channel) {
      console.warn(`[Welcome] ⚠️ Channel ${config.channelId} tidak ditemukan di guild ${member.guild.name}. Auto-disable welcome.`);
      config.enabled = false;
      client.welcomeSettings.set(member.guild.id, config);
      // Persist disable ke storage
      try {
        const { saveGuildSetting } = require('../utils/storage');
        saveGuildSetting(member.guild.id, 'welcome', config);
      } catch { /* storage mungkin belum tersedia */ }
      return;
    }

    const memberCount = guild.memberCount;
    const avatarURL = member.user.displayAvatarURL({ dynamic: true, size: 256 });

    const randomMsg = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];

    const colors = [0x5865F2, 0xFF6B6B, 0xFFD93D, 0x6BCB77, 0x4D96FF];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Cek apakah ada channel rules yang dikonfigurasi di storage
    const storage = require('../utils/storage');
    const guildSettings = storage.read('settings');
    const rulesChannelId = guildSettings[guild.id]?.rulesChannelId ?? null;
    const rulesText = rulesChannelId
      ? `📌 Silakan baca info & peraturan di <#${rulesChannelId}>!`
      : `📌 Jangan lupa baca peraturan server ya!`;

    const embed = new EmbedBuilder()
      .setColor(randomColor)
      .setAuthor({
        name: `👤 NEW MEMBER`,
        iconURL: avatarURL,
      })
      .setTitle(`👋 Welcome, ${member.user.username}!`)
      .setDescription(`${randomMsg(member.user.username, guild.name)}\n\n${rulesText}`)
      .setThumbnail(avatarURL)
      .addFields(
        {
          name: '🪪 Member Ke',
          value: `**#${memberCount}**`,
          inline: true,
        },
        {
          name: '📅 Akun Dibuat',
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        }
      )
      .setFooter({
        text: `${guild.name} • Glad you're here! 🙌`,
        iconURL: guild.iconURL({ dynamic: true }) || undefined,
      })
      .setTimestamp();

    try {
      await channel.send({
        content: `👋 Selamat datang <@${member.user.id}>! Selamat bergabung di server.`,
        embeds: [embed],
      });
    } catch (err) {
      console.error(`[Welcome] Gagal kirim pesan welcome di guild ${guild.name}:`, err.message);
    }
  },
};

