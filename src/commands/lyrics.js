const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkQueue } = require('../utils/helpers');

// Bersihkan judul lagu dari kata-kata seperti (Official Music Video), [Lyric], feat, dll
function cleanSongTitle(title) {
  if (!title) return '';
  return title
    .replace(/\(Official.*?\)/gi, '')
    .replace(/\[Official.*?\]/gi, '')
    .replace(/\(Music Video\)/gi, '')
    .replace(/\[Music Video\]/gi, '')
    .replace(/\(Audio\)/gi, '')
    .replace(/\[Audio\]/gi, '')
    .replace(/\(Lyric.*?\)/gi, '')
    .replace(/\[Lyric.*?\]/gi, '')
    .replace(/\(Visualizer\)/gi, '')
    .replace(/\|.*$/g, '')
    .trim();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Cari lirik lagu yang sedang diputar atau berdasarkan judul')
    .addStringOption(opt =>
      opt.setName('judul')
        .setDescription('Judul lagu yang ingin dicari (opsional, default: lagu saat ini)')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    let query = interaction.options.getString('judul');

    if (!query) {
      const queue = client.distube.getQueue(interaction.guild.id);
      if (!queue || !queue.songs || queue.songs.length === 0) {
        return interaction.reply({
          content: '❌ Tidak ada lagu yang sedang diputar. Harap masukkan judul lagu: `/lyrics judul:[nama lagu]`',
          ephemeral: true
        });
      }
      query = cleanSongTitle(queue.songs[0].name);
    }

    await interaction.deferReply();

    try {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'QumpruyDiscordBot/1.0 (https://github.com/dwiyansyahku/Music-Bot)'
        }
      });

      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const results = await res.json();

      if (!Array.isArray(results) || results.length === 0) {
        return interaction.editReply(`❌ Lirik tidak ditemukan untuk: **${query}**`);
      }

      // Ambil hasil pertama yang punya plainLyrics atau syncedLyrics
      const bestMatch = results.find(r => r.plainLyrics || r.syncedLyrics) || results[0];
      let lyricsText = bestMatch.plainLyrics;

      if (!lyricsText && bestMatch.syncedLyrics) {
        // Hapus timestamp [00:12.34] dari synced lyrics
        lyricsText = bestMatch.syncedLyrics.replace(/\[\d+:\d+\.\d+\]\s*/g, '');
      }

      if (!lyricsText) {
        return interaction.editReply(`❌ Lirik tidak tersedia untuk lagu: **${bestMatch.trackName}** oleh **${bestMatch.artistName}**`);
      }

      // Potong jika melebihi 4000 karakter (limit embed description discord)
      if (lyricsText.length > 4000) {
        lyricsText = lyricsText.substring(0, 3950) + '\n\n*... [Lirik dipotong karena terlalu panjang]*';
      }

      const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle(`📝 ${bestMatch.trackName}`)
        .setAuthor({ name: bestMatch.artistName || 'Unknown Artist' })
        .setDescription(lyricsText)
        .setFooter({ text: 'Sumber: LRCLIB' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Lyrics] Error:', err);
      await interaction.editReply(`❌ Gagal mencari lirik: ${err.message}`);
    }
  },
};
