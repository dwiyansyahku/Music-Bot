const fs = require('fs');
const path = require('path');

console.log('⏳ Sedang menyusun database lagu dengan tahun rilis akurat...');

// ══════════════════════════════════════════════════════════════
// 1. INDONESIA
// ══════════════════════════════════════════════════════════════
const indo = [
  // ─── Tulus ───
  { title: 'Hati-Hati di Jalan', artist: 'Tulus', year: '2022', genre: 'Indo Pop' },
  { title: 'Monokrom', artist: 'Tulus', year: '2016', genre: 'Indo Pop' },
  { title: 'Diri', artist: 'Tulus', year: '2022', genre: 'Indo Pop' },
  { title: 'Sepatu', artist: 'Tulus', year: '2013', genre: 'Indo Pop' },
  { title: 'Gajah', artist: 'Tulus', year: '2014', genre: 'Indo Pop' },
  { title: 'Jangan Cintai Aku Apa Adanya', artist: 'Tulus', year: '2014', genre: 'Indo Pop' },
  { title: 'Pamit', artist: 'Tulus', year: '2016', genre: 'Indo Pop' },
  { title: 'Tujuh Belas', artist: 'Tulus', year: '2011', genre: 'Indo Pop' },
  { title: 'Kelana', artist: 'Tulus', year: '2022', genre: 'Indo Pop' },
  { title: 'Remedi', artist: 'Tulus', year: '2022', genre: 'Indo Pop' },
  { title: 'Interaksi', artist: 'Tulus', year: '2011', genre: 'Indo Pop' },
  { title: 'Sewindu', artist: 'Tulus', year: '2016', genre: 'Indo Pop' },
  { title: 'Teman Pesta', artist: 'Tulus', year: '2016', genre: 'Indo Pop' },
  { title: 'Ruang Sendiri', artist: 'Tulus', year: '2016', genre: 'Indo Pop' },
  { title: 'Langit Abu-Abu', artist: 'Tulus', year: '2022', genre: 'Indo Pop' },
  { title: 'Manusia Kuat', artist: 'Tulus', year: '2016', genre: 'Indo Pop' },
  // ─── Mahalini ───
  { title: 'Sial', artist: 'Mahalini', year: '2023', genre: 'Indo Pop' },
  { title: 'Mati-Matian', artist: 'Mahalini', year: '2024', genre: 'Indo Pop' },
  { title: 'Sisa Rasa', artist: 'Mahalini', year: '2021', genre: 'Indo Pop' },
  { title: 'Kisah Sempurna', artist: 'Mahalini', year: '2022', genre: 'Indo Pop' },
  { title: 'Melawan Restu', artist: 'Mahalini', year: '2021', genre: 'Indo Pop' },
  { title: 'Bohongi Hati', artist: 'Mahalini', year: '2023', genre: 'Indo Pop' },
  { title: 'Aku yang Salah', artist: 'Mahalini ft. Nuca', year: '2022', genre: 'Indo Pop' },
  { title: 'Bermuara', artist: 'Mahalini', year: '2022', genre: 'Indo Pop' },
  // ─── Bernadya ───
  { title: 'Satu Bulan', artist: 'Bernadya', year: '2024', genre: 'Indo Pop' },
  { title: 'Kata Mereka Ini Berlebihan', artist: 'Bernadya', year: '2024', genre: 'Indo Pop' },
  { title: 'Untungnya, Hidup Harus Tetap Berjalan', artist: 'Bernadya', year: '2024', genre: 'Indo Pop' },
  { title: 'Kini Mereka Tahu', artist: 'Bernadya', year: '2024', genre: 'Indo Pop' },
  { title: 'Apa Mungkin', artist: 'Bernadya', year: '2022', genre: 'Indo Pop' },
  { title: 'Terlintas', artist: 'Bernadya', year: '2024', genre: 'Indo Pop' },
  // ─── Sal Priadi ───
  { title: 'Gala Bunga Matahari', artist: 'Sal Priadi', year: '2024', genre: 'Indo Indie' },
  { title: 'Dari Planet Lain', artist: 'Sal Priadi', year: '2024', genre: 'Indo Indie' },
  { title: 'Amin Paling Serius', artist: 'Sal Priadi ft. Nadin Amizah', year: '2019', genre: 'Indo Indie' },
  // ─── Juicy Luicy ───
  { title: 'Lantas', artist: 'Juicy Luicy', year: '2020', genre: 'Indo Pop' },
  { title: 'Tanpa Tergesa', artist: 'Juicy Luicy', year: '2018', genre: 'Indo Pop' },
  { title: 'Tampar', artist: 'Juicy Luicy', year: '2022', genre: 'Indo Pop' },
  { title: 'Asing', artist: 'Juicy Luicy', year: '2023', genre: 'Indo Pop' },
  { title: 'Sayangnya', artist: 'Juicy Luicy', year: '2023', genre: 'Indo Pop' },
  { title: 'Mawar Jingga', artist: 'Juicy Luicy', year: '2019', genre: 'Indo Pop' },
  { title: 'Terlalu Tinggi', artist: 'Juicy Luicy', year: '2020', genre: 'Indo Pop' },
  // ─── Nadin Amizah ───
  { title: 'Bertaut', artist: 'Nadin Amizah', year: '2020', genre: 'Indo Indie' },
  { title: 'Rayuan Perempuan Gila', artist: 'Nadin Amizah', year: '2023', genre: 'Indo Indie' },
  { title: 'Sorai', artist: 'Nadin Amizah', year: '2019', genre: 'Indo Indie' },
  { title: 'Rumpang', artist: 'Nadin Amizah', year: '2018', genre: 'Indo Indie' },
  { title: 'Taruh', artist: 'Nadin Amizah', year: '2020', genre: 'Indo Indie' },
  // ─── Pamungkas ───
  { title: 'To the Bone', artist: 'Pamungkas', year: '2019', genre: 'Indo Indie' },
  { title: 'Kenangan Manis', artist: 'Pamungkas', year: '2018', genre: 'Indo Indie' },
  { title: 'I Love You but I\'m Letting Go', artist: 'Pamungkas', year: '2018', genre: 'Indo Indie' },
  { title: 'Only One', artist: 'Pamungkas', year: '2018', genre: 'Indo Indie' },
  { title: 'Flying Solo', artist: 'Pamungkas', year: '2019', genre: 'Indo Indie' },
  { title: 'Monolog', artist: 'Pamungkas', year: '2019', genre: 'Indo Indie' },
  { title: 'One Only', artist: 'Pamungkas', year: '2018', genre: 'Indo Indie' },
  // ─── Hindia ───
  { title: 'Rumah ke Rumah', artist: 'Hindia', year: '2019', genre: 'Indo Indie' },
  { title: 'Evaluasi', artist: 'Hindia', year: '2019', genre: 'Indo Indie' },
  { title: 'Secukupnya', artist: 'Hindia', year: '2019', genre: 'Indo Indie' },
  { title: 'Membasuh', artist: 'Hindia', year: '2019', genre: 'Indo Indie' },
  { title: 'Dehidrasi', artist: 'Hindia', year: '2019', genre: 'Indo Indie' },
  // ─── Sheila On 7 ───
  { title: 'Dan...', artist: 'Sheila On 7', year: '2000', genre: 'Indo Pop Rock' },
  { title: 'Sephia', artist: 'Sheila On 7', year: '2000', genre: 'Indo Pop Rock' },
  { title: 'Sebuah Kisah Klasik', artist: 'Sheila On 7', year: '2000', genre: 'Indo Pop Rock' },
  { title: 'Hari Bersamanya', artist: 'Sheila On 7', year: '2011', genre: 'Indo Pop Rock' },
  { title: 'Mudah Saja', artist: 'Sheila On 7', year: '2009', genre: 'Indo Pop Rock' },
  { title: 'Lapang Dada', artist: 'Sheila On 7', year: '2014', genre: 'Indo Pop Rock' },
  { title: 'Pejantan Tangguh', artist: 'Sheila On 7', year: '2004', genre: 'Indo Pop Rock' },
  { title: 'Betapa', artist: 'Sheila On 7', year: '2008', genre: 'Indo Pop Rock' },
  { title: 'Pria Kesepian', artist: 'Sheila On 7', year: '2000', genre: 'Indo Pop Rock' },
  { title: 'Kita', artist: 'Sheila On 7', year: '2002', genre: 'Indo Pop Rock' },
  { title: 'J.A.P', artist: 'Sheila On 7', year: '2002', genre: 'Indo Pop Rock' },
  { title: 'Anugerah Terindah yang Pernah Kumiliki', artist: 'Sheila On 7', year: '2002', genre: 'Indo Pop Rock' },
  { title: 'Seberapa Pantas', artist: 'Sheila On 7', year: '1999', genre: 'Indo Pop Rock' },
  { title: 'Pemuja Rahasia', artist: 'Sheila On 7', year: '2014', genre: 'Indo Pop Rock' },
  { title: 'Sahabat Sejati', artist: 'Sheila On 7', year: '2008', genre: 'Indo Pop Rock' },
  { title: 'Melompat Lebih Tinggi', artist: 'Sheila On 7', year: '2004', genre: 'Indo Pop Rock' },
  // ─── Dewa 19 ───
  { title: 'Kangen', artist: 'Dewa 19', year: '1992', genre: 'Indo Rock' },
  { title: 'Pupus', artist: 'Dewa 19', year: '2002', genre: 'Indo Rock' },
  { title: 'Risalah Hati', artist: 'Dewa 19', year: '2000', genre: 'Indo Rock' },
  { title: 'Separuh Nafas', artist: 'Dewa 19', year: '2000', genre: 'Indo Rock' },
  { title: 'Cemburu', artist: 'Dewa 19', year: '2000', genre: 'Indo Rock' },
  { title: 'Arjuna', artist: 'Dewa 19', year: '2002', genre: 'Indo Rock' },
  { title: 'Roman Picisan', artist: 'Dewa 19', year: '2000', genre: 'Indo Rock' },
  { title: 'Cinta Kan Membawamu Kembali', artist: 'Dewa 19', year: '1995', genre: 'Indo Rock' },
  { title: 'Elang', artist: 'Dewa 19', year: '1992', genre: 'Indo Rock' },
  { title: 'Cukup Siti Nurbaya', artist: 'Dewa 19', year: '1992', genre: 'Indo Rock' },
  { title: 'Kamulah Satu-Satunya', artist: 'Dewa 19', year: '1994', genre: 'Indo Rock' },
  { title: 'Laskar Cinta', artist: 'Dewa 19', year: '2004', genre: 'Indo Rock' },
  { title: 'Pangeran Cinta', artist: 'Dewa 19', year: '2004', genre: 'Indo Rock' },
  { title: 'Sayap Sayap Patah', artist: 'Dewa 19', year: '2004', genre: 'Indo Rock' },
  // ─── Peterpan / NOAH ───
  { title: 'Yang Terdalam', artist: 'Peterpan', year: '2003', genre: 'Indo Pop Rock' },
  { title: 'Mungkin Nanti', artist: 'Peterpan', year: '2004', genre: 'Indo Pop Rock' },
  { title: 'Ada Apa Denganmu', artist: 'Peterpan', year: '2004', genre: 'Indo Pop Rock' },
  { title: 'Bintang di Surga', artist: 'Peterpan', year: '2004', genre: 'Indo Pop Rock' },
  { title: 'Semua Tentang Kita', artist: 'Peterpan', year: '2003', genre: 'Indo Pop Rock' },
  { title: 'Ku Katakan Dengan Indah', artist: 'Peterpan', year: '2004', genre: 'Indo Pop Rock' },
  { title: 'Mimpi yang Sempurna', artist: 'Peterpan', year: '2003', genre: 'Indo Pop Rock' },
  { title: 'Sahabat', artist: 'Peterpan', year: '2003', genre: 'Indo Pop Rock' },
  { title: 'Menghapus Jejakmu', artist: 'Peterpan', year: '2008', genre: 'Indo Pop Rock' },
  { title: 'Cobalah Mengerti', artist: 'Peterpan', year: '2007', genre: 'Indo Pop Rock' },
  { title: 'Walau Habis Terang', artist: 'Peterpan', year: '2007', genre: 'Indo Pop Rock' },
  { title: 'Tak Ada yang Abadi', artist: 'Peterpan', year: '2008', genre: 'Indo Pop Rock' },
  { title: 'Separuh Aku', artist: 'NOAH', year: '2012', genre: 'Indo Pop Rock' },
  { title: 'Kupu-Kupu Malam', artist: 'NOAH', year: '2022', genre: 'Indo Pop Rock' },
  { title: 'Wanitaku', artist: 'NOAH', year: '2019', genre: 'Indo Pop Rock' },
  { title: 'Jalani Mimpi', artist: 'NOAH', year: '2012', genre: 'Indo Pop Rock' },
  { title: 'Hidup Untukmu Mati Tanpamu', artist: 'NOAH', year: '2012', genre: 'Indo Pop Rock' },
  // ─── Rizky Febian ───
  { title: 'Kesempurnaan Cinta', artist: 'Rizky Febian', year: '2015', genre: 'Indo Pop' },
  { title: 'Hingga Tua Bersama', artist: 'Rizky Febian', year: '2021', genre: 'Indo Pop' },
  { title: 'Cuek', artist: 'Rizky Febian', year: '2020', genre: 'Indo Pop' },
  { title: 'Mantra Cinta', artist: 'Rizky Febian', year: '2020', genre: 'Indo Pop' },
  { title: 'Makna Cinta', artist: 'Rizky Febian', year: '2020', genre: 'Indo Pop' },
  { title: 'Cukup Tau', artist: 'Rizky Febian', year: '2017', genre: 'Indo Pop' },
  { title: 'Indah Pada Waktunya', artist: 'Rizky Febian ft. Aisyah Aziz', year: '2017', genre: 'Indo Pop' },
  // ─── Tiara Andini ───
  { title: 'Usai', artist: 'Tiara Andini', year: '2022', genre: 'Indo Pop' },
  { title: 'Merasa Indah', artist: 'Tiara Andini', year: '2021', genre: 'Indo Pop' },
  { title: 'Maafkan Aku #terlanjurmencinta', artist: 'Tiara Andini', year: '2020', genre: 'Indo Pop' },
  { title: 'Menjadi Dia', artist: 'Tiara Andini', year: '2023', genre: 'Indo Pop' },
  // ─── Lyodra ───
  { title: 'Pesan Terakhir', artist: 'Lyodra', year: '2021', genre: 'Indo Pop' },
  { title: 'Sang Dewi', artist: 'Lyodra ft. Andi Rianto', year: '2022', genre: 'Indo Pop' },
  { title: 'Kalau Bosan', artist: 'Lyodra', year: '2021', genre: 'Indo Pop' },
  // ─── Raisa ───
  { title: 'Mantan Terindah', artist: 'Raisa', year: '2013', genre: 'Indo Pop' },
  { title: 'Serba Salah', artist: 'Raisa', year: '2011', genre: 'Indo Pop' },
  { title: 'Kali Kedua', artist: 'Raisa', year: '2016', genre: 'Indo Pop' },
  { title: 'Jatuh Hati', artist: 'Raisa', year: '2015', genre: 'Indo Pop' },
  { title: 'Bahasa Kalbu', artist: 'Raisa ft. Andi Rianto', year: '2020', genre: 'Indo Pop' },
  // ─── Afgan ───
  { title: 'Terima Kasih Cinta', artist: 'Afgan', year: '2008', genre: 'Indo Pop' },
  { title: 'Bukan Cinta Biasa', artist: 'Afgan', year: '2007', genre: 'Indo Pop' },
  { title: 'Sadis', artist: 'Afgan', year: '2008', genre: 'Indo Pop' },
  { title: 'Jodoh Pasti Bertemu', artist: 'Afgan', year: '2014', genre: 'Indo Pop' },
  { title: 'Knock Me Out', artist: 'Afgan', year: '2016', genre: 'Indo Pop' },
  // ─── Rossa ───
  { title: 'Hati yang Kau Sakiti', artist: 'Rossa', year: '2002', genre: 'Indo Pop' },
  { title: 'Tegar', artist: 'Rossa', year: '2003', genre: 'Indo Pop' },
  { title: 'Ayat-Ayat Cinta', artist: 'Rossa', year: '2008', genre: 'Indo Pop' },
  { title: 'Pudar', artist: 'Rossa', year: '2001', genre: 'Indo Pop' },
  { title: 'Aku Bukan Untukmu', artist: 'Rossa', year: '2002', genre: 'Indo Pop' },
  { title: 'Terlalu Cinta', artist: 'Rossa', year: '2014', genre: 'Indo Pop' },
  // ─── Payung Teduh ───
  { title: 'Akad', artist: 'Payung Teduh', year: '2017', genre: 'Indo Folk' },
  { title: 'Menuju Senja', artist: 'Payung Teduh', year: '2012', genre: 'Indo Folk' },
  { title: 'Resah', artist: 'Payung Teduh', year: '2014', genre: 'Indo Folk' },
  { title: 'Untuk Perempuan Yang Sedang Dalam Pelukan', artist: 'Payung Teduh', year: '2012', genre: 'Indo Folk' },
  { title: 'Angin Pujaan Hujan', artist: 'Payung Teduh', year: '2017', genre: 'Indo Folk' },
  // ─── Fourtwnty ───
  { title: 'Zona Nyaman', artist: 'Fourtwnty', year: '2018', genre: 'Indo Indie' },
  { title: 'Fana Merah Jambu', artist: 'Fourtwnty', year: '2017', genre: 'Indo Indie' },
  { title: 'Aku Tenang', artist: 'Fourtwnty', year: '2019', genre: 'Indo Indie' },
  { title: 'Hitam Putih', artist: 'Fourtwnty', year: '2016', genre: 'Indo Indie' },
  { title: 'Trilogi', artist: 'Fourtwnty', year: '2017', genre: 'Indo Indie' },
  // ─── Raim Laode ───
  { title: 'Komang', artist: 'Raim Laode', year: '2022', genre: 'Indo Pop' },
  // ─── Ghea Indrawari ───
  { title: 'Jiwa Yang Bersedih', artist: 'Ghea Indrawari', year: '2023', genre: 'Indo Pop' },
  // ─── Anggi Marito ───
  { title: 'Tak Segampang Itu', artist: 'Anggi Marito', year: '2023', genre: 'Indo Pop' },
  // ─── Budi Doremi ───
  { title: 'Melukis Senja', artist: 'Budi Doremi', year: '2020', genre: 'Indo Pop' },
  { title: 'Tolong', artist: 'Budi Doremi', year: '2018', genre: 'Indo Pop' },
  { title: 'Doremi', artist: 'Budi Doremi', year: '2011', genre: 'Indo Pop' },
  // ─── Denny Caknan ───
  { title: 'Kartonyono Medot Janji', artist: 'Denny Caknan', year: '2019', genre: 'Indo Koplo' },
  { title: 'Sugeng Dalu', artist: 'Denny Caknan', year: '2019', genre: 'Indo Koplo' },
  { title: 'Los Dol', artist: 'Denny Caknan', year: '2020', genre: 'Indo Koplo' },
  { title: 'Kalih Welasku', artist: 'Denny Caknan', year: '2022', genre: 'Indo Koplo' },
  { title: 'Cundamani', artist: 'Denny Caknan', year: '2023', genre: 'Indo Koplo' },
  { title: 'Satru', artist: 'Denny Caknan ft. Happy Asmara', year: '2021', genre: 'Indo Koplo' },
  { title: 'Widodari', artist: 'Denny Caknan ft. Guyon Waton', year: '2021', genre: 'Indo Koplo' },
  // ─── Didi Kempot ───
  { title: 'Pamer Bojo', artist: 'Didi Kempot', year: '2019', genre: 'Indo Campursari' },
  { title: 'Banyu Langit', artist: 'Didi Kempot', year: '2016', genre: 'Indo Campursari' },
  { title: 'Stasiun Balapan', artist: 'Didi Kempot', year: '1999', genre: 'Indo Campursari' },
  { title: 'Cidro', artist: 'Didi Kempot', year: '2000', genre: 'Indo Campursari' },
  { title: 'Layang Kangen', artist: 'Didi Kempot', year: '2003', genre: 'Indo Campursari' },
  { title: 'Sewu Kuto', artist: 'Didi Kempot', year: '2001', genre: 'Indo Campursari' },
  { title: 'Tatu', artist: 'Didi Kempot', year: '2020', genre: 'Indo Campursari' },
  // ─── Guyon Waton ───
  { title: 'Korban Janji', artist: 'Guyon Waton', year: '2018', genre: 'Indo Pop Jawa' },
  { title: 'Perlahan', artist: 'Guyon Waton', year: '2020', genre: 'Indo Pop Jawa' },
  { title: 'Sanes', artist: 'Guyon Waton ft. Denny Caknan', year: '2023', genre: 'Indo Pop Jawa' },
  // ─── D'Masiv ───
  { title: 'Cinta Ini Membunuhku', artist: 'D\'Masiv', year: '2008', genre: 'Indo Pop Rock' },
  { title: 'Jangan Menyerah', artist: 'D\'Masiv', year: '2009', genre: 'Indo Pop Rock' },
  { title: 'Merindukanmu', artist: 'D\'Masiv', year: '2008', genre: 'Indo Pop Rock' },
  { title: 'Sudahi Perih Ini', artist: 'D\'Masiv', year: '2008', genre: 'Indo Pop Rock' },
  { title: 'Rindu Setengah Mati', artist: 'D\'Masiv', year: '2012', genre: 'Indo Pop Rock' },
  // ─── Armada ───
  { title: 'Asal Kau Bahagia', artist: 'Armada', year: '2017', genre: 'Indo Pop' },
  { title: 'Harusnya Aku', artist: 'Armada', year: '2012', genre: 'Indo Pop' },
  { title: 'Pergi Pagi Pulang Pagi', artist: 'Armada', year: '2008', genre: 'Indo Pop' },
  { title: 'Mau Dibawa Kemana', artist: 'Armada', year: '2019', genre: 'Indo Pop' },
  // ─── Ungu ───
  { title: 'Demi Waktu', artist: 'Ungu', year: '2002', genre: 'Indo Pop Rock' },
  { title: 'Kekasih Gelapku', artist: 'Ungu', year: '2005', genre: 'Indo Pop Rock' },
  { title: 'Tercipta Untukku', artist: 'Ungu', year: '2009', genre: 'Indo Pop Rock' },
  { title: 'Cinta Dalam Hati', artist: 'Ungu', year: '2009', genre: 'Indo Pop Rock' },
  { title: 'Laguku', artist: 'Ungu', year: '2002', genre: 'Indo Pop Rock' },
  { title: 'Andai Ku Tahu', artist: 'Ungu', year: '2005', genre: 'Indo Pop Rock' },
  { title: 'Bila Tiba', artist: 'Ungu', year: '2008', genre: 'Indo Pop Rock' },
  // ─── Slank ───
  { title: 'Terlalu Manis', artist: 'Slank', year: '2001', genre: 'Indo Rock' },
  { title: 'Ku Tak Bisa', artist: 'Slank', year: '1996', genre: 'Indo Rock' },
  { title: 'I Miss You But I Hate You', artist: 'Slank', year: '2001', genre: 'Indo Rock' },
  { title: 'Virus', artist: 'Slank', year: '2001', genre: 'Indo Rock' },
  { title: 'Balikin', artist: 'Slank', year: '1993', genre: 'Indo Rock' },
  { title: 'Mawar Merah', artist: 'Slank', year: '1990', genre: 'Indo Rock' },
  // ─── Padi ───
  { title: 'Sobat', artist: 'Padi', year: '2005', genre: 'Indo Pop Rock' },
  { title: 'Mahadewi', artist: 'Padi', year: '2005', genre: 'Indo Pop Rock' },
  { title: 'Begitu Indah', artist: 'Padi', year: '2001', genre: 'Indo Pop Rock' },
  { title: 'Semua Tak Sama', artist: 'Padi', year: '2003', genre: 'Indo Pop Rock' },
  { title: 'Kasih Tak Sampai', artist: 'Padi', year: '2001', genre: 'Indo Pop Rock' },
  { title: 'Menanti Sebuah Jawaban', artist: 'Padi', year: '2001', genre: 'Indo Pop Rock' },
  // ─── Samsons ───
  { title: 'Kenangan Terindah', artist: 'Samsons', year: '2006', genre: 'Indo Pop' },
  { title: 'Kisah Tak Sempurna', artist: 'Samsons', year: '2007', genre: 'Indo Pop' },
  { title: 'Dengan Nafasmu', artist: 'Samsons', year: '2006', genre: 'Indo Pop' },
  // ─── Letto ───
  { title: 'Ruang Rindu', artist: 'Letto', year: '2005', genre: 'Indo Pop' },
  { title: 'Sandaran Hati', artist: 'Letto', year: '2005', genre: 'Indo Pop' },
  { title: 'Sebelum Cahaya', artist: 'Letto', year: '2007', genre: 'Indo Pop' },
  // ─── Kahitna ───
  { title: 'Cantik', artist: 'Kahitna', year: '2000', genre: 'Indo Pop' },
  { title: 'Cerita Cinta', artist: 'Kahitna', year: '2005', genre: 'Indo Pop' },
  { title: 'Soulmate', artist: 'Kahitna', year: '2007', genre: 'Indo Pop' },
  { title: 'Takkan Terganti', artist: 'Kahitna', year: '2008', genre: 'Indo Pop' },
  // ─── Chrisye ───
  { title: 'Kisah Kasih di Sekolah', artist: 'Chrisye', year: '1977', genre: 'Indo Pop Legend' },
  { title: 'Pergilah Kasih', artist: 'Chrisye', year: '1984', genre: 'Indo Pop Legend' },
  { title: 'Kala Cinta Menggoda', artist: 'Chrisye', year: '1986', genre: 'Indo Pop Legend' },
  { title: 'Lilin-Lilin Kecil', artist: 'Chrisye', year: '1977', genre: 'Indo Pop Legend' },
  { title: 'Badai Pasti Berlalu', artist: 'Chrisye', year: '1977', genre: 'Indo Pop Legend' },
  // ─── Iwan Fals ───
  { title: 'Bento', artist: 'Iwan Fals', year: '1990', genre: 'Indo Folk Rock' },
  { title: 'Bongkar', artist: 'Iwan Fals', year: '1989', genre: 'Indo Folk Rock' },
  { title: 'Ibu', artist: 'Iwan Fals', year: '1990', genre: 'Indo Folk Rock' },
  { title: 'Kemesraan', artist: 'Iwan Fals', year: '1983', genre: 'Indo Folk Rock' },
  { title: 'Yang Terlupakan', artist: 'Iwan Fals', year: '1981', genre: 'Indo Folk Rock' },
  { title: 'Pesawat Tempurku', artist: 'Iwan Fals', year: '1988', genre: 'Indo Folk Rock' },
  { title: 'Sarjana Muda', artist: 'Iwan Fals', year: '1981', genre: 'Indo Folk Rock' },
  // ─── Glenn Fredly ───
  { title: 'Januari', artist: 'Glenn Fredly', year: '2003', genre: 'Indo R&B' },
  { title: 'Akhir Cerita Cinta', artist: 'Glenn Fredly', year: '2011', genre: 'Indo R&B' },
  { title: 'Kasih Putih', artist: 'Glenn Fredly', year: '2003', genre: 'Indo R&B' },
  { title: 'Sekali Ini Saja', artist: 'Glenn Fredly', year: '2002', genre: 'Indo R&B' },
  { title: 'Sedih Tak Berujung', artist: 'Glenn Fredly', year: '2009', genre: 'Indo R&B' },
  { title: 'Terserah', artist: 'Glenn Fredly', year: '2003', genre: 'Indo R&B' },
  // ─── Wali ───
  { title: 'Cari Jodoh', artist: 'Wali', year: '2009', genre: 'Indo Pop' },
  { title: 'Baik-Baik Sayang', artist: 'Wali', year: '2008', genre: 'Indo Pop' },
  { title: 'Yank', artist: 'Wali', year: '2009', genre: 'Indo Pop' },
  { title: 'Doaku Untukmu Sayang', artist: 'Wali', year: '2011', genre: 'Indo Pop' },
  // ─── Kangen Band ───
  { title: 'Tentang Aku, Kau dan Dia', artist: 'Kangen Band', year: '2007', genre: 'Indo Pop Melayu' },
  { title: 'Pujaan Hati', artist: 'Kangen Band', year: '2007', genre: 'Indo Pop Melayu' },
  { title: 'Terbang Bersamaku', artist: 'Kangen Band', year: '2009', genre: 'Indo Pop Melayu' },
  // ─── ST12 ───
  { title: 'Saat Terakhir', artist: 'ST12', year: '2008', genre: 'Indo Pop Melayu' },
  { title: 'Jangan Pernah Berubah', artist: 'ST12', year: '2008', genre: 'Indo Pop Melayu' },
  { title: 'Cari Pacar Lagi', artist: 'ST12', year: '2009', genre: 'Indo Pop Melayu' },
  { title: 'Rasa yang Tertinggal', artist: 'ST12', year: '2008', genre: 'Indo Pop Melayu' },
  // ─── Judika ───
  { title: 'Aku yang Tersakiti', artist: 'Judika', year: '2013', genre: 'Indo Pop' },
  { title: 'Bukan Dia Tapi Aku', artist: 'Judika', year: '2011', genre: 'Indo Pop' },
  { title: 'Mama Papa Larang', artist: 'Judika', year: '2013', genre: 'Indo Pop' },
  { title: 'Jikalau Kau Cinta', artist: 'Judika', year: '2015', genre: 'Indo Pop' },
  // ─── Bunga Citra Lestari ───
  { title: 'Cinta Sejati', artist: 'Bunga Citra Lestari', year: '2012', genre: 'Indo Pop' },
  { title: 'Kecewa', artist: 'Bunga Citra Lestari', year: '2008', genre: 'Indo Pop' },
  // ─── Maliq & D'Essentials ───
  { title: 'Dia', artist: 'Maliq & D\'Essentials', year: '2006', genre: 'Indo Jazz Pop' },
  { title: 'Untitled', artist: 'Maliq & D\'Essentials', year: '2005', genre: 'Indo Jazz Pop' },
  { title: 'Setapak Sriwedari', artist: 'Maliq & D\'Essentials', year: '2018', genre: 'Indo Jazz Pop' },
  // ─── Kotak ───
  { title: 'Pelan-Pelan Saja', artist: 'Kotak', year: '2009', genre: 'Indo Rock' },
  { title: 'Beraksi', artist: 'Kotak', year: '2007', genre: 'Indo Rock' },
  { title: 'Masih Cinta', artist: 'Kotak', year: '2008', genre: 'Indo Rock' },
  { title: 'Tendangan Dari Langit', artist: 'Kotak', year: '2011', genre: 'Indo Rock' },
  // ─── Ari Lasso ───
  { title: 'Hampa', artist: 'Ari Lasso', year: '2003', genre: 'Indo Pop' },
  { title: 'Mengejar Matahari', artist: 'Ari Lasso', year: '2004', genre: 'Indo Pop' },
  // ─── Batas Senja ───
  { title: 'Nanti Kita Seperti Ini', artist: 'Batas Senja', year: '2023', genre: 'Indo Pop' },
  // ─── DJ / TikTok Viral Indo ───
  { title: 'Ojo Dibandingke', artist: 'Farel Prayoga', year: '2022', genre: 'Indo Viral' },
  { title: 'Dj Siul', artist: 'DJ Viral', year: '2020', genre: 'Indo Viral' },
  { title: 'Buih Jadi Permadani', artist: 'Exist', year: '1996', genre: 'Indo Melayu' },
  { title: 'Aisyah Istri Rasulullah', artist: 'Sabyan Gambus', year: '2020', genre: 'Indo Religi' },
  { title: 'Berbeza Kasta', artist: 'Thomas Arya', year: '2020', genre: 'Indo Pop Minang' },
  { title: 'Sakit Gigi', artist: 'Meggy Z', year: '1994', genre: 'Indo Dangdut' },
  { title: 'Rindu Aku Rindu Kamu', artist: 'Doel Sumbang', year: '1984', genre: 'Indo Pop Sunda' },
  { title: 'Satu Rasa Cinta', artist: 'Arief', year: '2021', genre: 'Indo Pop Melayu' },
  { title: 'Dermaga Biru', artist: 'Thomas Arya', year: '2019', genre: 'Indo Pop Minang' },
  { title: 'Aku Sayang Kamu', artist: 'Ndarboy Genk', year: '2021', genre: 'Indo Pop Jawa' },
  { title: 'Mendung Tanpo Udan', artist: 'Ndarboy Genk', year: '2021', genre: 'Indo Pop Jawa' },
  { title: 'Nemen', artist: 'GildCoustic', year: '2023', genre: 'Indo Koplo' },
  { title: 'Lagu Rindu', artist: 'Keisya Levronka', year: '2022', genre: 'Indo Pop' },
  { title: 'Tenang', artist: 'Yura Yunita', year: '2016', genre: 'Indo Pop' },
  { title: 'Meraih Bintang', artist: 'Via Vallen', year: '2018', genre: 'Indo Pop' },
  { title: 'Senorita', artist: 'Via Vallen', year: '2018', genre: 'Indo Koplo' },
  { title: 'Sayang', artist: 'Via Vallen', year: '2017', genre: 'Indo Koplo' },
  { title: 'Karna Su Sayang', artist: 'Near ft. Dian Sorowea', year: '2018', genre: 'Indo Pop' },
  { title: 'Lagi Syantik', artist: 'Siti Badriah', year: '2018', genre: 'Indo Dangdut' },
  { title: 'Lagi Tamvan', artist: 'Siti Badriah ft. RPH', year: '2018', genre: 'Indo Dangdut' },
  { title: 'Goyang Dua Jari', artist: 'Sandrina', year: '2018', genre: 'Indo Dangdut' },
  { title: 'Tarik Sis Semongko', artist: 'Happy Asmara', year: '2021', genre: 'Indo Koplo' },
  { title: 'Cidro 2', artist: 'Happy Asmara', year: '2021', genre: 'Indo Koplo' },
  { title: 'Wes Tatas', artist: 'Happy Asmara', year: '2021', genre: 'Indo Koplo' },
  { title: 'Ku Puja Puja', artist: 'Ipank', year: '2019', genre: 'Indo Pop Minang' },
  { title: 'Minang Kabau', artist: 'Ipank', year: '2018', genre: 'Indo Pop Minang' },
  { title: 'Pecah Seribu', artist: 'Nike Ardilla', year: '1991', genre: 'Indo Pop Legend' },
  { title: 'Bintang Kehidupan', artist: 'Nike Ardilla', year: '1991', genre: 'Indo Pop Legend' },
  { title: 'Gala Gala', artist: 'Rhoma Irama', year: '1978', genre: 'Indo Dangdut Legend' },
  { title: 'Begadang', artist: 'Rhoma Irama', year: '1978', genre: 'Indo Dangdut Legend' },
  { title: 'Cinta Luar Biasa', artist: 'Andmesh Kamaleng', year: '2019', genre: 'Indo Pop' },
  { title: 'Hanya Rindu', artist: 'Andmesh Kamaleng', year: '2019', genre: 'Indo Pop' },
  { title: 'Jangan Rubah Takdirku', artist: 'Andmesh Kamaleng', year: '2019', genre: 'Indo Pop' },
  { title: 'Fiersa Besari', artist: 'April', year: '2019', genre: 'Indo Indie' },
  { title: 'Celengan Rindu', artist: 'Fiersa Besari', year: '2018', genre: 'Indo Indie' },
  { title: 'Waktu yang Salah', artist: 'Fiersa Besari', year: '2019', genre: 'Indo Indie' },
  { title: 'Runtuh', artist: 'Feby Putri ft. Fiersa Besari', year: '2021', genre: 'Indo Indie' },
  { title: 'Gigi', artist: 'Raisa ft. Isyana Sarasvati', year: '2016', genre: 'Indo Pop' },
  { title: 'Tetap Dalam Jiwa', artist: 'Isyana Sarasvati', year: '2015', genre: 'Indo Pop' },
  { title: 'Kau Adalah', artist: 'Isyana Sarasvati', year: '2015', genre: 'Indo Pop' },
  { title: 'Keep Being You', artist: 'Isyana Sarasvati', year: '2014', genre: 'Indo Pop' },
  { title: 'Pintu Terbuka', artist: 'Isyana Sarasvati', year: '2016', genre: 'Indo Pop' },
  { title: 'Menikmati Indah Cinta', artist: 'Yovie & Nuno', year: '2007', genre: 'Indo Pop' },
  { title: 'Tanpa Cinta', artist: 'Yovie & Nuno', year: '2003', genre: 'Indo Pop' },
  { title: 'Janji Suci', artist: 'Yovie & Nuno', year: '2007', genre: 'Indo Pop' },
  { title: 'Galau', artist: 'Yovie & Nuno', year: '2007', genre: 'Indo Pop' },
  { title: 'Selamat Jalan Kekasih', artist: 'Rita Effendi', year: '2000', genre: 'Indo Pop' },
  { title: 'Kamu', artist: 'Coboy Junior', year: '2012', genre: 'Indo Pop' },
  { title: 'Maju Mundur Cantik', artist: 'Iva Lola', year: '2013', genre: 'Indo Dangdut' },
  { title: 'Tak Ingin Usai', artist: 'Keisya Levronka', year: '2022', genre: 'Indo Pop' },
  { title: 'Better On My Own', artist: 'Keisya Levronka', year: '2023', genre: 'Indo Pop' },
];

// ══════════════════════════════════════════════════════════════
// 2. WESTERN & GLOBAL
// ══════════════════════════════════════════════════════════════
const western = [
  // ─── Bruno Mars ───
  { title: 'Grenade', artist: 'Bruno Mars', year: '2010', genre: 'Western Pop' },
  { title: 'Locked Out of Heaven', artist: 'Bruno Mars', year: '2012', genre: 'Western Pop' },
  { title: 'Just The Way You Are', artist: 'Bruno Mars', year: '2010', genre: 'Western Pop' },
  { title: 'When I Was Your Man', artist: 'Bruno Mars', year: '2012', genre: 'Western Pop' },
  { title: '24K Magic', artist: 'Bruno Mars', year: '2016', genre: 'Western Pop' },
  { title: 'That\'s What I Like', artist: 'Bruno Mars', year: '2016', genre: 'Western Pop' },
  { title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', year: '2024', genre: 'Western Pop' },
  { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', year: '2014', genre: 'Western Pop' },
  { title: 'Treasure', artist: 'Bruno Mars', year: '2012', genre: 'Western Pop' },
  { title: 'Versace on the Floor', artist: 'Bruno Mars', year: '2016', genre: 'Western Pop' },
  { title: 'The Lazy Song', artist: 'Bruno Mars', year: '2011', genre: 'Western Pop' },
  { title: 'Marry You', artist: 'Bruno Mars', year: '2010', genre: 'Western Pop' },
  { title: 'Talking to the Moon', artist: 'Bruno Mars', year: '2010', genre: 'Western Pop' },
  { title: 'Count on Me', artist: 'Bruno Mars', year: '2010', genre: 'Western Pop' },
  { title: 'It Will Rain', artist: 'Bruno Mars', year: '2011', genre: 'Western Pop' },
  { title: 'Leave the Door Open', artist: 'Silk Sonic', year: '2021', genre: 'Western R&B' },
  { title: 'Smokin Out the Window', artist: 'Silk Sonic', year: '2021', genre: 'Western R&B' },
  // ─── Taylor Swift ───
  { title: 'Cruel Summer', artist: 'Taylor Swift', year: '2019', genre: 'Western Pop' },
  { title: 'Blank Space', artist: 'Taylor Swift', year: '2014', genre: 'Western Pop' },
  { title: 'Anti-Hero', artist: 'Taylor Swift', year: '2022', genre: 'Western Pop' },
  { title: 'Shake It Off', artist: 'Taylor Swift', year: '2014', genre: 'Western Pop' },
  { title: 'Love Story', artist: 'Taylor Swift', year: '2008', genre: 'Western Pop' },
  { title: 'You Belong With Me', artist: 'Taylor Swift', year: '2008', genre: 'Western Pop' },
  { title: 'Cardigan', artist: 'Taylor Swift', year: '2020', genre: 'Western Pop' },
  { title: 'Style', artist: 'Taylor Swift', year: '2014', genre: 'Western Pop' },
  { title: 'Lover', artist: 'Taylor Swift', year: '2019', genre: 'Western Pop' },
  { title: 'Look What You Made Me Do', artist: 'Taylor Swift', year: '2017', genre: 'Western Pop' },
  { title: 'Delicate', artist: 'Taylor Swift', year: '2017', genre: 'Western Pop' },
  { title: 'Wildest Dreams', artist: 'Taylor Swift', year: '2014', genre: 'Western Pop' },
  { title: 'Enchanted', artist: 'Taylor Swift', year: '2010', genre: 'Western Pop' },
  { title: 'Bad Blood', artist: 'Taylor Swift', year: '2014', genre: 'Western Pop' },
  // ─── The Weeknd ───
  { title: 'Blinding Lights', artist: 'The Weeknd', year: '2019', genre: 'Western Pop' },
  { title: 'Starboy', artist: 'The Weeknd ft. Daft Punk', year: '2016', genre: 'Western Pop' },
  { title: 'Save Your Tears', artist: 'The Weeknd', year: '2020', genre: 'Western Pop' },
  { title: 'Die For You', artist: 'The Weeknd', year: '2016', genre: 'Western R&B' },
  { title: 'Can\'t Feel My Face', artist: 'The Weeknd', year: '2015', genre: 'Western Pop' },
  { title: 'The Hills', artist: 'The Weeknd', year: '2015', genre: 'Western R&B' },
  { title: 'Earned It', artist: 'The Weeknd', year: '2015', genre: 'Western R&B' },
  { title: 'Call Out My Name', artist: 'The Weeknd', year: '2018', genre: 'Western R&B' },
  { title: 'After Hours', artist: 'The Weeknd', year: '2020', genre: 'Western R&B' },
  // ─── Ed Sheeran ───
  { title: 'Shape of You', artist: 'Ed Sheeran', year: '2017', genre: 'Western Pop' },
  { title: 'Perfect', artist: 'Ed Sheeran', year: '2017', genre: 'Western Pop' },
  { title: 'Thinking Out Loud', artist: 'Ed Sheeran', year: '2014', genre: 'Western Pop' },
  { title: 'Photograph', artist: 'Ed Sheeran', year: '2014', genre: 'Western Pop' },
  { title: 'Bad Habits', artist: 'Ed Sheeran', year: '2021', genre: 'Western Pop' },
  { title: 'Castle on the Hill', artist: 'Ed Sheeran', year: '2017', genre: 'Western Pop' },
  { title: 'Galway Girl', artist: 'Ed Sheeran', year: '2017', genre: 'Western Pop' },
  { title: 'The A Team', artist: 'Ed Sheeran', year: '2011', genre: 'Western Pop' },
  // ─── Billie Eilish ───
  { title: 'Bad Guy', artist: 'Billie Eilish', year: '2019', genre: 'Western Pop' },
  { title: 'Birds of a Feather', artist: 'Billie Eilish', year: '2024', genre: 'Western Pop' },
  { title: 'Lovely', artist: 'Billie Eilish & Khalid', year: '2018', genre: 'Western Pop' },
  { title: 'Happier Than Ever', artist: 'Billie Eilish', year: '2021', genre: 'Western Pop' },
  { title: 'Ocean Eyes', artist: 'Billie Eilish', year: '2016', genre: 'Western Pop' },
  { title: 'What Was I Made For?', artist: 'Billie Eilish', year: '2023', genre: 'Western Pop' },
  { title: 'Everything I Wanted', artist: 'Billie Eilish', year: '2019', genre: 'Western Pop' },
  // ─── Coldplay ───
  { title: 'A Sky Full of Stars', artist: 'Coldplay', year: '2014', genre: 'Western Rock' },
  { title: 'Viva La Vida', artist: 'Coldplay', year: '2008', genre: 'Western Rock' },
  { title: 'Yellow', artist: 'Coldplay', year: '2000', genre: 'Western Rock' },
  { title: 'The Scientist', artist: 'Coldplay', year: '2002', genre: 'Western Rock' },
  { title: 'Fix You', artist: 'Coldplay', year: '2005', genre: 'Western Rock' },
  { title: 'Hymn for the Weekend', artist: 'Coldplay', year: '2015', genre: 'Western Pop' },
  { title: 'Paradise', artist: 'Coldplay', year: '2011', genre: 'Western Rock' },
  { title: 'Clocks', artist: 'Coldplay', year: '2002', genre: 'Western Rock' },
  { title: 'Adventure of a Lifetime', artist: 'Coldplay', year: '2015', genre: 'Western Pop' },
  { title: 'My Universe', artist: 'Coldplay x BTS', year: '2021', genre: 'Western Pop' },
  // ─── Dua Lipa ───
  { title: 'Levitating', artist: 'Dua Lipa', year: '2020', genre: 'Western Pop' },
  { title: 'Don\'t Start Now', artist: 'Dua Lipa', year: '2019', genre: 'Western Pop' },
  { title: 'New Rules', artist: 'Dua Lipa', year: '2017', genre: 'Western Pop' },
  { title: 'Dance The Night', artist: 'Dua Lipa', year: '2023', genre: 'Western Pop' },
  { title: 'Houdini', artist: 'Dua Lipa', year: '2023', genre: 'Western Pop' },
  { title: 'Physical', artist: 'Dua Lipa', year: '2020', genre: 'Western Pop' },
  // ─── Adele ───
  { title: 'Someone Like You', artist: 'Adele', year: '2011', genre: 'Western Pop' },
  { title: 'Rolling in the Deep', artist: 'Adele', year: '2010', genre: 'Western Pop' },
  { title: 'Easy On Me', artist: 'Adele', year: '2021', genre: 'Western Pop' },
  { title: 'Hello', artist: 'Adele', year: '2015', genre: 'Western Pop' },
  { title: 'Set Fire to the Rain', artist: 'Adele', year: '2011', genre: 'Western Pop' },
  { title: 'Skyfall', artist: 'Adele', year: '2012', genre: 'Western Pop' },
  // ─── Maroon 5 ───
  { title: 'Sugar', artist: 'Maroon 5', year: '2014', genre: 'Western Pop' },
  { title: 'Payphone', artist: 'Maroon 5 ft. Wiz Khalifa', year: '2012', genre: 'Western Pop' },
  { title: 'Memories', artist: 'Maroon 5', year: '2019', genre: 'Western Pop' },
  { title: 'Girls Like You', artist: 'Maroon 5 ft. Cardi B', year: '2018', genre: 'Western Pop' },
  { title: 'Maps', artist: 'Maroon 5', year: '2014', genre: 'Western Pop' },
  { title: 'She Will Be Loved', artist: 'Maroon 5', year: '2002', genre: 'Western Pop' },
  { title: 'Moves Like Jagger', artist: 'Maroon 5 ft. Christina Aguilera', year: '2011', genre: 'Western Pop' },
  { title: 'This Love', artist: 'Maroon 5', year: '2002', genre: 'Western Pop' },
  // ─── Justin Bieber ───
  { title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', year: '2021', genre: 'Western Pop' },
  { title: 'Peaches', artist: 'Justin Bieber', year: '2021', genre: 'Western Pop' },
  { title: 'Love Yourself', artist: 'Justin Bieber', year: '2015', genre: 'Western Pop' },
  { title: 'Sorry', artist: 'Justin Bieber', year: '2015', genre: 'Western Pop' },
  { title: 'Baby', artist: 'Justin Bieber ft. Ludacris', year: '2010', genre: 'Western Pop' },
  { title: 'Ghost', artist: 'Justin Bieber', year: '2021', genre: 'Western Pop' },
  { title: 'What Do You Mean?', artist: 'Justin Bieber', year: '2015', genre: 'Western Pop' },
  // ─── Queen ───
  { title: 'Bohemian Rhapsody', artist: 'Queen', year: '1975', genre: 'Western Rock' },
  { title: 'Don\'t Stop Me Now', artist: 'Queen', year: '1978', genre: 'Western Rock' },
  { title: 'We Will Rock You', artist: 'Queen', year: '1977', genre: 'Western Rock' },
  { title: 'We Are The Champions', artist: 'Queen', year: '1977', genre: 'Western Rock' },
  { title: 'Another One Bites the Dust', artist: 'Queen', year: '1980', genre: 'Western Rock' },
  { title: 'Somebody to Love', artist: 'Queen', year: '1976', genre: 'Western Rock' },
  // ─── Michael Jackson ───
  { title: 'Billie Jean', artist: 'Michael Jackson', year: '1982', genre: 'Western Pop' },
  { title: 'Beat It', artist: 'Michael Jackson', year: '1982', genre: 'Western Pop' },
  { title: 'Smooth Criminal', artist: 'Michael Jackson', year: '1987', genre: 'Western Pop' },
  { title: 'Thriller', artist: 'Michael Jackson', year: '1982', genre: 'Western Pop' },
  { title: 'Black or White', artist: 'Michael Jackson', year: '1991', genre: 'Western Pop' },
  { title: 'Heal the World', artist: 'Michael Jackson', year: '1991', genre: 'Western Pop' },
  // ─── Linkin Park ───
  { title: 'In the End', artist: 'Linkin Park', year: '2000', genre: 'Western Rock' },
  { title: 'Numb', artist: 'Linkin Park', year: '2003', genre: 'Western Rock' },
  { title: 'Faint', artist: 'Linkin Park', year: '2003', genre: 'Western Rock' },
  { title: 'Crawling', artist: 'Linkin Park', year: '2000', genre: 'Western Rock' },
  { title: 'What I\'ve Done', artist: 'Linkin Park', year: '2007', genre: 'Western Rock' },
  { title: 'One Step Closer', artist: 'Linkin Park', year: '2000', genre: 'Western Rock' },
  { title: 'The Emptiness Machine', artist: 'Linkin Park', year: '2024', genre: 'Western Rock' },
  // ─── OneRepublic ───
  { title: 'Counting Stars', artist: 'OneRepublic', year: '2013', genre: 'Western Pop' },
  { title: 'I Ain\'t Worried', artist: 'OneRepublic', year: '2022', genre: 'Western Pop' },
  { title: 'Apologize', artist: 'Timbaland ft. OneRepublic', year: '2007', genre: 'Western Pop' },
  { title: 'Secrets', artist: 'OneRepublic', year: '2009', genre: 'Western Pop' },
  // ─── Avicii (Vocal EDM) ───
  { title: 'Wake Me Up', artist: 'Avicii', year: '2013', genre: 'Western Pop' },
  { title: 'Waiting for Love', artist: 'Avicii', year: '2015', genre: 'Western Pop' },
  { title: 'The Nights', artist: 'Avicii', year: '2014', genre: 'Western Pop' },
  { title: 'Hey Brother', artist: 'Avicii', year: '2013', genre: 'Western Pop' },
  { title: 'Without You', artist: 'Avicii ft. Sandro Cavazza', year: '2017', genre: 'Western Pop' },
  { title: 'SOS', artist: 'Avicii ft. Aloe Blacc', year: '2019', genre: 'Western Pop' },
  { title: 'Lonely Together', artist: 'Avicii ft. Rita Ora', year: '2017', genre: 'Western Pop' },
  // ─── The Chainsmokers (Vocal) ───
  { title: 'Something Just Like This', artist: 'The Chainsmokers & Coldplay', year: '2017', genre: 'Western Pop' },
  { title: 'Closer', artist: 'The Chainsmokers ft. Halsey', year: '2016', genre: 'Western Pop' },
  { title: 'Don\'t Let Me Down', artist: 'The Chainsmokers ft. Daya', year: '2016', genre: 'Western Pop' },
  { title: 'Roses', artist: 'The Chainsmokers ft. ROZES', year: '2015', genre: 'Western Pop' },
  // ─── David Guetta (Vocal) ───
  { title: 'Titanium', artist: 'David Guetta ft. Sia', year: '2011', genre: 'Western Pop' },
  { title: 'Without You', artist: 'David Guetta ft. Usher', year: '2011', genre: 'Western Pop' },
  { title: 'When Love Takes Over', artist: 'David Guetta ft. Kelly Rowland', year: '2009', genre: 'Western Pop' },
  // ─── Post Malone ───
  { title: 'Sunflower', artist: 'Post Malone & Swae Lee', year: '2018', genre: 'Western Pop' },
  { title: 'Circles', artist: 'Post Malone', year: '2019', genre: 'Western Pop' },
  { title: 'Rockstar', artist: 'Post Malone ft. 21 Savage', year: '2017', genre: 'Western Pop' },
  // ─── Charlie Puth ───
  { title: 'See You Again', artist: 'Wiz Khalifa ft. Charlie Puth', year: '2015', genre: 'Western Pop' },
  { title: 'Attention', artist: 'Charlie Puth', year: '2017', genre: 'Western Pop' },
  { title: 'We Don\'t Talk Anymore', artist: 'Charlie Puth ft. Selena Gomez', year: '2016', genre: 'Western Pop' },
  // ─── Backstreet Boys ───
  { title: 'I Want It That Way', artist: 'Backstreet Boys', year: '1999', genre: 'Western Pop' },
  { title: 'Everybody (Backstreet\'s Back)', artist: 'Backstreet Boys', year: '1997', genre: 'Western Pop' },
  { title: 'As Long As You Love Me', artist: 'Backstreet Boys', year: '1997', genre: 'Western Pop' },
  // ─── Rihanna ───
  { title: 'Umbrella', artist: 'Rihanna ft. Jay-Z', year: '2007', genre: 'Western Pop' },
  { title: 'Diamonds', artist: 'Rihanna', year: '2012', genre: 'Western Pop' },
  { title: 'We Found Love', artist: 'Rihanna ft. Calvin Harris', year: '2011', genre: 'Western Pop' },
  { title: 'Stay', artist: 'Rihanna ft. Mikky Ekko', year: '2012', genre: 'Western Pop' },
  // ─── Lady Gaga ───
  { title: 'Poker Face', artist: 'Lady Gaga', year: '2008', genre: 'Western Pop' },
  { title: 'Bad Romance', artist: 'Lady Gaga', year: '2009', genre: 'Western Pop' },
  { title: 'Shallow', artist: 'Lady Gaga & Bradley Cooper', year: '2018', genre: 'Western Pop' },
  // ─── Olivia Rodrigo ───
  { title: 'drivers license', artist: 'Olivia Rodrigo', year: '2021', genre: 'Western Pop' },
  { title: 'good 4 u', artist: 'Olivia Rodrigo', year: '2021', genre: 'Western Pop' },
  { title: 'vampire', artist: 'Olivia Rodrigo', year: '2023', genre: 'Western Pop' },
  // ─── SZA ───
  { title: 'Kill Bill', artist: 'SZA', year: '2022', genre: 'Western R&B' },
  { title: 'Snooze', artist: 'SZA', year: '2022', genre: 'Western R&B' },
  // ─── Sabrina Carpenter ───
  { title: 'Espresso', artist: 'Sabrina Carpenter', year: '2024', genre: 'Western Pop' },
  { title: 'Please Please Please', artist: 'Sabrina Carpenter', year: '2024', genre: 'Western Pop' },
  // ─── Imagine Dragons ───
  { title: 'Believer', artist: 'Imagine Dragons', year: '2017', genre: 'Western Rock' },
  { title: 'Radioactive', artist: 'Imagine Dragons', year: '2012', genre: 'Western Rock' },
  { title: 'Demons', artist: 'Imagine Dragons', year: '2012', genre: 'Western Rock' },
  { title: 'Thunder', artist: 'Imagine Dragons', year: '2017', genre: 'Western Rock' },
];

// ══════════════════════════════════════════════════════════════
// 3. JEPANG & ANIME
// ══════════════════════════════════════════════════════════════
const japan = [
  // ─── LiSA ───
  { title: 'Gurenge', artist: 'LiSA', year: '2019', genre: 'Anime OST' },
  { title: 'Homura', artist: 'LiSA', year: '2020', genre: 'Anime OST' },
  { title: 'Crossing Field', artist: 'LiSA', year: '2012', genre: 'Anime OST' },
  { title: 'Catch the Moment', artist: 'LiSA', year: '2017', genre: 'Anime OST' },
  { title: 'Oath Sign', artist: 'LiSA', year: '2011', genre: 'Anime OST' },
  { title: 'Rising Hope', artist: 'LiSA', year: '2014', genre: 'Anime OST' },
  { title: 'Unlasting', artist: 'LiSA', year: '2019', genre: 'Anime OST' },
  // ─── YOASOBI ───
  { title: 'Idol', artist: 'YOASOBI', year: '2023', genre: 'J-Pop' },
  { title: 'Yoru ni Kakeru', artist: 'YOASOBI', year: '2019', genre: 'J-Pop' },
  { title: 'Monster', artist: 'YOASOBI', year: '2021', genre: 'Anime OST' },
  { title: 'Kaibutsu', artist: 'YOASOBI', year: '2021', genre: 'Anime OST' },
  { title: 'Gunjou', artist: 'YOASOBI', year: '2020', genre: 'J-Pop' },
  { title: 'Yuusha', artist: 'YOASOBI', year: '2023', genre: 'Anime OST' },
  { title: 'Shukufuku', artist: 'YOASOBI', year: '2022', genre: 'Anime OST' },
  { title: 'Tabun', artist: 'YOASOBI', year: '2020', genre: 'J-Pop' },
  // ─── RADWIMPS ───
  { title: 'Zenzenzense', artist: 'RADWIMPS', year: '2016', genre: 'Anime OST' },
  { title: 'Sparkle', artist: 'RADWIMPS', year: '2016', genre: 'Anime OST' },
  { title: 'Nandemonaiya', artist: 'RADWIMPS', year: '2016', genre: 'Anime OST' },
  { title: 'Grand Escape', artist: 'RADWIMPS ft. Toko Miura', year: '2019', genre: 'Anime OST' },
  { title: 'Suzume', artist: 'RADWIMPS ft. Toaka', year: '2022', genre: 'Anime OST' },
  { title: 'Dream Lantern', artist: 'RADWIMPS', year: '2016', genre: 'Anime OST' },
  // ─── Kenshi Yonezu ───
  { title: 'Kick Back', artist: 'Kenshi Yonezu', year: '2022', genre: 'Anime OST' },
  { title: 'Peace Sign', artist: 'Kenshi Yonezu', year: '2017', genre: 'Anime OST' },
  { title: 'Lemon', artist: 'Kenshi Yonezu', year: '2018', genre: 'J-Pop' },
  { title: 'Flamingo', artist: 'Kenshi Yonezu', year: '2018', genre: 'J-Pop' },
  { title: 'Paprika', artist: 'Kenshi Yonezu', year: '2018', genre: 'J-Pop' },
  { title: 'Pale Blue', artist: 'Kenshi Yonezu', year: '2021', genre: 'J-Pop' },
  { title: 'Loser', artist: 'Kenshi Yonezu', year: '2016', genre: 'J-Pop' },
  // ─── King Gnu ───
  { title: 'Specialz', artist: 'King Gnu', year: '2023', genre: 'Anime OST' },
  { title: 'Hakujitsu', artist: 'King Gnu', year: '2019', genre: 'J-Rock' },
  { title: 'Ichizu', artist: 'King Gnu', year: '2021', genre: 'Anime OST' },
  { title: 'Teenager Forever', artist: 'King Gnu', year: '2019', genre: 'J-Rock' },
  { title: 'Boy', artist: 'King Gnu', year: '2018', genre: 'J-Rock' },
  // ─── Ado ───
  { title: 'Usseewa', artist: 'Ado', year: '2020', genre: 'J-Pop' },
  { title: 'New Genesis', artist: 'Ado', year: '2022', genre: 'Anime OST' },
  { title: 'Show', artist: 'Ado', year: '2023', genre: 'J-Pop' },
  { title: 'Odo', artist: 'Ado', year: '2021', genre: 'J-Pop' },
  { title: 'Gira Gira', artist: 'Ado', year: '2021', genre: 'J-Pop' },
  { title: 'Tot Musica', artist: 'Ado', year: '2022', genre: 'Anime OST' },
  // ─── Creepy Nuts ───
  { title: 'Bling-Bang-Bang-Born', artist: 'Creepy Nuts', year: '2024', genre: 'Anime OST' },
  { title: 'Otonoke', artist: 'Creepy Nuts', year: '2024', genre: 'Anime OST' },
  // ─── Official HIGE DANdism ───
  { title: 'Cry Baby', artist: 'Official HIGE DANdism', year: '2021', genre: 'Anime OST' },
  { title: 'Pretender', artist: 'Official HIGE DANdism', year: '2019', genre: 'J-Pop' },
  { title: 'Mixed Nuts', artist: 'Official HIGE DANdism', year: '2022', genre: 'Anime OST' },
  { title: 'Subtitle', artist: 'Official HIGE DANdism', year: '2022', genre: 'J-Pop' },
  { title: 'I LOVE...', artist: 'Official HIGE DANdism', year: '2020', genre: 'J-Pop' },
  // ─── TK from Ling Tosite Sigure ───
  { title: 'Unravel', artist: 'TK from Ling Tosite Sigure', year: '2014', genre: 'Anime OST' },
  { title: 'Katharsis', artist: 'TK from Ling Tosite Sigure', year: '2018', genre: 'Anime OST' },
  // ─── Linked Horizon ───
  { title: 'Shinzou wo Sasageyo', artist: 'Linked Horizon', year: '2017', genre: 'Anime OST' },
  { title: 'Guren no Yumiya', artist: 'Linked Horizon', year: '2013', genre: 'Anime OST' },
  { title: 'Jiyuu no Tsubasa', artist: 'Linked Horizon', year: '2014', genre: 'Anime OST' },
  // ─── SiM ───
  { title: 'The Rumbling', artist: 'SiM', year: '2022', genre: 'Anime OST' },
  // ─── FLOW ───
  { title: 'Sign', artist: 'FLOW', year: '2010', genre: 'Anime OST' },
  { title: 'GO!!!', artist: 'FLOW', year: '2004', genre: 'Anime OST' },
  { title: 'Colors', artist: 'FLOW', year: '2006', genre: 'Anime OST' },
  // ─── Ikimonogakari ───
  { title: 'Blue Bird', artist: 'Ikimonogakari', year: '2008', genre: 'Anime OST' },
  { title: 'Hotaru no Hikari', artist: 'Ikimonogakari', year: '2009', genre: 'Anime OST' },
  // ─── KANA-BOON ───
  { title: 'Silhouette', artist: 'KANA-BOON', year: '2014', genre: 'Anime OST' },
  // ─── Eve ───
  { title: 'Kaikai Kitan', artist: 'Eve', year: '2020', genre: 'Anime OST' },
  { title: 'Dramaturgy', artist: 'Eve', year: '2017', genre: 'J-Pop' },
  // ─── Tatsuya Kitani ───
  { title: 'Ao no Sumika', artist: 'Tatsuya Kitani', year: '2023', genre: 'Anime OST' },
  // ─── Other Anime Classics ───
  { title: 'Renai Circulation', artist: 'Kana Hanazawa', year: '2009', genre: 'Anime OST' },
  { title: 'Again', artist: 'YUI', year: '2009', genre: 'Anime OST' },
  { title: 'Kawaikute Gomen', artist: 'HoneyWorks', year: '2022', genre: 'J-Pop' },
  { title: 'Fukai Mori', artist: 'Do As Infinity', year: '2001', genre: 'Anime OST' },
  { title: 'Haruka Kanata', artist: 'ASIAN KUNG-FU GENERATION', year: '2003', genre: 'Anime OST' },
  { title: 'Rewrite', artist: 'ASIAN KUNG-FU GENERATION', year: '2004', genre: 'Anime OST' },
];

// ══════════════════════════════════════════════════════════════
// 4. KOREA SELATAN / K-POP
// ══════════════════════════════════════════════════════════════
const korea = [
  // ─── BTS ───
  { title: 'Dynamite', artist: 'BTS', year: '2020', genre: 'K-Pop' },
  { title: 'Butter', artist: 'BTS', year: '2021', genre: 'K-Pop' },
  { title: 'Boy With Luv', artist: 'BTS ft. Halsey', year: '2019', genre: 'K-Pop' },
  { title: 'Spring Day', artist: 'BTS', year: '2017', genre: 'K-Pop' },
  { title: 'DNA', artist: 'BTS', year: '2017', genre: 'K-Pop' },
  { title: 'Fake Love', artist: 'BTS', year: '2018', genre: 'K-Pop' },
  { title: 'IDOL', artist: 'BTS', year: '2018', genre: 'K-Pop' },
  { title: 'Blood Sweat & Tears', artist: 'BTS', year: '2016', genre: 'K-Pop' },
  { title: 'Fire', artist: 'BTS', year: '2016', genre: 'K-Pop' },
  { title: 'MIC Drop', artist: 'BTS', year: '2017', genre: 'K-Pop' },
  { title: 'I NEED U', artist: 'BTS', year: '2015', genre: 'K-Pop' },
  { title: 'Run', artist: 'BTS', year: '2015', genre: 'K-Pop' },
  { title: 'Permission to Dance', artist: 'BTS', year: '2021', genre: 'K-Pop' },
  { title: 'Seven', artist: 'Jung Kook ft. Latto', year: '2023', genre: 'K-Pop' },
  { title: 'Standing Next to You', artist: 'Jung Kook', year: '2023', genre: 'K-Pop' },
  // ─── BLACKPINK ───
  { title: 'How You Like That', artist: 'BLACKPINK', year: '2020', genre: 'K-Pop' },
  { title: 'DDU-DU DDU-DU', artist: 'BLACKPINK', year: '2018', genre: 'K-Pop' },
  { title: 'Kill This Love', artist: 'BLACKPINK', year: '2019', genre: 'K-Pop' },
  { title: 'Pink Venom', artist: 'BLACKPINK', year: '2022', genre: 'K-Pop' },
  { title: 'Shut Down', artist: 'BLACKPINK', year: '2022', genre: 'K-Pop' },
  { title: 'Boombayah', artist: 'BLACKPINK', year: '2016', genre: 'K-Pop' },
  { title: 'As If It\'s Your Last', artist: 'BLACKPINK', year: '2017', genre: 'K-Pop' },
  { title: 'Lovesick Girls', artist: 'BLACKPINK', year: '2020', genre: 'K-Pop' },
  { title: 'SOLO', artist: 'JENNIE', year: '2018', genre: 'K-Pop' },
  { title: 'APT.', artist: 'ROSÉ & Bruno Mars', year: '2024', genre: 'K-Pop' },
  { title: 'On The Ground', artist: 'ROSÉ', year: '2021', genre: 'K-Pop' },
  { title: 'MONEY', artist: 'LISA', year: '2021', genre: 'K-Pop' },
  { title: 'Rockstar', artist: 'LISA', year: '2024', genre: 'K-Pop' },
  { title: 'FLOWER', artist: 'JISOO', year: '2023', genre: 'K-Pop' },
  // ─── NewJeans ───
  { title: 'Hype Boy', artist: 'NewJeans', year: '2022', genre: 'K-Pop' },
  { title: 'Ditto', artist: 'NewJeans', year: '2022', genre: 'K-Pop' },
  { title: 'Super Shy', artist: 'NewJeans', year: '2023', genre: 'K-Pop' },
  { title: 'OMG', artist: 'NewJeans', year: '2023', genre: 'K-Pop' },
  { title: 'Attention', artist: 'NewJeans', year: '2022', genre: 'K-Pop' },
  { title: 'ETA', artist: 'NewJeans', year: '2023', genre: 'K-Pop' },
  { title: 'How Sweet', artist: 'NewJeans', year: '2024', genre: 'K-Pop' },
  // ─── aespa ───
  { title: 'Next Level', artist: 'aespa', year: '2021', genre: 'K-Pop' },
  { title: 'Supernova', artist: 'aespa', year: '2024', genre: 'K-Pop' },
  { title: 'Drama', artist: 'aespa', year: '2023', genre: 'K-Pop' },
  { title: 'Savage', artist: 'aespa', year: '2021', genre: 'K-Pop' },
  { title: 'Spicy', artist: 'aespa', year: '2023', genre: 'K-Pop' },
  { title: 'Armageddon', artist: 'aespa', year: '2024', genre: 'K-Pop' },
  { title: 'Whiplash', artist: 'aespa', year: '2024', genre: 'K-Pop' },
  { title: 'Black Mamba', artist: 'aespa', year: '2020', genre: 'K-Pop' },
  // ─── IVE ───
  { title: 'Love Dive', artist: 'IVE', year: '2022', genre: 'K-Pop' },
  { title: 'After LIKE', artist: 'IVE', year: '2022', genre: 'K-Pop' },
  { title: 'I AM', artist: 'IVE', year: '2023', genre: 'K-Pop' },
  { title: 'Baddie', artist: 'IVE', year: '2023', genre: 'K-Pop' },
  { title: 'Eleven', artist: 'IVE', year: '2021', genre: 'K-Pop' },
  { title: 'HEYA', artist: 'IVE', year: '2024', genre: 'K-Pop' },
  // ─── LE SSERAFIM ───
  { title: 'Antifragile', artist: 'LE SSERAFIM', year: '2022', genre: 'K-Pop' },
  { title: 'Eve, Psyche & The Bluebeard\'s wife', artist: 'LE SSERAFIM', year: '2023', genre: 'K-Pop' },
  { title: 'Smart', artist: 'LE SSERAFIM', year: '2024', genre: 'K-Pop' },
  { title: 'Easy', artist: 'LE SSERAFIM', year: '2024', genre: 'K-Pop' },
  { title: 'Perfect Night', artist: 'LE SSERAFIM', year: '2023', genre: 'K-Pop' },
  { title: 'UNFORGIVEN', artist: 'LE SSERAFIM', year: '2023', genre: 'K-Pop' },
  { title: 'Crazy', artist: 'LE SSERAFIM', year: '2024', genre: 'K-Pop' },
  { title: 'FEARLESS', artist: 'LE SSERAFIM', year: '2022', genre: 'K-Pop' },
  // ─── TWICE ───
  { title: 'Fancy', artist: 'TWICE', year: '2019', genre: 'K-Pop' },
  { title: 'Feel Special', artist: 'TWICE', year: '2019', genre: 'K-Pop' },
  { title: 'What is Love?', artist: 'TWICE', year: '2018', genre: 'K-Pop' },
  { title: 'Cheer Up', artist: 'TWICE', year: '2016', genre: 'K-Pop' },
  { title: 'TT', artist: 'TWICE', year: '2016', genre: 'K-Pop' },
  { title: 'The Feels', artist: 'TWICE', year: '2021', genre: 'K-Pop' },
  { title: 'I CAN\'T STOP ME', artist: 'TWICE', year: '2020', genre: 'K-Pop' },
  { title: 'Likey', artist: 'TWICE', year: '2017', genre: 'K-Pop' },
  { title: 'Like OOH-AHH', artist: 'TWICE', year: '2015', genre: 'K-Pop' },
  // ─── Stray Kids ───
  { title: 'God\'s Menu', artist: 'Stray Kids', year: '2020', genre: 'K-Pop' },
  { title: 'Maniac', artist: 'Stray Kids', year: '2022', genre: 'K-Pop' },
  { title: 'S-Class', artist: 'Stray Kids', year: '2023', genre: 'K-Pop' },
  { title: 'LALALALA', artist: 'Stray Kids', year: '2023', genre: 'K-Pop' },
  { title: 'Thunderous', artist: 'Stray Kids', year: '2021', genre: 'K-Pop' },
  { title: 'Back Door', artist: 'Stray Kids', year: '2020', genre: 'K-Pop' },
  { title: 'MIROH', artist: 'Stray Kids', year: '2019', genre: 'K-Pop' },
  // ─── SEVENTEEN ───
  { title: 'Super', artist: 'SEVENTEEN', year: '2023', genre: 'K-Pop' },
  { title: 'HOT', artist: 'SEVENTEEN', year: '2022', genre: 'K-Pop' },
  { title: 'Maestro', artist: 'SEVENTEEN', year: '2024', genre: 'K-Pop' },
  { title: 'Don\'t Wanna Cry', artist: 'SEVENTEEN', year: '2017', genre: 'K-Pop' },
  { title: 'Very NICE', artist: 'SEVENTEEN', year: '2016', genre: 'K-Pop' },
  // ─── BIGBANG ───
  { title: 'Bang Bang Bang', artist: 'BIGBANG', year: '2015', genre: 'K-Pop' },
  { title: 'Fantastic Baby', artist: 'BIGBANG', year: '2012', genre: 'K-Pop' },
  { title: 'Haru Haru', artist: 'BIGBANG', year: '2008', genre: 'K-Pop' },
  { title: 'Lies', artist: 'BIGBANG', year: '2007', genre: 'K-Pop' },
  // ─── EXO ───
  { title: 'Growl', artist: 'EXO', year: '2013', genre: 'K-Pop' },
  { title: 'Monster', artist: 'EXO', year: '2016', genre: 'K-Pop' },
  { title: 'Love Shot', artist: 'EXO', year: '2018', genre: 'K-Pop' },
  { title: 'Call Me Baby', artist: 'EXO', year: '2015', genre: 'K-Pop' },
  { title: 'Ko Ko Bop', artist: 'EXO', year: '2017', genre: 'K-Pop' },
  // ─── Other Classics ───
  { title: 'Love Scenario', artist: 'iKON', year: '2018', genre: 'K-Pop' },
  { title: 'Gee', artist: 'Girls\' Generation', year: '2009', genre: 'K-Pop' },
  { title: 'Sorry, Sorry', artist: 'Super Junior', year: '2009', genre: 'K-Pop' },
  { title: 'Gangnam Style', artist: 'PSY', year: '2012', genre: 'K-Pop' },
];

// ══════════════════════════════════════════════════════════════
// 5. ARAB & TIMUR TENGAH
// ══════════════════════════════════════════════════════════════
const arabic = [
  { title: 'Nour El Ain', artist: 'Amr Diab', year: '1996', genre: 'Arabic Pop' },
  { title: 'Tamally Maak', artist: 'Amr Diab', year: '2000', genre: 'Arabic Pop' },
  { title: 'Wayah', artist: 'Amr Diab', year: '2009', genre: 'Arabic Pop' },
  { title: 'Osad Einy', artist: 'Amr Diab', year: '2004', genre: 'Arabic Pop' },
  { title: 'Amarain', artist: 'Amr Diab', year: '2003', genre: 'Arabic Pop' },
  { title: 'Allem Alby', artist: 'Amr Diab', year: '2003', genre: 'Arabic Pop' },
  { title: 'Leily Nahary', artist: 'Amr Diab', year: '2004', genre: 'Arabic Pop' },
  { title: 'El Leila', artist: 'Amr Diab', year: '2013', genre: 'Arabic Pop' },
  { title: 'Sahran', artist: 'Amr Diab', year: '2019', genre: 'Arabic Pop' },
  { title: 'Enta Eih', artist: 'Nancy Ajram', year: '2004', genre: 'Arabic Pop' },
  { title: 'Ah W Noss', artist: 'Nancy Ajram', year: '2004', genre: 'Arabic Pop' },
  { title: 'Akhasmak Ah', artist: 'Nancy Ajram', year: '2003', genre: 'Arabic Pop' },
  { title: 'Ya Tabtab Wa Dalla', artist: 'Nancy Ajram', year: '2006', genre: 'Arabic Pop' },
  { title: 'Salamat', artist: 'Nancy Ajram', year: '2021', genre: 'Arabic Pop' },
  { title: 'Aa Baly Habibi', artist: 'Elissa', year: '2009', genre: 'Arabic Pop' },
  { title: 'Betmoun', artist: 'Elissa', year: '2007', genre: 'Arabic Pop' },
  { title: 'Krahni', artist: 'Elissa', year: '2018', genre: 'Arabic Pop' },
  { title: 'C\'est La Vie', artist: 'Khaled', year: '2012', genre: 'Arabic Raï' },
  { title: 'Didi', artist: 'Khaled', year: '1991', genre: 'Arabic Raï' },
  { title: 'Aicha', artist: 'Khaled', year: '1996', genre: 'Arabic Raï' },
  { title: 'Lm3allem', artist: 'Saad Lamjarred', year: '2015', genre: 'Arabic Pop' },
  { title: 'Ghaltana', artist: 'Saad Lamjarred', year: '2016', genre: 'Arabic Pop' },
  { title: 'Ensay', artist: 'Mohamed Ramadan & Saad Lamjarred', year: '2019', genre: 'Arabic Pop' },
  { title: 'Ya Lili', artist: 'Balti ft. Hamouda', year: '2017', genre: 'Arabic Pop' },
  { title: 'Mafia', artist: 'Mohamed Ramadan', year: '2019', genre: 'Arabic Mahraganat' },
  { title: 'Number One', artist: 'Mohamed Ramadan', year: '2018', genre: 'Arabic Mahraganat' },
  { title: 'Boushret Kheir', artist: 'Hussain Al Jassmi', year: '2014', genre: 'Arabic Pop' },
  { title: 'Faqadtek', artist: 'Hussain Al Jassmi', year: '2004', genre: 'Arabic Pop' },
  { title: 'Ya Nabi Salam Alayka', artist: 'Maher Zain', year: '2011', genre: 'Arabic Pop' },
  { title: 'Insha Allah', artist: 'Maher Zain', year: '2010', genre: 'Arabic Pop' },
  { title: 'Kun Anta', artist: 'Humood Alkhudher', year: '2015', genre: 'Arabic Pop' },
  { title: 'Sabry Qaleel', artist: 'Sherine', year: '2003', genre: 'Arabic Pop' },
  { title: 'Kolly Melkak', artist: 'Sherine', year: '2014', genre: 'Arabic Pop' },
  { title: 'Kalam Einah', artist: 'Sherine', year: '2018', genre: 'Arabic Pop' },
  { title: 'Naseeny Leeh', artist: 'Tamer Hosny', year: '2006', genre: 'Arabic Pop' },
  { title: 'Kol Marra', artist: 'Tamer Hosny', year: '2006', genre: 'Arabic Pop' },
  { title: 'Bint El Geran', artist: 'Hassan Shakosh & Omar Kamal', year: '2019', genre: 'Arabic Mahraganat' },
];

// ══════════════════════════════════════════════════════════════
// 6. THAILAND
// ══════════════════════════════════════════════════════════════
const thailand = [
  { title: 'Fon Tok Mai', artist: 'Three Man Down', year: '2019', genre: 'Thai Pop' },
  { title: 'Snooze', artist: 'Three Man Down', year: '2021', genre: 'Thai Pop' },
  { title: 'Khwam Lap Nang Fa', artist: 'Three Man Down', year: '2023', genre: 'Thai Pop' },
  { title: 'Same Page?', artist: 'Tilly Birds', year: '2020', genre: 'Thai Indie' },
  { title: 'Khon Rao Cha Rak Kan Dai Sak Tao Rai', artist: 'Tilly Birds', year: '2021', genre: 'Thai Indie' },
  { title: 'Mirror Mirror', artist: 'F.HERO x MILLI ft. Changbin', year: '2021', genre: 'Thai Hip-Hop' },
  { title: 'Pak Kon', artist: 'MILLI', year: '2020', genre: 'Thai Hip-Hop' },
  { title: 'Skyline', artist: 'Billkin', year: '2020', genre: 'Thai OST' },
  { title: 'Fire Boy', artist: 'PP Krit', year: '2022', genre: 'T-Pop' },
  { title: 'Booty Bomb', artist: '4EVE', year: '2021', genre: 'T-Pop' },
  { title: 'Doo Dee', artist: 'Polycat', year: '2019', genre: 'Thai Synth-Pop' },
  { title: 'Alright', artist: 'Polycat', year: '2018', genre: 'Thai Synth-Pop' },
  { title: 'Rao Lae Nai', artist: 'LOSO', year: '1998', genre: 'Thai Rock' },
  { title: 'Jai Sang Ma', artist: 'LOSO', year: '2000', genre: 'Thai Rock' },
  { title: 'Som San', artist: 'LOSO', year: '1998', genre: 'Thai Rock' },
  { title: 'Khu Chiwit', artist: 'Cocktail', year: '2014', genre: 'Thai Rock' },
  { title: 'Ther', artist: 'Cocktail', year: '2014', genre: 'Thai Rock' },
  { title: 'Kook Khao', artist: 'Cocktail', year: '2012', genre: 'Thai Rock' },
  { title: 'Saeng Sut Thai', artist: 'Bodyslam', year: '2006', genre: 'Thai Rock' },
  { title: 'Melt', artist: 'Four-Mod', year: '2007', genre: 'T-Pop' },
  { title: 'Ploi', artist: 'NUM KALA', year: '2020', genre: 'Thai Rock' },
];

// ══════════════════════════════════════════════════════════════
// 7. AMERIKA LATIN
// ══════════════════════════════════════════════════════════════
const latin = [
  { title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee', year: '2017', genre: 'Latin Pop' },
  { title: 'Echame La Culpa', artist: 'Luis Fonsi & Demi Lovato', year: '2017', genre: 'Latin Pop' },
  { title: 'Gasolina', artist: 'Daddy Yankee', year: '2004', genre: 'Reggaeton' },
  { title: 'Dura', artist: 'Daddy Yankee', year: '2018', genre: 'Reggaeton' },
  { title: 'Con Calma', artist: 'Daddy Yankee & Snow', year: '2019', genre: 'Reggaeton' },
  { title: 'Tití Me Preguntó', artist: 'Bad Bunny', year: '2022', genre: 'Reggaeton' },
  { title: 'Me Porto Bonito', artist: 'Bad Bunny & Chencho Corleone', year: '2022', genre: 'Reggaeton' },
  { title: 'Dakiti', artist: 'Bad Bunny & Jhay Cortez', year: '2020', genre: 'Latin Pop' },
  { title: 'Callaita', artist: 'Bad Bunny & Tainy', year: '2019', genre: 'Reggaeton' },
  { title: 'Monaco', artist: 'Bad Bunny', year: '2023', genre: 'Reggaeton' },
  { title: 'Mi Gente', artist: 'J Balvin & Willy William', year: '2017', genre: 'Reggaeton' },
  { title: 'Ay Vamos', artist: 'J Balvin', year: '2014', genre: 'Reggaeton' },
  { title: 'Hawai', artist: 'Maluma', year: '2020', genre: 'Latin Pop' },
  { title: 'Felices los 4', artist: 'Maluma', year: '2017', genre: 'Reggaeton' },
  { title: 'Hips Don\'t Lie', artist: 'Shakira ft. Wyclef Jean', year: '2006', genre: 'Latin Pop' },
  { title: 'Waka Waka', artist: 'Shakira', year: '2010', genre: 'Latin Pop' },
  { title: 'TQG', artist: 'KAROL G & Shakira', year: '2023', genre: 'Reggaeton' },
  { title: 'Whenever, Wherever', artist: 'Shakira', year: '2001', genre: 'Latin Pop' },
  { title: 'BZRP Music Sessions #53', artist: 'Shakira & Bizarrap', year: '2023', genre: 'Latin Pop' },
  { title: 'Provenza', artist: 'KAROL G', year: '2022', genre: 'Reggaeton' },
  { title: 'Tusa', artist: 'KAROL G & Nicki Minaj', year: '2019', genre: 'Reggaeton' },
  { title: 'Bichota', artist: 'KAROL G', year: '2020', genre: 'Reggaeton' },
  { title: 'Bailando', artist: 'Enrique Iglesias', year: '2014', genre: 'Latin Pop' },
  { title: 'El Perdon', artist: 'Nicky Jam & Enrique Iglesias', year: '2015', genre: 'Reggaeton' },
  { title: 'Hero', artist: 'Enrique Iglesias', year: '2001', genre: 'Latin Pop' },
  { title: 'Pepas', artist: 'Farruko', year: '2021', genre: 'Latin Dance' },
  { title: 'Vivir Mi Vida', artist: 'Marc Anthony', year: '2013', genre: 'Salsa' },
  { title: 'La Bicicleta', artist: 'Carlos Vives & Shakira', year: '2016', genre: 'Latin Pop' },
];

// ══════════════════════════════════════════════════════════════
// DEDUPLIKASI & SAVE
// ══════════════════════════════════════════════════════════════
function dedup(list) {
  const result = [];
  const seen = new Set();
  for (const item of list) {
    const key = `${item.title}|${item.artist}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

const masterCatalog = {
  indo: dedup(indo),
  western: dedup(western),
  japan: dedup(japan),
  korea: dedup(korea),
  arabic: dedup(arabic),
  thailand: dedup(thailand),
  latin: dedup(latin)
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
console.log(`TOTAL SEMUA   : ${totalAll} Lagu (Judul Asli, Tahun Akurat) 🚀`);
console.log(`======================================================\n`);
