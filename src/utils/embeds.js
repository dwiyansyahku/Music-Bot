const { EmbedBuilder } = require('discord.js');

const COLOR_MAIN = '#2B2D31'; // Elegant Dark theme
const COLOR_ACCENT = 0x5865F2; // Discord Blurple
const COLOR_SUCCESS = 0x57F287;
const COLOR_ERROR = 0xED4245;

function formatDuration(seconds) {
  if (seconds === Infinity) return '🔴 LIVE';
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getSourceEmoji(song) {
  const url = song?.url || '';
  if (url.includes('spotify')) return '🟢';
  if (url.includes('soundcloud')) return '🟠';
  if (url.includes('youtube') || url.includes('youtu.be')) return '🔴';
  return '🎵';
}

function createProgressBar(current = 0, total = 0, size = 18) {
  if (total <= 0) return '─'.repeat(size);
  const progress = Math.min(size - 1, Math.max(0, Math.round((current / total) * (size - 1))));
  const left = '─'.repeat(progress);
  const right = '─'.repeat(Math.max(0, size - 1 - progress));
  return `${left}●${right}`;
}

function nowPlayingEmbed(song, queue) {
  const emoji = getSourceEmoji(song);
  const current = queue?.currentTime || 0;
  const total = song?.duration || 0;
  const progressBar = createProgressBar(current, total, 18);

  const artist = song?.uploader?.name || 'Unknown Artist';
  const requester = song?.member?.displayName || song?.user?.username || 'Unknown';
  const loopLabel = queue?.repeatMode === 0 ? 'Off' : queue?.repeatMode === 1 ? 'Lagu' : 'Antrian';
  const autoplayLabel = queue?.autoplay ? 'On' : 'Off';

  const embed = new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setAuthor({ name: 'Sedang Diputar' })
    .setTitle(`${emoji} ${song.name}`)
    .setURL(song.url)
    .setDescription(
      `oleh **${artist}**\n\n` +
      `${progressBar}\n` +
      `\`${formatDuration(current)} / ${formatDuration(total)}\`\n`
    )
    .setFooter({
      text: `Diminta oleh ${requester} • Vol ${queue?.volume || 100}% • Loop: ${loopLabel} • Autoplay: ${autoplayLabel}`,
      iconURL: song?.member?.displayAvatarURL() || null
    })
    .setTimestamp();

  if (song?.thumbnail) {
    embed.setThumbnail(song.thumbnail);
  }

  return embed;
}

function addedToQueueEmbed(song, queue) {
  const emoji = getSourceEmoji(song);
  const requester = song?.member?.displayName || 'Unknown';
  const pos = queue?.songs?.length || 1;

  return new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setDescription(
      `➕ Ditambahkan ke antrian: **[${song.name}](${song.url})**\n` +
      `⏱️ \`${formatDuration(song.duration)}\` • Posisi: **#${pos}** • Oleh: **${requester}**`
    );
}

function addedPlaylistEmbed(playlist, queue) {
  const requester = playlist?.member?.displayName || 'Unknown';
  return new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setDescription(
      `📋 Playlist ditambahkan: **[${playlist.name}](${playlist.url || ''})**\n` +
      `🎵 **${playlist.songs.length} lagu** • Total Antrian: **${queue.songs.length} lagu** • Oleh: **${requester}**`
    );
}

function queueEmbed(queue, page = 1) {
  const perPage = 10;
  const start = (page - 1) * perPage;
  const songs = queue.songs.slice(start, start + perPage);
  const totalPages = Math.max(1, Math.ceil(queue.songs.length / perPage));
  const totalDuration = queue.songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  const songList = songs.map((s, i) => {
    const num = start + i;
    const prefix = num === 0 ? '▶️ **Sedang Diputar:**' : `\`${num}.\``;
    return `${prefix} [${s.name}](${s.url}) — \`${formatDuration(s.duration)}\``;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setTitle(`📋 Antrian Lagu (${queue.songs.length} lagu • ${formatDuration(totalDuration)})`)
    .setDescription(songList || '_Antrian kosong_')
    .setFooter({
      text: `Halaman ${page}/${totalPages} • Volume: ${queue.volume}% • Loop: ${queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Lagu' : 'Antrian'} • Autoplay: ${queue.autoplay ? 'On' : 'Off'}`
    });
}

function autoplayEmbed(lastSongName) {
  return new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setTitle('🔄 Autoplay')
    .setDescription(`Mencari lagu serupa dengan:\n> **${lastSongName}**`)
    .setFooter({ text: 'Matikan autoplay dengan /autoplay' });
}

module.exports = {
  nowPlayingEmbed,
  addedToQueueEmbed,
  addedPlaylistEmbed,
  queueEmbed,
  autoplayEmbed,
  formatDuration,
  getSourceEmoji,
  createProgressBar,
};
