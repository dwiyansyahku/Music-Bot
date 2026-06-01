const { SlashCommandBuilder } = require('discord.js');
const { checkQueue } = require('../utils/helpers');
const { queueEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Tampilkan antrian lagu')
    .addIntegerOption(opt =>
      opt.setName('halaman')
        .setDescription('Halaman ke berapa (default: 1)')
        .setMinValue(1)
    ),

  async execute(interaction, client) {
    const queue = checkQueue(interaction, client);
    if (!queue) return;

    const page = interaction.options.getInteger('halaman') || 1;
    const embed = queueEmbed(queue, page);
    await interaction.reply({ embeds: [embed] });
  },
};
