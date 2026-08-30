// ══════════════════════════════════════════════════════════════
// LAGU TRADISIONAL & DAERAH INDONESIA (38 PROVINSI NUSANTARA)
// ══════════════════════════════════════════════════════════════

const traditionalIndoSongs = [
  // ─── Aceh ───
  { title: 'Bungong Jeumpa', artist: 'Lagu Daerah Aceh', year: '1900', genre: 'Lagu Tradisional Aceh' },
  { title: 'Piso Surit', artist: 'Lagu Daerah Aceh / Batak Karo', year: '1960', genre: 'Lagu Tradisional Aceh' },
  { title: 'Tarek Pukat', artist: 'Lagu Daerah Aceh', year: '1958', genre: 'Lagu Tradisional Aceh' },
  { title: 'Saleum', artist: 'Lagu Daerah Aceh', year: '1970', genre: 'Lagu Tradisional Aceh' },
  { title: 'Aneuk Yatim', artist: 'Lagu Daerah Aceh', year: '1999', genre: 'Lagu Tradisional Aceh' },
  { title: 'Seulanga', artist: 'Lagu Daerah Aceh', year: '1985', genre: 'Lagu Tradisional Aceh' },
  { title: 'Meureudeh', artist: 'Lagu Daerah Aceh', year: '1975', genre: 'Lagu Tradisional Aceh' },
  { title: 'Kutidhing', artist: 'Lagu Daerah Aceh', year: '1965', genre: 'Lagu Tradisional Aceh' },
  { title: 'Lembah Alas', artist: 'Lagu Daerah Aceh', year: '1980', genre: 'Lagu Tradisional Aceh' },

  // ─── Sumatera Utara ───
  { title: 'Sinanggar Tulo', artist: 'Lagu Daerah Sumatera Utara', year: '1940', genre: 'Lagu Tradisional Batak' },
  { title: 'Butet', artist: 'Lagu Daerah Sumatera Utara', year: '1945', genre: 'Lagu Tradisional Batak' },
  { title: 'Sing Sing So', artist: 'Lagu Daerah Sumatera Utara', year: '1950', genre: 'Lagu Tradisional Batak' },
  { title: 'Lisoi', artist: 'Lagu Daerah Sumatera Utara', year: '1965', genre: 'Lagu Tradisional Batak' },
  { title: 'Mariam Tomong', artist: 'Lagu Daerah Sumatera Utara', year: '1930', genre: 'Lagu Tradisional Batak' },
  { title: 'Sik Sik Sibatumanikam', artist: 'Lagu Daerah Sumatera Utara', year: '1955', genre: 'Lagu Tradisional Batak' },
  { title: 'Rambadia', artist: 'Lagu Daerah Sumatera Utara', year: '1950', genre: 'Lagu Tradisional Batak' },
  { title: 'Situmorang', artist: 'Lagu Daerah Sumatera Utara', year: '1975', genre: 'Lagu Tradisional Batak' },
  { title: 'Anju Ahu', artist: 'Lagu Daerah Sumatera Utara', year: '1960', genre: 'Lagu Tradisional Batak' },
  { title: 'Alusi Au', artist: 'Lagu Daerah Sumatera Utara', year: '1970', genre: 'Lagu Tradisional Batak' },
  { title: 'O Tano Batak', artist: 'Lagu Daerah Sumatera Utara', year: '1940', genre: 'Lagu Tradisional Batak' },
  { title: 'Sengko Sengko', artist: 'Lagu Daerah Sumatera Utara', year: '1960', genre: 'Lagu Tradisional Batak' },
  { title: 'Sai Anju Ma Au', artist: 'Lagu Daerah Sumatera Utara', year: '1972', genre: 'Lagu Tradisional Batak' },
  { title: 'Nasonang Dohita Nadua', artist: 'Lagu Daerah Sumatera Utara', year: '1968', genre: 'Lagu Tradisional Batak' },
  { title: 'Boasa Ma', artist: 'Lagu Daerah Sumatera Utara', year: '1978', genre: 'Lagu Tradisional Batak' },
  { title: 'Tanoh Niha', artist: 'Lagu Daerah Nias', year: '1980', genre: 'Lagu Tradisional Nias' },

  // ─── Sumatera Barat (Minangkabau) ───
  { title: 'Ayam Den Lapeh', artist: 'Lagu Daerah Sumatera Barat', year: '1960', genre: 'Lagu Tradisional Minang' },
  { title: 'Kampuang Nan Jauh Di Mato', artist: 'Lagu Daerah Sumatera Barat', year: '1935', genre: 'Lagu Tradisional Minang' },
  { title: 'Bareh Solok', artist: 'Lagu Daerah Sumatera Barat', year: '1965', genre: 'Lagu Tradisional Minang' },
  { title: 'Tak Tontong', artist: 'Lagu Daerah Sumatera Barat', year: '1950', genre: 'Lagu Tradisional Minang' },
  { title: 'Dayung Palinggam', artist: 'Lagu Daerah Sumatera Barat', year: '1968', genre: 'Lagu Tradisional Minang' },
  { title: 'Kambanglah Bungo', artist: 'Lagu Daerah Sumatera Barat', year: '1970', genre: 'Lagu Tradisional Minang' },
  { title: 'Malam Baiko', artist: 'Lagu Daerah Sumatera Barat', year: '1972', genre: 'Lagu Tradisional Minang' },
  { title: 'Rang Talu', artist: 'Lagu Daerah Sumatera Barat', year: '1965', genre: 'Lagu Tradisional Minang' },
  { title: 'Ka Parak Tingga', artist: 'Lagu Daerah Sumatera Barat', year: '1960', genre: 'Lagu Tradisional Minang' },
  { title: 'Mak Inang', artist: 'Lagu Daerah Sumatera Barat', year: '1955', genre: 'Lagu Tradisional Minang' },
  { title: 'Paku Gelang', artist: 'Lagu Daerah Sumatera Barat', year: '1940', genre: 'Lagu Tradisional Minang' },
  { title: 'Lah Laruik Sanjo', artist: 'Lagu Daerah Sumatera Barat', year: '1975', genre: 'Lagu Tradisional Minang' },
  { title: 'Babendi-Bendi', artist: 'Lagu Daerah Sumatera Barat', year: '1965', genre: 'Lagu Tradisional Minang' },
  { title: 'Bugih Lamo', artist: 'Lagu Daerah Sumatera Barat', year: '1970', genre: 'Lagu Tradisional Minang' },
  { title: 'Tari Payung', artist: 'Lagu Daerah Sumatera Barat', year: '1950', genre: 'Lagu Tradisional Minang' },

  // ─── Riau & Kepulauan Riau ───
  { title: 'Soleram', artist: 'Lagu Daerah Riau', year: '1940', genre: 'Lagu Tradisional Melayu' },
  { title: 'Lancang Kuning', artist: 'Lagu Daerah Riau', year: '1960', genre: 'Lagu Tradisional Melayu' },
  { title: 'Segantang Lada', artist: 'Lagu Daerah Kepulauan Riau', year: '1965', genre: 'Lagu Tradisional Melayu' },
  { title: 'Kutang Barendo', artist: 'Lagu Daerah Riau', year: '1970', genre: 'Lagu Tradisional Melayu' },
  { title: 'Zapin Laksamana Raja di Laut', artist: 'Lagu Daerah Riau', year: '1980', genre: 'Lagu Tradisional Melayu' },
  { title: 'Hang Tuah', artist: 'Lagu Daerah Riau', year: '1975', genre: 'Lagu Tradisional Melayu' },
  { title: 'Pulau Bintan', artist: 'Lagu Daerah Kepulauan Riau', year: '1982', genre: 'Lagu Tradisional Melayu' },
  { title: 'Pak Ngah Balik', artist: 'Lagu Daerah Kepulauan Riau', year: '1978', genre: 'Lagu Tradisional Melayu' },

  // ─── Jambi ───
  { title: 'Injit-Injit Semut', artist: 'Lagu Daerah Jambi', year: '1950', genre: 'Lagu Tradisional Jambi' },
  { title: 'Batanghari', artist: 'Lagu Daerah Jambi', year: '1965', genre: 'Lagu Tradisional Jambi' },
  { title: 'Selendang Mayang', artist: 'Lagu Daerah Jambi', year: '1970', genre: 'Lagu Tradisional Jambi' },
  { title: 'Pinang Muda', artist: 'Lagu Daerah Jambi', year: '1960', genre: 'Lagu Tradisional Jambi' },
  { title: 'Dodoi Si Dodoi', artist: 'Lagu Daerah Jambi', year: '1975', genre: 'Lagu Tradisional Jambi' },
  { title: 'Angso Duo', artist: 'Lagu Daerah Jambi', year: '1985', genre: 'Lagu Tradisional Jambi' },
  { title: 'Timang-Timang Anakku Sayang', artist: 'Lagu Daerah Jambi', year: '1970', genre: 'Lagu Tradisional Jambi' },

  // ─── Sumatera Selatan (Palembang) ───
  { title: 'Gending Sriwijaya', artist: 'Lagu Daerah Sumatera Selatan', year: '1944', genre: 'Lagu Tradisional Palembang' },
  { title: 'Dek Sangke', artist: 'Lagu Daerah Sumatera Selatan', year: '1955', genre: 'Lagu Tradisional Palembang' },
  { title: 'Cuk Mak Ilang', artist: 'Lagu Daerah Sumatera Selatan', year: '1960', genre: 'Lagu Tradisional Palembang' },
  { title: 'Kabile-Bile', artist: 'Lagu Daerah Sumatera Selatan', year: '1965', genre: 'Lagu Tradisional Palembang' },
  { title: 'Ya Saman', artist: 'Lagu Daerah Sumatera Selatan', year: '1980', genre: 'Lagu Tradisional Palembang' },
  { title: 'Petang-Petang', artist: 'Lagu Daerah Sumatera Selatan', year: '1970', genre: 'Lagu Tradisional Palembang' },
  { title: 'Pempek Lenjer', artist: 'Lagu Daerah Sumatera Selatan', year: '1975', genre: 'Lagu Tradisional Palembang' },
  { title: 'Dirut', artist: 'Lagu Daerah Sumatera Selatan', year: '1968', genre: 'Lagu Tradisional Palembang' },

  // ─── Bengkulu ───
  { title: 'Lalan Belek', artist: 'Lagu Daerah Bengkulu', year: '1960', genre: 'Lagu Tradisional Bengkulu' },
  { title: 'Sungai Suci', artist: 'Lagu Daerah Bengkulu', year: '1970', genre: 'Lagu Tradisional Bengkulu' },
  { title: 'Umang-Umang', artist: 'Lagu Daerah Bengkulu', year: '1965', genre: 'Lagu Tradisional Bengkulu' },
  { title: 'Ikan Pais', artist: 'Lagu Daerah Bengkulu', year: '1975', genre: 'Lagu Tradisional Bengkulu' },
  { title: 'Be Inai Curi', artist: 'Lagu Daerah Bengkulu', year: '1980', genre: 'Lagu Tradisional Bengkulu' },

  // ─── Lampung ───
  { title: 'Cangget Agung', artist: 'Lagu Daerah Lampung', year: '1965', genre: 'Lagu Tradisional Lampung' },
  { title: 'Tanoh Lada', artist: 'Lagu Daerah Lampung', year: '1970', genre: 'Lagu Tradisional Lampung' },
  { title: 'Lipang Lipandang', artist: 'Lagu Daerah Lampung', year: '1960', genre: 'Lagu Tradisional Lampung' },
  { title: 'Bumi Lampung', artist: 'Lagu Daerah Lampung', year: '1975', genre: 'Lagu Tradisional Lampung' },
  { title: 'Sang Bumi Ruwa Jurai', artist: 'Lagu Daerah Lampung', year: '1980', genre: 'Lagu Tradisional Lampung' },
  { title: 'Adi-Adi Laun Lambar', artist: 'Lagu Daerah Lampung', year: '1985', genre: 'Lagu Tradisional Lampung' },

  // ─── Bangka Belitung ───
  { title: 'Men Sahang Lah Mirak', artist: 'Lagu Daerah Bangka Belitung', year: '1970', genre: 'Lagu Tradisional Bangka' },
  { title: 'Nasib Si Bujang Saro', artist: 'Lagu Daerah Bangka Belitung', year: '1975', genre: 'Lagu Tradisional Bangka' },
  { title: 'Alam Wisata Pulau Bangka', artist: 'Lagu Daerah Bangka Belitung', year: '1980', genre: 'Lagu Tradisional Bangka' },
  { title: 'Yo Beli Yo', artist: 'Lagu Daerah Bangka Belitung', year: '1985', genre: 'Lagu Tradisional Belitung' },
  { title: 'Zapin Maharani', artist: 'Lagu Daerah Bangka Belitung', year: '1990', genre: 'Lagu Tradisional Melayu' },

  // ─── DKI Jakarta (Betawi) ───
  { title: 'Kicir-Kicir', artist: 'Lagu Daerah Betawi / Jakarta', year: '1900', genre: 'Lagu Tradisional Betawi' },
  { title: 'Jali-Jali', artist: 'Lagu Daerah Betawi / Jakarta', year: '1942', genre: 'Lagu Tradisional Betawi' },
  { title: 'Keroncong Kemayoran', artist: 'Lagu Daerah Betawi / Jakarta', year: '1930', genre: 'Lagu Tradisional Betawi' },
  { title: 'Surilang', artist: 'Lagu Daerah Betawi / Jakarta', year: '1950', genre: 'Lagu Tradisional Betawi' },
  { title: 'Ondel-Ondel', artist: 'Lagu Daerah Betawi / Jakarta', year: '1970', genre: 'Lagu Tradisional Betawi' },
  { title: 'Lenggang Kangkung', artist: 'Lagu Daerah Betawi / Jakarta', year: '1955', genre: 'Lagu Tradisional Betawi' },
  { title: 'Sirih Kuning', artist: 'Lagu Daerah Betawi / Jakarta', year: '1960', genre: 'Lagu Tradisional Betawi' },
  { title: 'Hujan Gerimis', artist: 'Lagu Daerah Betawi / Jakarta', year: '1975', genre: 'Lagu Tradisional Betawi' },
  { title: 'Wak-Wak Gung', artist: 'Lagu Daerah Betawi / Jakarta', year: '1965', genre: 'Lagu Tradisional Betawi' },
  { title: 'Sang Bango', artist: 'Lagu Daerah Betawi / Jakarta', year: '1972', genre: 'Lagu Tradisional Betawi' },
  { title: 'Abang Pulang', artist: 'Lagu Daerah Betawi / Jakarta', year: '1970', genre: 'Lagu Tradisional Betawi' },
  { title: 'Ronggeng Jakarta', artist: 'Lagu Daerah Betawi / Jakarta', year: '1968', genre: 'Lagu Tradisional Betawi' },

  // ─── Jawa Barat & Banten (Sunda) ───
  { title: 'Manuk Dadali', artist: 'Lagu Daerah Jawa Barat', year: '1962', genre: 'Lagu Tradisional Sunda' },
  { title: 'Tokecang', artist: 'Lagu Daerah Jawa Barat', year: '1950', genre: 'Lagu Tradisional Sunda' },
  { title: 'Es Lilin', artist: 'Lagu Daerah Jawa Barat', year: '1955', genre: 'Lagu Tradisional Sunda' },
  { title: 'Bubuy Bulan', artist: 'Lagu Daerah Jawa Barat', year: '1958', genre: 'Lagu Tradisional Sunda' },
  { title: 'Warung Pojok', artist: 'Lagu Daerah Jawa Barat', year: '1960', genre: 'Lagu Tradisional Sunda' },
  { title: 'Cing Cangkeling', artist: 'Lagu Daerah Jawa Barat', year: '1945', genre: 'Lagu Tradisional Sunda' },
  { title: 'Panon Hideung', artist: 'Lagu Daerah Jawa Barat', year: '1937', genre: 'Lagu Tradisional Sunda' },
  { title: 'Bajing Luncat', artist: 'Lagu Daerah Jawa Barat', year: '1965', genre: 'Lagu Tradisional Sunda' },
  { title: 'Peuyeum Bandung', artist: 'Lagu Daerah Jawa Barat', year: '1960', genre: 'Lagu Tradisional Sunda' },
  { title: 'Sapu Nyere Pegat Simpai', artist: 'Lagu Daerah Jawa Barat', year: '1970', genre: 'Lagu Tradisional Sunda' },
  { title: 'Mojang Priangan', artist: 'Lagu Daerah Jawa Barat', year: '1975', genre: 'Lagu Tradisional Sunda' },
  { title: 'Pileuleuyan', artist: 'Lagu Daerah Jawa Barat', year: '1965', genre: 'Lagu Tradisional Sunda' },
  { title: 'Neng Geulis', artist: 'Lagu Daerah Jawa Barat', year: '1968', genre: 'Lagu Tradisional Sunda' },
  { title: 'Talak Tilu', artist: 'Lagu Daerah Jawa Barat', year: '1980', genre: 'Lagu Tradisional Sunda' },
  { title: 'Karatagan Pahlawan', artist: 'Lagu Daerah Jawa Barat', year: '1955', genre: 'Lagu Tradisional Sunda' },
  { title: 'Tong Tolang Nangka', artist: 'Lagu Daerah Jawa Barat', year: '1970', genre: 'Lagu Tradisional Sunda' },
  { title: 'Kalangkang', artist: 'Lagu Daerah Jawa Barat', year: '1986', genre: 'Lagu Tradisional Sunda' },
  { title: 'Dayung Sampan', artist: 'Lagu Daerah Banten', year: '1960', genre: 'Lagu Tradisional Banten' },
  { title: 'Bendrong Lesung', artist: 'Lagu Daerah Banten', year: '1975', genre: 'Lagu Tradisional Banten' },

  // ─── Jawa Tengah & D.I. Yogyakarta ───
  { title: 'Gundul-Gundul Pacul', artist: 'Lagu Daerah Jawa Tengah', year: '1400', genre: 'Lagu Tradisional Jawa' },
  { title: 'Gambang Suling', artist: 'Lagu Daerah Jawa Tengah', year: '1950', genre: 'Lagu Tradisional Jawa' },
  { title: 'Suwe Ora Jamu', artist: 'Lagu Daerah Jawa Tengah / Yogyakarta', year: '1930', genre: 'Lagu Tradisional Jawa' },
  { title: 'Lir-Ilir', artist: 'Lagu Daerah Jawa Tengah', year: '1500', genre: 'Lagu Tradisional Jawa' },
  { title: 'Cublak-Cublak Suweng', artist: 'Lagu Daerah Jawa Tengah', year: '1450', genre: 'Lagu Tradisional Jawa' },
  { title: 'Jaranan', artist: 'Lagu Daerah Jawa Tengah', year: '1950', genre: 'Lagu Tradisional Jawa' },
  { title: 'Padhang Bulan', artist: 'Lagu Daerah Jawa Tengah', year: '1960', genre: 'Lagu Tradisional Jawa' },
  { title: 'Pitik Tukung', artist: 'Lagu Daerah D.I. Yogyakarta', year: '1955', genre: 'Lagu Tradisional Jawa' },
  { title: 'Menthog-Menthog', artist: 'Lagu Daerah Jawa Tengah', year: '1960', genre: 'Lagu Tradisional Jawa' },
  { title: 'Dondong Opo Salak', artist: 'Lagu Daerah Jawa Tengah', year: '1965', genre: 'Lagu Tradisional Jawa' },
  { title: 'Caping Gunung', artist: 'Lagu Daerah Jawa Tengah', year: '1958', genre: 'Lagu Tradisional Jawa' },
  { title: 'Jenang Gulo', artist: 'Lagu Daerah Jawa Tengah', year: '1970', genre: 'Lagu Tradisional Jawa' },
  { title: 'Prau Layar', artist: 'Lagu Daerah Jawa Tengah', year: '1960', genre: 'Lagu Tradisional Jawa' },
  { title: 'Yen Ing Tawang Ono Lintang', artist: 'Lagu Daerah Jawa Tengah', year: '1964', genre: 'Lagu Tradisional Jawa' },
  { title: 'Nyidam Sari', artist: 'Lagu Daerah Jawa Tengah', year: '1975', genre: 'Lagu Tradisional Jawa' },
  { title: 'Sinom', artist: 'Lagu Daerah D.I. Yogyakarta', year: '1850', genre: 'Lagu Tradisional Jawa' },

  // ─── Jawa Timur ───
  { title: 'Rek Ayo Rek', artist: 'Lagu Daerah Jawa Timur', year: '1955', genre: 'Lagu Tradisional Jawa Timur' },
  { title: 'Tanduk Majeng', artist: 'Lagu Daerah Madura / Jawa Timur', year: '1940', genre: 'Lagu Tradisional Madura' },
  { title: 'Kerraban Sape', artist: 'Lagu Daerah Madura / Jawa Timur', year: '1960', genre: 'Lagu Tradisional Madura' },
  { title: 'Semanggi Surabaya', artist: 'Lagu Daerah Jawa Timur', year: '1965', genre: 'Lagu Tradisional Jawa Timur' },
  { title: 'Grimis-Grimis', artist: 'Lagu Daerah Jawa Timur', year: '1968', genre: 'Lagu Tradisional Jawa Timur' },
  { title: 'Lindri', artist: 'Lagu Daerah Jawa Timur', year: '1970', genre: 'Lagu Tradisional Jawa Timur' },
  { title: 'Kembang Malathe', artist: 'Lagu Daerah Madura / Jawa Timur', year: '1972', genre: 'Lagu Tradisional Madura' },
  { title: 'Tanjung Perak', artist: 'Lagu Daerah Jawa Timur', year: '1960', genre: 'Lagu Tradisional Jawa Timur' },
  { title: 'Pa\'lele', artist: 'Lagu Daerah Madura / Jawa Timur', year: '1975', genre: 'Lagu Tradisional Madura' },

  // ─── Bali ───
  { title: 'Meyong-Meyong', artist: 'Lagu Daerah Bali', year: '1950', genre: 'Lagu Tradisional Bali' },
  { title: 'Putri Cening Ayu', artist: 'Lagu Daerah Bali', year: '1955', genre: 'Lagu Tradisional Bali' },
  { title: 'Ratu Anom', artist: 'Lagu Daerah Bali', year: '1960', genre: 'Lagu Tradisional Bali' },
  { title: 'Janger', artist: 'Lagu Daerah Bali', year: '1920', genre: 'Lagu Tradisional Bali' },
  { title: 'Macepet-Cepetan', artist: 'Lagu Daerah Bali', year: '1965', genre: 'Lagu Tradisional Bali' },
  { title: 'Ngusak Asik', artist: 'Lagu Daerah Bali', year: '1970', genre: 'Lagu Tradisional Bali' },
  { title: 'Dadong Dauh', artist: 'Lagu Daerah Bali', year: '1965', genre: 'Lagu Tradisional Bali' },
  { title: 'Tari Pendet', artist: 'Lagu Daerah Bali', year: '1950', genre: 'Lagu Tradisional Bali' },
  { title: 'Dewa Ayu', artist: 'Lagu Daerah Bali', year: '1975', genre: 'Lagu Tradisional Bali' },
  { title: 'Tresna Mejohan', artist: 'Lagu Daerah Bali', year: '1985', genre: 'Lagu Tradisional Bali' },
  { title: 'Merah Putih', artist: 'Lagu Daerah Bali', year: '1980', genre: 'Lagu Tradisional Bali' },

  // ─── Nusa Tenggara Barat (NTB) ───
  { title: 'Helele U Ala De Teang', artist: 'Lagu Daerah NTB', year: '1960', genre: 'Lagu Tradisional Sasak' },
  { title: 'Moree', artist: 'Lagu Daerah NTB', year: '1965', genre: 'Lagu Tradisional Sumbawa' },
  { title: 'Kadal Nongaq', artist: 'Lagu Daerah NTB', year: '1970', genre: 'Lagu Tradisional Sasak' },
  { title: 'Orlen-Orlen', artist: 'Lagu Daerah NTB', year: '1968', genre: 'Lagu Tradisional Sumbawa' },
  { title: 'Tutu Koda', artist: 'Lagu Daerah NTB', year: '1975', genre: 'Lagu Tradisional Mbojo' },
  { title: 'Tebe Onana', artist: 'Lagu Daerah NTB', year: '1980', genre: 'Lagu Tradisional Sasak' },
  { title: 'Pai Mura Rame', artist: 'Lagu Daerah NTB', year: '1972', genre: 'Lagu Tradisional Sasak' },

  // ─── Nusa Tenggara Timur (NTT) ───
  { title: 'Anak Kambing Saya', artist: 'Lagu Daerah NTT', year: '1950', genre: 'Lagu Tradisional Timor' },
  { title: 'Potong Bebek Angsa', artist: 'Lagu Daerah NTT', year: '1945', genre: 'Lagu Tradisional Timor' },
  { title: 'Bolelebo', artist: 'Lagu Daerah NTT', year: '1955', genre: 'Lagu Tradisional Rote' },
  { title: 'Desaku', artist: 'Lagu Daerah NTT', year: '1948', genre: 'Lagu Tradisional NTT' },
  { title: 'Gemu Fa Mi Re', artist: 'Nyong Franco / Lagu Daerah NTT', year: '2011', genre: 'Lagu Tradisional Maumere' },
  { title: 'O Nina Noi', artist: 'Lagu Daerah NTT', year: '1960', genre: 'Lagu Tradisional Timor' },
  { title: 'Mai Fali E', artist: 'Lagu Daerah NTT', year: '1965', genre: 'Lagu Tradisional Rote' },
  { title: 'Lerang Wulan', artist: 'Lagu Daerah NTT', year: '1970', genre: 'Lagu Tradisional Flores' },
  { title: 'Mana Lolo Banda', artist: 'Lagu Daerah NTT', year: '1972', genre: 'Lagu Tradisional Rote' },
  { title: 'Ofa Ngao', artist: 'Lagu Daerah NTT', year: '1975', genre: 'Lagu Tradisional Flores' },
  { title: 'Flobamora', artist: 'Lagu Daerah NTT', year: '1980', genre: 'Lagu Tradisional NTT' },
  { title: 'Bale Nagi', artist: 'Lagu Daerah NTT', year: '1985', genre: 'Lagu Tradisional Larantuka' },

  // ─── Kalimantan Barat ───
  { title: 'Cik Cik Periuk', artist: 'Lagu Daerah Kalimantan Barat', year: '1930', genre: 'Lagu Tradisional Sambas' },
  { title: 'Aek Kapuas', artist: 'Lagu Daerah Kalimantan Barat', year: '1965', genre: 'Lagu Tradisional Melayu Pontianak' },
  { title: 'Sungai Kapuas', artist: 'Lagu Daerah Kalimantan Barat', year: '1970', genre: 'Lagu Tradisional Melayu Pontianak' },
  { title: 'Alon-Alon', artist: 'Lagu Daerah Kalimantan Barat', year: '1960', genre: 'Lagu Tradisional Dayak' },
  { title: 'Dare Bandung', artist: 'Lagu Daerah Kalimantan Barat', year: '1975', genre: 'Lagu Tradisional Dayak' },
  { title: 'Ka\' Kain Pantun', artist: 'Lagu Daerah Kalimantan Barat', year: '1980', genre: 'Lagu Tradisional Dayak' },

  // ─── Kalimantan Tengah ───
  { title: 'Kalayar', artist: 'Lagu Daerah Kalimantan Tengah', year: '1965', genre: 'Lagu Tradisional Dayak Ngaju' },
  { title: 'Naluya', artist: 'Lagu Daerah Kalimantan Tengah', year: '1960', genre: 'Lagu Tradisional Dayak Ngaju' },
  { title: 'Tumpi Wahyu', artist: 'Lagu Daerah Kalimantan Tengah', year: '1970', genre: 'Lagu Tradisional Dayak Ngaju' },
  { title: 'Palu Lempong Popi', artist: 'Lagu Daerah Kalimantan Tengah', year: '1975', genre: 'Lagu Tradisional Dayak' },
  { title: 'Manasai', artist: 'Lagu Daerah Kalimantan Tengah', year: '1980', genre: 'Lagu Tradisional Dayak' },
  { title: 'Oh Indang Oh Apang', artist: 'Lagu Daerah Kalimantan Tengah', year: '1985', genre: 'Lagu Tradisional Dayak' },
  { title: 'Isen Mulang', artist: 'Lagu Daerah Kalimantan Tengah', year: '1990', genre: 'Lagu Tradisional Dayak' },

  // ─── Kalimantan Selatan ───
  { title: 'Ampar-Ampar Pisang', artist: 'Lagu Daerah Kalimantan Selatan', year: '1950', genre: 'Lagu Tradisional Banjar' },
  { title: 'Paris Barantai', artist: 'Lagu Daerah Kalimantan Selatan', year: '1960', genre: 'Lagu Tradisional Banjar' },
  { title: 'Saputangan Bapuncu Ampat', artist: 'Lagu Daerah Kalimantan Selatan', year: '1965', genre: 'Lagu Tradisional Banjar' },
  { title: 'Anak Pipit', artist: 'Lagu Daerah Kalimantan Selatan', year: '1970', genre: 'Lagu Tradisional Banjar' },
  { title: 'Ayun Apan', artist: 'Lagu Daerah Kalimantan Selatan', year: '1975', genre: 'Lagu Tradisional Banjar' },
  { title: 'Tirik Lalan', artist: 'Lagu Daerah Kalimantan Selatan', year: '1980', genre: 'Lagu Tradisional Banjar' },

  // ─── Kalimantan Timur & Utara ───
  { title: 'Indung-Indung', artist: 'Lagu Daerah Kalimantan Timur', year: '1960', genre: 'Lagu Tradisional Kutai' },
  { title: 'Oh Adingkoh', artist: 'Lagu Daerah Kalimantan Timur', year: '1965', genre: 'Lagu Tradisional Kutai' },
  { title: 'Burung Enggang', artist: 'Lagu Daerah Kalimantan Timur', year: '1970', genre: 'Lagu Tradisional Dayak Kenyah' },
  { title: 'Saban Saban Hari', artist: 'Lagu Daerah Kalimantan Timur', year: '1975', genre: 'Lagu Tradisional Kutai' },
  { title: 'Lamin Talunsur', artist: 'Lagu Daerah Kalimantan Timur', year: '1980', genre: 'Lagu Tradisional Dayak' },
  { title: 'Bebilin', artist: 'Lagu Daerah Kalimantan Utara', year: '1970', genre: 'Lagu Tradisional Tidung' },
  { title: 'Tuyang', artist: 'Lagu Daerah Kalimantan Utara', year: '1975', genre: 'Lagu Tradisional Bulungan' },

  // ─── Sulawesi Utara & Minahasa ───
  { title: 'Si Patokaan', artist: 'Lagu Daerah Sulawesi Utara', year: '1950', genre: 'Lagu Tradisional Minahasa' },
  { title: 'O Ina Ni Keke', artist: 'Lagu Daerah Sulawesi Utara', year: '1955', genre: 'Lagu Tradisional Minahasa' },
  { title: 'Esa Mokan', artist: 'Lagu Daerah Sulawesi Utara', year: '1960', genre: 'Lagu Tradisional Minahasa' },
  { title: 'Poco-Poco', artist: 'Yopie Latul / Lagu Daerah Sulawesi Utara', year: '1993', genre: 'Lagu Tradisional Manado' },
  { title: 'Gadis Taruna', artist: 'Lagu Daerah Sulawesi Utara', year: '1965', genre: 'Lagu Tradisional Sangihe' },
  { title: 'Tahanusangkara', artist: 'Lagu Daerah Sulawesi Utara', year: '1970', genre: 'Lagu Tradisional Sangihe' },
  { title: 'Nikani Kaku', artist: 'Lagu Daerah Sulawesi Utara', year: '1975', genre: 'Lagu Tradisional Bolaang Mongondow' },

  // ─── Gorontalo ───
  { title: 'Binde Biluhuta', artist: 'Lagu Daerah Gorontalo', year: '1965', genre: 'Lagu Tradisional Gorontalo' },
  { title: 'Moholunga', artist: 'Lagu Daerah Gorontalo', year: '1970', genre: 'Lagu Tradisional Gorontalo' },
  { title: 'Dabu-Dabu', artist: 'Lagu Daerah Gorontalo', year: '1975', genre: 'Lagu Tradisional Gorontalo' },
  { title: 'Hulonthalo Lipu\'u', artist: 'Lagu Daerah Gorontalo', year: '1960', genre: 'Lagu Tradisional Gorontalo' },
  { title: 'Tilola Malo Wolo Wololo', artist: 'Lagu Daerah Gorontalo', year: '1980', genre: 'Lagu Tradisional Gorontalo' },

  // ─── Sulawesi Tengah ───
  { title: 'Tondok Kadadingku', artist: 'Lagu Daerah Sulawesi Tengah', year: '1965', genre: 'Lagu Tradisional Kaili' },
  { title: 'Tananggu Kaili', artist: 'Lagu Daerah Sulawesi Tengah', year: '1970', genre: 'Lagu Tradisional Kaili' },
  { title: 'Posisani', artist: 'Lagu Daerah Sulawesi Tengah', year: '1975', genre: 'Lagu Tradisional Kaili' },
  { title: 'Randa Ntovea', artist: 'Lagu Daerah Sulawesi Tengah', year: '1980', genre: 'Lagu Tradisional Kaili' },
  { title: 'Palu Ngataku', artist: 'Lagu Daerah Sulawesi Tengah', year: '1985', genre: 'Lagu Tradisional Kaili' },

  // ─── Sulawesi Barat ───
  { title: 'Tenggang-Tenggang Lopi', artist: 'Lagu Daerah Sulawesi Barat', year: '1960', genre: 'Lagu Tradisional Mandar' },
  { title: 'Sayang-Sayang', artist: 'Lagu Daerah Sulawesi Barat', year: '1965', genre: 'Lagu Tradisional Mandar' },
  { title: 'Malluya', artist: 'Lagu Daerah Sulawesi Barat', year: '1970', genre: 'Lagu Tradisional Mandar' },
  { title: 'Lita Pembolongan', artist: 'Lagu Daerah Sulawesi Barat', year: '1975', genre: 'Lagu Tradisional Mandar' },
  { title: 'Pulo Karampuang', artist: 'Lagu Daerah Sulawesi Barat', year: '1980', genre: 'Lagu Tradisional Mamuju' },

  // ─── Sulawesi Selatan (Bugis, Makassar, Toraja) ───
  { title: 'Angin Mammiri', artist: 'Lagu Daerah Sulawesi Selatan', year: '1940', genre: 'Lagu Tradisional Makassar' },
  { title: 'Pakarena', artist: 'Lagu Daerah Sulawesi Selatan', year: '1950', genre: 'Lagu Tradisional Makassar' },
  { title: 'Marencong-Rencong', artist: 'Lagu Daerah Sulawesi Selatan', year: '1955', genre: 'Lagu Tradisional Bugis' },
  { title: 'Ammac Ciang', artist: 'Lagu Daerah Sulawesi Selatan', year: '1960', genre: 'Lagu Tradisional Makassar' },
  { title: 'Ana\' Malie', artist: 'Lagu Daerah Sulawesi Selatan', year: '1965', genre: 'Lagu Tradisional Bugis' },
  { title: 'To Maelo', artist: 'Lagu Daerah Sulawesi Selatan', year: '1970', genre: 'Lagu Tradisional Toraja' },
  { title: 'Indo Logo', artist: 'Lagu Daerah Sulawesi Selatan', year: '1965', genre: 'Lagu Tradisional Bugis' },
  { title: 'Sarira Rokko Rokko', artist: 'Lagu Daerah Sulawesi Selatan', year: '1975', genre: 'Lagu Tradisional Toraja' },
  { title: 'Batti-Batti', artist: 'Lagu Daerah Sulawesi Selatan', year: '1970', genre: 'Lagu Tradisional Selayar' },
  { title: 'Ati Raja', artist: 'Lagu Daerah Sulawesi Selatan', year: '1945', genre: 'Lagu Tradisional Makassar' },
  { title: 'Bulu Alau\'na Tempe', artist: 'Lagu Daerah Sulawesi Selatan', year: '1968', genre: 'Lagu Tradisional Wajo' },

  // ─── Sulawesi Tenggara ───
  { title: 'Peia Tawa-Tawa', artist: 'Lagu Daerah Sulawesi Tenggara', year: '1965', genre: 'Lagu Tradisional Tolaki' },
  { title: 'Wulele Sanggula', artist: 'Lagu Daerah Sulawesi Tenggara', year: '1970', genre: 'Lagu Tradisional Tolaki' },
  { title: 'Tana Wolio', artist: 'Lagu Daerah Sulawesi Tenggara', year: '1975', genre: 'Lagu Tradisional Buton' },
  { title: 'Ko Mo Sio', artist: 'Lagu Daerah Sulawesi Tenggara', year: '1980', genre: 'Lagu Tradisional Muna' },
  { title: 'Symponi Bahteramas', artist: 'Lagu Daerah Sulawesi Tenggara', year: '1990', genre: 'Lagu Tradisional Sultra' },

  // ─── Maluku & Maluku Utara ───
  { title: 'Rasa Sayange', artist: 'Lagu Daerah Maluku', year: '1900', genre: 'Lagu Tradisional Maluku' },
  { title: 'Ayo Mama', artist: 'Lagu Daerah Maluku', year: '1930', genre: 'Lagu Tradisional Maluku' },
  { title: 'Buka Pintu', artist: 'Lagu Daerah Maluku', year: '1940', genre: 'Lagu Tradisional Maluku' },
  { title: 'Burung Kakatua', artist: 'Lagu Daerah Maluku', year: '1920', genre: 'Lagu Tradisional Maluku' },
  { title: 'Kole-Kole', artist: 'Lagu Daerah Maluku', year: '1950', genre: 'Lagu Tradisional Maluku' },
  { title: 'Sayang Kene', artist: 'Lagu Daerah Maluku', year: '1955', genre: 'Lagu Tradisional Maluku' },
  { title: 'Saule', artist: 'Lagu Daerah Maluku', year: '1960', genre: 'Lagu Tradisional Maluku' },
  { title: 'O Ulate', artist: 'Lagu Daerah Maluku', year: '1965', genre: 'Lagu Tradisional Maluku' },
  { title: 'Hela Rotane', artist: 'Lagu Daerah Maluku', year: '1970', genre: 'Lagu Tradisional Maluku' },
  { title: 'Lembe-Lembe', artist: 'Lagu Daerah Maluku', year: '1968', genre: 'Lagu Tradisional Maluku' },
  { title: 'Goro-Goro Ne', artist: 'Lagu Daerah Maluku', year: '1972', genre: 'Lagu Tradisional Maluku' },
  { title: 'Tanase', artist: 'Lagu Daerah Maluku', year: '1975', genre: 'Lagu Tradisional Maluku' },
  { title: 'Borero', artist: 'Lagu Daerah Maluku Utara', year: '1970', genre: 'Lagu Tradisional Ternate' },
  { title: 'Moloku Kie Raha', artist: 'Lagu Daerah Maluku Utara', year: '1975', genre: 'Lagu Tradisional Tidore' },
  { title: 'Una Nande', artist: 'Lagu Daerah Maluku Utara', year: '1980', genre: 'Lagu Tradisional Malut' },

  // ─── Papua & Tanah Papua ───
  { title: 'Yamko Rambe Yamko', artist: 'Lagu Daerah Papua', year: '1950', genre: 'Lagu Tradisional Papua' },
  { title: 'Apuse', artist: 'Lagu Daerah Papua', year: '1960', genre: 'Lagu Tradisional Papua Biak' },
  { title: 'Sajojo', artist: 'Lagu Daerah Papua', year: '1985', genre: 'Lagu Tradisional Papua' },
  { title: 'E Mambo Simbo', artist: 'Lagu Daerah Papua', year: '1970', genre: 'Lagu Tradisional Papua' },
  { title: 'Diru Diru Nina', artist: 'Lagu Daerah Papua', year: '1975', genre: 'Lagu Tradisional Papua' },
  { title: 'Wesupe', artist: 'Lagu Daerah Papua', year: '1980', genre: 'Lagu Tradisional Papua' },
  { title: 'Rasine Ma Go', artist: 'Lagu Daerah Papua', year: '1985', genre: 'Lagu Tradisional Papua' },
  { title: 'Akai Bipamari', artist: 'Lagu Daerah Papua', year: '1978', genre: 'Lagu Tradisional Papua' },
  { title: 'Sup Mambeso', artist: 'Lagu Daerah Papua', year: '1982', genre: 'Lagu Tradisional Papua' }
];

module.exports = { traditionalIndoSongs };
