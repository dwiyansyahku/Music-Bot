const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggle autoplay — bot otomatis cari lagu berikutnya saat antrian habis'),

  async execute(interaction, client) {
    if (!client.autoplaySettings) {
      client.autoplaySettings = new Map();
    }

    const guildId = interaction.guild.id;
    const queue = client.distube.getQueue(guildId);

    // Jika antrean sedang aktif, pastikan pengguna berada di voice channel yang sama
    if (queue) {
      if (!checkVoiceChannel(interaction)) return;
    }

    let isOn;
    if (queue) {
      queue.autoplay = !queue.autoplay;
      isOn = queue.autoplay;
      client.autoplaySettings.set(guildId, isOn);
    } else {
      const current = client.autoplaySettings.get(guildId) || false;
      isOn = !current;
      client.autoplaySettings.set(guildId, isOn);
    }

    const embed = new EmbedBuilder()
      .setColor(isOn ? 0x1DB954 : 0xFF6B6B)
      .setTitle(isOn ? '🔄 Autoplay Aktif' : '⏹️ Autoplay Nonaktif')
      .setDescription(
        isOn
          ? 'Bot akan otomatis mencari dan memutar lagu serupa saat antrian habis.\nGunakan `/autoplay` lagi untuk menonaktifkan.'
          : 'Autoplay telah dimatikan. Bot akan berhenti saat antrian habis.'
      )
      .setFooter({ text: `Diubah oleh ${interaction.member?.displayName || 'Unknown'}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
