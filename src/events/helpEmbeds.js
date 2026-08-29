const { EmbedBuilder } = require('discord.js');

// Info owner
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
  card: {
    label: '🎴 Card Profil',
    color: 0x9B59B6,
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
    label: '🎉 Fun & Usilan',
    color: 0xFF6B6B,
  },
  settings: {
    label: '⚙️ Info & Settings',
    color: 0x99AAB5,
  },
};

function buildHelpEmbed(category, client) {
  switch (category) {
    case 'home':
    default:
      return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🤖 QUMPRUY Bot — Pusat Bantuan')
        .setDescription(
          `Bot multifungsi para BESTIE MPRUY\n` +
          `Mendukung pemutar musik lengkap, kartu profil interaktif, moderasi, pengingat harian, dan fitur hiburan.\n\n` +
          `**Pilih menu kategori di bawah untuk melihat rincian setiap command.**`
        )
        .addFields(
          { name: '🎵 Musik (20+ Fitur)', value: 'YouTube, Spotify, SoundCloud + Lirik, Filter & Tombol Kontrol', inline: true },
          { name: '🎴 Card Profil', value: 'Sistem identitas member, Live Voice & Reputasi Like/Respect', inline: true },
          { name: '🛡️ Moderasi', value: 'Warn auto-punish, Mute, Kick, Ban, dan Clear chat', inline: true },
          { name: '🌅 Harian & Jadwal', value: 'Reminder, Ultah, Pengumuman, AFK & Event Server', inline: true },
          { name: '🎉 Fun & Usilan', value: 'Polling interaktif, Sistem Penjara (Jail), Roast, Fakequote & Wanted', inline: true },
          { name: '⚙️ Info & Settings', value: 'Serverinfo, Userinfo, Welcome greeting, Ping & Setup bot', inline: true },
          {
            name: '👤 Developer',
            value: `**${OWNER.name}**\n🐙 [GitHub](${OWNER.github})`,
            inline: false,
          }
        )
        .setFooter({ text: `QUMPRUY Bot • Made with ❤️ by ${OWNER.name}` })
        .setTimestamp();

    case 'music':
      return new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle('🎵 Command Musik')
        .setDescription(
          'Dukungan multi-platform (YouTube, Spotify, SoundCloud) dengan kontrol interaktif dan audio filters.'
        )
        .addFields(
          {
            name: '▶️ Pemutaran Dasar',
            value: [
              '`/play [lagu/url]` — Putar lagu atau playlist',
              '`/search [query]` — Cari & pilih lagu dari 5 hasil dropdown',
              '`/nowplaying` — Info lagu yang sedang diputar + progress bar visual',
              '`/queue [halaman]` — Lihat daftar antrian lagu',
              '`/skip` — Loncat ke lagu berikutnya',
              '`/pause` — Jeda pemutaran musik sementara',
              '`/resume` — Lanjutkan lagu yang di-pause',
              '`/stop` — Hentikan musik & bersihkan antrian *(bot tetap di VC)*',
              '`/leave` — Keluarkan bot dari Voice Channel *(Owner only)*',
              '`/join` — Panggil bot bergabung ke Voice Channel kamu',
            ].join('\n'),
          },
          {
            name: '🎛️ Kontrol Lanjutan & Efek Audio',
            value: [
              '`/volume [0-150]` — Atur volume pemutaran',
              '`/loop [off/song/queue]` — Mode pengulangan lagu atau antrian',
              '`/shuffle` — Acak urutan daftar antrian',
              '`/seek [detik]` — Melompat ke durasi waktu tertentu dalam lagu',
              '`/remove [nomor]` — Hapus lagu tertentu dari antrian',
              '`/clearqueue` — Kosongkan seluruh antrian lagu berikutnya',
              '`/filter [efek]` — Audio filter (`bassboost`, `nightcore`, `vaporwave`, `3d`, `karaoke`, `treble`, `clear`)',
              '`/lyrics [judul?]` — Cari lirik lagu via LRCLIB (otomatis jika judul dikosongkan)',
              '`/autoplay` — Toggle otomatis mencari & memutar lagu serupa',
              '`/q247` — Toggle mode 24/7 agar bot standby di Voice Channel *(Owner/Mod)*',
            ].join('\n'),
          },
          {
            name: '🖲️ Tombol Kontrol Interaktif',
            value: 'Pesan **Now Playing** dilengkapi 5 tombol instan: `⏮️ Prev`, `⏯️ Pause/Play`, `⏭️ Skip`, `⏹️ Stop`, dan `🔀 Shuffle`.',
          },
          {
            name: '💡 Prefix Commands (Awalan `q`)',
            value: 'Semua command musik dapat dijalankan lewat pesan teks biasa menggunakan awalan `q`:\nContoh: `qp [judul]`, `qnp`, `qs`, `qvol 80`, `qloop`, `qfilter bassboost`, `qlyrics`, `qstop`, `qleave`.',
          }
        )
        .setFooter({ text: 'QUMPRUY Bot • Sistem Musik' });

    case 'card':
      return new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🎴 Sistem Card Profil Member')
        .setDescription('Kartu identitas digital member interaktif tanpa perlu mengetik perintah rumit!')
        .addFields(
          {
            name: '📝 Pengisian Profil (Pop-up Form Modal)',
            value: [
              '1. Kunjungi channel **Member Card** di server.',
              '2. Klik tombol **`Edit Profile`** untuk membuka form pop-up.',
              '3. Isi **Bio**, **Kota Asal**, **Tanggal Lahir** *(Contoh: 15-08-2000)*, **Zodiac/Social Link**, dan **Banner Image URL**.',
              '4. Kartu profil akan otomatis diterbitkan dan diperbarui di gallery.',
            ].join('\n'),
          },
          {
            name: '👤 Tampilkan & Lihat Card',
            value: [
              '`/card` — Tampilkan card profil milikmu secara privat (Ephemeral)',
              '`/card member:@user` — Lihat card profil member lain secara privat',
              'Atau klik tombol **`View My Card`** pada panel hub profil.',
            ].join('\n'),
          },
          {
            name: '🎂 Fitur Ulang Tahun & Zodiak Otomatis',
            value: [
              '• Bot otomatis menghitung zodiak dan usia dari tanggal lahirmu.',
              '• Otomatis dirayakan dengan ucapan meriah di channel khusus ulang tahun saat hari spesialmu tiba!',
            ].join('\n'),
          },
          {
            name: '🎙️ Live Voice Status & Companions',
            value: [
              '• Otomatis mendeteksi channel Voice aktif beserta durasinya.',
              '• Mencatat total waktu voice dan 3 partner Voice yang paling sering mengobrol bersama.',
            ].join('\n'),
          },
          {
            name: '❤️ Interaksi Sosial & Reputasi',
            value: 'Setiap kartu di gallery dilengkapi tombol **`❤️ Like`** dan **`⭐ Respect`** yang dapat diberikan oleh member lain.',
          },
          {
            name: '🗺️ Peta Wilayah Member `/membermap`',
            value: '`/membermap` — Tampilkan statistik sebaran kota asal member berdasarkan data kartu profil!',
          },
          {
            name: '🏅 Pencapaian & Gelar `/achievements`',
            value: '`/achievements [@user?]` — Lihat status badge dan milestone yang langsung tampil di kartu profilmu!',
          },
          {
            name: '📌 Pengaturan Admin',
            value: '`/setcard channel:#channel-gallery` — Atur channel tempat hasil kartu member dipublikasikan *(Admin only)*.',
          }
        )
        .setFooter({ text: 'QUMPRUY Bot • Member Profile Card' });

    case 'mod':
      return new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🛡️ Command Moderasi Server')
        .setDescription('Sistem penegakan aturan otomatis dan proteksi server.\n⚠️ Memerlukan permission **Moderate Members** atau lebih tinggi.')
        .addFields(
          {
            name: '⚠️ Sistem Peringatan (Warn)',
            value: [
              '`/mod warn @user [alasan]` — Berikan peringatan kepada member',
              '`/mod warnings @user` — Lihat riwayat dan jumlah warn member',
              '`/mod clearwarns @user` — Hapus seluruh catatan warn *(Admin only)*',
            ].join('\n'),
          },
          {
            name: '🤖 Auto-Punish (Hukuman Otomatis)',
            value: [
              '• `3x Warn` ➔ 🔇 Auto Mute/Timeout selama 3 jam',
              '• `5x Warn` ➔ 👢 Auto Kick dari Voice Channel',
              '• `8x Warn` ➔ 🔨 Auto Ban permanen dari server',
            ].join('\n'),
          },
          {
            name: '🔇 Mute & Timeout',
            value: [
              '`/mod mute @user [menit] [alasan]` — Berikan timeout kepada member',
              '`/mod unmute @user` — Cabut status timeout member',
            ].join('\n'),
          },
          {
            name: '🚪 Kick & Ban',
            value: [
              '`/mod kick @user [alasan]` — Keluarkan member dari server',
              '`/mod ban @user [alasan]` — Blokir permanen member dari server',
              '`/mod voicekick @user` — Tendang paksa member keluar dari Voice Channel',
              '`/mod purge [jumlah 1-100]` — Hapus pesan dalam jumlah banyak secara massal',
            ].join('\n'),
          }
        )
        .setFooter({ text: 'QUMPRUY Bot • Moderasi • Target menerima notifikasi DM otomatis' });

    case 'daily':
      return new EmbedBuilder()
        .setColor(0xFFD93D)
        .setTitle('🌅 Command Harian, Jadwal & Pengumuman')
        .setDescription('Pengingat otomatis waktu harian, perayaan ulang tahun, dan jadwal pengumuman.')
        .addFields(
          {
            name: '☀️ Ucapan Pagi `/qmorning`',
            value: [
              '`/qmorning setchannel #channel` — Tentukan channel pesan pagi',
              '`/qmorning settime [jam] [menit]` — Atur jadwal jam kirim (WIB)',
              '`/qmorning enable` / `disable` — Aktifkan atau nonaktifkan pengingat',
              '`/qmorning test` — Preview tampilan pesan selamat pagi',
              '`/qmorning status` — Cek konfigurasi jadwal saat ini',
            ].join('\n'),
          },
          {
            name: '🌙 Ucapan Malam `/qnight`',
            value: [
              '`/qnight setchannel #channel` — Tentukan channel pesan malam',
              '`/qnight settime [jam] [menit]` — Atur jadwal jam kirim (WIB)',
              '`/qnight enable` / `disable` — Aktifkan atau nonaktifkan pengingat',
              '`/qnight test` — Preview tampilan pesan selamat malam',
              '`/qnight status` — Cek konfigurasi jadwal saat ini',
            ].join('\n'),
          },
          {
            name: '🎂 Perayaan Ulang Tahun `/birthday`',
            value: [
              '`/birthday view [@user?]` — Lihat tanggal lahir, umur, zodiak & hitung mundur',
              '`/birthday list` — Lihat daftar ulang tahun member terdekat di server',
              '`/birthday setchannel #channel` — Atur channel khusus pengumuman ulang tahun *(Owner/Mod)*',
              '`/birthday test [@user?]` — Uji coba kirim simulasi ucapan ulang tahun *(Owner/Mod)*',
              '`/birthday status` — Cek status & channel pengumuman ulang tahun saat ini',
              '`/birthday removechannel` — Nonaktifkan pengumuman ulang tahun *(Owner/Mod)*',
            ].join('\n'),
          },
          {
            name: '📢 Pengumuman Terjadwal `/announce`',
            value: [
              '`/announce send #channel [pesan]` — Kirim pengumuman langsung',
              '`/announce schedule #channel [pesan] [jam] [menit]` — Jadwalkan pengumuman rutin setiap hari',
              '`/announce list` — Tampilkan daftar pengumuman terjadwal aktif',
              '`/announce remove [id]` — Batalkan/hapus jadwal pengumuman',
            ].join('\n'),
          },
          {
            name: '💤 Sistem AFK `/afk`',
            value: [
              '`/afk [alasan?]` — Set status AFK dengan alasan opsional',
              '*Saat seseorang mention kamu, bot otomatis kasih tahu mereka.*',
              '*Status AFK otomatis hilang saat kamu kembali mengetik.*',
            ].join('\n'),
          },
          {
            name: '📅 Event & Acara Server `/event`',
            value: [
              '`/event create [nama] [tanggal] [jam]` — Buat event baru + RSVP',
              '`/event list` — Lihat daftar event yang akan datang',
              '`/event info [id]` — Detail lengkap event tertentu',
              '`/event cancel [id]` — Batalkan event *(Owner/Mod)*',
              '*Bot otomatis kirim pengingat 30 menit sebelum event!*',
            ].join('\n'),
          },
          {
            name: '📮 Kapsul Waktu `/timecapsule`',
            value: [
              '`/timecapsule send [pesan] [tanggal] [jam?] [tujuan?]` — Kirim surat masa depan',
              '`/timecapsule list` — Cek daftar kapsul aktif milikmu',
              '`/timecapsule cancel [id]` — Batalkan kapsul waktu',
              '*Kapsul akan otomatis terbuka dan dikirim ke DM / Channel saat tanggalnya tiba!*',
            ].join('\n'),
          }
        )
        .setFooter({ text: 'QUMPRUY Bot • Waktu terkonfigurasi pada WIB (UTC+7)' });

    case 'fun':
      return new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('🎉 Command Fun, Usilan & Jail')
        .setDescription('Fitur interaktif dan hiburan server. Fitur usilan & jail khusus untuk **Moderator / Admin**.')
        .addFields(
          {
            name: '📊 Polling & Voting `/poll`',
            value: [
              '`/poll [pertanyaan] [opsi1] [opsi2]` — Buat voting 2 pilihan',
              '`/poll [pertanyaan] [opsi1] [opsi2] [opsi3] [opsi4]` — Hingga 4 pilihan voting',
              '*Bot otomatis menambahkan reaksi voting interaktif 🇦 🇧 🇨 🇩.*',
            ].join('\n'),
          },
          {
            name: '🔒 Sistem Penjara Server `/fun jail`',
            value: [
              '`/fun jailsetup [role] [channel] [voice]` — Konfigurasi sistem penjara *(Admin only)*',
              '`/fun jail @user [menit] [alasan]` — Jebloskan member nakal ke sel penjara',
              '`/fun bail @user` — Bebaskan tahanan dari penjara lebih awal',
              '`/fun jailstatus @user` — Cek status hukuman dan durasi tersisa tahanan',
              '*Tahanan akan kehilangan akses semua channel lain dan dikurung di channel penjara.*',
            ].join('\n'),
          },
          {
            name: '😂 Fitur Usilan `/fun`',
            value: [
              '`/fun roast @user [teks?] [#channel?]` — Kirim ejekan/roast lucu ke target',
              '`/fun wanted @user [kejahatan]` — Buat poster buronan WANTED bergaya koboi',
              '`/fun rename @user [nama?]` — Ganti nickname member menjadi nama unik/kocak',
              '`/fun fakequote @user [teks]` — Buat kutipan lucu seolah dikatakan oleh target',
              '`/fun say [pesan] [#channel?]` — Kirim pesan mengatasnamakan bot',
            ].join('\n'),
          },
          {
            name: '🎵 Music Quiz `/musicquiz`',
            value: [
              '`/musicquiz start [ronde?]` — Mulai tebak lagu interaktif dengan tombol A/B/C/D',
              '`/musicquiz stop` — Hentikan quiz yang sedang berlangsung',
              '`/musicquiz leaderboard` — Lihat papan peringkat juara tebak lagu server',
            ].join('\n'),
          },
          {
            name: '🎁 Kotak Misteri Gacha `/gacha`',
            value: [
              '`/gacha pull` — Buka 1 peti misteri harian (Common ⚪ hingga Legendary 🟡)',
              '`/gacha inventory [@user?]` — Cek koleksi item, title, dan badge gachamu',
            ].join('\n'),
          }
        )
        .setFooter({ text: 'QUMPRUY Bot • Fitur Hiburan & Interaktif' });

    case 'settings':
      return new EmbedBuilder()
        .setColor(0x99AAB5)
        .setTitle('⚙️ Info, Utilitas & Konfigurasi')
        .setDescription('Informasi server, member, dan pengaturan umum bot.')
        .addFields(
          {
            name: 'ℹ️ Informasi Server & Member',
            value: [
              '`/serverinfo` — Tampilkan statistik lengkap server (Member, Boost Level, Roles, Channels)',
              '`/userinfo [@user]` — Tampilkan profil detail member (Join date, Akun dibuat, Status VC, Role)',
              '`/ping` — Cek status latensi koneksi bot dan Discord WebSocket',
              '`/help` — Buka panel menu panduan bot ini',
            ].join('\n'),
          },
          {
            name: '👋 Sambutan Member Baru `/qwelcome`',
            value: [
              '`/qwelcome setchannel #channel` — Atur channel kirim kartu sambutan',
              '`/qwelcome enable` / `disable` — Aktifkan atau nonaktifkan sambutan',
              '`/qwelcome test` — Uji coba kirim pesan kartu sambutan',
              '`/qwelcome status` — Cek status konfigurasi welcome',
            ].join('\n'),
          },
          {
            name: '🎴 Pengaturan Panel Profil',
            value: '`/setcard #channel` — Tentukan channel untuk panel hub pembuatan kartu profil member.',
          },
          {
            name: '👤 Informasi Developer',
            value: [
              `Nama: **${OWNER.name}**`,
              `GitHub: [${OWNER.github}](${OWNER.github})`,
              `Role: Developer & Bot Architect`,
            ].join('\n'),
          }
        )
        .setFooter({ text: `QUMPRUY Bot • Versi 2.0 • Made with ❤️ by ${OWNER.name}` });
  }
}

module.exports = { buildHelpEmbed, CATEGORIES, OWNER };
