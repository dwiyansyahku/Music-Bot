const { EmbedBuilder } = require('discord.js');

const COLOR_MAIN = 0x1DB954; // Spotify green
const COLOR_ERROR = 0xFF4444;
const COLOR_INFO = 0x5865F2;

function formatDuration(seconds) {
  if (!seconds || seconds === Infinity) return '🔴 LIVE';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getSourceEmoji(song) {
  const url = song.url || '';
  if (url.includes('spotify')) return '🟢';
  if (url.includes('soundcloud')) return '🟠';
  if (url.includes('youtube') || url.includes('youtu.be')) return '🔴';
  return '🎵';
}

function nowPlayingEmbed(song, queue) {
  const emoji = getSourceEmoji(song);
  const progressBar = createProgressBar(0, 1);

  return new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setTitle(`${emoji} Sedang Diputar`)
    .setDescription(`### [${song.name}](${song.url})`)
    .setThumbnail(song.thumbnail)
    .addFields(
      { name: '👤 Artist', value: song.uploader?.name || 'Unknown', inline: true },
      { name: '⏱️ Durasi', value: formatDuration(song.duration), inline: true },
      { name: '📋 Antrian', value: `${queue.songs.length} lagu`, inline: true },
      { name: '🔊 Volume', value: `${queue.volume}%`, inline: true },
      { name: '🔁 Loop', value: queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Song' : 'Queue', inline: true },
      { name: '⏭️ Selanjutnya', value: queue.songs[1]?.name ? `[${queue.songs[1].name}](${queue.songs[1].url})` : '_Tidak ada_', inline: false },
    )
    .setFooter({ text: `Diminta oleh ${song.member?.displayName || song.user?.username || 'Unknown'}`, iconURL: song.member?.displayAvatarURL() || null })
    .setTimestamp();
}

function addedToQueueEmbed(song, queue) {
  const emoji = getSourceEmoji(song);
  return new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle(`${emoji} Ditambahkan ke Antrian`)
    .setDescription(`[${song.name}](${song.url})`)
    .setThumbnail(song.thumbnail)
    .addFields(
      { name: '⏱️ Durasi', value: formatDuration(song.duration), inline: true },
      { name: '📍 Posisi', value: `#${queue.songs.length}`, inline: true },
    )
    .setFooter({ text: `Diminta oleh ${song.member?.displayName || 'Unknown'}` });
}

function addedPlaylistEmbed(playlist, queue) {
  return new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setTitle('📋 Playlist Ditambahkan!')
    .setDescription(`**${playlist.name}**`)
    .setThumbnail(playlist.thumbnail)
    .addFields(
      { name: '🎵 Jumlah Lagu', value: `${playlist.songs.length} lagu`, inline: true },
      { name: '📋 Total Antrian', value: `${queue.songs.length} lagu`, inline: true },
    )
    .setFooter({ text: `Diminta oleh ${playlist.member?.displayName || 'Unknown'}` });
}

function queueEmbed(queue, page = 1) {
  const perPage = 10;
  const start = (page - 1) * perPage;
  const songs = queue.songs.slice(start, start + perPage);
  const totalPages = Math.ceil(queue.songs.length / perPage);
  const totalDuration = queue.songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  const songList = songs.map((s, i) => {
    const num = start + i;
    const emoji = num === 0 ? '🎵' : `\`${num}\``;
    return `${emoji} [${s.name}](${s.url}) — \`${formatDuration(s.duration)}\``;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setTitle('📋 Antrian Lagu')
    .setDescription(songList || '_Antrian kosong_')
    .addFields(
      { name: '🎵 Total', value: `${queue.songs.length} lagu`, inline: true },
      { name: '⏱️ Total Durasi', value: formatDuration(totalDuration), inline: true },
      { name: '🔊 Volume', value: `${queue.volume}%`, inline: true },
    )
    .setFooter({ text: `Halaman ${page}/${totalPages}` });
}

function createProgressBar(current, total, size = 15) {
  const progress = total > 0 ? Math.round((current / total) * size) : 0;
  return '▓'.repeat(progress) + '░'.repeat(size - progress);
}

function autoplayEmbed(lastSongName) {
  return new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('🔄 Autoplay Mencari Lagu...')
    .setDescription(`Antrian habis! Sedang mencari lagu serupa dengan:\n> **${lastSongName}**`)
    .setFooter({ text: 'Matikan autoplay dengan /autoplay' })
    .setTimestamp();
}

module.exports = { nowPlayingEmbed, addedToQueueEmbed, addedPlaylistEmbed, queueEmbed, autoplayEmbed, formatDuration, getSourceEmoji };
