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

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
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

    const guild = member.guild;
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

