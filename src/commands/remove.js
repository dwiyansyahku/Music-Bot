const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Hapus lagu tertentu dari antrian')
    .addIntegerOption(opt =>
      opt.setName('nomor')
        .setDescription('Nomor urutan lagu di antrian (/queue)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction, client) {
    if (!checkVoiceChannel(interaction)) return;
    const queue = checkQueue(interaction, client);
    if (!queue) return;

    const index = interaction.options.getInteger('nomor');

    // Index 0 adalah lagu yang sedang diputar
    if (index >= queue.songs.length) {
      return interaction.reply({
        content: `❌ Nomor tidak valid! Antrian saat ini hanya memiliki ${queue.songs.length - 1} lagu berikutnya.`,
        ephemeral: true
      });
    }

    const removedSong = queue.songs.splice(index, 1)[0];
    await interaction.reply(`🗑️ Dihapus dari antrian: **${removedSong.name}**`);
  },
};
