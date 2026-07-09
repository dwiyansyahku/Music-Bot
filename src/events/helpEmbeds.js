const { EmbedBuilder } = require('discord.js');

// Info owner — berdasarkan footer di help.js lama
const OWNER = {
  name: 'Dwiyansyah Oktavyudi',
  github: 'https://github.com/dwiyansyahku',
  tag: '<@&1396396538686607410>',
};

const CATEGORIES = {
  home: {
    label: '🏠 Home',
    color: 0x5865F2,
  },
  music: {
    label: '🎵 Musik',
    color: 0x1DB954,
  },
  mod: {
    label: '🛡️ Moderasi',
    color: 0xED4245,
  },
  daily: {
    label: '🌅 Harian & Jadwal',
    color: 0xFFD93D,
  },
  fun: {
    label: '🎉 Fun',
    color: 0xFF6B6B,
  },
  settings: {
    label: '⚙️ Settings',
    color: 0x99AAB5,
  },
};

function buildHelpEmbed(category, client) {
  switch (category) {
    case 'home':
    default:
      return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🤖 QUMPRUY Bot — Bantuan')
        .setDescription(
          `Bot serbaguna untuk server Discord kamu!\n` +
          `Dukung musik, moderasi, reminder harian, dan lebih banyak lagi.\n\n` +
          `**Pilih kategori di bawah untuk melihat daftar command.**`
        )
        .addFields(
          { name: '🎵 Musik', value: 'Putar lagu dari YouTube, Spotify, SoundCloud', inline: true },
          { name: '🛡️ Moderasi', value: 'Warn, mute, kick, ban member', inline: true },
          { name: '🌅 Harian & Jadwal', value: 'Reminder pagi, malam, ulang tahun, pengumuman', inline: true },
          { name: '🎉 Fun', value: 'Poll / vote', inline: true },
          { name: '⚙️ Settings', value: 'Welcome, clear, konfigurasi bot', inline: true },
          {
            name: '👤 Developer',
            value: `**${OWNER.name}**\n🐙 [GitHub](${OWNER.github})`,
            inline: true,
          }
        )
        .setFooter({ text: `QUMPRUY Bot • Made with ❤️ by ${OWNER.name}` })
        .setTimestamp();

    case 'music':
      return new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle('🎵 Command Musik')
        .setDescription('Support YouTube, Spotify, SoundCloud, dan 1000+ platform via yt-dlp!')
        .addFields(
          {
            name: '▶️ Pemutaran',
            value: [
              '`/qp [lagu/url]` — Putar lagu atau playlist',
              '`/nowplaying` — Info lagu yang sedang diputar',
              '`/queue [halaman]` — Lihat antrian lagu',
              '`/skip` — Skip ke lagu berikutnya',
              '`/pause` — Pause lagu',
              '`/resume` — Lanjutkan lagu',
              '`/stop` — Stop dan keluar dari voice channel',
            ].join('\n'),
          },
          {
            name: '⚙️ Kontrol Lanjutan',
            value: [
              '`/volume [0-100]` — Atur volume',
              '`/loop [off/song/queue]` — Mode repeat',
              '`/shuffle` — Acak antrian',
              '`/seek [detik]` — Loncat ke waktu tertentu',
              '`/remove [nomor]` — Hapus lagu dari antrian',
              '`/clearqueue` — Kosongkan antrian',
              '`/autoplay` — Toggle autoplay lagu serupa',
              '`/247` — Toggle mode 24/7 (bot stay di VC)',
            ].join('\n'),
          },
          {
            name: '💡 Contoh',
            value: [
              '`/qp DJ Domba Kuring`',
              '`/qp https://open.spotify.com/track/...`',
              '`/qp https://www.youtube.com/watch?v=...`',
            ].join('\n'),
          }
        )
        .setFooter({ text: 'QUMPRUY Bot • Musik' });

    case 'mod':
      return new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🛡️ Command Moderasi')
        .setDescription('Sistem moderasi lengkap dengan auto-punish berdasarkan jumlah warn.\n⚠️ Butuh permission **Moderate Members** atau lebih tinggi.')
        .addFields(
          {
            name: '⚠️ Warn System',
            value: [
              '`/mod warn @user [alasan]` — Beri peringatan',
              '`/mod warnings @user` — Lihat riwayat warn',
              '`/mod clearwarns @user` — Hapus semua warn *(Admin only)*',
            ].join('\n'),
          },
          {
            name: '🤖 Auto-Punish (Berdasarkan Jumlah Warn)',
            value: [
              '`3x Warn` → 🔇 Auto mute 3 jam',
              '`5x Warn` → 👢 Auto kick dari voice',
              '`8x Warn` → 🔨 Auto ban permanent and kick server',
            ].join('\n'),
          },
          {
            name: '🔇 Mute / Timeout',
            value: [
              '`/mod mute @user [menit] [alasan]` — Timeout member',
              '`/mod unmute @user` — Cabut timeout',
            ].join('\n'),
          },
          {
            name: '🚪 Kick & Ban',
            value: [
              '`/mod kick @user [alasan]` — Kick member',
              '`/mod ban @user [alasan] [hapus_pesan]` — Ban member',
            ].join('\n'),
          },
          {
            name: '🧹 Lainnya',
            value: [
              '`/qclear amount [jumlah]` — Hapus N pesan (1-100)',
              '`/qclear all` — Hapus semua pesan di channel',
            ].join('\n'),
          }
        )
        .setFooter({ text: 'QUMPRUY Bot • Moderasi • Target akan dapat DM notifikasi.' });

    case 'daily':
      return new EmbedBuilder()
        .setColor(0xFFD93D)
        .setTitle('🌅 Command Harian & Jadwal')
        .setDescription('Reminder otomatis harian, ulang tahun, dan pengumuman terjadwal. Semua setting tersimpan permanen (tidak hilang saat restart).')
        .addFields(
          {
            name: '☀️ Selamat Pagi `/qmorning`',
            value: [
              '`/qmorning setchannel #channel` — Set channel',
              '`/qmorning settime [jam] [menit]` — Set jam (WIB)',
              '`/qmorning enable/disable` — Toggle',
              '`/qmorning test` — Preview',
              '`/qmorning status` — Cek status',
            ].join('\n'),
          },
          {
            name: '🌙 Selamat Malam `/qnight`',
            value: [
              '`/qnight setchannel #channel` — Set channel',
              '`/qnight settime [jam] [menit]` — Set jam (WIB)',
              '`/qnight enable/disable` — Toggle',
              '`/qnight test` — Preview',
              '`/qnight status` — Cek status',
            ].join('\n'),
          },
          {
            name: '🎂 Discord Anniversary `/birthday`',
            value: [
              '`/birthday view @user` — Lihat ultah akun Discord seseorang',
              '`/birthday list` — 10 Discord Anniversary terdekat di server',
              '`/birthday setchannel #channel` — Set channel pengumuman *(Owner only)*',
              '',
              '> Fitur ini otomatis merayakan hari pembuatan akun Discord semua member tanpa perlu registrasi!',
            ].join('\n'),
          },
          {
            name: '📢 Pengumuman `/announce`',
            value: [
              '`/announce send #channel [pesan]` — Kirim pengumuman sekarang',
              '`/announce schedule #channel [pesan] [jam] [menit]` — Jadwalkan harian',
              '`/announce list` — Lihat jadwal aktif',
              '`/announce remove [id]` — Hapus jadwal',
            ].join('\n'),
          }
        )
        .setFooter({ text: 'QUMPRUY Bot • Semua waktu menggunakan WIB (UTC+7)' });

    case 'fun':
      return new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('🎉 Command Fun & Usilan')
        .setDescription('Semua command di bawah **hanya bisa diakses Moderator/Admin**. Gunakan dengan bijak (atau jangan — terserah 😈)')
        .addFields(
          {
            name: '📊 Poll / Vote `/poll`',
            value: [
              '`/poll [pertanyaan] [opsi1] [opsi2]` — Buat poll 2 pilihan',
              '`/poll [pertanyaan] [opsi1] [opsi2] [opsi3] [opsi4]` — Hingga 4 pilihan',
              'Bot otomatis tambah reaksi 🇦 🇧 🇨 🇩',
            ].join('\n'),
          },
          {
            name: '🔒 Sistem Jail `/fun jail`',
            value: [
              '`/fun jailsetup [role] [channel]` — Setup jail *(Admin only)*',
              '`/fun jail @user [menit] [alasan]` — Masukkan member ke penjara',
              '`/fun bail @user` — Bebaskan lebih awal',
              '`/fun jailstatus @user` — Cek status penjara member',
              '',
              '> Member yang di-jail kehilangan akses semua channel & hanya bisa chat di #penjara. Auto-bebas setelah waktu habis.',
            ].join('\n'),
          },
          {
            name: '😂 Usilan `/fun`',
            value: [
              '`/fun roast @user` — Kirim roast lucu ke target',
              '`/fun wanted @user [kejahatan]` — Buat poster WANTED keren',
              '`/fun rename @user [nama?]` — Ganti nickname jadi nama lucu (nama random kalau dikosongkan)',
              '`/fun fakequote @user [teks]` — Buat quote palsu seolah dari member itu',
              '`/fun say [pesan] [#channel?]` — Bot ngomong atas nama lo',
            ].join('\n'),
          }
        )
        .setFooter({ text: 'QUMPRUY Bot • Fun & Usilan • Mod/Admin only' });


    case 'settings':
      return new EmbedBuilder()
        .setColor(0x99AAB5)
        .setTitle('⚙️ Command Settings')
        .setDescription('Konfigurasi fitur bot untuk server. Semua perintah ini butuh **Manage Server** atau **Owner Bot**.')
        .addFields(
          {
            name: '👋 Welcome Member `/qwelcome`',
            value: [
              '`/qwelcome setchannel #channel` — Set channel sambutan',
              '`/qwelcome enable/disable` — Toggle',
              '`/qwelcome test` — Preview sambutan',
              '`/qwelcome status` — Cek status',
            ].join('\n'),
          },
          {
            name: '🔧 Utilitas',
            value: [
              '`/ping` — Cek latency bot & uptime',
              '`/join` — Paksa bot masuk voice channel',
            ].join('\n'),
          },
          {
            name: '👤 Info Developer',
            value: [
              `**${OWNER.name}**`,
              `🐙 GitHub: [${OWNER.tag}](${OWNER.github})`,
              '',
              '*Bot ini dibuat dengan ❤️ khusus untuk server ini.*',
            ].join('\n'),
          }
        )
        .setFooter({ text: `QUMPRUY Bot • Made by ${OWNER.name}` });
  }
}

module.exports = { buildHelpEmbed, CATEGORIES, OWNER };
