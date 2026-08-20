const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkQueue } = require('../utils/helpers');
const { formatDuration, getSourceEmoji, createProgressBar } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Tampilkan info lagu yang sedang diputar'),

  async execute(interaction, client) {
    const queue = checkQueue(interaction, client);
    if (!queue) return;

    const song = queue.songs[0];
    const current = queue.currentTime || 0;
    const total = song.duration || 0;
    const emoji = getSourceEmoji(song);
    const bar = createProgressBar(current, total, 20);

    const embed = new EmbedBuilder()
      .setColor('#2B2D31')
      .setAuthor({ name: '🎵 Sedang Diputar' })
      .setTitle(song.name)
      .setURL(song.url)
      .setThumbnail(song.thumbnail)
      .setDescription(
        `oleh **${song.uploader?.name || 'Unknown'}**\n\n` +
        `${bar}\n` +
        `\`${formatDuration(current)} / ${formatDuration(total)}\``
      )
      .addFields(
        { name: '🔊 Volume', value: `${queue.volume}%`, inline: true },
        { name: '🔁 Loop', value: queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Lagu' : 'Antrian', inline: true },
        { name: '📋 Antrian', value: `${queue.songs.length} lagu`, inline: true },
      )
      .setFooter({ text: `Diminta oleh ${song.member?.displayName || song.user?.username || 'Unknown'}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
