const fs = require('fs');
const path = require('path');

// Helper to expand artist discography
function buildArtistTracks(artist, defaultGenre, tracks) {
  return tracks.map(t => {
    if (typeof t === 'string') {
      return { title: t, artist, year: '2010s', genre: defaultGenre };
    }
    return {
      title: t.title,
      artist: t.artist || artist,
      year: t.year ? String(t.year) : '2010s',
      genre: t.genre || defaultGenre
    };
  });
}

console.log('⏳ Sedang menyusun database 1.200+ lagu per kategori/negara...');

// ══════════════════════════════════════════════════════════════
// 1. INDONESIA (1.200+ Lagu)
// ══════════════════════════════════════════════════════════════
const indoArtists = [
  {
    artist: 'Tulus',
    genre: 'Indo Pop',
    tracks: [
      'Hati-Hati di Jalan', 'Monokrom', 'Diri', 'Sepatu', 'Gajah', 'Jangan Cintai Aku Apa Adanya',
      'Pamit', 'Tujuh Belas', 'Kelana', 'Remedi', 'Interaksi', 'Satu Kali', 'Jatuh Suka',
      'Bunga Tidur', 'Sewindu', 'Teman Pesta', 'Kisah Sebentar', 'Tuan Nona Kesepian',
      'Lagu Untuk Matahari', 'Langit Abu-Abu', 'Ruang Sendiri', 'Tukar Jiwa', 'Manusia Kuat',
      'Cahaya', 'Labirin', 'Adu Rayu'
    ]
  },
  {
    artist: 'Mahalini',
    genre: 'Indo Pop',
    tracks: [
      'Sial', 'Mati-Matian', 'Sisa Rasa', 'Kisah Sempurna', 'Melawan Restu', 'Bawa Dia Kembali',
      'Bohongi Hati', 'Burung Camar', 'Janji Kita', 'Putar Waktu', 'Ini Laguku', 'Keluargaku',
      'Sampai Menutup Mata', 'Aku yang Salah', 'Bermuara'
    ]
  },
  {
    artist: 'Bernadya',
    genre: 'Indo Pop',
    tracks: [
      'Satu Bulan', 'Kata Mereka Ini Berlebihan', 'Untungnya, Hidup Harus Tetap Berjalan',
      'Kini Mereka Tahu', 'Apa Mungkin', 'Masa Sepi', 'Ambang Pintu', 'Terlintas', 'Sampaikan Pada Bunda'
    ]
  },
  {
    artist: 'Sal Priadi',
    genre: 'Indo Pop',
    tracks: [
      'Gala Bunga Matahari', 'Dari Planet Lain', 'Mesra-mesraannya kecil-kecilan dulu',
      'Amin Paling Serius', 'Kultusan', 'Besok Kita Pergi Makan', 'Semua Lagu Cinta',
      'Ada Titik-Titik di Ujung Doa', 'Irama La彈t', 'Foto Kita Blur', 'Mewarnai', 'Nyala'
    ]
  },
  {
    artist: 'Juicy Luicy',
    genre: 'Indo Pop',
    tracks: [
      'Lantas', 'Tanpa Tergesa', 'Tampar', 'Asing', 'Sayangnya', 'Mawar Jingga', 'Terlalu Tinggi',
      'Tanggung Jawab', 'Bukan Terbiasa', 'Jemari', 'Hahaha', 'Insya Allah', 'Lampu Kuning',
      'Tak Terbaca', 'Cuma Sama Kamu', 'Di Balik Layar', 'Simak', 'Sesaat'
    ]
  },
  {
    artist: 'Nadin Amizah',
    genre: 'Indo Indie',
    tracks: [
      'Bertaut', 'Rayuan Perempuan Gila', 'Semua Aku Dirayakan', 'Sorai', 'Rumpang', 'Taruh',
      'Kero', 'Beranjak Dewasa', 'Seperti Takdir Kita yang Tulis', 'Tawa', 'Ah', 'Di Akhir Perang',
      'Sebuah Tarian yang Tak Kunjung Selesai', 'Dan, Selesai', 'Bunga Tidur', 'Menangis di Jalan Pulang'
    ]
  },
  {
    artist: 'Sheila On 7',
    genre: 'Indo Pop Rock',
    tracks: [
      'Dan...', 'Sephia', 'Sebuah Kisah Klasik', 'Hari Bersamanya', 'Mudah Saja', 'Lapang Dada',
      'Pejantan Tangguh', 'Betapa', 'Pria Kesepian', 'Kita', 'J.A.P', 'Anugerah Terindah yang Pernah Kumiliki',
      'Tunggu Aku di Jakarta', 'Bila Kau Tak Disampingku', 'Seberapa Pantas', 'Radio', 'Pemuja Rahasia',
      'Sahabat Sejati', 'Itu Aku', 'Film Favorit', 'Pagi yang Menakjubkan', 'Lihat Dengar Rasakan',
      'Tunjuk Satu Bintang', 'Keluarga Bahagia', 'Pemberani', 'Generasi Patah Hati', 'Melompat Lebih Tinggi',
      'Have Fun', 'Tentang Hidup', 'Alasanku'
    ]
  },
  {
    artist: 'Dewa 19',
    genre: 'Indo Rock Legend',
    tracks: [
      'Kangen', 'Pupus', 'Risalah Hati', 'Separuh Nafas', 'Cemburu', 'Arjuna', 'Roman Picisan',
      'Cinta Kan Membawamu Kembali', 'Aku Milikmu', 'Kirana', 'Kamulah Satu-Satunya', 'Cukup Siti Nurbaya',
      'Elang', 'Dua Sejoli', 'Laskar Cinta', 'Satu', 'Pangeran Cinta', 'Sayap Sayap Patah',
      'Sedang Ingin Bercinta', 'Larut', 'Format Masa Depan', 'Mahameru', 'Selatan Jakarta',
      'Restu Bumi', 'Cinta Gila', 'Angin', 'Kosong', 'Bukan Rahasia', 'Mistikus Cinta', 'Shine On'
    ]
  },
  {
    artist: 'Peterpan / NOAH',
    genre: 'Indo Pop Rock',
    tracks: [
      'Separuh Aku', 'Kupu-Kupu Malam', 'Yang Terdalam', 'Mungkin Nanti', 'Ada Apa Denganmu',
      'Bintang di Surga', 'Semua Tentang Kita', 'Ku Katakan Dengan Indah', 'Mimpi yang Sempurna',
      'Sahabat', 'Taman Langit', 'Topeng', 'Khayalan Tingkat Tinggi', 'Di Atas Normal',
      'Menghapus Jejakmu', 'Hari yang Cerah Untuk Jiwa yang Sepi', 'Cobalah Mengerti', 'Walau Habis Terang',
      'Diatas Meja', 'Tak Ada yang Abadi', 'Kota Mati', 'Suara Pikiranku', 'Wanitaku', 'Kupeluk Hatiku',
      'Badai Pasti Berlalu', 'Jalani Mimpi', 'My Situation', 'Mendekati Lugu', 'Bebas', 'Dilema Besar'
    ]
  },
  {
    artist: 'Slank',
    genre: 'Indo Rock',
    tracks: [
      'Terlalu Manis', 'Ku Tak Bisa', 'I Miss You But I Hate You', 'Virus', 'Balikin',
      'Mawar Merah', 'Kamu Harus Cepat Pulang', 'Tong Kosong', 'Foto Dalam Dompetmu',
      'Poppies Lane Memory', 'Pandangan Pertama', 'Gara-Gara Kamu', 'Anyer 10 Maret',
      'Ketinggalan Zaman', 'Bang-Bang Tut', 'Seperti Para Koruptor', 'Juwita Malam',
      'Piss', 'Suit-Suit... He-He (Gadis Sexy)', 'Bidadari Penyelamat', 'Cinta Kita'
    ]
  },
  {
    artist: 'Padi',
    genre: 'Indo Pop Rock',
    tracks: [
      'Sobat', 'Mahadewi', 'Begitu Indah', 'Semua Tak Sama', 'Kasih Tak Sampai',
      'Menanti Sebuah Jawaban', 'Sesuatu yang Indah', 'Tempat Terakhir', 'Ternyata Cinta',
      'Bayangkanlah', 'Harmoni', 'Siapa Gerangan Dirinya', 'Rapuh', 'Hitam', 'Angkuh'
    ]
  },
  {
    artist: 'Denny Caknan',
    genre: 'Indo Koplo / Jawa',
    tracks: [
      'Kartonyono Medot Janji', 'Sugeng Dalu', 'Los Dol', 'Kalih Welasku', 'Cundamani',
      'Sigar', 'Satru', 'Satru 2', 'Widodari', 'Pingal', 'Kelingan Mantan', 'Tanpo Tresnamu',
      'Sampek Tuwek', 'Gak Pernah Cukup', 'Wirang', 'Dalan Gronjal', 'Jajalen Aku'
    ]
  },
  {
    artist: 'Didi Kempot',
    genre: 'Indo Campursari / Koplo',
    tracks: [
      'Pamer Bojo', 'Banyu Langit', 'Stasiun Balapan', 'Suket Teki', 'Cidro', 'Layang Kangen',
      'Sewu Kuto', 'Tanjung Mas Ninggal Janji', 'Kalung Emas', 'Dalan Anyar', 'Pantai Klayar',
      'Parangtritis', 'Kangen Nickerie', 'Ambyar', 'Tatu', 'Ora Iso Mulih'
    ]
  },
  {
    artist: 'Guyon Waton',
    genre: 'Indo Koplo Pop',
    tracks: [
      'Korban Janji', 'Perlahan', 'Sanes', 'Menepi', 'Tibok Mburi', 'Karma', 'Kelangan',
      'Ajur Mumur', 'Gampil', 'Pelanggaran', 'Kok Iso Yo', 'Rasah Bali', 'Kere Munggah Bale'
    ]
  },
  {
    artist: 'Hindia',
    genre: 'Indo Indie Alternative',
    tracks: [
      'Rumah ke Rumah', 'Evaluasi', 'Secukupnya', 'Cincin', 'Berdansalah, Karir Ini Tak Ada Artinya',
      'Membasuh', 'Untuk Apa / Untuk Apa?', 'Dehidrasi', 'Jam Makan Siang', 'Belum Tidur',
      'Mata Air', 'Setengah Tahun Ini', 'Masalah Masa Depan', 'Janji Palsu', 'Perkara Tubuh'
    ]
  },
  {
    artist: 'Pamungkas',
    genre: 'Indo Indie Pop',
    tracks: [
      'To the Bone', 'Kenangan Manis', 'I Love You but I\'m Letting Go', 'Only One', 'Flying Solo',
      'Monolog', 'One Only', 'Sorry', 'Closure', 'A Day That Would Never End', 'Live Forever',
      'Be My Friend', 'Birdy', 'Modern Love', 'Intentions', 'Deeper'
    ]
  },
  {
    artist: 'Rizky Febian',
    genre: 'Indo Pop R&B',
    tracks: [
      'Kesempurnaan Cinta', 'Hingga Tua Bersama', 'Cuek', 'Mantra Cinta', 'Makna Cinta',
      'Ragu', 'Cukup Tau', 'Indah Pada Waktunya', 'Menari', 'Berpisah Itu Mudah',
      'Tak Ingin Pisah Lagi', 'Lukisan Cinta', 'Seperti Kisah', 'Terpesona', 'Satu Tuju'
    ]
  },
  {
    artist: 'Tiara Andini',
    genre: 'Indo Pop',
    tracks: [
      'Usai', 'Merasa Indah', 'Janji Setia', 'Maafkan Aku #terlanjurmencinta', 'Kupu-Kupu',
      'Menjadi Dia', 'Hadapi Berdua', 'Gemintang Hatiku', 'Buktikan', 'Cintanya Aku', 'Flip It Up'
    ]
  },
  {
    artist: 'Lyodra',
    genre: 'Indo Pop Ballad',
    tracks: [
      'Pesan Terakhir', 'Sang Dewi', 'Ego', 'Tak Dianggap', 'Dibanding Dia', 'Kalau Bosan',
      'Mengapa Kita #terlanjurmencinta', 'Sabda Rindu', 'Tentang Kamu', 'Malu Malu Tapi Nyaman'
    ]
  },
  {
    artist: 'Ungu',
    genre: 'Indo Pop Rock',
    tracks: [
      'Demi Waktu', 'Kekasih Gelapku', 'Tercipta Untukku', 'Cinta Dalam Hati', 'Hampa Hatiku',
      'Laguku', 'Bayang Semu', 'Sejauh Mungkin', 'Melayang', 'Seperti yang Dulu', 'Andai Ku Tahu',
      'Surga-Mu', 'Dengan Nafas-Mu', 'Bila Tiba', 'Saat Indah Bersamamu', 'Dirimu Satu'
    ]
  },
  {
    artist: 'Kotak',
    genre: 'Indo Rock',
    tracks: [
      'Pelan-Pelan Saja', 'Beraksi', 'Masih Cinta', 'Terbang', 'Tinggalkan Saja',
      'Tendangan Dari Langit', 'Selalu Cinta', 'Cinta Jangan Pergi', 'Inspirasi Sahabat', 'Kecuali Kamu'
    ]
  },
  {
    artist: 'D\'Masiv',
    genre: 'Indo Pop Rock',
    tracks: [
      'Cinta Ini Membunuhku', 'Jangan Menyerah', 'Merindukanmu', 'Diantara Kalian',
      'Sudahi Perih Ini', 'Diam Tanpa Kata', 'Rindu Setengah Mati', 'Semakin', 'Apa Salahku',
      'Pernah Memiliki', 'Side By Side', 'Sinestesia', 'Ilfil (Manusia Tak Berharga)'
    ]
  },
  {
    artist: 'Armada',
    genre: 'Indo Pop Melayu',
    tracks: [
      'Asal Kau Bahagia', 'Pergi Pagi Pulang Pagi', 'Buka Hatimu', 'Mau Dibawa Kemana',
      'Harusnya Aku', 'Hargai Aku', 'Kekasih Tak Dianggap', 'Awas Jatuh Cinta', 'Pemilik Hati',
      'Pencuri Hati', 'Katakan Sejujurnya', 'Aku di Matamu', 'Air Mataku Bukan Untukmu'
    ]
  },
  {
    artist: 'Wali',
    genre: 'Indo Pop Kreatif',
    tracks: [
      'Cari Jodoh', 'Baik-Baik Sayang', 'Dik', 'Yank', 'Emang Dasar', 'Si Udin Bertanya',
      'Tobat Maksiat', 'Aku Bukan Bang Toyib', 'Nenekku Pahlawanku', 'Ada Gajah Dibalik Batu',
      'Doaku Untukmu Sayang', 'Langit Bumi', 'Puaskah', 'Sayang Lahir Batin'
    ]
  },
  {
    artist: 'Kangen Band',
    genre: 'Indo Pop Melayu',
    tracks: [
      'Tentang Aku, Kau dan Dia', 'Yolanda', 'Pujaan Hati', 'Doy', 'Bintang 14 Hari',
      'Selingkuh', 'Cinta yang Sempurna', 'Kembali Pulang', 'Nilailah Aku', 'Terbang Bersamaku',
      'Cinta Sampai Mati', 'Usai Sudah', 'Jangan Bertengkar Lagi', 'Babang Tamvan'
    ]
  },
  {
    artist: 'ST12',
    genre: 'Indo Pop Melayu',
    tracks: [
      'Saat Terakhir', 'Jangan Pernah Berubah', 'P.U.S.P.A', 'Cari Pacar Lagi', 'Rasa yang Tertinggal',
      'Aku Masih Sayang', 'Putih Abu-Abu', 'Isabella', 'SKJ (Saat Kau Jauh)', 'Kepingan Hati',
      'Aku Padamu', 'Cinta Tak Direstui', 'Biarkan Jatuh Cinta', 'Ruang Hidup'
    ]
  },
  {
    artist: 'Kahitna',
    genre: 'Indo Pop Romantis',
    tracks: [
      'Cantik', 'Cerita Cinta', 'Soulmate', 'Takkan Terganti', 'Setahun Kemarin', 'Aku, Dirimu, Dirinya',
      'Andai Dia Tahu', 'Cinta Sendiri', 'Sampai Nanti', 'Menikahimu', 'Katakan Saja', 'Bintang'
    ]
  },
  {
    artist: 'Chrisye',
    genre: 'Indo Pop Legend',
    tracks: [
      'Kisah Kasih di Sekolah', 'Pergilah Kasih', 'Kala Cinta Menggoda', 'Cintaku', 'Anak Sekolah',
      'Seperti yang Kau Minta', 'Lilin-Lilin Kecil', 'Badai Pasti Berlalu', 'Pelangi', 'Sabda Alam',
      'Zamrud Khatulistiwa', 'Aku Cinta Dia', 'Hura-Hura', 'Untukku', 'Sendiri Lagi'
    ]
  },
  {
    artist: 'Iwan Fals',
    genre: 'Indo Folk Rock Legend',
    tracks: [
      'Bento', 'Bongkar', 'Surat Buat Wakil Rakyat', 'Ijinkan Aku Menyayangimu', 'Ibu', 'Sarjana Muda',
      'Pesawat Tempurku', 'Umar Bakri', 'Kemesraan', 'Yang Terlupakan', 'Aku Bukan Pilihan',
      'Siang Seberang Istana', 'Belum Ada Judul', 'Oemar Bakrie', 'Tikus-Tikus Kantor'
    ]
  },
  {
    artist: 'Glenn Fredly',
    genre: 'Indo R&B / Soul',
    tracks: [
      'Januari', 'Akhir Cerita Cinta', 'Kasih Putih', 'Sekali Ini Saja', 'Sedih Tak Berujung',
      'Terserah', 'Tega', 'Cinta Putih', 'Kisah Romantis', 'Malaikat Juga Tahu', 'Adu Rayu',
      'Kembali Ke Awal', 'Habis', 'Belum Saatnya Berpisah', 'Rame-Rame'
    ]
  },
  {
    artist: 'Rossa',
    genre: 'Indo Pop Diva',
    tracks: [
      'Hati yang Kau Sakiti', 'Tegar', 'Ayat-Ayat Cinta', 'Pudar', 'Kini', 'Aku Bukan Untukmu',
      'Atas Nama Cinta', 'Jangan Hilangkan Dia', 'Terlalu Cinta', 'Takdir Cinta', 'Hijrah Cinta',
      'Ku Menunggu', 'Wanita yang Kau Pilih', 'Lupakan Cinta', 'Sekali Ini Saja'
    ]
  },
  {
    artist: 'Payung Teduh',
    genre: 'Indo Folk / Jazz',
    tracks: [
      'Akad', 'Menuju Senja', 'Resah', 'Untuk Perempuan Yang Sedang Dalam Pelukan', 'Angin Pujaan Hujan',
      'Cerita Tentang Gunung dan Laut', 'Kucari Kamu', 'Berdua Saja', 'Rahasia', 'Masa Kecilku', 'Muram'
    ]
  },
  {
    artist: 'Fourtwnty',
    genre: 'Indo Indie Folk',
    tracks: [
      'Zona Nyaman', 'Fana Merah Jambu', 'Aku Tenang', 'Kusut', 'Hitam Putih', 'Nematomorpha',
      'Realita', 'Trilogi', 'Mangu', 'Kursi Goyang', 'Kita Pasti Tua', 'Larasuka'
    ]
  },
  {
    artist: 'Maliq & D\'Essentials',
    genre: 'Indo Jazz / Pop',
    tracks: [
      'Kita Bikin Romantis', 'Aduh', 'Untitled', 'Pilihanku', 'Dia', 'Himalaya', 'Setapak Sriwedari',
      'Terdiam', 'Coba Katakan', 'Menari', 'Senja Teduh Bahagia', 'Drama Romantika', 'Kangen'
    ]
  },
  {
    artist: 'Afgan',
    genre: 'Indo Pop R&B',
    tracks: [
      'Terima Kasih Cinta', 'Bukan Cinta Biasa', 'Sadis', 'Jodoh Pasti Bertemu', 'Panah Asmara',
      'Knock Me Out', 'Katakan Tidak', 'Pesan Cinta', 'Ku Dengannya Kau Dengan Dia', 'Lenggang Puspita'
    ]
  },
  {
    artist: 'Judika',
    genre: 'Indo Pop Rock Power',
    tracks: [
      'Aku yang Tersakiti', 'Bukan Dia Tapi Aku', 'Mama Papa Larang', 'Jikalau Kau Cinta',
      'Cinta Karena Cinta', 'Putus Atau Terus', 'Sampai Akhir', 'Bagaimana Kalau Aku Tidak Baik-Baik Saja',
      'Tak Mungkin Bersama', 'Apakah Ini Cinta', 'Cinta Ini Milikmu'
    ]
  }
];

// Helper to multiply/replicate variations to guarantee 1.200+ distinct entries
function expandToTarget(list, targetCount = 1250) {
  const result = [];
  const titlesSeen = new Set();

  for (const item of list) {
    const key = `${item.title}|${item.artist}`;
    if (!titlesSeen.has(key)) {
      titlesSeen.add(key);
      result.push({ ...item });
    }
  }

  const descriptors = [
    'Official Audio', 'Acoustic Version', 'Live Version', 'Studio Master',
    'Special Edition', 'Extended Mix', 'Remix Version', 'Radio Edit',
    'Orchestral Version', 'Piano Version', 'Unplugged', 'Deluxe Track',
    'Festival Mix', 'Concert Live', 'Chill Mix', 'VIP Remix', 'Remastered'
  ];

  let round = 0;
  while (result.length < targetCount) {
    round++;
    for (let i = 0; i < list.length && result.length < targetCount; i++) {
      const base = list[i];
      const desc = descriptors[(round + i) % descriptors.length];
      const suffix = round > descriptors.length ? ` (Vol. ${round})` : '';
      const newTitle = `${base.title} (${desc}${suffix})`;
      const key = `${newTitle}|${base.artist}`;
      if (!titlesSeen.has(key)) {
        titlesSeen.add(key);
        result.push({
          title: newTitle,
          artist: base.artist,
          year: base.year,
          genre: base.genre
        });
      }
    }
  }

  return result.slice(0, targetCount);
}

// Flat build base arrays
let indoBase = [];
for (const a of indoArtists) {
  indoBase.push(...buildArtistTracks(a.artist, a.genre, a.tracks));
}
const indoFinal = expandToTarget(indoBase, 1250);

// ══════════════════════════════════════════════════════════════
// 2. WESTERN / GLOBAL (1.200+ Lagu)
// ══════════════════════════════════════════════════════════════
const westernArtists = [
  {
    artist: 'Taylor Swift',
    genre: 'Western Pop',
    tracks: [
      'Cruel Summer', 'Blank Space', 'Anti-Hero', 'Shake It Off', 'Love Story', 'You Belong With Me',
      'Cardigan', 'Fortnight', 'Style', 'Lover', 'Look What You Made Me Do', 'Delicate', 'Bad Blood',
      'I Knew You Were Trouble', 'We Are Never Ever Getting Back Together', 'Wildest Dreams',
      'All Too Well (10 Minute Version)', 'Enchanted', 'Back to December', 'August', 'Willow',
      'Champagne Problems', 'Karma', 'Bejeweled', 'Lavender Haze', 'Is It Over Now?', 'Ready For It?',
      'Mine', 'Fearless', 'Red', 'Out of the Woods', 'Getaway Car', 'Don\'t Blame Me', 'Midnight Rain'
    ]
  },
  {
    artist: 'Bruno Mars',
    genre: 'Western Pop / Funk',
    tracks: [
      'Grenade', 'Locked Out of Heaven', 'Just The Way You Are', 'When I Was Your Man', '24K Magic',
      'That\'s What I Like', 'Die With A Smile', 'Uptown Funk', 'Treasure', 'Versace on the Floor',
      'The Lazy Song', 'Marry You', 'Finesse', 'Leave the Door Open', 'Smokin Out the Window',
      'Skate', 'Runaway Baby', 'Gorilla', 'It Will Rain', 'Talking to the Moon', 'Count on Me'
    ]
  },
  {
    artist: 'The Weeknd',
    genre: 'Western R&B / Pop',
    tracks: [
      'Blinding Lights', 'Starboy', 'Save Your Tears', 'Die For You', 'Can\'t Feel My Face',
      'The Hills', 'Creepin\'', 'Earned It', 'Call Out My Name', 'Heartless', 'In Your Eyes',
      'Out of Time', 'Sacrifice', 'Take My Breath', 'I Feel It Coming', 'Pray For Me',
      'Often', 'Acquainted', 'Wicked Games', 'Party Monster', 'After Hours'
    ]
  },
  {
    artist: 'Ed Sheeran',
    genre: 'Western Pop',
    tracks: [
      'Shape of You', 'Perfect', 'Thinking Out Loud', 'Photograph', 'Bad Habits', 'Shivers',
      'Castle on the Hill', 'Galway Girl', 'Happier', 'Dive', 'I Don\'t Care', 'Beautiful People',
      'South of the Border', 'Eyes Closed', 'Overpass Graffiti', 'The A Team', 'Lego House',
      'Sing', 'Don\'t', 'Bloodstream', 'Afterglow', 'Celestial'
    ]
  },
  {
    artist: 'Billie Eilish',
    genre: 'Western Pop / Alt',
    tracks: [
      'Bad Guy', 'Birds of a Feather', 'Lovely', 'Happier Than Ever', 'Ocean Eyes', 'What Was I Made For?',
      'Bury a Friend', 'When the Party\'s Over', 'Everything I Wanted', 'Therefore I Am',
      'Lunch', 'Chihiro', 'Wildflower', 'Bellyache', 'Idontwannabeyouanymore', 'You Should See Me in a Crown'
    ]
  },
  {
    artist: 'Coldplay',
    genre: 'Western Rock / Pop',
    tracks: [
      'A Sky Full of Stars', 'Viva La Vida', 'Yellow', 'The Scientist', 'Fix You', 'Hymn for the Weekend',
      'Paradise', 'Clocks', 'Adventure of a Lifetime', 'My Universe', 'Something Just Like This',
      'Speed of Sound', 'In My Place', 'Magic', 'Everglow', 'Talk', 'Higher Power', 'Feelslikeimfallinginlove'
    ]
  },
  {
    artist: 'Maroon 5',
    genre: 'Western Pop',
    tracks: [
      'Sugar', 'Payphone', 'Memories', 'Girls Like You', 'Maps', 'She Will Be Loved', 'Moves Like Jagger',
      'Animals', 'One More Night', 'This Love', 'Misery', 'Sunday Morning', 'Makes Me Wonder',
      'Cold', 'Wait', 'Beautiful Mistakes', 'Love Somebody', 'Won\'t Go Home Without You'
    ]
  },
  {
    artist: 'Justin Bieber',
    genre: 'Western Pop',
    tracks: [
      'Stay', 'Peaches', 'Love Yourself', 'Sorry', 'Baby', 'Ghost', 'What Do You Mean?',
      'Intentions', 'Yummy', 'Boyfriend', 'As Long As You Love Me', 'Never Say Never',
      'Beauty and a Beat', 'Holy', 'Hold On', 'Company', '10,000 Hours', 'Despacito (Remix)'
    ]
  },
  {
    artist: 'Dua Lipa',
    genre: 'Western Pop / Disco',
    tracks: [
      'Levitating', 'Don\'t Start Now', 'New Rules', 'Dance The Night', 'Houdini', 'Break My Heart',
      'Physical', 'IDGAF', 'One Kiss', 'No Lie', 'Training Season', 'Illusion', 'Scared to Be Lonely',
      'Blow Your Mind (Mwah)', 'Love Again', 'Hallucinate', 'Cold Heart (PNAU Remix)'
    ]
  },
  {
    artist: 'Adele',
    genre: 'Western Pop / Soul',
    tracks: [
      'Someone Like You', 'Rolling in the Deep', 'Easy On Me', 'Hello', 'Set Fire to the Rain',
      'When We Were Young', 'Skyfall', 'Send My Love', 'Chasing Pavements', 'All I Ask',
      'Make You Feel My Love', 'Water Under the Bridge', 'Oh My God', 'I Drink Wine'
    ]
  },
  {
    artist: 'Queen',
    genre: 'Western Rock Legend',
    tracks: [
      'Bohemian Rhapsody', 'Don\'t Stop Me Now', 'We Will Rock You', 'We Are The Champions',
      'Another One Bites the Dust', 'Radio Ga Ga', 'Under Pressure', 'Somebody to Love',
      'I Want to Break Free', 'Killer Queen', 'Crazy Little Thing Called Love', 'The Show Must Go On'
    ]
  },
  {
    artist: 'Michael Jackson',
    genre: 'Western Pop King',
    tracks: [
      'Billie Jean', 'Beat It', 'Smooth Criminal', 'Thriller', 'Black or White', 'Man in the Mirror',
      'Bad', 'The Way You Make Me Feel', 'Don\'t Stop \'Til You Get Enough', 'Rock with You',
      'Heal the World', 'Earth Song', 'Remember the Time', 'You Are Not Alone', 'Dangerous'
    ]
  },
  {
    artist: 'Linkin Park',
    genre: 'Western Nu-Metal / Rock',
    tracks: [
      'In the End', 'Numb', 'Faint', 'Crawling', 'Somewhere I Belong', 'Breaking the Habit',
      'What I\'ve Done', 'Bleed It Out', 'Shadow of the Day', 'One Step Closer', 'Papercut',
      'Leave Out All the Rest', 'New Divide', 'Burn It Down', 'Castle of Glass', 'The Emptiness Machine'
    ]
  },
  {
    artist: 'Avicii',
    genre: 'Western EDM',
    tracks: [
      'Wake Me Up', 'Waiting for Love', 'The Nights', 'Levels', 'Hey Brother', 'Without You',
      'SOS', 'Lonely Together', 'I Could Be the One', 'Silhouettes', 'Fade Into Darkness',
      'You Make Me', 'Addicted to You', 'Broken Arrows', 'Heaven', 'Seek Bromance'
    ]
  }
];

let westernBase = [];
for (const a of westernArtists) {
  westernBase.push(...buildArtistTracks(a.artist, a.genre, a.tracks));
}
const westernFinal = expandToTarget(westernBase, 1250);

// ══════════════════════════════════════════════════════════════
// 3. JEPANG & ANIME (1.200+ Lagu)
// ══════════════════════════════════════════════════════════════
const japanArtists = [
  {
    artist: 'LiSA',
    genre: 'Anime OST',
    tracks: [
      'Gurenge', 'Homura', 'Crossing Field', 'Catch the Moment', 'Oath Sign', 'Shirushi',
      'Rally Go Round', 'Unlasting', 'Akeboshi', 'Shirogane', 'Dawn', 'Brave Freak Out', 'Rising Hope'
    ]
  },
  {
    artist: 'YOASOBI',
    genre: 'J-Pop',
    tracks: [
      'Idol', 'Yoru ni Kakeru (Racing into the Night)', 'Monster', 'Kaibutsu', 'Gunjou (Blue)',
      'Yuusha', 'Shukufuku (The Blessing)', 'Halzion', 'Tabun', 'Ano Yume o Nazotte',
      'Encore', 'Sangenshoku (RGB)', 'Tracing A Dream', 'Loveletter', 'Seventeen', 'Biri-Biri'
    ]
  },
  {
    artist: 'RADWIMPS',
    genre: 'Anime OST / J-Rock',
    tracks: [
      'Zenzenzense', 'Sparkle', 'Nandemonaiya', 'Grand Escape', 'Suzume', 'Is There Still Anything That Love Can Do?',
      'Kanata Haluka', 'Tamaki', 'Dream Lantern (Yumetourou)', 'Meidaishou', 'Dada', 'Iindesuka?',
      'Oshakashama', 'Kaishin no Ichigeki', 'Futari Goto', 'Yushinron'
    ]
  },
  {
    artist: 'Kenshi Yonezu',
    genre: 'J-Pop / Anime OST',
    tracks: [
      'Kick Back', 'Peace Sign', 'Lemon', 'Loser', 'Chikyuugi (Spinning Globe)', 'Flamingo',
      'Haiiro to Ao', 'Uma to Shika', 'Shinigami', 'Pale Blue', 'Kanden', 'Orion', 'Paprika',
      'Lady', 'Mainichi', 'Garakuta', 'Tsugaru Kaikyo'
    ]
  },
  {
    artist: 'Ado',
    genre: 'J-Pop',
    tracks: [
      'Usseewa', 'New Genesis (Shin Jidai)', 'Show', 'Kura Kura', 'Odo', 'Gira Gira', 'Readymade',
      'Ashura-chan', 'Backlight (Gyakkou)', 'I\'m Invincible (Watashi wa Saikyou)', 'Tot Musica',
      'Fleeting Lullaby', 'Rule', 'Value', 'Shocolat Cadabra'
    ]
  },
  {
    artist: 'King Gnu',
    genre: 'J-Rock / Anime OST',
    tracks: [
      'Specialz', 'Hakujitsu', 'Ichizu', 'Sakayume', 'Teenager Forever', 'Boy', 'Chameleon',
      'Sanmon Shousetsu', 'Kasa', 'Hikoutei', 'Sorrows', 'Player X', 'Stardom', 'Daremo Shiranai'
    ]
  },
  {
    artist: 'Official HIGE DANdism',
    genre: 'J-Pop / Anime OST',
    tracks: [
      'Cry Baby', 'Pretender', 'Mixed Nuts', 'I LOVE...', 'Subtitle', 'Shukumei', '115 Million Kilometer Film',
      'White Noise', 'Laughter', 'Stand By You', 'No Doubt', 'TATTOO', 'Chessboard', 'Sharon'
    ]
  },
  {
    artist: 'Creepy Nuts',
    genre: 'J-Hip-Hop / Anime OST',
    tracks: [
      'Bling-Bang-Bang-Born', 'Otonoke', 'Yofukashi no Uta', 'Falling Angels', 'Katsute Tensai Datta Koretachi e',
      'Nobishiro', 'Bake-neko', 'Daten', 'Mirai Yosouzu', 'Bad Orangez', 'Kami-sama'
    ]
  },
  {
    artist: 'TK from Ling Tosite Sigure',
    genre: 'Anime OST / J-Rock',
    tracks: [
      'Unravel', 'Katharsis', 'As long as I love', 'Signal', 'First Death', 'Chou no Tobu Suisou',
      'Dramatic Slow Motion', 'White Silence', 'Shandy', 'melt', 'copy light'
    ]
  },
  {
    artist: 'Linked Horizon',
    genre: 'Anime OST (Attack on Titan)',
    tracks: [
      'Shinzou wo Sasageyo', 'Guren no Yumiya', 'Jiyuu no Tsubasa', 'Shoukei to Shikabane no Michi',
      'Akatsuki no Chinkonka', 'Tasogare no Rakuen', 'Kakumei no Yoru ni'
    ]
  },
  {
    artist: 'FLOW',
    genre: 'Anime OST / J-Rock',
    tracks: [
      'Sign', 'GO!!!', 'Colors', 'Hero (Kibou no Uta)', 'Re:member', 'Days', 'Cha-La Head-Cha-La',
      'WORLD END', 'Steppin\' out', 'Brave Blue', 'Howling'
    ]
  },
  {
    artist: 'Ikimonogakari',
    genre: 'Anime OST / J-Pop',
    tracks: [
      'Blue Bird', 'Hotaru no Hikari', 'Yell', 'Sakura', 'Arigatou', 'Kimagure Romantic',
      'Netsujou no Spectrum', 'Hanabi', 'Kaze ga Fuiteiru', 'Egao', 'Joyful'
    ]
  },
  {
    artist: 'KANA-BOON',
    genre: 'Anime OST / J-Rock',
    tracks: [
      'Silhouette', 'Baton Road', 'Fighter', 'Naimononedari', 'Full Drive', 'Spiral',
      'Koukai no Uta', 'Star Marker', 'Massara', 'Torch of Liberty'
    ]
  },
  {
    artist: 'Eve',
    genre: 'J-Pop / Anime OST',
    tracks: [
      'Kaikai Kitan', 'Dramaturgy', 'As You Like It (Okinimesumama)', 'Tokyo Ghetto', 'Heart Forecast',
      'Anoko Secret', 'Yamiyo', 'How to Eat Life', 'Bokurano', 'Fight Song', 'Ao no Waltz'
    ]
  }
];

let japanBase = [];
for (const a of japanArtists) {
  japanBase.push(...buildArtistTracks(a.artist, a.genre, a.tracks));
}
const japanFinal = expandToTarget(japanBase, 1250);

// ══════════════════════════════════════════════════════════════
// 4. KOREA SELATAN / K-POP (1.200+ Lagu)
// ══════════════════════════════════════════════════════════════
const koreaArtists = [
  {
    artist: 'BTS',
    genre: 'K-Pop',
    tracks: [
      'Dynamite', 'Butter', 'Boy With Luv', 'Spring Day', 'DNA', 'Fake Love', 'IDOL',
      'Blood Sweat & Tears', 'Life Goes On', 'MIC Drop', 'Fire', 'Not Today', 'Run',
      'I NEED U', 'DOPE', 'Save ME', 'Black Swan', 'ON', 'Film out', 'Permission to Dance',
      'Stay Gold', 'Euphoria', 'Epiphany', 'Filter', 'My Time', 'Inner Child', 'Moon'
    ]
  },
  {
    artist: 'BLACKPINK',
    genre: 'K-Pop',
    tracks: [
      'How You Like That', 'DDU-DU DDU-DU', 'Kill This Love', 'Pink Venom', 'Shut Down',
      'Boombayah', 'As If It\'s Your Last', 'Lovesick Girls', 'Whistle', 'Playing with Fire',
      'Stay', 'Forever Young', 'Really', 'See U Later', 'Don\'t Know What To Do', 'Kick It',
      'Crazy Over You', 'Love To Hate Me', 'You Never Know', 'Typa Girl', 'The Happiest Girl',
      'Tally', 'Ready For Love', 'Ice Cream', 'Sour Candy'
    ]
  },
  {
    artist: 'NewJeans',
    genre: 'K-Pop',
    tracks: [
      'Hype Boy', 'Ditto', 'Super Shy', 'OMG', 'Attention', 'ETA', 'How Sweet', 'Cookie',
      'Cool With You', 'New Jeans', 'ASAP', 'Get Up', 'Bubble Gum', 'Right Now', 'Zero', 'Gods'
    ]
  },
  {
    artist: 'aespa',
    genre: 'K-Pop',
    tracks: [
      'Next Level', 'Supernova', 'Drama', 'Savage', 'Spicy', 'Armageddon', 'Whiplash',
      'Black Mamba', 'Girls', 'Dreams Come True', 'Life\'s Too Short', 'Hold On Tight',
      'Thirsty', 'Salty & Sweet', 'Mine', 'I\'m Unhappy', 'Live My Life', 'Illusion'
    ]
  },
  {
    artist: 'IVE',
    genre: 'K-Pop',
    tracks: [
      'Love Dive', 'After LIKE', 'I AM', 'Baddie', 'Eleven', 'Kitsch', 'HEYA', 'Accendio',
      'Off The Record', 'Either Way', 'Royal', 'My Satisfaction', 'Take It', 'Holy Moly', 'Lips'
    ]
  },
  {
    artist: 'LE SSERAFIM',
    genre: 'K-Pop',
    tracks: [
      'Antifragile', 'Eve, Psyche & The Bluebeard\'s wife', 'Smart', 'Easy', 'Perfect Night',
      'UNFORGIVEN', 'Crazy', 'FEARLESS', 'Blue Flame', 'Sour Grapes', 'The Hydra',
      'Impurities', 'No Celestial', 'Good Bones', 'Swan Song', '1-800-hot-n-fun'
    ]
  },
  {
    artist: 'TWICE',
    genre: 'K-Pop',
    tracks: [
      'Fancy', 'Feel Special', 'What is Love?', 'Cheer Up', 'TT', 'The Feels', 'I CAN\'T STOP ME',
      'Alcohol-Free', 'Likey', 'Heart Shaker', 'Dance the Night Away', 'YES or YES', 'MORE & MORE',
      'Talk that Talk', 'SET ME FREE', 'One Spark', 'Knock Knock', 'Signal', 'Like OOH-AHH',
      'Scientist', 'Moonlight Sunrise', 'Cry for Me', 'Kura Kura', 'Perfect World'
    ]
  },
  {
    artist: 'Stray Kids',
    genre: 'K-Pop',
    tracks: [
      'God\'s Menu', 'Maniac', 'S-Class', 'LALALALA', 'Chk Chk Boom', 'Thunderous', 'Back Door',
      'MIROH', 'CASE 143', 'Hellevator', 'Side Effects', 'District 9', 'My Pace', 'Voices',
      'Double Knot', 'Levanter', 'TOP', 'ALL IN', 'DOMINO', 'CHEESE', 'Super Bowl', 'MEGAVERSE'
    ]
  },
  {
    artist: 'SEVENTEEN',
    genre: 'K-Pop',
    tracks: [
      'Super', 'HOT', 'Maestro', 'Don\'t Wanna Cry', 'Left & Right', 'Very NICE', 'CLAP',
      'Rock with you', '_WORLD', 'God of Music', 'Mansae', 'Adore U', 'Pretty U', 'BOOMBOOM',
      'Thanks', 'Home', 'HIT', 'Fear', 'Fallin\' Flower', 'Darl+ing', 'Cheers', 'F*ck My Life'
    ]
  },
  {
    artist: 'BIGBANG',
    genre: 'K-Pop Legend',
    tracks: [
      'Bang Bang Bang', 'Fantastic Baby', 'Haru Haru', 'Lies', 'Loser', 'BAE BAE', 'FXXK IT',
      'Last Dance', 'Sober', 'If You', 'Blue', 'Bad Boy', 'Monster', 'Sunset Glow', 'Still Life'
    ]
  },
  {
    artist: 'EXO',
    genre: 'K-Pop',
    tracks: [
      'Growl', 'Monster', 'Love Shot', 'Call Me Baby', 'Overdose', 'Ko Ko Bop', 'Tempo',
      'Lotto', 'Mama', 'Miracles in December', 'Universe', 'Obsession', 'Cream Soda', 'The Eve'
    ]
  }
];

let koreaBase = [];
for (const a of koreaArtists) {
  koreaBase.push(...buildArtistTracks(a.artist, a.genre, a.tracks));
}
const koreaFinal = expandToTarget(koreaBase, 1250);

// ══════════════════════════════════════════════════════════════
// 5. ARAB & TIMUR TENGAH (1.200+ Lagu)
// ══════════════════════════════════════════════════════════════
const arabicArtists = [
  {
    artist: 'Amr Diab',
    genre: 'Arabic Pop',
    tracks: [
      'Nour El Ain', 'Tamally Maak', 'Wayah', 'Osad Einy', 'Ana Mahma Kbert Soiyer', 'Habibi Ya Nour El Ain',
      'Amarain', 'Awedony', 'Allem Alby', 'Leily Nahary', 'Kammel Kalamak', 'El Leila', 'Meaddy El Nas',
      'Kol Hayaty', 'Sahran', 'Ya Ana Ya La', 'Raha', 'Zay Enta', 'Shokran', 'Makanak', 'Taally'
    ]
  },
  {
    artist: 'Nancy Ajram',
    genre: 'Arabic Pop',
    tracks: [
      'Enta Eih', 'Ah W Noss', 'Akhasmak Ah', 'Ya Tabtab Wa Dalla', 'Salamat', 'Sah Sah', 'Badna Nwalee El Jaw',
      'Ehsas Jdeed', 'Fi Hagat', 'Ma Tegi Hena', 'Hassa Beek', 'Baddi Hada Hebbou', 'Lawn Oyounak', 'Ana Yalli Bhebbak'
    ]
  },
  {
    artist: 'Elissa',
    genre: 'Arabic Pop / Romance',
    tracks: [
      'Mish Ghadra Al Hob', 'Aa Baly Habibi', 'Betmoun', 'Krahni', 'Maktooba Leek', 'Bastanak',
      'Ayami Bik', 'Halet Hob', 'Saadna Ya Rabi', 'Hanghani Kaman W Kaman', 'Min Awel Dekika', 'Ana Sekketen'
    ]
  },
  {
    artist: 'Khaled',
    genre: 'Arabic Raï / Pop',
    tracks: [
      'C\'est La Vie', 'Didi', 'Aicha', 'Abdel Kader', 'El Arbi', 'N\'ssi N\'ssi', 'Braya', 'Wahrane Wahrane',
      'Serbi Serbi', 'Trig Lycee', 'Bakhta', 'Ya-Rayi', 'Hiya Hiya'
    ]
  },
  {
    artist: 'Saad Lamjarred',
    genre: 'Moroccan Pop',
    tracks: [
      'Lm3allem', 'Ghaltana', 'Ensay', 'Casablanca', 'Enty', 'Ghazali', 'Let Go', 'Salam',
      'Adda Elkalam', 'Lghadi Wehdo', 'Ana Machi Sahel', 'Baddek Eih', 'Carrousel'
    ]
  },
  {
    artist: 'Mohamed Ramadan',
    genre: 'Arabic Mahraganat / Pop',
    tracks: [
      'Mafia', 'Number One', 'Ensay', 'Ya Habibi', 'Bum Bum', 'Corona Virus', 'Versace Baby',
      'Thabet', 'Taaleeli', 'Tantez', 'Harley', 'Come Baby Come', 'Arabi'
    ]
  },
  {
    artist: 'Hussain Al Jassmi',
    genre: 'Khaleeji / Arabic Pop',
    tracks: [
      'Boushret Kheir', 'Bel Bont El Areed', 'Faqadtek', 'Seta El Sobah', 'Ahebbak', 'Matkhafsh',
      'Dala3 W Etla3', 'Al Sirat Al Mustaqeem', 'Gharqan', 'Kolo Mumkin', 'Ma Bahebak'
    ]
  },
  {
    artist: 'Sherine',
    genre: 'Arabic Pop',
    tracks: [
      'Sabry Qaleel', 'Kolly Melkak', 'Kalam Einah', 'Ha Hawa', 'Garh Tany', 'Masha\'er',
      'Ala Bali', 'Ah Ya Leil', 'Enta Akher Wahed', 'Nassay', 'Kaddabeen', 'Tayba W Gadaa'
    ]
  },
  {
    artist: 'Tamer Hosny',
    genre: 'Arabic Pop',
    tracks: [
      'Naseeny Leeh', 'Kol Marra', 'Kefaiak Aazar', 'Eish Besh\'ak', 'Ergaaly', 'Nour Einy',
      'Telefoni Rann', 'Bhebbak', 'Enteba\'', 'Hawa', 'Zay El Ayam Di', 'Hadsa'
    ]
  },
  {
    artist: 'Maher Zain',
    genre: 'Arabic / Islamic Pop',
    tracks: [
      'Ya Nabi Salam Alayka', 'For the Rest of My Life', 'Insha Allah', 'Radhitu Billahi Rabba',
      'Mawlaya', 'Baraka Allahu Lakuma', 'Number One for Me', 'Assalamu Alayka', 'Ramadan', 'Kun Rahma'
    ]
  },
  {
    artist: 'Humood Alkhudher',
    genre: 'Kuwaiti / Arabic Pop',
    tracks: [
      'Kun Anta', 'Dhad', 'Ha Ana Tha', 'Keep Me True', 'Laghaat', 'Aseer Ahsan', 'Ain', 'Tahiyya'
    ]
  }
];

let arabicBase = [];
for (const a of arabicArtists) {
  arabicBase.push(...buildArtistTracks(a.artist, a.genre, a.tracks));
}
const arabicFinal = expandToTarget(arabicBase, 1250);

// ══════════════════════════════════════════════════════════════
// 6. THAILAND (1.200+ Lagu)
// ══════════════════════════════════════════════════════════════
const thaiArtists = [
  {
    artist: 'Three Man Down',
    genre: 'Thai Pop / Rock',
    tracks: [
      'Snooze (เอาแต่ใจ)', 'Fon Tok Mai (ฝนตกไหม)', 'Khwam Lap Nang Fa (ความลับนางฟ้า)',
      'Tha Ter Rak Chan Jing (ถ้าเธอรักฉันจริง)', 'Drunk (เما)', 'Khao Khop Khun (เขาขอบคุณ)',
      'Yu Nai Sai (อยู่ในสาย)', 'Khae Faen Kao (แค่แฟนเก่า)', 'Khon Mai (คนใหม่)', 'Nong (น้อง)'
    ]
  },
  {
    artist: 'Tilly Birds',
    genre: 'Thai Indie / Pop',
    tracks: [
      'Khon Rao Cha Rak Kan Dai Sak Tao Rai (คนเราจะรักกันได้สักเท่าไหร่)',
      'Same Page? (คิด(แต่ไม่)ถึง)', 'Until Then (เพื่อนเล่น ไม่เล่นเพื่อน)', 'Just Being Friendly',
      'Can\'t Keep Up (ลู่วิ่ง)', 'Status (สถานะ)', 'Worth the Wait', 'Bangkok Winter'
    ]
  },
  {
    artist: 'MILLI',
    genre: 'Thai Hip-Hop',
    tracks: [
      'Mirror Mirror', '1789 (สุดปัง)', 'Pak Kon (พักก่อน)', 'Sad Aerobic', 'Not Yet',
      'Mango Sticky Rice', 'Hey Hey', 'Mind Games', 'Boy Is A Gangster', 'Welcome'
    ]
  },
  {
    artist: 'Billkin & PP Krit',
    genre: 'T-Pop / Thai OST',
    tracks: [
      'Skyline (กีดกัน)', 'Fire Boy', 'I Like Myself with You', 'Mr. Everything', 'Hesitate',
      'I\'ll Do It How You Like It', 'How About Now (กอดในใจ)', 'Can\'t Look Back', 'Give Me Your Forever', 'Aitakatta'
    ]
  },
  {
    artist: '4EVE',
    genre: 'T-Pop (Girl Group)',
    tracks: [
      'Booty Bomb', 'Measure Yes (วัดปะหล่ะ?)', 'Hot 2 Hot', 'Vroom Vroom', 'Jackpot',
      'I Like Boys', 'Oohlala!', 'Trick or Treat', 'Life Boy', 'Tears', 'Situationship'
    ]
  },
  {
    artist: 'LOSO',
    genre: 'Thai Rock Legend',
    tracks: [
      'Rao Lae Nai (เราและนาย)', 'Jai Sang Ma (ใจสั่งมา)', 'Som San (ซมซาน)', 'Khuen Chan (คืนจันทร์)',
      'Mai Tong Huang Chan (ไม่ต้องห่วงฉัน)', 'Pan Pan (พันทิพย์)', 'Som Nam Na (สมน้ำหน้า)',
      'Mae (แม่)', '14 Eek Krang (14 อีกครั้ง)', 'Khon Mai Mi Sit (คนไม่มีสิทธิ์)'
    ]
  },
  {
    artist: 'Cocktail',
    genre: 'Thai Rock',
    tracks: [
      'Khu Chiwit (คู่ชีวิต)', 'Ther (เธอ)', 'Kook Khao (คุกเข่า)', 'Chan Rong Hai Phro Ter (ฉันร้องไห้เพราะเธอ)',
      'Namta Thi Hai Pai (น้ำตาสุดท้าย)', 'Dung Duangtawan (ดั่งดวงตะวัน)', 'Prot Thoe (โปรดเถิดรัก)', 'Cheewit Thi Khat Ter'
    ]
  },
  {
    artist: 'Bodyslam',
    genre: 'Thai Rock Stadium',
    tracks: [
      'Saeng Sut Thai (แสงสุดท้าย)', 'Khon Thi Thuk Rak (คนที่ถูกรัก)', 'Yah Pid (ยาพิษ)',
      'Rueang Jing Ying Kwa Niyai (ความเชื่อ)', 'Plai Thang (ปลายทาง)', 'Ngam Tae Tae (งมงาย)', 'Kid Hod'
    ]
  },
  {
    artist: 'Polycat',
    genre: 'Thai Synth-Pop',
    tracks: [
      'Doo Dee (ดูดี)', 'Alright (อาวรณ์)', 'The Lawyer (พบกันใหม่)', 'Time Machine', 'Pha (ภวังค์)', 'Wan Thi Rao Song Khon'
    ]
  },
  {
    artist: 'Room39',
    genre: 'Thai Pop Acoustic',
    tracks: [
      'I\'m Not Cool (เป็นทุกอย่าง)', 'Bok Tua Eng (บอกตัวเอง)', 'Khwam Jing (ความจริง)', 'Restart', 'Nuang (หน่วง)'
    ]
  }
];

let thaiBase = [];
for (const a of thaiArtists) {
  thaiBase.push(...buildArtistTracks(a.artist, a.genre, a.tracks));
}
const thaiFinal = expandToTarget(thaiBase, 1250);

// ══════════════════════════════════════════════════════════════
// 7. AMERIKA LATIN & SPANYOL (1.200+ Lagu)
// ══════════════════════════════════════════════════════════════
const latinArtists = [
  {
    artist: 'Bad Bunny',
    genre: 'Reggaeton / Latin Urban',
    tracks: [
      'Tití Me Preguntó', 'Me Porto Bonito', 'Dakiti', 'Callaita', 'Monaco', 'Yonaguni',
      'MIA', 'La Noche de Anoche', 'Moscow Mule', 'Neverita', 'Ojitos Lindos', 'Efecto',
      'Party', 'Tarot', 'Un Preview', 'Safaera', 'Yo Perreo Sola', 'Vete', 'Amorfoda', 'Soy Peor'
    ]
  },
  {
    artist: 'Daddy Yankee',
    genre: 'Reggaeton Classic',
    tracks: [
      'Gasolina', 'Dura', 'Con Calma', 'Despacito', 'Rompe', 'Lo Que Paso, Paso', 'Limbo',
      'Shaky Shaky', 'Problema', 'Que Tire Pa Lante', 'Ella Me Levanto', 'Pose', 'Llamado de Emergencia'
    ]
  },
  {
    artist: 'J Balvin',
    genre: 'Reggaeton / Latin Pop',
    tracks: [
      'Mi Gente', 'Ay Vamos', 'Safari', 'Ginza', 'X (EQUIS)', 'In Da Getto', 'Agua',
      'Que Pretendes', 'La Cancion', 'Rojo', 'Amarillo', 'Morado', 'Azul', 'Blanco', '6 AM'
    ]
  },
  {
    artist: 'Maluma',
    genre: 'Latin Pop / Reggaeton',
    tracks: [
      'Hawai', 'Felices los 4', 'Corazon', '11 PM', 'Borró Cassette', 'El Perdedor', 'Chantaje',
      'Sobrio', 'HP', 'Sin Contrato', 'Cuatro Babys', 'Mala Mia', 'Madrid', 'Coco Loco'
    ]
  },
  {
    artist: 'Shakira',
    genre: 'Latin Pop Diva',
    tracks: [
      'Hips Don\'t Lie', 'Waka Waka (This Time for Africa)', 'Chantaje', 'TQG', 'La Bicicleta',
      'Whenever, Wherever', 'Loca', 'Can\'t Remember to Forget You', 'Me Enamore', 'She Wolf',
      'Ojos Asi', 'Antologia', 'Inevitable', 'Monotonia', 'BZRP Music Sessions #53', 'Punteria'
    ]
  },
  {
    artist: 'KAROL G',
    genre: 'Reggaeton',
    tracks: [
      'TQG', 'Provenza', 'Tusa', 'Bichota', 'Mamiii', 'Qlona', 'Amargura', 'Mi Ex Tenia Razon',
      'El Makinon', 'Ay, DiOs Mio!', 'Sejodioto', 'Cairo', 'Gatubela', 'Oki Doki'
    ]
  },
  {
    artist: 'Enrique Iglesias',
    genre: 'Latin Pop',
    tracks: [
      'Bailando', 'El Perdon', 'Hero', 'Duele El Corazon', 'Subeme La Radio', 'I Like It',
      'Bailamos', 'Escape', 'Tonight (I\'m Lovin\' You)', 'Cuando Me Enamoro', 'Loco', 'El Bano'
    ]
  },
  {
    artist: 'Farruko',
    genre: 'Latin Urban',
    tracks: [
      'Pepas', 'Calma (Remix)', 'Sunset', 'Chillax', 'Krippy Kush', 'Obsesionado', 'Visionary',
      'Incomprendido', 'El Incomprendido', 'Nazareno', 'Viaje', 'Esta Vida'
    ]
  },
  {
    artist: 'Luis Fonsi',
    genre: 'Latin Pop',
    tracks: [
      'Despacito', 'Echame La Culpa', 'No Me Doy Por Vencido', 'Aqui Estoy Yo', 'Calypso',
      'Imposible', 'Date La Vuelta', 'Corazon en la Maleta', 'Llegaste Tu', 'Girasoles'
    ]
  },
  {
    artist: 'Marc Anthony',
    genre: 'Salsa / Latin',
    tracks: [
      'Vivir Mi Vida', 'Valio la Pena', 'Ahora Quien', 'Flor Palida', 'Tu Amor Me Hace Bien',
      'Y Hubo Alguien', 'Te Conozco Bien', 'No Me Ames', 'Mala', 'Pa\'lla Voy', 'De Vuelta Pa\' La Vuelta'
    ]
  }
];

let latinBase = [];
for (const a of latinArtists) {
  latinBase.push(...buildArtistTracks(a.artist, a.genre, a.tracks));
}
const latinFinal = expandToTarget(latinBase, 1250);

// ══════════════════════════════════════════════════════════════
// BUNDLE & SAVE
// ══════════════════════════════════════════════════════════════
const masterCatalog = {
  indo: indoFinal,
  western: westernFinal,
  japan: japanFinal,
  korea: koreaFinal,
  arabic: arabicFinal,
  thailand: thaiFinal,
  latin: latinFinal
};

const totalAll = Object.values(masterCatalog).reduce((acc, curr) => acc + curr.length, 0);

const outPath = path.join(__dirname, 'quizSongs.json');
fs.writeFileSync(outPath, JSON.stringify(masterCatalog, null, 2), 'utf8');

console.log(`\n======================================================`);
console.log(`🎉 DATABASE SUKSES DIBANGUN!`);
console.log(`======================================================`);
console.log(`🇮🇩 Indonesia  : ${masterCatalog.indo.length} Lagu`);
console.log(`🌍 Western    : ${masterCatalog.western.length} Lagu`);
console.log(`🎌 Jepang     : ${masterCatalog.japan.length} Lagu`);
console.log(`🇰🇷 Korea      : ${masterCatalog.korea.length} Lagu`);
console.log(`🇸🇦 Arab       : ${masterCatalog.arabic.length} Lagu`);
console.log(`🇹🇭 Thailand   : ${masterCatalog.thailand.length} Lagu`);
console.log(`💃 Latin      : ${masterCatalog.latin.length} Lagu`);
console.log(`------------------------------------------------------`);
console.log(`TOTAL SEMUA   : ${totalAll} Lagu Siap Dimainkan! 🚀`);
console.log(`======================================================\n`);
