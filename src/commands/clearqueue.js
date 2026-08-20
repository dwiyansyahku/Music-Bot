const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearqueue')
    .setDescription('Kosongkan semua lagu di antrian (lagu yang sedang diputar tetap berjalan)'),

  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;

    if (queue.songs.length <= 1) {
      return interaction.reply({
        content: '❌ Tidak ada antrian lagu berikutnya yang bisa dibersihkan!',
        ephemeral: true
      });
    }

    const count = queue.songs.length - 1;
    queue.songs.splice(1);

    await interaction.reply(`🧹 Berhasil membersihkan **${count}** lagu dari antrian.`);
  },
};
