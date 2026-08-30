const { EmbedBuilder } = require('discord.js');

const OWNER = {
  name: 'Dwiyansyah Oktavyudi',
  github: 'https://github.com/dwiyansyahku',
  tag: '<@&1396396538686607410>',
};

function buildHelpEmbed(category, client, guild = null) {
  const guildName = guild ? guild.name : 'QUMPRUY';

  switch (category) {
    case 'home':
    case 'overview':
    default:
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `DIREKTORI FITUR — ${guildName.toUpperCase()}`,
          iconURL: guild?.iconURL({ dynamic: true }) || client?.user?.displayAvatarURL()
        })
        .setTitle('Pusat Panduan & Akses Fitur Server')
        .setDescription(
          `Direktori resmi panduan dan fitur bot di server **${guildName}**.\n\n` +
          `◈ **Petunjuk Penggunaan Direktori:**\n` +
          `Pilih salah satu kategori pada menu pilihan di bawah untuk membuka penjelasan fungsi, daftar perintah, dan tutorial langkah demi langkahnya secara privat.`
        )
        .addFields(
          {
            name: '✦ Hiburan & Komunitas',
            value: [
              '• **Musik & Audio** — Pemutar lagu YouTube/Spotify, lirik & efek',
              '• **Music Quiz** — Game tebak lagu audio 10 detik di voice',
              '• **Member Card** — Kartu profil identitas & voice stats',
              '• **Peta Wilayah** — Statistik sebaran domisili member server'
            ].join('\n'),
            inline: false
          },
          {
            name: '✦ Utilitas & Jadwal Server',
            value: [
              '• **Gacha & Koleksi** — Daily claim & kartu koleksi langka',
              '• **Kapsul Waktu** — Pesan rahasia terjadwal untuk masa depan',
              '• **Jadwal & Ulang Tahun** — Perayaan otomatis & event server',
              '• **Voice & Achievements** — Tracking durasi voice & lencana',
              '• **Moderasi & Keamanan** — Sistem warn, mute, dan clear chat'
            ].join('\n'),
            inline: false
          }
        )
        .setFooter({ text: 'Pilih kategori di bawah untuk membaca panduan fitur lengkap' })
        .setTimestamp();

    case 'music':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `PANDUAN FITUR — ${guildName.toUpperCase()}` })
        .setTitle('Pemutar Musik & Audio')
        .setDescription(
          `**Fungsi:**\n` +
          `Memutar audio berkualitas tinggi dari YouTube, Spotify, dan SoundCloud di dalam Voice Channel.\n\n` +
          `◈ **Langkah Penggunaan:**\n` +
          `1. Masuk ke salah satu **Voice Channel** server.\n` +
          `2. Ketik perintah pemutaran di text chat:\n` +
          `   • \`qp [judul lagu]\` *(Shortcut Cepat)*\n` +
          `   • \`/play [judul/link]\` *(Slash Command)*\n` +
          `3. Bot akan bergabung ke VC dan langsung memutar lagu.\n` +
          `4. Gunakan tombol interaktif pada kartu pemutar untuk jeda, lewati, lirik, atau antrian.\n\n` +
          `◈ **Perintah Bermanfaat:**\n` +
          `• \`/search [query]\` — Cari lagu dan pilih dari dropdown hasil.\n` +
          `• \`/lyrics\` — Tampilkan lirik lagu yang sedang diputar.\n` +
          `• \`/filter [efek]\` — Pasang efek audio (bassboost, nightcore, 8d).\n` +
          `• \`/autoplay\` — Putar rekomendasi lagu otomatis saat antrian habis.\n` +
          `• \`/q247\` — Mode standby 24/7 di Voice Channel.`
        )
        .setFooter({ text: 'Gunakan tombol pada pemutar untuk kendali tanpa mengetik perintah' });

    case 'quiz':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `PANDUAN FITUR — ${guildName.toUpperCase()}` })
        .setTitle('Music Quiz (Tebak Lagu)')
        .setDescription(
          `**Fungsi:**\n` +
          `Game kuis audio di mana bot memutar **potongan lagu 10 detik** di Voice Channel dan member berlomba menebak judul lagunya.\n\n` +
          `◈ **Langkah Penggunaan:**\n` +
          `1. Masuk ke **Voice Channel** bersama teman-temanmu.\n` +
          `2. Ketik \`/musicquiz start\` di text chat.\n` +
          `   *(Tersedia opsi genre: Indo Hits, Western Pop, Anime OST, K-Pop, atau Campuran)*.\n` +
          `3. Dengarkan audio 10 detik yang dimainkan bot di voice.\n` +
          `4. Klik tombol **A, B, C, atau D** sebelum waktu 20 detik habis.\n` +
          `5. Kumpulkan poin tercepat untuk menjuarai sesi kuis!\n\n` +
          `◈ **Perintah Terkait:**\n` +
          `• \`/musicquiz start\` — Memulai sesi kuis baru.\n` +
          `• \`/musicquiz leaderboard\` — Papan peringkat juara server.\n` +
          `• \`/musicquiz stop\` — Menghentikan sesi kuis berjalan.`
        )
        .setFooter({ text: 'Poin dihitung berdasarkan ketepatan dan kecepatan menjawab' });

    case 'card':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `PANDUAN FITUR — ${guildName.toUpperCase()}` })
        .setTitle('Member Profile Card')
        .setDescription(
          `**Fungsi:**\n` +
          `Kartu profil resmi member server yang merangkum biodata, asal daerah, tanggal lahir, zodiak, banner GIF, dan teman ngobrol voice terdekat.\n\n` +
          `◈ **Langkah Penggunaan:**\n` +
          `1. Buka channel pembuatan kartu (<#1532222435250929735>).\n` +
          `2. Klik tombol **[ Buat/Edit Kartu ]** pada panel.\n` +
          `3. Lengkapi formulir:\n` +
          `   • **Bio:** Deskripsi singkat dirimu.\n` +
          `   • **Asal Daerah:** Nama kota/kabupaten tempat tinggalmu.\n` +
          `   • **Tanggal Lahir:** Format tanggal (contoh: *15-08-2000* atau *15 Agustus*).\n` +
          `   • **Banner URL:** *(Opsional)* Link gambar atau GIF.\n` +
          `4. Klik **Submit** untuk menerbitkan kartumu di channel galeri.\n\n` +
          `◈ **Tips Banner Gambar / GIF:**\n` +
          `Kirim gambar/GIF ke chat Discord ➔ Klik kanan (PC) atau tahan gambar (HP) ➔ Pilih **Copy Image/Media Link** ➔ Tempelkan di kolom Banner URL.`
        )
        .setFooter({ text: 'Daftar Voice Companions di kartu diperbarui otomatis saat kamu aktif di voice' });

    case 'membermap':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `PANDUAN FITUR — ${guildName.toUpperCase()}` })
        .setTitle('Peta Persebaran Wilayah')
        .setDescription(
          `**Fungsi:**\n` +
          `Melihat persebaran asal domisili member server yang dikelompokkan berdasarkan provinsi & kota terbanyak, serta mencari teman satu daerah.\n\n` +
          `◈ **Langkah Penggunaan:**\n` +
          `1. Pastikan sudah mengisi **Asal Daerah** pada kartu profilmu.\n` +
          `2. Ketik \`/membermap view\` atau klik tombol **[ Buka Peta Wilayah ↗ ]** di panel peta.\n` +
          `3. Gunakan tombol **Prev / Next** untuk menelusuri halaman peta.\n` +
          `4. **Melihat Member per Kota:** Pilih nama kota pada menu dropdown untuk membuka pop-up daftar nama member dan link kartu profil mereka.\n\n` +
          `◈ **Catatan:**\n` +
          `Sesi navigasi peta bersifat **privat (ephemeral)** sehingga kamu dapat bernavigasi tanpa mengganggu member lain.`
        )
        .setFooter({ text: 'Statistik wilayah diperbarui secara realtime dari database profil member' });

    case 'gacha':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `PANDUAN FITUR — ${guildName.toUpperCase()}` })
        .setTitle('Sistem Gacha & Koleksi Kartu')
        .setDescription(
          `**Fungsi:**\n` +
          `Minigame koleksi kartu karakter dengan tingkat kelangkaan mulai dari Common hingga Mythic.\n\n` +
          `◈ **Langkah Penggunaan:**\n` +
          `1. Ketik \`/gacha daily\` setiap hari untuk klaim tiket & koin gratis.\n` +
          `2. Ketik \`/gacha pull\` untuk melakukan tarikan gacha.\n` +
          `3. Ketik \`/gacha inventory\` untuk melihat koleksi kartu yang kamu miliki.\n` +
          `4. Ketik \`/gacha album\` untuk melihat kelengkapan kartu server.\n\n` +
          `◈ **Tingkat Kelangkaan (Rarity):**\n` +
          `• Common (Biasa) • Rare (Langka) • Epic (Sangat Langka)\n` +
          `• Legendary (Istimewa) • Mythic (Paling Langka)`
        )
        .setFooter({ text: 'Klaim hadiah harian gratis setiap 24 jam dengan /gacha daily' });

    case 'timecapsule':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `PANDUAN FITUR — ${guildName.toUpperCase()}` })
        .setTitle('Kapsul Waktu (Time Capsule)')
        .setDescription(
          `**Fungsi:**\n` +
          `Menyimpan surat, pesan rahasia, atau kenangan yang **terkunci rapat dan baru akan terbuka otomatis pada tanggal yang ditentukan**.\n\n` +
          `◈ **Langkah Penggunaan:**\n` +
          `1. Ketik \`/timecapsule create\` di text chat.\n` +
          `2. Tulis isi pesan kapsul waktumu.\n` +
          `3. Tentukan tanggal buka (contoh: *31-12-2026*, *1 bulan lagi*, dll).\n` +
          `4. Pilih target: **Pribadi (DM)** atau **Publik (Channel Server)**.\n` +
          `5. Bot akan mengunci pesan dan otomatis membukanya saat tanggalnya tiba!\n\n` +
          `◈ **Perintah Terkait:**\n` +
          `• \`/timecapsule list\` — Melihat daftar kapsul aktif milikmu.`
        )
        .setFooter({ text: 'Isi kapsul tidak dapat dibaca oleh siapa pun sebelum tanggal bukanya' });

    case 'daily':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `PANDUAN FITUR — ${guildName.toUpperCase()}` })
        .setTitle('Ulang Tahun & Pengingat Harian')
        .setDescription(
          `**Fungsi:**\n` +
          `Otomatisasi perayaan ulang tahun member setiap pukul 00:00 WIB, sapaan pagi/malam, dan pengumuman event server.\n\n` +
          `◈ **Langkah Penggunaan:**\n` +
          `1. Cukup isi tanggal lahirmu di Member Card (<#1532222435250929735>).\n` +
          `2. Saat hari ulang tahunmu tiba, bot otomatis mengirim kartu perayaan spesial di channel ulang tahun.\n` +
          `3. Member server dapat langsung memberikan ucapan selamat bersama.\n\n` +
          `◈ **Perintah Terkait:**\n` +
          `• \`/birthday upcoming\` — Cek siapa saja yang berulang tahun dalam waktu dekat.\n` +
          `• \`/birthday check [user]\` — Cek tanggal lahir & zodiak member.\n` +
          `• \`/event list\` — Jadwal kegiatan dan event server mendatang.`
        )
        .setFooter({ text: 'Perayaan ulang tahun murni dihitung dari tanggal lahir asli di kartu profil' });

    case 'voice':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `PANDUAN FITUR — ${guildName.toUpperCase()}` })
        .setTitle('Voice Tracking & Achievements')
        .setDescription(
          `**Fungsi:**\n` +
          `Mencatat durasi aktif di Voice Channel, mendeteksi teman ngobrol terdekat (**Top Voice Companions**), dan membuka lencana pencapaian.\n\n` +
          `◈ **Langkah Penggunaan:**\n` +
          `1. Cukup masuk dan aktif di Voice Channel seperti biasa.\n` +
          `2. Sistem bot mencatat jam aktifmu secara otomatis di latar belakang.\n` +
          `3. Semakin sering ngobrol bersama teman tertentu, namanya akan otomatis naik ke daftar teman terdekat di profilmu.\n` +
          `4. Raih target jam aktif untuk membuka lencana khusus!\n\n` +
          `◈ **Perintah Terkait:**\n` +
          `• \`/achievements\` — Cek daftar lencana yang sudah terbuka.\n` +
          `• \`/userinfo [user]\` — Cek statistik voice lengkap seseorang.`
        )
        .setFooter({ text: 'Sistem pencatatan voice berjalan otomatis tanpa membebani performa' });

    case 'mod':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `PANDUAN FITUR — ${guildName.toUpperCase()}` })
        .setTitle('Sistem Moderasi Server')
        .setDescription(
          `**Fungsi:**\n` +
          `Perangkat pengelolaan server untuk Staff & Moderator dalam menjaga kenyamanan dan ketertiban komunitas.\n\n` +
          `◈ **Daftar Perintah Moderasi:**\n` +
          `• \`/warn [user] [alasan]\` — Berikan teguran resmi ke member.\n` +
          `• \`/warnings [user]\` — Riwayat peringatan member.\n` +
          `• \`/clear [jumlah]\` — Hapus pesan chat dalam jumlah banyak secara instan.\n` +
          `• \`/mute [user] [durasi]\` — Timeout / bisukan member sementara.\n` +
          `• \`/unmute [user]\` — Lepaskan status timeout member.\n` +
          `• \`/kick [user]\` — Keluarkan member dari server.\n` +
          `• \`/ban [user]\` — Blokir member dari server.`
        )
        .setFooter({ text: 'Perintah moderasi hanya dapat digunakan oleh Staff / Moderator yang berwenang' });

    case 'all_cmds':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `PANDUAN FITUR — ${guildName.toUpperCase()}` })
        .setTitle('Daftar Perintah (Commands List)')
        .setDescription('Ringkasan seluruh perintah slash command bot yang tersedia di server:')
        .addFields(
          {
            name: '✦ Musik & Audio',
            value: '`/play`, `/search`, `/nowplaying`, `/queue`, `/skip`, `/pause`, `/resume`, `/stop`, `/volume`, `/loop`, `/shuffle`, `/seek`, `/lyrics`, `/filter`, `/autoplay`, `/q247`',
            inline: false
          },
          {
            name: '✦ Hiburan & Game',
            value: '`/musicquiz`, `/gacha`, `/poll`, `/afk`, `/roast`, `/fakequote`, `/wanted`, `/dice`, `/coinflip`, `/8ball`',
            inline: false
          },
          {
            name: '✦ Komunitas & Profil',
            value: '`/card`, `/membermap`, `/birthday`, `/timecapsule`, `/event`, `/achievements`, `/userinfo`, `/serverinfo`',
            inline: false
          },
          {
            name: '✦ Moderasi & Utilitas',
            value: '`/warn`, `/warnings`, `/clearwarn`, `/mute`, `/unmute`, `/kick`, `/ban`, `/clear`, `/announce`, `/qmorning`, `/qnight`, `/backup`',
            inline: false
          }
        )
        .setFooter({ text: 'Ketik / di kolom chat untuk melihat panduan interaktif setiap command' });
  }
}

/**
 * Buat Payload Pesan Panel Publik Panduan & Direktori Bot (Sleek & Minimalist)
 */
function createHelpGuidePanelPayload(guild) {
  const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

  const embed = buildHelpEmbed('overview', null, guild);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_guide_select')
    .setPlaceholder('Pilih kategori fitur untuk melihat panduan...')
    .addOptions(
      {
        label: 'Direktori Utama',
        description: 'Kembali ke ringkasan pengantar direktori',
        value: 'overview'
      },
      {
        label: 'Pemutar Musik & Audio',
        description: 'Cara putar lagu, prefix qp, lirik, filter & radio',
        value: 'music'
      },
      {
        label: 'Music Quiz (Tebak Lagu)',
        description: 'Cara main kuis tebak lagu audio 10 detik & leaderboard',
        value: 'quiz'
      },
      {
        label: 'Member Profile Card',
        description: 'Cara buat kartu profil, pasang banner GIF & bio',
        value: 'card'
      },
      {
        label: 'Peta Persebaran Wilayah',
        description: 'Cara cek domisili kota & cari teman satu daerah',
        value: 'membermap'
      },
      {
        label: 'Sistem Gacha & Koleksi',
        description: 'Daily claim gratis & kelangkaan kartu koleksi',
        value: 'gacha'
      },
      {
        label: 'Kapsul Waktu (Time Capsule)',
        description: 'Kirim pesan rahasia untuk dibuka di masa depan',
        value: 'timecapsule'
      },
      {
        label: 'Ulang Tahun & Sapaan',
        description: 'Perayaan ultah jam 00:00 WIB, sapaan & event',
        value: 'daily'
      },
      {
        label: 'Voice Tracker & Badges',
        description: 'Catatan jam voice, companions & lencana pencapaian',
        value: 'voice'
      },
      {
        label: 'Moderasi & Keamanan',
        description: 'Panduan staff untuk sistem warn, mute & clear chat',
        value: 'mod'
      },
      {
        label: 'Daftar Semua Perintah',
        description: 'Rangkuman lengkap seluruh slash command',
        value: 'all_cmds'
      }
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return { embeds: [embed], components: [row] };
}

module.exports = {
  buildHelpEmbed,
  createHelpGuidePanelPayload,
  OWNER
};
