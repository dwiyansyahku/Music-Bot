const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Tampilkan semua command yang tersedia'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x1DB954)
      .setTitle('🎵 Discord Music Bot — Bantuan')
      .setDescription('Bot musik yang support YouTube, Spotify, SoundCloud, dan banyak lagi!')
      .addFields(
        {
          name: '🎵 Perintah Utama',
          value: [
            '`/qp [query/url]` — Putar lagu atau playlist',
            '`/nowplaying` — Info lagu yang sedang diputar',
            '`/queue [halaman]` — Lihat antrian lagu',
          ].join('\n'),
        },
        {
          name: '⏯️ Kontrol Pemutaran',
          value: [
            '`qpause` — Pause lagu',
            '`qresume` — Lanjutkan lagu',
            '`qskip` — Skip ke lagu berikutnya',
            '`qstop` — Stop dan keluar dari voice channel',
            '`qseek [detik]` — Lompat ke waktu tertentu',
          ].join('\n'),
        },
        {
          name: '⚙️ Pengaturan',
          value: [
            '`qvol [0-100]` — Atur volume',
            '`qloop [off/song/queue]` — Mode loop',
            '`qshuffle` — Acak antrian',
            '`qremove [nomor]` — Hapus lagu dari antrian',
            '`qclearqueue` — Hapus semua antrian',
          ].join('\n'),
        },
        {
          name: '🔗 Platform yang Didukung',
          value: '🔴 YouTube & YouTube Music\n🟢 Spotify (lagu, album, playlist)\n🟠 SoundCloud\n🌐 Dan banyak platform lain via yt-dlp!',
        },
        {
          name: '💡 Contoh Penggunaan',
          value: [
            '`qp DJ Domba Kuring`',
            '`qp https://open.spotify.com/track/...`',
            '`qp https://www.youtube.com/watch?v=...`',
            '`qp https://soundcloud.com/...`',
          ].join('\n'),
        }
      )
      .setFooter({ text: 'Discord Music Bot | Made QUMPRUY | https://discord.gg/qPYxhRzBzB' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
