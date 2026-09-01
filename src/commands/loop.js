const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Atur mode pengulangan')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Mode loop')
        .setRequired(true)
        .addChoices(
          { name: 'Off — Matikan pengulangan', value: 'off' },
          { name: 'Lagu — Ulangi lagu saat ini', value: 'song' },
          { name: 'Antrian — Ulangi seluruh antrian', value: 'queue' },
        )
    ),

  async execute(interaction, client) {
    if (!checkVoiceChannel(interaction)) return;
    const queue = checkQueue(interaction, client);
    if (!queue) return;

    const mode = interaction.options.getString('mode');
    const modeMap = { off: 0, song: 1, queue: 2 };
    const labels = { off: '⏹️ Loop dimatikan', song: '🔂 Loop lagu aktif', queue: '🔁 Loop antrian aktif' };

    queue.setRepeatMode(modeMap[mode]);
    await interaction.reply(labels[mode]);
  },
};
