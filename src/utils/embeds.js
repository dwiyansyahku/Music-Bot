const { EmbedBuilder } = require('discord.js');

const COLOR_MAIN = '#2B2D31'; // Discord modern dark theme

function formatDuration(seconds) {
  if (seconds === Infinity) return 'LIVE';
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function nowPlayingEmbed(song, queue) {
  const total = song?.duration || 0;
  const artist = song?.uploader?.name || 'Unknown Artist';
  const requester = song?.member?.displayName || song?.user?.username || 'Unknown';
  const loopLabel = queue?.repeatMode === 0 ? 'Off' : queue?.repeatMode === 1 ? 'Lagu' : 'Antrian';
  const autoplayLabel = queue?.autoplay ? 'On' : 'Off';

  const embed = new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setAuthor({ name: 'NOW PLAYING' })
    .setTitle(song.name)
    .setURL(song.url)
    .setDescription(
      `oleh **${artist}**\n\n` +
      `Durasi: \`${formatDuration(total)}\` • Volume: \`${queue?.volume || 100}%\`\n` +
      `Loop: \`${loopLabel}\` • Autoplay: \`${autoplayLabel}\``
    )
    .setFooter({
      text: `Diminta oleh ${requester}`,
      iconURL: song?.member?.displayAvatarURL() || null
    })
    .setTimestamp();

  if (song?.thumbnail) {
    embed.setThumbnail(song.thumbnail);
  }

  return embed;
}

function addedToQueueEmbed(song, queue) {
  const requester = song?.member?.displayName || 'Unknown';
  const pos = queue?.songs?.length || 1;

  return new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setDescription(
      `Ditambahkan ke antrian: **[${song.name}](${song.url})**\n` +
      `Durasi: \`${formatDuration(song.duration)}\` • Posisi: **#${pos}** • Oleh: **${requester}**`
    );
}

function addedPlaylistEmbed(playlist, queue) {
  const requester = playlist?.member?.displayName || 'Unknown';
  return new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setDescription(
      `Playlist ditambahkan: **[${playlist.name}](${playlist.url || ''})**\n` +
      `**${playlist.songs.length} lagu** • Total Antrian: **${queue.songs.length} lagu** • Oleh: **${requester}**`
    );
}

function queueEmbed(queue, page = 1) {
  const perPage = 10;
  const start = (page - 1) * perPage;
  const songs = queue.songs.slice(start, start + perPage);
  const totalPages = Math.max(1, Math.ceil(queue.songs.length / perPage));
  const totalDuration = queue.songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  const currentSong = queue.songs[0];
  const upcomingSongs = queue.songs.slice(1);

  let desc = '';
  if (page === 1 && currentSong) {
    desc += `**Sedang Diputar:**\n[${currentSong.name}](${currentSong.url}) — \`${formatDuration(currentSong.duration)}\`\n\n`;
    if (upcomingSongs.length > 0) {
      desc += `**Antrian Berikutnya:**\n`;
      desc += upcomingSongs.slice(0, perPage - 1).map((s, i) => {
        return `\`${i + 1}.\` [${s.name}](${s.url}) — \`${formatDuration(s.duration)}\``;
      }).join('\n');
    } else {
      desc += `_Tidak ada lagu berikutnya dalam antrian._`;
    }
  } else {
    desc = songs.map((s, i) => {
      const num = start + i;
      return `\`${num}.\` [${s.name}](${s.url}) — \`${formatDuration(s.duration)}\``;
    }).join('\n') || '_Antrian kosong_';
  }

  return new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setTitle(`Antrian Musik (${queue.songs.length} lagu • ${formatDuration(totalDuration)})`)
    .setDescription(desc)
    .setFooter({
      text: `Halaman ${page}/${totalPages} • Volume: ${queue.volume}% • Loop: ${queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Lagu' : 'Antrian'} • Autoplay: ${queue.autoplay ? 'On' : 'Off'}`
    });
}

function autoplayEmbed(lastSongName) {
  return new EmbedBuilder()
    .setColor(COLOR_MAIN)
    .setTitle('Autoplay')
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
};
