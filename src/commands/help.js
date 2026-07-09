const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} = require('discord.js');
const { buildHelpEmbed, OWNER } = require('../events/helpEmbeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Tampilkan semua command yang tersedia'),

  async execute(interaction, client) {
    // Ambil avatar owner dari Discord jika bisa
    let ownerAvatarURL = null;
    try {
      await client.application.fetch();
      const owner = client.application.owner;
      if (owner && !owner.members) {
        ownerAvatarURL = owner.displayAvatarURL?.({ dynamic: true, size: 128 }) || null;
      }
    } catch { /* ignore */ }

    const homeEmbed = buildHelpEmbed('home', client);
    if (ownerAvatarURL) {
      homeEmbed.setThumbnail(ownerAvatarURL);
    }

    // Select menu untuk navigasi kategori
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('📂 Pilih kategori command...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('🏠 Home')
          .setDescription('Halaman utama & info bot')
          .setValue('home')
          .setDefault(true),
        new StringSelectMenuOptionBuilder()
          .setLabel('🎵 Musik')
          .setDescription('Putar lagu dari YouTube, Spotify, dan lebih banyak lagi')
          .setValue('music'),
        new StringSelectMenuOptionBuilder()
          .setLabel('🛡️ Moderasi')
          .setDescription('Warn, mute, kick, ban — sistem moderasi lengkap')
          .setValue('mod'),
        new StringSelectMenuOptionBuilder()
          .setLabel('🌅 Harian & Jadwal')
          .setDescription('Reminder pagi, malam, ulang tahun, pengumuman')
          .setValue('daily'),
        new StringSelectMenuOptionBuilder()
          .setLabel('🎉 Fun')
          .setDescription('Poll & voting interaktif')
          .setValue('fun'),
        new StringSelectMenuOptionBuilder()
          .setLabel('⚙️ Settings')
          .setDescription('Konfigurasi welcome, bot, dan utilitas lainnya')
          .setValue('settings'),
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      embeds: [homeEmbed],
      components: [row],
    });
  },
};
