const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Buat baris tombol interaktif untuk kontrol pemutar musik (Now Playing message)
 * @param {import('distube').Queue} queue
 */
function createMusicControlRow(queue) {
  const isPaused = queue ? Boolean(queue.paused) : false;
  const hasPrevious = Boolean(queue && queue.previousSongs && queue.previousSongs.length > 0);
  const canSkip = Boolean(queue && (queue.songs.length > 1 || queue.autoplay));
  const canShuffle = Boolean(queue && queue.songs.length > 2);

  const prevBtn = new ButtonBuilder()
    .setCustomId('music_btn_prev')
    .setEmoji('⏮️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!hasPrevious);

  const pauseResumeBtn = new ButtonBuilder()
    .setCustomId('music_btn_pause')
    .setEmoji(isPaused ? '▶️' : '⏸️')
    .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary);

  const skipBtn = new ButtonBuilder()
    .setCustomId('music_btn_skip')
    .setEmoji('⏭️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!canSkip);

  const stopBtn = new ButtonBuilder()
    .setCustomId('music_btn_stop')
    .setEmoji('⏹️')
    .setStyle(ButtonStyle.Danger);

  const shuffleBtn = new ButtonBuilder()
    .setCustomId('music_btn_shuffle')
    .setEmoji('🔀')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!canShuffle);

  return new ActionRowBuilder().addComponents(prevBtn, pauseResumeBtn, skipBtn, stopBtn, shuffleBtn);
}

module.exports = { createMusicControlRow };
