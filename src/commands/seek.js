const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');
const { formatDuration } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Loncat ke waktu tertentu dalam lagu')
    .addIntegerOption(opt =>
      opt.setName('detik')
        .setDescription('Waktu dalam detik (contoh: 90 = 1 menit 30 detik)')
        .setRequired(true)
        .setMinValue(0)
    ),

  async execute(interaction, client) {
    if (!checkVoiceChannel(interaction)) return;
    const queue = checkQueue(interaction, client);
    if (!queue) return;

    const seconds = interaction.options.getInteger('detik');
    const song = queue.songs[0];

    if (song.isLive) {
      return interaction.reply({ content: '❌ Tidak bisa seek di lagu LIVE!', ephemeral: true });
    }

    if (seconds > song.duration) {
      return interaction.reply({ content: `❌ Waktu melebihi durasi lagu! (Maks: ${formatDuration(song.duration)})`, ephemeral: true });
    }

    await queue.seek(seconds);
    await interaction.reply(`⏩ Melompat ke **${formatDuration(seconds)}**`);
  },
};
