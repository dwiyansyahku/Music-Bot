const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggle autoplay — bot otomatis cari lagu berikutnya saat antrian habis'),

  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;

    // Toggle state
    queue.autoplay = !queue.autoplay;
    const isOn = queue.autoplay;

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
