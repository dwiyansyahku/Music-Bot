const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Buat 2 baris tombol interaktif lengkap untuk pemutar musik (Now Playing message)
 * @param {import('distube').Queue} queue
 * @returns {ActionRowBuilder[]}
 */
function createMusicControlRows(queue) {
  if (!queue) return [];

  const isPaused = Boolean(queue.paused);
  const hasPrevious = Boolean(queue.previousSongs && queue.previousSongs.length > 0);
  const canSkip = Boolean(queue.songs.length > 1 || queue.autoplay);
  const canShuffle = Boolean(queue.songs.length > 2);
  const loopMode = queue.repeatMode || 0; // 0 = Off, 1 = Song, 2 = Queue
  const isAutoplay = Boolean(queue.autoplay);

  // ── BARIS 1: KONTROL PEMUTARAN UTAMA ──
  const prevBtn = new ButtonBuilder()
    .setCustomId('music_btn_prev')
    .setEmoji('⏮️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!hasPrevious);

  const pauseResumeBtn = new ButtonBuilder()
    .setCustomId('music_btn_pause')
    .setEmoji(isPaused ? '▶️' : '⏸️')
    .setStyle(ButtonStyle.Secondary);

  const skipBtn = new ButtonBuilder()
    .setCustomId('music_btn_skip')
    .setEmoji('⏭️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!canSkip);

  const stopBtn = new ButtonBuilder()
    .setCustomId('music_btn_stop')
    .setEmoji('⏹️')
    .setStyle(ButtonStyle.Secondary);

  const shuffleBtn = new ButtonBuilder()
    .setCustomId('music_btn_shuffle')
    .setEmoji('🔀')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!canShuffle);

  const row1 = new ActionRowBuilder().addComponents(prevBtn, pauseResumeBtn, skipBtn, stopBtn, shuffleBtn);

  // ── BARIS 2: PENGATURAN & INFORMASI (LOOP, AUTOPLAY, LIRIK, ANTRIAN) ──
  const loopLabels = ['Loop: Off', 'Loop: Single', 'Loop: All'];
  const loopStyles = [ButtonStyle.Secondary, ButtonStyle.Primary, ButtonStyle.Primary];

  const loopBtn = new ButtonBuilder()
    .setCustomId('music_btn_loop')
    .setLabel(loopLabels[loopMode])
    .setStyle(loopStyles[loopMode]);

  const autoplayBtn = new ButtonBuilder()
    .setCustomId('music_btn_autoplay')
    .setLabel(isAutoplay ? 'Autoplay: On' : 'Autoplay: Off')
    .setStyle(isAutoplay ? ButtonStyle.Primary : ButtonStyle.Secondary);

  const lyricsBtn = new ButtonBuilder()
    .setCustomId('music_btn_lyrics')
    .setLabel('Lirik')
    .setStyle(ButtonStyle.Secondary);

  const queueBtn = new ButtonBuilder()
    .setCustomId('music_btn_queue')
    .setLabel('Antrian')
    .setStyle(ButtonStyle.Secondary);

  const row2 = new ActionRowBuilder().addComponents(loopBtn, autoplayBtn, lyricsBtn, queueBtn);

  return [row1, row2];
}

module.exports = { createMusicControlRows, createMusicControlRow: createMusicControlRows };
