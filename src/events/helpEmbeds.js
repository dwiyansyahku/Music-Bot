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
          name: `PUSAT PANDUAN & DIREKTORI FITUR — ${guildName.toUpperCase()}`,
          iconURL: guild?.iconURL({ dynamic: true }) || client?.user?.displayAvatarURL()
        })
        .setTitle('Direktori Panduan Penggunaan Bot')
        .setDescription(
          `Selamat datang di **Pusat Panduan & Direktori Fitur** server **${guildName}**!\n` +
          `Semua fitur bot dirancang untuk mempermudah, meramaikan, dan mempererat interaksi seluruh member di komunitas kita.\n\n` +
          `**Pilih salah satu fitur pada menu pilihan di bawah** untuk melihat penjelasan lengkap, fungsi, dan cara menggunakannya step-by-step:`
        )
        .addFields(
          { name: '🎵 Pemutar Musik & Audio', value: 'Putar lagu dari YouTube/Spotify, lirik berjalan, & filter audio.', inline: true },
          { name: '🎮 Music Quiz (Tebak Lagu)', value: 'Game kuis audio 10 detik, leaderboard, & variasi genre.', inline: true },
          { name: '🪪 Member Profile Card', value: 'Kartu profil server, foto banner/GIF, bio, & voice companions.', inline: true },
          { name: '🗺️ Peta Persebaran Wilayah', value: 'Lihat persebaran domisili member & cari teman satu daerah.', inline: true },
          { name: '🎰 Gacha & Koleksi Kartu', value: 'Daily gacha gratis, koleksi kartu rarity Common s/d Mythic.', inline: true },
          { name: '⏳ Kapsul Waktu (Time Capsule)', value: 'Kirim pesan rahasia yang baru terbuka otomatis di masa depan.', inline: true },
          { name: '🎂 Ulang Tahun & Sapaan', value: 'Pengumuman ultah jam 00:00 WIB, sapaan pagi/malam, & event.', inline: true },
          { name: '🎙️ Voice Tracking & Badges', value: 'Catatan durasi aktif voice channel & lencana pencapaian.', inline: true },
          { name: '🛡️ Moderasi & Keamanan', value: 'Sistem peringatan, mute otomatis, dan pembersihan chat.', inline: true }
        )
        .setFooter({ text: 'Pilih kategori pada menu dropdown di bawah untuk membaca panduan' })
        .setTimestamp();

    case 'music':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'PANDUAN FITUR • PEMUTAR MUSIK & AUDIO' })
        .setTitle('🎵 Pemutar Musik & Radio 24/7')
        .setDescription(
          '**Fungsi Utama:**\n' +
          'Memutar musik berkecepatan tinggi dengan audio jernih dari **YouTube**, **Spotify**, dan **SoundCloud** langsung di dalam Voice Channel.\n\n' +
          '📝 **Cara Menggunakannya (Langkah demi Langkah):**\n' +
          '1. Masuklah ke salah satu **Voice Channel** server terlebih dahulu.\n' +
          '2. Ketik perintah pemutaran di text channel:\n' +
          '   • **`qp [judul lagu/link]`** *(Cara Cepat)*\n' +
          '   • **`/play [judul lagu/link]`** *(Slash Command)*\n' +
          '3. Bot akan otomatis bergabung ke voice channel kamu dan mulai memutar lagu.\n' +
          '4. Gunakan **tombol interaktif** di bawah kartu player untuk Jeda (⏸️), Lanjut (▶️), Lewati (⏭️), Lirik (📜), atau Antrian (📋).\n\n' +
          '⚡ **Fitur & Perintah Bermanfaat:**\n' +
          '• `/search [query]` — Cari lagu dan pilih dari menu dropdown 5 hasil teratas.\n' +
          '• `/lyrics` atau `!lyrics` — Menampilkan lirik lagu yang sedang diputar secara langsung.\n' +
          '• `/filter [bassboost/nightcore/8d/vaporwave]` — Tambahkan efek suara seru.\n' +
          '• `/autoplay` — Otomatis memutar lagu rekomendasi serupa saat antrian habis.\n' +
          '• `/q247` — Mode 24/7 agar bot tetap standby di Voice Channel.'
        )
        .setFooter({ text: 'Gunakan tombol kontrol musik untuk kendali tanpa mengetik command' });

    case 'quiz':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'PANDUAN FITUR • GAME MUSIC QUIZ' })
        .setTitle('🎮 Music Quiz Interaktif (Tebak Lagu)')
        .setDescription(
          '**Fungsi Utama:**\n' +
          'Game kuis seru di mana bot akan memutar **potongan musik selama 10 detik** di Voice Channel, dan seluruh member berlomba menebak judul lagunya secepat mungkin.\n\n' +
          '📝 **Cara Menggunakannya (Langkah demi Langkah):**\n' +
          '1. Masuk ke **Voice Channel** bersama teman-temanmu.\n' +
          '2. Ketik perintah **`/musicquiz start`** di text channel.\n' +
          '   *(Kamu bisa memilih genre: Indo Hits, Western Pop, Anime OST, K-Pop, atau Campuran, serta jumlah ronde 1-15)*.\n' +
          '3. Bot akan memutar potongan musik selama 10 detik.\n' +
          '4. Klik tombol **A, B, C, atau D** pada text channel sebelum waktu 20 detik habis!\n' +
          '5. Semakin cepat kamu menjawab dengan benar, semakin banyak poin yang didapatkan.\n' +
          '6. Di akhir ronde, bot akan mengumumkan Juara dan menyimpannya di Leaderboard!\n\n' +
          '⚡ **Perintah Terkait:**\n' +
          '• `/musicquiz start` — Memulai sesi kuis baru.\n' +
          '• `/musicquiz leaderboard` — Melihat klasemen juara tebak lagu server.\n' +
          '• `/musicquiz stop` — Menghentikan sesi kuis yang sedang berjalan.'
        )
        .setFooter({ text: 'Jawaban benar dihitung berdasarkan kecepatan klik tombol' });

    case 'card':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'PANDUAN FITUR • MEMBER PROFILE CARD' })
        .setTitle('🪪 Member Profile Card')
        .setDescription(
          '**Fungsi Utama:**\n' +
          'Kartu identitas resmi member server yang merangkum biodata, asal daerah, tanggal lahir, zodiak, tautan sosial media, gambar banner/GIF, serta statistik teman ngobrol terdekat di voice channel.\n\n' +
          '📝 **Cara Membuat & Mengedit Kartu Profil:**\n' +
          '1. Buka channel pembuatan kartu (biasanya di <#1532222435250929735>).\n' +
          '2. Klik tombol **`[ 🪪 Buat/Edit Kartu ]`** pada panel.\n' +
          '3. Isi formulir pop-up yang muncul:\n' +
          '   • **Bio Singkat:** Deskripsi atau kata mutiara tentang dirimu.\n' +
          '   • **Asal Daerah:** Tulis nama kota/kabupatenmu (contoh: *Bandung*, *Surabaya*, *Jakarta Selatan*).\n' +
          '   • **Tanggal Lahir:** Format tanggal lahirmu (contoh: *15-08-2000* atau *15 Agustus*).\n' +
          '   • **Banner Image URL:** *(Opsional)* Tautan gambar/GIF untuk banner kartumu.\n' +
          '4. Klik **Submit**. Kartu profilmu akan otomatis dipublikasikan ke channel galeri kartu!\n' +
          '5. Klik tombol **`[ Lihat Kartu Profil ↗ ]`** untuk langsung melompat ke kartumu.\n\n' +
          '💡 **Tips Memasang Banner (Gambar / GIF):**\n' +
          'Kirim gambar/GIF ke salah satu chat Discord ➔ Klik kanan (PC) atau tahan gambar (HP) ➔ Pilih **`Copy Image/Media Link`** ➔ Tempelkan di kolom Banner URL saat edit kartu.'
        )
        .setFooter({ text: 'Data Top Voice Companions di kartu otomatis diperbarui setiap kali kamu aktif di Voice' });

    case 'membermap':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'PANDUAN FITUR • PETA PERSEBARAN WILAYAH' })
        .setTitle('🗺️ Peta Persebaran Wilayah Member')
        .setDescription(
          '**Fungsi Utama:**\n' +
          'Melihat peta persebaran asal domisili teman-teman di server, mengetahui provinsi/kota dengan komunitas terbanyak, dan mencari teman satu daerah.\n\n' +
          '📝 **Cara Menggunakannya:**\n' +
          '1. Pastikan kamu sudah mengisi **Asal Daerah** pada kartu profilmu.\n' +
          '2. Ketik **`/membermap view`** atau klik tombol **`[ Buka Peta Wilayah ↗ ]`** pada panel peta server.\n' +
          '3. Bot akan menampilkan daftar kota & provinsi yang sudah diurutkan dari yang paling banyak membernya.\n' +
          '4. Gunakan tombol **◀ Prev / Next ▶** untuk berpindah halaman.\n' +
          '5. **Ingin tahu siapa saja yang tinggal di kota tertentu?**\n' +
          '   Pilih nama kota pada menu dropdown di bawah peta untuk membuka pop-up daftar nama member beserta bio dan link kartu profil mereka!\n\n' +
          '⚡ **Privasi & Real-Time:**\n' +
          'Sesi navigasi peta bersifat **privat (ephemeral)**, sehingga kamu bisa membuka halaman mana pun tanpa mengganggu tampilan member lain.'
        )
        .setFooter({ text: 'Data daerah otomatis tersinkronisasi secara real-time dari profil member' });

    case 'gacha':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'PANDUAN FITUR • SISTEM GACHA & KOLEKSI' })
        .setTitle('🎰 Sistem Gacha & Koleksi Kartu')
        .setDescription(
          '**Fungsi Utama:**\n' +
          'Fitur hiburan gacha kartu koleksi dengan tingkat kelangkaan mulai dari **Common**, **Rare**, **Epic**, **Legendary**, hingga **Mythic**.\n\n' +
          '📝 **Cara Menggunakannya:**\n' +
          '1. Ketik **`/gacha daily`** setiap hari untuk mengklaim tiket gacha dan koin harian gratis.\n' +
          '2. Ketik **`/gacha pull`** untuk melakukan tarikan gacha dan mendapatkan kartu baru.\n' +
          '3. Cek seluruh koleksi kartumu dengan mengetik **`/gacha inventory`**.\n' +
          '4. Lihat galeri kelengkapan album kartu server dengan **`/gacha album`**.\n\n' +
          '💎 **Tingkat Kelangkaan (Rarity):**\n' +
          '• ⚪ **Common** (Biasa)\n' +
          '• 🔵 **Rare** (Langka)\n' +
          '• 🟣 **Epic** (Sangat Langka)\n' +
          '• 🟡 **Legendary** (Istimewa)\n' +
          '• 🔴 **Mythic** (Paling Langka & Bernilai Tinggi)'
        )
        .setFooter({ text: 'Klaim hadiah gratis setiap 24 jam dengan /gacha daily' });

    case 'timecapsule':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'PANDUAN FITUR • KAPSUL WAKTU (TIME CAPSULE)' })
        .setTitle('⏳ Kapsul Waktu (Time Capsule)')
        .setDescription(
          '**Fungsi Utama:**\n' +
          'Menyimpan surat, pesan rahasia, impian, atau kenangan untuk dirimu sendiri atau seluruh server yang **terkunci rapat dan baru akan terbuka otomatis pada tanggal di masa depan**.\n\n' +
          '📝 **Cara Menggunakannya:**\n' +
          '1. Ketik **`/timecapsule create`** di text channel.\n' +
          '2. Tulis isi pesan kapsul waktumu.\n' +
          '3. Tentukan kapan kapsul tersebut boleh dibuka (contoh: *31-12-2026*, *Tahun Baru*, atau *1 bulan lagi*).\n' +
          '4. Pilih target kapsul: **Pribadi (DM)** atau **Publik (Channel Server)**.\n' +
          '5. Bot akan mengunci kapsul tersebut. Saat waktu yang ditentukan tiba, bot akan otomatis mengirimkan notifikasi dan membuka isi pesannya!\n\n' +
          '⚡ **Perintah Terkait:**\n' +
          '• `/timecapsule list` — Melihat daftar kapsul waktu aktif milikmu.'
        )
        .setFooter({ text: 'Kapsul waktu yang terkunci tidak dapat dibaca oleh siapa pun sebelum tanggal bukanya' });

    case 'daily':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'PANDUAN FITUR • ULANG TAHUN & JADWAL HARIAN' })
        .setTitle('🎂 Ulang Tahun & Pengingat Harian')
        .setDescription(
          '**Fungsi Utama:**\n' +
          'Sistem otomatisasi server yang merayakan ulang tahun member secara otomatis tepat pukul 00:00 WIB, sapaan pagi/malam hari, dan pengumuman event.\n\n' +
          '📝 **Cara Mengikuti Perayaan Ulang Tahun:**\n' +
          '1. Cukup isi tanggal lahirmu di Member Card melalui <#1532222435250929735>.\n' +
          '2. Saat hari ulang tahunmu tiba (jam 00:00 WIB), bot akan otomatis mengirimkan kartu ucapan perayaan spesial di channel ulang tahun!\n' +
          '3. Member lain bisa mengucapkan selamat dan merayakannya bersama.\n\n' +
          '⚡ **Perintah Terkait:**\n' +
          '• `/birthday upcoming` — Melihat siapa saja member yang berulang tahun dalam waktu dekat.\n' +
          '• `/birthday check [user]` — Mengecek tanggal lahir & zodiak member tertentu.\n' +
          '• `/event list` — Melihat jadwal kegiatan/event server mendatang.'
        )
        .setFooter({ text: 'Ulang tahun dihitung 100% dari tanggal lahir asli di Member Card' });

    case 'voice':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'PANDUAN FITUR • VOICE TRACKING & ACHIEVEMENTS' })
        .setTitle('🎙️ Voice Tracker & Lencana Pencapaian')
        .setDescription(
          '**Fungsi Utama:**\n' +
          'Mencatat durasi keaktifan ngobrol di Voice Channel, mendeteksi siapa teman ngobrol terdekatmu (**Top Voice Companions**), dan membuka berbagai lencana pencapaian (Badges).\n\n' +
          '📝 **Cara Kerjanya:**\n' +
          '1. Cukup masuk dan nongkrong di Voice Channel mana saja seperti biasa.\n' +
          '2. Sistem bot akan mencatat jam aktifmu secara otomatis tanpa perlu mengetik apa pun.\n' +
          '3. Semakin sering kamu berada di voice bersama teman tertentu, namanya akan naik ke daftar **Top Voice Companions** di kartu profilmu.\n' +
          '4. Buka lencana khusus seperti *Night Owl*, *Talkaholic*, *DJ Master*, dan banyak lagi saat mencapai target jam aktif!\n\n' +
          '⚡ **Perintah Terkait:**\n' +
          '• `/achievements` — Melihat daftar lencana dan pencapaianmu.\n' +
          '• `/userinfo [user]` — Melihat profil statistik voice lengkap seseorang.'
        )
        .setFooter({ text: 'Tracking berjalan otomatis dan tidak membebani performa server' });

    case 'mod':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'PANDUAN FITUR • MODERASI & KEAMANAN' })
        .setTitle('🛡️ Sistem Moderasi Server')
        .setDescription(
          '**Fungsi Utama:**\n' +
          'Alat bantu pengelolaan server untuk Staff & Moderator dalam menjaga ketertiban komunitas.\n\n' +
          '⚡ **Daftar Perintah Moderasi:**\n' +
          '• `/warn [user] [alasan]` — Berikan peringatan resmi ke member (otomatis auto-punish jika melebihi batas).\n' +
          '• `/warnings [user]` — Cek riwayat peringatan yang pernah diterima seseorang.\n' +
          '• `/clear [jumlah] [target]` — Bersihkan pesan chat dalam jumlah banyak secara instan.\n' +
          '• `/mute [user] [durasi] [alasan]` — Berikan timeout / bisukan member sementara.\n' +
          '• `/unmute [user]` — Lepaskan status bisu/timeout member.\n' +
          '• `/kick [user] [alasan]` — Keluarkan member dari server.\n' +
          '• `/ban [user] [alasan]` — Blokir permanen member dari server.'
        )
        .setFooter({ text: 'Perintah moderasi hanya dapat dijalankan oleh Staff / Admin yang berwenang' });

    case 'all_cmds':
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'PANDUAN FITUR • DAFTAR SEMUA PERINTAH' })
        .setTitle('📖 Ringkasan Semua Slash Commands')
        .setDescription('Berikut adalah rangkuman cepat seluruh perintah slash command bot yang tersedia:')
        .addFields(
          {
            name: '🎵 Musik & Player',
            value: '`/play`, `/search`, `/nowplaying`, `/queue`, `/skip`, `/pause`, `/resume`, `/stop`, `/volume`, `/loop`, `/shuffle`, `/seek`, `/lyrics`, `/filter`, `/autoplay`, `/q247`',
            inline: false
          },
          {
            name: '🎮 Games & Hiburan',
            value: '`/musicquiz`, `/gacha`, `/poll`, `/afk`, `/roast`, `/fakequote`, `/wanted`, `/dice`, `/coinflip`, `/8ball`',
            inline: false
          },
          {
            name: '🪪 Komunitas & Profil',
            value: '`/card`, `/membermap`, `/birthday`, `/timecapsule`, `/event`, `/achievements`, `/userinfo`, `/serverinfo`',
            inline: false
          },
          {
            name: '🛡️ Moderasi & Staff',
            value: '`/warn`, `/warnings`, `/clearwarn`, `/mute`, `/unmute`, `/kick`, `/ban`, `/clear`, `/announce`, `/qmorning`, `/qnight`, `/backup`',
            inline: false
          }
        )
        .setFooter({ text: 'Ketik / untuk melihat daftar command interaktif Discord' });
  }
}

/**
 * Buat Payload Pesan Panel Publik Panduan & Direktori Bot
 */
function createHelpGuidePanelPayload(guild) {
  const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

  const embed = buildHelpEmbed('overview', null, guild);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_guide_select')
    .setPlaceholder('📂 Pilih fitur yang ingin kamu pelajari...')
    .addOptions(
      {
        label: '🏠 Ringkasan Direktori Utama',
        description: 'Tampilan pengantar dan gambaran umum bot',
        value: 'overview',
        emoji: '🏠'
      },
      {
        label: '🎵 Pemutar Musik & Audio',
        description: 'Cara putar lagu, prefix qp, lirik, filter, & radio',
        value: 'music',
        emoji: '🎵'
      },
      {
        label: '🎮 Music Quiz (Tebak Lagu)',
        description: 'Cara main game tebak lagu audio 10s & leaderboard',
        value: 'quiz',
        emoji: '🎮'
      },
      {
        label: '🪪 Member Profile Card',
        description: 'Cara buat kartu profil, pasang banner GIF, & bio',
        value: 'card',
        emoji: '🪪'
      },
      {
        label: '🗺️ Peta Persebaran Wilayah',
        description: 'Cara cek domisili kota & cari teman satu daerah',
        value: 'membermap',
        emoji: '🗺️'
      },
      {
        label: '🎰 Sistem Gacha & Koleksi',
        description: 'Daily pull gratis & kelangkaan kartu koleksi',
        value: 'gacha',
        emoji: '🎰'
      },
      {
        label: '⏳ Kapsul Waktu (Time Capsule)',
        description: 'Kirim surat rahasia untuk dibuka di masa depan',
        value: 'timecapsule',
        emoji: '⏳'
      },
      {
        label: '🎂 Ulang Tahun & Sapaan',
        description: 'Perayaan ultah jam 00:00 WIB, event, & sapaan harian',
        value: 'daily',
        emoji: '🎂'
      },
      {
        label: '🎙️ Voice Tracking & Badges',
        description: 'Jam voice otomatis, companions terdekat, & badges',
        value: 'voice',
        emoji: '🎙️'
      },
      {
        label: '🛡️ Moderasi & Keamanan',
        description: 'Panduan staff untuk warn, mute, & clear chat',
        value: 'mod',
        emoji: '🛡️'
      },
      {
        label: '📖 Daftar Semua Perintah',
        description: 'Rangkuman lengkap seluruh slash command',
        value: 'all_cmds',
        emoji: '📖'
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
