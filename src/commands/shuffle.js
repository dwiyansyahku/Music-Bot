const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Acak urutan antrian lagu'),

  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;

    if (queue.songs.length <= 2) {
      return interaction.reply({ content: '❌ Antrian terlalu sedikit untuk diacak!', ephemeral: true });
    }

    await queue.shuffle();
    await interaction.reply(`🔀 **Antrian diacak!** (${queue.songs.length - 1} lagu)`);
  },
};
