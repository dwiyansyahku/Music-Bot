const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Atur volume musik')
    .addIntegerOption(opt =>
      opt.setName('level')
        .setDescription('Volume 0-150 (kosongkan untuk lihat volume saat ini)')
        .setMinValue(0)
        .setMaxValue(150)
    ),

  async execute(interaction, client) {
    const queue = checkQueue(interaction, client);
    if (!queue) return;

    const level = interaction.options.getInteger('level');

    if (level === null || level === undefined) {
      return interaction.reply(`🔊 Volume saat ini: **${queue.volume}%**`);
    }

    if (!checkVoiceChannel(interaction)) return;
    queue.setVolume(level);
    
    let icon = '🔊';
    if (level === 0) icon = '🔇';
    else if (level <= 30) icon = '🔈';
    else if (level <= 70) icon = '🔉';

    await interaction.reply(`${icon} Volume diatur ke **${level}%**`);
  },
};
