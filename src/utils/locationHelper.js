/**
 * Smart Global Location Normalizer & Parser
 * Mendukung seluruh Kota/Kabupaten di Indonesia + Malaysia + Kota-Kota Metropolitan Dunia + Seluruh Negara Global
 */

// Blacklist Kata Anomali / Lokasi Fiksi / Meme (Bukan Nama Lokasi Riil di Dunia)
const ANOMALY_LOCATIONS = new Set([
  'home', 'rumah', 'kamar', 'surga', 'bumi', 'earth', 'mars', 'galaxy',
  'discord', 'server', 'secret', 'rahasia', 'unknown', 'lainnya', 'other',
  'none', '-', 'null', 'undefined', 'barat', 'timur', 'tengah', 'utara', 'selatan', 'pusat',
  'indonesia', 'indo', 'id', 'wib', 'wita', 'wit', 'here', 'dimana', 'ntah', 'gatau',
  'somewhere', 'anywhere', 'nowhere', 'heart', 'hati', 'planet', 'universe',
  // Lokasi Fiksi / Pop Culture / Meme
  'isekai', 'konoha', 'wakanda', 'bikini bottom', 'namek', 'hogwarts', 'atlantis', 'gotham', 'metropolis',
  'heaven', 'hell', 'neraka', 'kayangan', 'alam gaib', 'alam barzah', 'akhirat', 'alam lain',
  'bulan', 'moon', 'sun', 'matahari', 'pluto', 'jupiter', 'saturnus', 'venus', 'merkurius', 'neptunus', 'uranus',
  'jauh', 'antah berantah', 'dimana mana', 'mana aja', 'hati kamu', 'hatimu', 'lubuk hati', 'pikiran', 'mimpi',
  'anime', 'wibu', 'otaku', '2d', 'dunia 2d', 'genshin', 'teyvat', 'honkai', 'roblox', 'minecraft'
]);

// Kamus Negara Bagian & Kota di Malaysia (🇲🇾)
const MALAYSIA_REGIONS = {
  // 13 Negara Bagian & 3 Wilayah Persekutuan
  'sarawak': { city: 'Sarawak', state: 'Sarawak', country: 'Malaysia', flag: '🇲🇾' },
  'sabah': { city: 'Sabah', state: 'Sabah', country: 'Malaysia', flag: '🇲🇾' },
  'johor': { city: 'Johor', state: 'Johor', country: 'Malaysia', flag: '🇲🇾' },
  'selangor': { city: 'Selangor', state: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'perak': { city: 'Perak', state: 'Perak', country: 'Malaysia', flag: '🇲🇾' },
  'kedah': { city: 'Kedah', state: 'Kedah', country: 'Malaysia', flag: '🇲🇾' },
  'kelantan': { city: 'Kelantan', state: 'Kelantan', country: 'Malaysia', flag: '🇲🇾' },
  'terengganu': { city: 'Terengganu', state: 'Terengganu', country: 'Malaysia', flag: '🇲🇾' },
  'pahang': { city: 'Pahang', state: 'Pahang', country: 'Malaysia', flag: '🇲🇾' },
  'melaka': { city: 'Melaka', state: 'Melaka', country: 'Malaysia', flag: '🇲🇾' },
  'malacca': { city: 'Melaka', state: 'Melaka', country: 'Malaysia', flag: '🇲🇾' },
  'negeri sembilan': { city: 'Negeri Sembilan', state: 'Negeri Sembilan', country: 'Malaysia', flag: '🇲🇾' },
  'perlis': { city: 'Perlis', state: 'Perlis', country: 'Malaysia', flag: '🇲🇾' },
  'pulau pinang': { city: 'Penang', state: 'Penang', country: 'Malaysia', flag: '🇲🇾' },
  'penang': { city: 'Penang', state: 'Penang', country: 'Malaysia', flag: '🇲🇾' },
  'kuala lumpur': { city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', country: 'Malaysia', flag: '🇲🇾' },
  'kl': { city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', country: 'Malaysia', flag: '🇲🇾' },
  'putrajaya': { city: 'Putrajaya', state: 'Wilayah Persekutuan', country: 'Malaysia', flag: '🇲🇾' },
  'labuan': { city: 'Labuan', state: 'Wilayah Persekutuan', country: 'Malaysia', flag: '🇲🇾' },

  // Kota-Kota Populer di Malaysia
  'kuching': { city: 'Kuching', state: 'Sarawak', country: 'Malaysia', flag: '🇲🇾' },
  'miri': { city: 'Miri', state: 'Sarawak', country: 'Malaysia', flag: '🇲🇾' },
  'sibu': { city: 'Sibu', state: 'Sarawak', country: 'Malaysia', flag: '🇲🇾' },
  'bintulu': { city: 'Bintulu', state: 'Sarawak', country: 'Malaysia', flag: '🇲🇾' },
  'kota kinabalu': { city: 'Kota Kinabalu', state: 'Sabah', country: 'Malaysia', flag: '🇲🇾' },
  'sandakan': { city: 'Sandakan', state: 'Sabah', country: 'Malaysia', flag: '🇲🇾' },
  'tawau': { city: 'Tawau', state: 'Sabah', country: 'Malaysia', flag: '🇲🇾' },
  'johor bahru': { city: 'Johor Bahru', state: 'Johor', country: 'Malaysia', flag: '🇲🇾' },
  'jb': { city: 'Johor Bahru', state: 'Johor', country: 'Malaysia', flag: '🇲🇾' },
  'george town': { city: 'George Town', state: 'Penang', country: 'Malaysia', flag: '🇲🇾' },
  'georgetown': { city: 'George Town', state: 'Penang', country: 'Malaysia', flag: '🇲🇾' },
  'ipoh': { city: 'Ipoh', state: 'Perak', country: 'Malaysia', flag: '🇲🇾' },
  'shah alam': { city: 'Shah Alam', state: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'petaling jaya': { city: 'Petaling Jaya', state: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'pj': { city: 'Petaling Jaya', state: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'subang jaya': { city: 'Subang Jaya', state: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'klang': { city: 'Klang', state: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'alor setar': { city: 'Alor Setar', state: 'Kedah', country: 'Malaysia', flag: '🇲🇾' },
  'kuantan': { city: 'Kuantan', state: 'Pahang', country: 'Malaysia', flag: '🇲🇾' },
  'seremban': { city: 'Seremban', state: 'Negeri Sembilan', country: 'Malaysia', flag: '🇲🇾' },
  'kota bharu': { city: 'Kota Bharu', state: 'Kelantan', country: 'Malaysia', flag: '🇲🇾' },
  'kuala terengganu': { city: 'Kuala Terengganu', state: 'Terengganu', country: 'Malaysia', flag: '🇲🇾' }
};

// Kamus Negara Global & Emoji Bendera
const GLOBAL_COUNTRIES = {
  'indonesia': { name: 'Indonesia', flag: '🇮🇩', code: 'ID' },
  'singapore': { name: 'Singapore', flag: '🇸🇬', code: 'SG' },
  'singapura': { name: 'Singapore', flag: '🇸🇬', code: 'SG' },
  'malaysia': { name: 'Malaysia', flag: '🇲🇾', code: 'MY' },
  'thailand': { name: 'Thailand', flag: '🇹🇭', code: 'TH' },
  'philippines': { name: 'Filipina', flag: '🇵🇭', code: 'PH' },
  'filipina': { name: 'Filipina', flag: '🇵🇭', code: 'PH' },
  'vietnam': { name: 'Vietnam', flag: '🇻🇳', code: 'VN' },
  'brunei': { name: 'Brunei', flag: '🇧🇳', code: 'BN' },
  'japan': { name: 'Jepang', flag: '🇯🇵', code: 'JP' },
  'jepang': { name: 'Jepang', flag: '🇯🇵', code: 'JP' },
  'south korea': { name: 'Korea Selatan', flag: '🇰🇷', code: 'KR' },
  'korea': { name: 'Korea Selatan', flag: '🇰🇷', code: 'KR' },
  'korsel': { name: 'Korea Selatan', flag: '🇰🇷', code: 'KR' },
  'china': { name: 'China', flag: '🇨🇳', code: 'CN' },
  'tiongkok': { name: 'China', flag: '🇨🇳', code: 'CN' },
  'taiwan': { name: 'Taiwan', flag: '🇹🇼', code: 'TW' },
  'hong kong': { name: 'Hong Kong', flag: '🇭🇰', code: 'HK' },
  'usa': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'united states': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'amerika': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'uk': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'united kingdom': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'england': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'inggris': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'australia': { name: 'Australia', flag: '🇦🇺', code: 'AU' },
  'canada': { name: 'Kanada', flag: '🇨🇦', code: 'CA' },
  'kanada': { name: 'Kanada', flag: '🇨🇦', code: 'CA' },
  'germany': { name: 'Jerman', flag: '🇩🇪', code: 'DE' },
  'jerman': { name: 'Jerman', flag: '🇩🇪', code: 'DE' },
  'france': { name: 'Prancis', flag: '🇫🇷', code: 'FR' },
  'prancis': { name: 'Prancis', flag: '🇫🇷', code: 'FR' },
  'netherlands': { name: 'Belanda', flag: '🇳🇱', code: 'NL' },
  'belanda': { name: 'Belanda', flag: '🇳🇱', code: 'NL' },
  'russia': { name: 'Rusia', flag: '🇷🇺', code: 'RU' },
  'rusia': { name: 'Rusia', flag: '🇷🇺', code: 'RU' },
  'turkey': { name: 'Turki', flag: '🇹🇷', code: 'TR' },
  'turki': { name: 'Turki', flag: '🇹🇷', code: 'TR' },
  'saudi arabia': { name: 'Arab Saudi', flag: '🇸🇦', code: 'SA' },
  'arab saudi': { name: 'Arab Saudi', flag: '🇸🇦', code: 'SA' },
  'uae': { name: 'Uni Emirat Arab', flag: '🇦🇪', code: 'AE' },
  'dubai': { name: 'Uni Emirat Arab', flag: '🇦🇪', code: 'AE' }
};

// Kamus Kota Global Populer
const GLOBAL_CITIES = {
  'tokyo': { city: 'Tokyo', country: 'Jepang', flag: '🇯🇵' },
  'osaka': { city: 'Osaka', country: 'Jepang', flag: '🇯🇵' },
  'kyoto': { city: 'Kyoto', country: 'Jepang', flag: '🇯🇵' },
  'seoul': { city: 'Seoul', country: 'Korea Selatan', flag: '🇰🇷' },
  'busan': { city: 'Busan', country: 'Korea Selatan', flag: '🇰🇷' },
  'bangkok': { city: 'Bangkok', country: 'Thailand', flag: '🇹🇭' },
  'manila': { city: 'Manila', country: 'Filipina', flag: '🇵🇭' },
  'taipei': { city: 'Taipei', country: 'Taiwan', flag: '🇹🇼' },
  'beijing': { city: 'Beijing', country: 'China', flag: '🇨🇳' },
  'shanghai': { city: 'Shanghai', country: 'China', flag: '🇨🇳' },
  'london': { city: 'London', country: 'United Kingdom', flag: '🇬🇧' },
  'manchester': { city: 'Manchester', country: 'United Kingdom', flag: '🇬🇧' },
  'new york': { city: 'New York', country: 'United States', flag: '🇺🇸' },
  'nyc': { city: 'New York', country: 'United States', flag: '🇺🇸' },
  'los angeles': { city: 'Los Angeles', country: 'United States', flag: '🇺🇸' },
  'san francisco': { city: 'San Francisco', country: 'United States', flag: '🇺🇸' },
  'sydney': { city: 'Sydney', country: 'Australia', flag: '🇦🇺' },
  'melbourne': { city: 'Melbourne', country: 'Australia', flag: '🇦🇺' },
  'toronto': { city: 'Toronto', country: 'Kanada', flag: '🇨🇦' },
  'vancouver': { city: 'Vancouver', country: 'Kanada', flag: '🇨🇦' },
  'berlin': { city: 'Berlin', country: 'Jerman', flag: '🇩🇪' },
  'paris': { city: 'Paris', country: 'Prancis', flag: '🇫🇷' },
  'amsterdam': { city: 'Amsterdam', country: 'Belanda', flag: '🇳🇱' }
};

// Kamus 38 Provinsi Indonesia
const INDONESIA_PROVINCES = {
  'aceh': 'Aceh',
  'sumatera utara': 'Sumatera Utara',
  'sumut': 'Sumatera Utara',
  'sumatera barat': 'Sumatera Barat',
  'sumbar': 'Sumatera Barat',
  'riau': 'Riau',
  'kepulauan riau': 'Kepulauan Riau',
  'kepri': 'Kepulauan Riau',
  'jambi': 'Jambi',
  'sumatera selatan': 'Sumatera Selatan',
  'sumsel': 'Sumatera Selatan',
  'sumatra': 'Sumatera',
  'sumatera': 'Sumatera',
  'bengkulu': 'Bengkulu',
  'lampung': 'Lampung',
  'kepulauan bangka belitung': 'Kepulauan Bangka Belitung',
  'bangka belitung': 'Kepulauan Bangka Belitung',
  'babel': 'Kepulauan Bangka Belitung',
  'dki jakarta': 'DKI Jakarta',
  'jakarta': 'DKI Jakarta',
  'jawa barat': 'Jawa Barat',
  'jabar': 'Jawa Barat',
  'jawa tengah': 'Jawa Tengah',
  'jateng': 'Jawa Tengah',
  'di yogyakarta': 'DI Yogyakarta',
  'yogyakarta': 'DI Yogyakarta',
  'jogja': 'DI Yogyakarta',
  'jogjakarta': 'DI Yogyakarta',
  'jawa timur': 'Jawa Timur',
  'jatim': 'Jawa Timur',
  'banten': 'Banten',
  'bali': 'Bali',
  'nusa tenggara barat': 'Nusa Tenggara Barat',
  'ntb': 'Nusa Tenggara Barat',
  'nusa tenggara timur': 'Nusa Tenggara Timur',
  'ntt': 'Nusa Tenggara Timur',
  'kalimantan barat': 'Kalimantan Barat',
  'kalbar': 'Kalimantan Barat',
  'kalimantan tengah': 'Kalimantan Tengah',
  'kalteng': 'Kalimantan Tengah',
  'kalimantan selatan': 'Kalimantan Selatan',
  'kalsel': 'Kalimantan Selatan',
  'kalimantan timur': 'Kalimantan Timur',
  'kaltim': 'Kalimantan Timur',
  'kalimantan utara': 'Kalimantan Utara',
  'kaltara': 'Kalimantan Utara',
  'sulawesi utara': 'Sulawesi Utara',
  'sulut': 'Sulawesi Utara',
  'sulawesi tengah': 'Sulawesi Tengah',
  'sulteng': 'Sulawesi Tengah',
  'sulawesi selatan': 'Sulawesi Selatan',
  'sulsel': 'Sulawesi Selatan',
  'sulawesi tenggara': 'Sulawesi Tenggara',
  'sultra': 'Sulawesi Tenggara',
  'gorontalo': 'Gorontalo',
  'sulawesi barat': 'Sulawesi Barat',
  'sulbar': 'Sulawesi Barat',
  'maluku': 'Maluku',
  'maluku utara': 'Maluku Utara',
  'malut': 'Maluku Utara',
  'papua': 'Papua',
  'papua barat': 'Papua Barat',
  'papua selatan': 'Papua Selatan',
  'papua tengah': 'Papua Tengah',
  'papua pegunungan': 'Papua Pegunungan',
  'papua barat daya': 'Papua Barat Daya'
};

// Kamus Kota/Kabupaten Populer di Indonesia
const INDONESIA_CITIES = {
  // DKI Jakarta
  'jakarta barat': { city: 'Jakarta Barat', province: 'DKI Jakarta' },
  'jakbar': { city: 'Jakarta Barat', province: 'DKI Jakarta' },
  'jakarta selatan': { city: 'Jakarta Selatan', province: 'DKI Jakarta' },
  'jaksel': { city: 'Jakarta Selatan', province: 'DKI Jakarta' },
  'jakarta timur': { city: 'Jakarta Timur', province: 'DKI Jakarta' },
  'jaktim': { city: 'Jakarta Timur', province: 'DKI Jakarta' },
  'jakarta pusat': { city: 'Jakarta Pusat', province: 'DKI Jakarta' },
  'jakpus': { city: 'Jakarta Pusat', province: 'DKI Jakarta' },
  'jakarta utara': { city: 'Jakarta Utara', province: 'DKI Jakarta' },
  'jakut': { city: 'Jakarta Utara', province: 'DKI Jakarta' },

  // Jawa Barat
  'bandung': { city: 'Bandung', province: 'Jawa Barat' },
  'bogor': { city: 'Bogor', province: 'Jawa Barat' },
  'bekasi': { city: 'Bekasi', province: 'Jawa Barat' },
  'bekasea': { city: 'Bekasi', province: 'Jawa Barat' },
  'depok': { city: 'Depok', province: 'Jawa Barat' },
  'cimahi': { city: 'Cimahi', province: 'Jawa Barat' },
  'sukabumi': { city: 'Sukabumi', province: 'Jawa Barat' },
  'cirebon': { city: 'Cirebon', province: 'Jawa Barat' },
  'tasikmalaya': { city: 'Tasikmalaya', province: 'Jawa Barat' },
  'indramayu': { city: 'Indramayu', province: 'Jawa Barat' },
  'karawang': { city: 'Karawang', province: 'Jawa Barat' },
  'purwakarta': { city: 'Purwakarta', province: 'Jawa Barat' },
  'subang': { city: 'Subang', province: 'Jawa Barat' },
  'garut': { city: 'Garut', province: 'Jawa Barat' },
  'sumedang': { city: 'Sumedang', province: 'Jawa Barat' },
  'majalengka': { city: 'Majalengka', province: 'Jawa Barat' },
  'kuningan': { city: 'Kuningan', province: 'Jawa Barat' },
  'cianjur': { city: 'Cianjur', province: 'Jawa Barat' },
  'ciamis': { city: 'Ciamis', province: 'Jawa Barat' },

  // Banten
  'tangerang selatan': { city: 'Tangerang Selatan', province: 'Banten' },
  'tangsel': { city: 'Tangerang Selatan', province: 'Banten' },
  'tangerang': { city: 'Tangerang', province: 'Banten' },
  'serang': { city: 'Serang', province: 'Banten' },
  'cilegon': { city: 'Cilegon', province: 'Banten' },

  // Jawa Tengah & DIY
  'semarang': { city: 'Semarang', province: 'Jawa Tengah' },
  'surakarta': { city: 'Surakarta', province: 'Jawa Tengah' },
  'solo': { city: 'Surakarta', province: 'Jawa Tengah' },
  'magelang': { city: 'Magelang', province: 'Jawa Tengah' },
  'pekalongan': { city: 'Pekalongan', province: 'Jawa Tengah' },
  'salatiga': { city: 'Salatiga', province: 'Jawa Tengah' },
  'tegal': { city: 'Tegal', province: 'Jawa Tengah' },
  'banyumas': { city: 'Banyumas', province: 'Jawa Tengah' },
  'purwokerto': { city: 'Purwokerto', province: 'Jawa Tengah' },
  'cilacap': { city: 'Cilacap', province: 'Jawa Tengah' },
  'kudus': { city: 'Kudus', province: 'Jawa Tengah' },
  'pati': { city: 'Pati', province: 'Jawa Tengah' },
  'jepara': { city: 'Jepara', province: 'Jawa Tengah' },
  'klaten': { city: 'Klaten', province: 'Jawa Tengah' },
  'sleman': { city: 'Sleman', province: 'DI Yogyakarta' },
  'bantul': { city: 'Bantul', province: 'DI Yogyakarta' },
  'kulon progo': { city: 'Kulon Progo', province: 'DI Yogyakarta' },
  'gunungkidul': { city: 'Gunungkidul', province: 'DI Yogyakarta' },

  // Jawa Timur
  'surabaya': { city: 'Surabaya', province: 'Jawa Timur' },
  'malang': { city: 'Malang', province: 'Jawa Timur' },
  'sidoarjo': { city: 'Sidoarjo', province: 'Jawa Timur' },
  'gresik': { city: 'Gresik', province: 'Jawa Timur' },
  'kediri': { city: 'Kediri', province: 'Jawa Timur' },
  'blitar': { city: 'Blitar', province: 'Jawa Timur' },
  'madiun': { city: 'Madiun', province: 'Jawa Timur' },
  'mojokerto': { city: 'Mojokerto', province: 'Jawa Timur' },
  'pasuruan': { city: 'Pasuruan', province: 'Jawa Timur' },
  'probolinggo': { city: 'Probolinggo', province: 'Jawa Timur' },
  'batu': { city: 'Batu', province: 'Jawa Timur' },
  'jombang': { city: 'Jombang', province: 'Jawa Timur' },
  'banyuwangi': { city: 'Banyuwangi', province: 'Jawa Timur' },
  'jember': { city: 'Jember', province: 'Jawa Timur' },

  // Bali & Nusa Tenggara
  'denpasar': { city: 'Denpasar', province: 'Bali' },
  'badung': { city: 'Badung', province: 'Bali' },
  'gianyar': { city: 'Gianyar', province: 'Bali' },
  'tabanan': { city: 'Tabanan', province: 'Bali' },
  'buleleng': { city: 'Buleleng', province: 'Bali' },
  'singaraja': { city: 'Buleleng', province: 'Bali' },
  'klungkung': { city: 'Klungkung', province: 'Bali' },
  'karangasem': { city: 'Karangasem', province: 'Bali' },
  'mataram': { city: 'Mataram', province: 'Nusa Tenggara Barat' },
  'lombok': { city: 'Lombok', province: 'Nusa Tenggara Barat' },
  'kupang': { city: 'Kupang', province: 'Nusa Tenggara Timur' },

  // Kalimantan
  'pontianak': { city: 'Pontianak', province: 'Kalimantan Barat' },
  'singkawang': { city: 'Singkawang', province: 'Kalimantan Barat' },
  'banjarmasin': { city: 'Banjarmasin', province: 'Kalimantan Selatan' },
  'banjarbaru': { city: 'Banjarbaru', province: 'Kalimantan Selatan' },
  'palangkaraya': { city: 'Palangka Raya', province: 'Kalimantan Tengah' },
  'palangka raya': { city: 'Palangka Raya', province: 'Kalimantan Tengah' },
  'sampit': { city: 'Sampit', province: 'Kalimantan Tengah' },
  'kotawaringin': { city: 'Kotawaringin', province: 'Kalimantan Tengah' },
  'kapuas': { city: 'Kapuas', province: 'Kalimantan Tengah' },
  'pangkalan bun': { city: 'Pangkalan Bun', province: 'Kalimantan Tengah' },
  'samarinda': { city: 'Samarinda', province: 'Kalimantan Timur' },
  'balikpapan': { city: 'Balikpapan', province: 'Kalimantan Timur' },
  'bontang': { city: 'Bontang', province: 'Kalimantan Timur' },
  'tarakan': { city: 'Tarakan', province: 'Kalimantan Utara' },

  // Sumatera
  'medan': { city: 'Medan', province: 'Sumatera Utara' },
  'padang': { city: 'Padang', province: 'Sumatera Barat' },
  'pekanbaru': { city: 'Pekanbaru', province: 'Riau' },
  'dumai': { city: 'Dumai', province: 'Riau' },
  'duri': { city: 'Duri', province: 'Riau' },
  'batam': { city: 'Batam', province: 'Kepulauan Riau' },
  'tanjungpinang': { city: 'Tanjungpinang', province: 'Kepulauan Riau' },
  'palembang': { city: 'Palembang', province: 'Sumatera Selatan' },
  'pagaralam': { city: 'Pagar Alam', province: 'Sumatera Selatan' },
  'pagar alam': { city: 'Pagar Alam', province: 'Sumatera Selatan' },
  'prabumulih': { city: 'Prabumulih', province: 'Sumatera Selatan' },
  'lubuklinggau': { city: 'Lubuklinggau', province: 'Sumatera Selatan' },
  'lubuk linggau': { city: 'Lubuklinggau', province: 'Sumatera Selatan' },
  'muara enim': { city: 'Muara Enim', province: 'Sumatera Selatan' },
  'lahat': { city: 'Lahat', province: 'Sumatera Selatan' },
  'banyuasin': { city: 'Banyuasin', province: 'Sumatera Selatan' },
  'ogan ilir': { city: 'Ogan Ilir', province: 'Sumatera Selatan' },
  'bandar lampung': { city: 'Bandar Lampung', province: 'Lampung' },
  'pangkalpinang': { city: 'Pangkalpinang', province: 'Kepulauan Bangka Belitung' },
  'bangka': { city: 'Bangka', province: 'Kepulauan Bangka Belitung' },
  'belitung': { city: 'Belitung', province: 'Kepulauan Bangka Belitung' },
  'banda aceh': { city: 'Banda Aceh', province: 'Aceh' },
  'bengkulu': { city: 'Bengkulu', province: 'Bengkulu' },
  'rejang lebong': { city: 'Rejang Lebong', province: 'Bengkulu' },
  'mukomuko': { city: 'Mukomuko', province: 'Bengkulu' },
  'jambi': { city: 'Jambi', province: 'Jambi' },
  'sungai penuh': { city: 'Sungai Penuh', province: 'Jambi' },
  'muaro jambi': { city: 'Muaro Jambi', province: 'Jambi' },
  'bungo': { city: 'Bungo', province: 'Jambi' },
  'merangin': { city: 'Merangin', province: 'Jambi' },

  // Sulawesi & Maluku & Papua
  'makassar': { city: 'Makassar', province: 'Sulawesi Selatan' },
  'sidenreng rappang': { city: 'Sidenreng Rappang', province: 'Sulawesi Selatan' },
  'sidrap': { city: 'Sidenreng Rappang', province: 'Sulawesi Selatan' },
  'gowa': { city: 'Gowa', province: 'Sulawesi Selatan' },
  'maros': { city: 'Maros', province: 'Sulawesi Selatan' },
  'bone': { city: 'Bone', province: 'Sulawesi Selatan' },
  'wajo': { city: 'Wajo', province: 'Sulawesi Selatan' },
  'soppeng': { city: 'Soppeng', province: 'Sulawesi Selatan' },
  'pinrang': { city: 'Pinrang', province: 'Sulawesi Selatan' },
  'parepare': { city: 'Parepare', province: 'Sulawesi Selatan' },
  'pare pare': { city: 'Parepare', province: 'Sulawesi Selatan' },
  'palopo': { city: 'Palopo', province: 'Sulawesi Selatan' },
  'toraja': { city: 'Tana Toraja', province: 'Sulawesi Selatan' },
  'bulukumba': { city: 'Bulukumba', province: 'Sulawesi Selatan' },
  'manado': { city: 'Manado', province: 'Sulawesi Utara' },
  'palu': { city: 'Palu', province: 'Sulawesi Tengah' },
  'kendari': { city: 'Kendari', province: 'Sulawesi Tenggara' },
  'ambon': { city: 'Ambon', province: 'Maluku' },
  'tual': { city: 'Tual', province: 'Maluku' },
  'ternate': { city: 'Ternate', province: 'Maluku Utara' },
  'jayapura': { city: 'Jayapura', province: 'Papua' },
  'sorong': { city: 'Sorong', province: 'Papua Barat Daya' },
  'merauke': { city: 'Merauke', province: 'Papua Selatan' },
  'timika': { city: 'Timika', province: 'Papua Tengah' }
};

/**
 * Normalisasi dan deteksi lokasi
 */
function parseLocation(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const original = raw.trim();

  // 0. Bersihkan semua emoji dan regional indicator flag agar tidak terjadi duplikasi bendera
  const cleanWithoutEmojis = original
    .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '') // Surrogate pairs (emoji umum & flags)
    .replace(/[\u2600-\u27BF]/g, '')               // Misc symbols
    .replace(/[\uFE00-\uFE0F]/g, '')               // Variation selectors
    .trim();

  let clean = cleanWithoutEmojis
    .toLowerCase()
    .replace(/[,\.\-\/\\_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length < 2) return null;

  // 1. Cek kata-kata anomali / lokasi fiksi langsung (isekai, konoha, surga, dll)
  if (ANOMALY_LOCATIONS.has(clean)) {
    const cap = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return {
      isAnomaly: true,
      city: cap,
      stateOrProvince: 'Fiksi / Lainnya',
      country: 'Non-Duniawi',
      flag: '🌌',
      display: `${cap} 🌌`,
      searchKey: cap
    };
  }

  let detectedCountry = null;
  let detectedFlag = '🇮🇩';
  let detectedProvince = null;
  let detectedCity = null;

  // 2. Cek Daerah Malaysia (Sarawak, Sabah, KL, dll) — PRIORITAS sebelum default ke Indonesia!
  const sortedMyKeys = Object.keys(MALAYSIA_REGIONS).sort((a, b) => b.length - a.length);
  for (const key of sortedMyKeys) {
    const reg = MALAYSIA_REGIONS[key];
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(clean)) {
      detectedCity = reg.city;
      detectedProvince = reg.state;
      detectedCountry = reg.country;
      detectedFlag = reg.flag;
      break;
    }
  }

  // 3. Cek Kota Global Lainnya (Tokyo, Seoul, dll)
  if (!detectedCity) {
    for (const [key, cityInfo] of Object.entries(GLOBAL_CITIES)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(clean)) {
        detectedCity = cityInfo.city;
        detectedProvince = cityInfo.country;
        detectedCountry = cityInfo.country;
        detectedFlag = cityInfo.flag;
        break;
      }
    }
  }

  // 4. Cek Negara Global (kecuali Indonesia)
  if (!detectedCity) {
    for (const [key, countryInfo] of Object.entries(GLOBAL_COUNTRIES)) {
      if (key === 'indonesia' || key === 'id' || key === 'indo') continue;
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(clean)) {
        detectedCity = countryInfo.name;
        detectedProvince = countryInfo.name;
        detectedCountry = countryInfo.name;
        detectedFlag = countryInfo.flag;
        break;
      }
    }
  }

  // 5. Cek Kota/Kabupaten Indonesia (Urutkan dari nama terpanjang)
  if (!detectedCity) {
    const sortedCityKeys = Object.keys(INDONESIA_CITIES).sort((a, b) => b.length - a.length);
    for (const key of sortedCityKeys) {
      const cityInfo = INDONESIA_CITIES[key];
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(clean)) {
        detectedCity = cityInfo.city;
        detectedProvince = cityInfo.province;
        detectedCountry = 'Indonesia';
        detectedFlag = '🇮🇩';
        break;
      }
    }
  }

  // 6. Cek Provinsi Indonesia (jika belum ada kota spesifik)
  if (!detectedCity) {
    const sortedProvKeys = Object.keys(INDONESIA_PROVINCES).sort((a, b) => b.length - a.length);
    for (const key of sortedProvKeys) {
      const provName = INDONESIA_PROVINCES[key];
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(clean)) {
        detectedCity = provName;
        detectedProvince = provName; // Set provinsi juga agar tidak masuk ke (Lainnya)!
        detectedCountry = 'Indonesia';
        detectedFlag = '🇮🇩';
        break;
      }
    }
  }

  // 7. Cek jika mengandung kata anomali di dalam kalimat (misal: "isekai realm")
  if (detectedCity && ANOMALY_LOCATIONS.has(detectedCity.toLowerCase())) {
    return { isAnomaly: true, city: detectedCity, country: 'Non-Duniawi', flag: '🌌', display: `${detectedCity} 🌌` };
  }

  // 8. Fallback jika tidak terdaftar di kamus
  if (!detectedCity) {
    // Jika mengandung kata anomali, tandai anomaly
    for (const anom of ANOMALY_LOCATIONS) {
      if (clean === anom || clean.startsWith(anom + ' ') || clean.endsWith(' ' + anom)) {
        const cap = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return { isAnomaly: true, city: cap, country: 'Non-Duniawi', flag: '🌌', display: `${cap} 🌌` };
      }
    }

    detectedCity = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    detectedProvince = 'Lainnya';
    detectedCountry = 'Indonesia';
    detectedFlag = '🇮🇩';
  }

  // Format string display
  let displayParts = [];
  if (detectedCity) displayParts.push(detectedCity);
  if (detectedProvince && detectedCity !== detectedProvince && detectedProvince !== 'Lainnya') {
    displayParts.push(detectedProvince);
  }
  if (detectedCountry && detectedCountry !== 'Indonesia' && detectedCity !== detectedCountry) {
    displayParts.push(detectedCountry);
  }

  let display = displayParts.join(', ');
  if (detectedFlag) {
    display += ` ${detectedFlag}`;
  }

  return {
    isAnomaly: false,
    city: detectedCity,
    stateOrProvince: detectedProvince,
    country: detectedCountry || 'Indonesia',
    flag: detectedFlag,
    display,
    searchKey: detectedCity
  };
}

module.exports = {
  parseLocation,
  ANOMALY_LOCATIONS,
  MALAYSIA_REGIONS,
  GLOBAL_COUNTRIES,
  GLOBAL_CITIES,
  INDONESIA_PROVINCES,
  INDONESIA_CITIES
};

