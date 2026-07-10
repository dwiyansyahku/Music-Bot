const { EmbedBuilder } = require('discord.js');

// Kumpulan kalimat sambutan gaul (random tiap ada member baru)
const WELCOME_MESSAGES = [
  (name, server) => `Yooo **${name}** finally joined **${server}**! 🔥\nGlad you're here, gaskeunnn~ 🚀`,
  (name, server) => `Heyy **${name}**! Welcome to **${server}** bestie ✨\nJangan malu-malu ya, langsung gabung aja! 😄`,
  (name, server) => `Waduh ada **${name}** nyasar ke **${server}**! 👀\nYa udah, welcome! Semoga betah di sini bro/sis 🎉`,
  (name, server) => `Ayooo **${name}** udah join **${server}**! 🥳\nSiap-siap have fun bareng kita semua ngabbb~ 💫`,
  (name, server) => `Hai **${name}**! You made it to **${server}** 🎊\nSelamat datang, jangan lupa say hi! 👋`,
  (name, server) => `Welcome home, **${name}**! 🏠✨\nEnjoy your stay di **${server}**, semoga betah ya! 🙌`,
  (name, server) => `Akhirnya yang ditunggu-tunggu dateng juga! Selamat datang **${name}** di **${server}**! 🌟`,
  (name, server) => `Hello **${name}**! Baru landing di **${server}** nih? ✈️\nYuk langsung kenalan sama yang lain di chatroom! ☕`,
  (name, server) => `Welcome **${name}** to the club! 🎧🔥\nLet's make some good memories here in **${server}**! ⚡`,
  (name, server) => `Eh, ada member baru! Welcome **${name}** di **${server}**! 💫\nSering-sering mampir dan ngobrol yaa~`,
  (name, server) => `Warmest welcome to **${name}**! 🤗\nSelamat bergabung di keluarga besar **${server}**! ❤️`,
  (name, server) => `Look who just joined! It's **${name}**! 🤩✨\nWelcome to **${server}**, let's hang out! 🎮`,
  (name, server) => `Selamat datang **${name}**! Semoga **${server}** bisa jadi tempat seru buat kamu ya! 🚀🌈`,
  (name, server) => `Yuhuu **${name}** is here! 🥳🎉\nWelcome to **${server}**, have a great time! ✨`,
  (name, server) => `Welcome aboard, **${name}**! 🚢✨\nSelamat menjelajahi **${server}**, enjoy the vibe! 🍃`,
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

