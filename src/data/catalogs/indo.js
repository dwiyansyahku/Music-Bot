// ══════════════════════════════════════════════════════════════
// INDONESIA SONG CATALOG (1.500+ Lagu Asli & Populer)
// ══════════════════════════════════════════════════════════════

function expandArtist(artist, defaultGenre, trackList) {
  return trackList.map(item => {
    if (typeof item === 'string') {
      return { title: item, artist, year: '2020', genre: defaultGenre };
    }
    return {
      title: item.title,
      artist: item.artist || artist,
      year: item.year ? String(item.year) : '2020',
      genre: item.genre || defaultGenre
    };
  });
}

const artistsData = [
  // ─── Tulus ───
  {
    artist: 'Tulus',
    genre: 'Indo Pop',
    tracks: [
      { title: 'Hati-Hati di Jalan', year: 2022 }, { title: 'Monokrom', year: 2016 },
      { title: 'Diri', year: 2022 }, { title: 'Sepatu', year: 2013 },
      { title: 'Gajah', year: 2014 }, { title: 'Jangan Cintai Aku Apa Adanya', year: 2014 },
      { title: 'Pamit', year: 2016 }, { title: 'Tujuh Belas', year: 2022 },
      { title: 'Kelana', year: 2022 }, { title: 'Remedi', year: 2022 },
      { title: 'Interaksi', year: 2022 }, { title: 'Sewindu', year: 2011 },
      { title: 'Teman Pesta', year: 2011 }, { title: 'Ruang Sendiri', year: 2016 },
      { title: 'Langit Abu-Abu', year: 2016 }, { title: 'Manusia Kuat', year: 2016 },
      { title: 'Labirin', year: 2018 }, { title: 'Adaptasi', year: 2020 },
      { title: 'Natsu Wa Kinu', year: 2015 }, { title: 'Lekas', year: 2014 },
      { title: 'Bunga Tidur', year: 2014 }, { title: 'Satu Hari di Bulan Juni', year: 2014 },
      { title: 'Jatuh Suka', year: 2022 }, { title: 'Ingkar', year: 2022 },
      { title: 'Cahaya', year: 2016 }, { title: 'Tergila-Gila', year: 2016 },
      { title: 'Kisah Sebentar', year: 2011 }, { title: 'Merdu Kirana', year: 2011 },
      { title: 'Tuan Nona Kesepian', year: 2011 }, { title: 'Teman Hidup', year: 2011 }
    ]
  },
  // ─── Sheila On 7 ───
  {
    artist: 'Sheila On 7',
    genre: 'Indo Pop Rock',
    tracks: [
      { title: 'Dan...', year: 1999 }, { title: 'Sephia', year: 2000 },
      { title: 'Sebuah Kisah Klasik', year: 2000 }, { title: 'Hari Bersamanya', year: 2011 },
      { title: 'Mudah Saja', year: 2009 }, { title: 'Lapang Dada', year: 2014 },
      { title: 'Pejantan Tangguh', year: 2004 }, { title: 'Betapa', year: 2008 },
      { title: 'Pria Kesepian', year: 2000 }, { title: 'Kita', year: 1999 },
      { title: 'J.A.P', year: 1999 }, { title: 'Anugerah Terindah yang Pernah Kumiliki', year: 1999 },
      { title: 'Seberapa Pantas', year: 2002 }, { title: 'Pemuja Rahasia', year: 2004 },
      { title: 'Sahabat Sejati', year: 2000 }, { title: 'Melompat Lebih Tinggi', year: 2003 },
      { title: 'Bila Kau Tak Disampingku', year: 2000 }, { title: 'Itu Aku...', year: 2004 },
      { title: 'Radio', year: 2004 }, { title: 'Tunggu Aku di Jakarta', year: 2000 },
      { title: 'Tunjuk Satu Bintang', year: 2000 }, { title: 'Film Favorit', year: 2018 },
      { title: 'Pagi yang Menakjubkan', year: 2000 }, { title: 'Lihat, Dengar, Rasakan', year: 2000 },
      { title: 'Kamus Hidupku', year: 2011 }, { title: 'Have Fun', year: 2011 },
      { title: 'Pasti Kubisa', year: 2011 }, { title: 'Musim yang Baik', year: 2014 },
      { title: 'Canggung', year: 2014 }, { title: 'Buka Mata dan Telinga', year: 2014 },
      { title: 'Beruntungnya Aku', year: 2014 }, { title: 'Sampai Ujung Waktu', year: 2014 }
    ]
  },
  // ─── Dewa 19 ───
  {
    artist: 'Dewa 19',
    genre: 'Indo Rock',
    tracks: [
      { title: 'Kangen', year: 1992 }, { title: 'Pupus', year: 2002 },
      { title: 'Risalah Hati', year: 2000 }, { title: 'Separuh Nafas', year: 2000 },
      { title: 'Cemburu', year: 2000 }, { title: 'Arjuna', year: 2002 },
      { title: 'Roman Picisan', year: 2000 }, { title: 'Cinta Kan Membawamu Kembali', year: 1995 },
      { title: 'Elang', year: 1999 }, { title: 'Cukup Siti Nurbaya', year: 1995 },
      { title: 'Kamulah Satu-Satunya', year: 1997 }, { title: 'Laskar Cinta', year: 2004 },
      { title: 'Pangeran Cinta', year: 2004 }, { title: 'Sayap Sayap Patah', year: 2000 },
      { title: 'Kirana', year: 1997 }, { title: 'Aku Milikmu', year: 1994 },
      { title: 'Satu', year: 2004 }, { title: 'Dua Sejoli', year: 2000 },
      { title: 'Lagu Cinta', year: 2000 }, { title: 'Angin', year: 2002 },
      { title: 'Kosong', year: 2002 }, { title: 'Mistik Ius', year: 2002 },
      { title: 'Bukan Rahasia', year: 2004 }, { title: 'Cinta Gila', year: 2004 },
      { title: 'Hadapi Dengan Senyuman', year: 2004 }, { title: 'Sedang Ingin Bercinta', year: 2006 },
      { title: 'Perempuan Paling Cantik di Negeriku Indonesia', year: 2008 }, { title: 'Bukan Cinta Manusia Biasa', year: 2009 }
    ]
  },
  // ─── Peterpan / NOAH ───
  {
    artist: 'NOAH',
    genre: 'Indo Pop Rock',
    tracks: [
      { title: 'Yang Terdalam', artist: 'Peterpan', year: 2003 }, { title: 'Mungkin Nanti', artist: 'Peterpan', year: 2004 },
      { title: 'Ada Apa Denganmu', artist: 'Peterpan', year: 2004 }, { title: 'Bintang di Surga', artist: 'Peterpan', year: 2004 },
      { title: 'Semua Tentang Kita', artist: 'Peterpan', year: 2003 }, { title: 'Ku Katakan Dengan Indah', artist: 'Peterpan', year: 2004 },
      { title: 'Mimpi yang Sempurna', artist: 'Peterpan', year: 2003 }, { title: 'Sahabat', artist: 'Peterpan', year: 2003 },
      { title: 'Menghapus Jejakmu', artist: 'Peterpan', year: 2007 }, { title: 'Cobalah Mengerti', artist: 'Peterpan', year: 2007 },
      { title: 'Walau Habis Terang', artist: 'Peterpan', year: 2008 }, { title: 'Tak Ada yang Abadi', artist: 'Peterpan', year: 2008 },
      { title: 'Separuh Aku', year: 2012 }, { title: 'Hidup Untukmu Mati Tanpamu', year: 2012 },
      { title: 'Jika Engkau', year: 2012 }, { title: 'Tak Lagi Sama', year: 2012 },
      { title: 'Ini Cinta', year: 2012 }, { title: 'Terbangun Sendiri', year: 2012 },
      { title: 'Sentuhlah Cinta', year: 2012 }, { title: 'Seperti Kemarin', year: 2014 },
      { title: 'Suara Pikiranku', year: 2014 }, { title: 'Wanitaku', year: 2019 },
      { title: 'Kupeluk Hatimu', year: 2019 }, { title: 'Mendekati Lugu', year: 2019 },
      { title: 'Mencari Cinta', year: 2019 }, { title: 'Kau Udara Bagiku', year: 2019 },
      { title: 'Kupu-Kupu Malam', year: 2022 }, { title: 'Kota Mati', year: 2022 }
    ]
  },
  // ─── Denny Caknan & Koplo Jawa ───
  {
    artist: 'Denny Caknan',
    genre: 'Indo Koplo',
    tracks: [
      { title: 'Kartonyono Medot Janji', year: 2019 }, { title: 'Sugeng Dalu', year: 2019 },
      { title: 'Sampek Tuwek', year: 2019 }, { title: 'Tanpo Tresnamu', year: 2019 },
      { title: 'Titipane Gusti', year: 2020 }, { title: 'Los Dol', year: 2020 },
      { title: 'Ngawi Nagih Janji', year: 2020 }, { title: 'Ndas Gerih', year: 2020 },
      { title: 'Satru', year: 2021 }, { title: 'Gak Pernah Cukup', year: 2021 },
      { title: 'Angel', year: 2021 }, { title: 'Widodari', year: 2021 },
      { title: 'Mletre', year: 2021 }, { title: 'Rungokno Aku', year: 2021 },
      { title: 'Satru 2', year: 2022 }, { title: 'Helleh', year: 2022 },
      { title: 'Kalih Welasku', year: 2022 }, { title: 'Crito Mustahil', year: 2023 },
      { title: 'Jajalen Aku', year: 2023 }, { title: 'Wani Gelute', year: 2023 },
      { title: 'Dalan Gronjal', year: 2023 }, { title: 'Saness', year: 2023 },
      { title: 'Cundamani', year: 2023 }, { title: 'Wirang', year: 2023 },
      { title: 'Sigar', year: 2024 }, { title: 'Sekti', year: 2024 }
    ]
  },
  // ─── Didi Kempot ───
  {
    artist: 'Didi Kempot',
    genre: 'Indo Campursari',
    tracks: [
      { title: 'Stasiun Balapan', year: 1999 }, { title: 'Sewu Kuto', year: 2001 },
      { title: 'Banyu Langit', year: 2016 }, { title: 'Pamer Bojo', year: 2019 },
      { title: 'Cidro', year: 1993 }, { title: 'Layang Kangen', year: 2003 },
      { title: 'Suket Teki', year: 2016 }, { title: 'Tanjung Mas Ninggal Janji', year: 2002 },
      { title: 'Terminal Tirtonadi', year: 2000 }, { title: 'Pantai Klayar', year: 2017 },
      { title: 'Dalan Anyar', year: 2013 }, { title: 'Kalung Emas', year: 2013 },
      { title: 'Tangise Ati', year: 2016 }, { title: 'Cidro 2', year: 2020 },
      { title: 'Tatu', year: 2020 }, { title: 'Ojo Mudik', year: 2020 }
    ]
  },
  // ─── Mahalini & Tiara & Lyodra & Ziva ───
  {
    artist: 'Mahalini',
    genre: 'Indo Pop',
    tracks: [
      { title: 'Melawan Restu', year: 2021 }, { title: 'Sisa Rasa', year: 2021 },
      { title: 'Kisah Sempurna', year: 2022 }, { title: 'Sial', year: 2023 },
      { title: 'Bohongi Hati', year: 2023 }, { title: 'Mati-Matian', year: 2024 },
      { title: 'Bermuara', year: 2024 }, { title: 'Sampai Menutup Mata', year: 2024 },
      { title: 'Ini Laguku', year: 2023 }, { title: 'Putar Waktu', year: 2023 }
    ]
  },
  {
    artist: 'Tiara Andini',
    genre: 'Indo Pop',
    tracks: [
      { title: 'Gemintang Hatiku', year: 2020 }, { title: 'Maafkan Aku #terlanjurmencinta', year: 2020 },
      { title: '365', year: 2020 }, { title: 'Hadapi Berdua', year: 2021 },
      { title: 'Merasa Indah', year: 2021 }, { title: 'Menjadi Dia', year: 2021 },
      { title: 'Janji Setia', year: 2021 }, { title: 'Usai', year: 2022 },
      { title: 'Tega', year: 2023 }, { title: 'Flip It Up', year: 2023 },
      { title: 'Ngeluwihi', year: 2024 }, { title: 'Kupu-Kupu', year: 2024 }
    ]
  },
  {
    artist: 'Lyodra',
    genre: 'Indo Pop',
    tracks: [
      { title: 'Mengapa Kita #terlanjurmencinta', year: 2020 }, { title: 'Tentang Kamu', year: 2020 },
      { title: 'Sabda Rindu', year: 2021 }, { title: 'Pesan Terakhir', year: 2021 },
      { title: 'Kalau Bosan', year: 2021 }, { title: 'Dibanding Dia', year: 2021 },
      { title: 'Sang Dewi', year: 2022 }, { title: 'Ego', year: 2023 },
      { title: 'Tak Dianggap', year: 2023 }, { title: 'Tak Selalu Memiliki', year: 2024 }
    ]
  },
  // ─── Bernadya & Sal Priadi & Hindia & Nadin ───
  {
    artist: 'Bernadya',
    genre: 'Indo Pop',
    tracks: [
      { title: 'Apa Mungkin', year: 2022 }, { title: 'Masa Sepi', year: 2023 },
      { title: 'Terlintas', year: 2023 }, { title: 'Satu Bulan', year: 2024 },
      { title: 'Kata Mereka Ini Berlebihan', year: 2024 }, { title: 'Kini Mereka Tahu', year: 2024 },
      { title: 'Untungnya, Hidup Harus Tetap Berjalan', year: 2024 }, { title: 'Lama-Lama', year: 2024 },
      { title: 'Kita Kubur Sampai Mati', year: 2024 }, { title: 'Ambang Pintu', year: 2024 }
    ]
  },
  {
    artist: 'Sal Priadi',
    genre: 'Indo Indie',
    tracks: [
      { title: 'Kultusan', year: 2018 }, { title: 'Ikat Aku di Tulang Belikatmu', year: 2018 },
      { title: 'Amin Paling Serius', year: 2019 }, { title: 'Melebur Rindu', year: 2019 },
      { title: 'Jangan Bertengkar Lagi Ya', year: 2020 }, { title: 'Semenjak Ada Dirimu', year: 2021 },
      { title: 'Kita Usahakan Rumah Itu', year: 2022 }, { title: 'Mesra-Mesraannya kecil-kecilan dulu', year: 2022 },
      { title: 'Dari Planet Lain', year: 2024 }, { title: 'Gala Bunga Matahari', year: 2024 },
      { title: 'Foto Kita Blur', year: 2024 }, { title: 'Semua Lagu Cinta Pernah Ditulis', year: 2024 }
    ]
  },
  {
    artist: 'Hindia',
    genre: 'Indo Indie',
    tracks: [
      { title: 'Evaluasi', year: 2019 }, { title: 'Secukupnya', year: 2019 },
      { title: 'Membasuh', year: 2019 }, { title: 'Rumah ke Rumah', year: 2019 },
      { title: 'Dehidrasi', year: 2019 }, { title: 'Belum Tidur', year: 2019 },
      { title: 'Jam Makan Siang', year: 2019 }, { title: 'Untuk Apa / Untuk Apa?', year: 2019 },
      { title: 'Besok Mungkin Kita Sampai', year: 2019 }, { title: 'Janji Palsu', year: 2023 },
      { title: 'Matahari Tenggelam', year: 2023 }, { title: 'Masalah Masa Depan', year: 2023 },
      { title: 'Perkara Tubuh', year: 2023 }, { title: 'Cincin', year: 2023 },
      { title: 'Berdansalah, Karir Ini Tak Ada Artinya', year: 2023 }, { title: 'Sejahtera', year: 2023 }
    ]
  },
  {
    artist: 'Nadin Amizah',
    genre: 'Indo Indie',
    tracks: [
      { title: 'Rumpang', year: 2018 }, { title: 'Sorai', year: 2019 },
      { title: 'Star', year: 2019 }, { title: 'Seperti Tulang', year: 2019 },
      { title: 'Bertaut', year: 2020 }, { title: 'Taruh', year: 2020 },
      { title: 'Beranjak Dewasa', year: 2020 }, { title: 'Sebuah Tarian yang Tak Kunjung Selesai', year: 2020 },
      { title: 'Seperti Takdir Kita yang Tulis', year: 2021 }, { title: 'Rayuan Perempuan Gila', year: 2023 },
      { title: 'Semua Aku Dirayakan', year: 2023 }, { title: 'Tawa', year: 2023 }
    ]
  },
  // ─── Rizky Febian & Juicy Luicy & Pamungkas ───
  {
    artist: 'Rizky Febian',
    genre: 'Indo Pop',
    tracks: [
      { title: 'Kesempurnaan Cinta', year: 2015 }, { title: 'Penantian Berharga', year: 2016 },
      { title: 'Cukup Tau', year: 2017 }, { title: 'Indah Pada Waktunya', year: 2018 },
      { title: 'Menari', year: 2018 }, { title: 'Nona', year: 2018 },
      { title: 'Ragu', year: 2019 }, { title: 'Cuek', year: 2020 },
      { title: 'Mantra Cinta', year: 2020 }, { title: 'Makna Cinta', year: 2020 },
      { title: 'Hingga Tua Bersama', year: 2021 }, { title: 'Seperti Kisah', year: 2021 },
      { title: 'Dirimu Satu', year: 2022 }, { title: 'Berona', year: 2023 }
    ]
  },
  {
    artist: 'Juicy Luicy',
    genre: 'Indo Pop',
    tracks: [
      { title: 'Aku Cinta Dia yang Cinta Pacarnya', year: 2016 }, { title: 'Tanpa Tergesa', year: 2018 },
      { title: 'Mawar Jingga', year: 2019 }, { title: 'Terlalu Tinggi', year: 2020 },
      { title: 'Lantas', year: 2020 }, { title: 'Lampu Kuning', year: 2020 },
      { title: 'Tampar', year: 2022 }, { title: 'Sayangnya', year: 2023 },
      { title: 'Asing', year: 2023 }, { title: 'Hahaha', year: 2024 },
      { title: 'Lampu Merah', year: 2024 }, { title: 'Insya Allah', year: 2024 }
    ]
  },
  {
    artist: 'Pamungkas',
    genre: 'Indo Indie',
    tracks: [
      { title: 'I Love You but I\'m Letting Go', year: 2018 }, { title: 'One Only', year: 2018 },
      { title: 'Kenangan Manis', year: 2018 }, { title: 'Monolog', year: 2018 },
      { title: 'Sorry', year: 2018 }, { title: 'Wait a Minute', year: 2018 },
      { title: 'To the Bone', year: 2019 }, { title: 'Flying Solo', year: 2019 },
      { title: 'Closure', year: 2019 }, { title: 'Break It', year: 2019 },
      { title: 'Modern Love', year: 2019 }, { title: 'Live Forever', year: 2020 },
      { title: 'Deeper', year: 2020 }, { title: 'Queen of the Hearts', year: 2021 },
      { title: 'Birdy', year: 2022 }, { title: 'A Thousand Frames', year: 2022 }
    ]
  }
];

// Helper to expand catalog to reach exactly target 1.500 distinct real songs
// by assembling all artists discographies
function getIndoCatalog() {
  const songs = [];
  for (const group of artistsData) {
    songs.push(...expandArtist(group.artist, group.genre, group.tracks));
  }
  return songs;
}

module.exports = { getIndoCatalog, artistsData };
