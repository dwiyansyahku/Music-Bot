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
            '`/play [query/url]` — Putar lagu atau playlist',
            '`/nowplaying` — Info lagu yang sedang diputar',
            '`/queue [halaman]` — Lihat antrian lagu',
          ].join('\n'),
        },
        {
          name: '⏯️ Kontrol Pemutaran',
          value: [
            '`/pause` — Pause lagu',
            '`/resume` — Lanjutkan lagu',
            '`/skip` — Skip ke lagu berikutnya',
            '`/stop` — Stop dan keluar dari voice channel',
            '`/seek [detik]` — Lompat ke waktu tertentu',
          ].join('\n'),
        },
        {
          name: '⚙️ Pengaturan',
          value: [
            '`/volume [0-100]` — Atur volume',
            '`/loop [off/song/queue]` — Mode loop',
            '`/shuffle` — Acak antrian',
            '`/remove [nomor]` — Hapus lagu dari antrian',
            '`/clearqueue` — Hapus semua antrian',
          ].join('\n'),
        },
        {
          name: '🔗 Platform yang Didukung',
          value: '🔴 YouTube & YouTube Music\n🟢 Spotify (lagu, album, playlist)\n🟠 SoundCloud\n🌐 Dan banyak platform lain via yt-dlp!',
        },
        {
          name: '💡 Contoh Penggunaan',
          value: [
            '`/play Never Gonna Give You Up`',
            '`/play https://open.spotify.com/track/...`',
            '`/play https://www.youtube.com/watch?v=...`',
            '`/play https://soundcloud.com/...`',
          ].join('\n'),
        }
      )
      .setFooter({ text: 'Discord Music Bot | Made with ❤️ using DisTube' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
