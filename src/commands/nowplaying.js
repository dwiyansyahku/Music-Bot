const { SlashCommandBuilder } = require('discord.js');
const { checkQueue } = require('../utils/helpers');
const { nowPlayingEmbed } = require('../utils/embeds');
const { createMusicControlRows } = require('../utils/musicButtons');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Tampilkan info lagu yang sedang diputar'),

  async execute(interaction, client) {
    const queue = checkQueue(interaction, client);
    if (!queue) return;

    const song = queue.songs[0];
    const embed = nowPlayingEmbed(song, queue);
    const rows = createMusicControlRows(queue);

    await interaction.reply({ embeds: [embed], components: rows });
  },
};
