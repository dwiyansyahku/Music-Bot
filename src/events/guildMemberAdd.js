const { EmbedBuilder } = require('discord.js');

// Kumpulan welcome GIF (random tiap ada member baru)
const WELCOME_GIFS = [
  'https://media.tenor.com/ypA_veH6aogAAAAC/welcome-hi.gif',
  'https://media.tenor.com/jHEQTpIjJo0AAAAC/hi-wave.gif',
  'https://media.tenor.com/cFdCCXRNEd8AAAAC/hello-there-wave.gif',
  'https://media.tenor.com/0K7WbXxZnJoAAAAC/hello-wave.gif',
  'https://media.tenor.com/y8UVqflMWMcAAAAC/hello-hi.gif',
];

// Kumpulan kalimat sambutan gaul (random tiap ada member baru)
const WELCOME_MESSAGES = [
  (name, server) => `Yooo **${name}** finally joined **${server}**! 🔥\nGlad you're here, gaskeunnn~ 🚀`,
  (name, server) => `Heyy **${name}**! Welcome to **${server}** bestie ✨\nJangan malu-malu ya, langsung gabung aja! 😄`,
  (name, server) => `Waduh ada **${name}** nyasar ke **${server}**! 👀\nYa udah, welcome! Semoga betah di sini bro/sis 🎉`,
  (name, server) => `Ayooo **${name}** udah join **${server}**! 🥳\nSiap-siap have fun bareng kita semua ngabbb~ 💫`,
  (name, server) => `Hai **${name}**! You made it to **${server}** 🎊\nSelamat datang, jangan lupa say hi! 👋`,
];

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // Ambil setting welcome untuk guild ini
    const config = client.welcomeSettings?.get(member.guild.id);
    if (!config || !config.channelId || !config.enabled) return;

    const channel = member.guild.channels.cache.get(config.channelId);
    if (!channel) return;

    const guild = member.guild;
    const memberCount = guild.memberCount;
    const avatarURL = member.user.displayAvatarURL({ dynamic: true, size: 256 });

    // Pilih GIF & pesan secara random
    const randomGif = WELCOME_GIFS[Math.floor(Math.random() * WELCOME_GIFS.length)];
    const randomMsg = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];

    // Warna random yang vibe banget
    const colors = [0x5865F2, 0xFF6B6B, 0xFFD93D, 0x6BCB77, 0x4D96FF];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const embed = new EmbedBuilder()
      .setColor(randomColor)
      .setAuthor({
        name: `✨ New member alert!`,
        iconURL: avatarURL,
      })
      .setTitle(`👋 Heyy, ${member.user.username}!`)
      .setDescription(randomMsg(member.user.username, guild.name))
      .setThumbnail(avatarURL)
      .setImage(randomGif)
      .addFields(
        {
          name: '🪪 Member ke-',
          value: `**#${memberCount}**`,
          inline: true,
        },
        {
          name: '📅 Join Discord',
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: '📌 More Info',
          value: `[Klik di sini buat info lebih lanjut! 👀](https://discord.com/channels/1396245234693963878/1489575354778648586)`,
          inline: false,
        }
      )
      .setFooter({
        text: `${guild.name} • Glad you're here! 🙌`,
        iconURL: guild.iconURL({ dynamic: true }) || undefined,
      })
      .setTimestamp();

    try {
      await channel.send({
        content: `🎊 yo yo yo, sambut <@${member.user.id}> yang baru join! **gass~** 🔥`,
        embeds: [embed],
      });
    } catch (err) {
      console.error(`[Welcome] Gagal kirim pesan welcome di guild ${guild.name}:`, err.message);
    }
  },
};
