/**
 * Smart Global Location Normalizer & Parser
 * Mendukung seluruh Kota/Kabupaten di Indonesia + Kota-Kota Metropolitan Dunia + Seluruh Negara Global
 */

// Kamus Negara Global & Emoji Bendera
const GLOBAL_COUNTRIES = {
  // Asia Tenggara
  'indonesia': { name: 'Indonesia', flag: '🇮🇩', code: 'ID' },
  'id': { name: 'Indonesia', flag: '🇮🇩', code: 'ID' },
  'singapore': { name: 'Singapore', flag: '🇸🇬', code: 'SG' },
  'singapura': { name: 'Singapore', flag: '🇸🇬', code: 'SG' },
  'sg': { name: 'Singapore', flag: '🇸🇬', code: 'SG' },
  'malaysia': { name: 'Malaysia', flag: '🇲🇾', code: 'MY' },
  'my': { name: 'Malaysia', flag: '🇲🇾', code: 'MY' },
  'thailand': { name: 'Thailand', flag: '🇹🇭', code: 'TH' },
  'philippines': { name: 'Filipina', flag: '🇵🇭', code: 'PH' },
  'filipina': { name: 'Filipina', flag: '🇵🇭', code: 'PH' },
  'vietnam': { name: 'Vietnam', flag: '🇻🇳', code: 'VN' },
  'brunei': { name: 'Brunei', flag: '🇧🇳', code: 'BN' },

  // Asia Timur
  'japan': { name: 'Jepang', flag: '🇯🇵', code: 'JP' },
  'jepang': { name: 'Jepang', flag: '🇯🇵', code: 'JP' },
  'jp': { name: 'Jepang', flag: '🇯🇵', code: 'JP' },
  'south korea': { name: 'Korea Selatan', flag: '🇰🇷', code: 'KR' },
  'korea': { name: 'Korea Selatan', flag: '🇰🇷', code: 'KR' },
  'korsel': { name: 'Korea Selatan', flag: '🇰🇷', code: 'KR' },
  'kr': { name: 'Korea Selatan', flag: '🇰🇷', code: 'KR' },
  'china': { name: 'China', flag: '🇨🇳', code: 'CN' },
  'tiongkok': { name: 'China', flag: '🇨🇳', code: 'CN' },
  'cn': { name: 'China', flag: '🇨🇳', code: 'CN' },
  'taiwan': { name: 'Taiwan', flag: '🇹🇼', code: 'TW' },
  'hong kong': { name: 'Hong Kong', flag: '🇭🇰', code: 'HK' },

  // Amerika & Eropa & Australia
  'usa': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'us': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'united states': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'amerika': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'uk': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'united kingdom': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'england': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'inggris': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'australia': { name: 'Australia', flag: '🇦🇺', code: 'AU' },
  'au': { name: 'Australia', flag: '🇦🇺', code: 'AU' },
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

// Kamus Kota-Kota Global Populer
const GLOBAL_CITIES = {
  // Asia
  'tokyo': { city: 'Tokyo', country: 'Jepang', flag: '🇯🇵' },
  'osaka': { city: 'Osaka', country: 'Jepang', flag: '🇯🇵' },
  'kyoto': { city: 'Kyoto', country: 'Jepang', flag: '🇯🇵' },
  'yokohama': { city: 'Yokohama', country: 'Jepang', flag: '🇯🇵' },
  'nagoya': { city: 'Nagoya', country: 'Jepang', flag: '🇯🇵' },
  'seoul': { city: 'Seoul', country: 'Korea Selatan', flag: '🇰🇷' },
  'busan': { city: 'Busan', country: 'Korea Selatan', flag: '🇰🇷' },
  'incheon': { city: 'Incheon', country: 'Korea Selatan', flag: '🇰🇷' },
  'kuala lumpur': { city: 'Kuala Lumpur', country: 'Malaysia', flag: '🇲🇾' },
  'kl': { city: 'Kuala Lumpur', country: 'Malaysia', flag: '🇲🇾' },
  'penang': { city: 'Penang', country: 'Malaysia', flag: '🇲🇾' },
  'johor bahru': { city: 'Johor Bahru', country: 'Malaysia', flag: '🇲🇾' },
  'bangkok': { city: 'Bangkok', country: 'Thailand', flag: '🇹🇭' },
  'manila': { city: 'Manila', country: 'Filipina', flag: '🇵🇭' },
  'taipei': { city: 'Taipei', country: 'Taiwan', flag: '🇹🇼' },
  'beijing': { city: 'Beijing', country: 'China', flag: '🇨🇳' },
  'shanghai': { city: 'Shanghai', country: 'China', flag: '🇨🇳' },
  'shenzhen': { city: 'Shenzhen', country: 'China', flag: '🇨🇳' },

  // Barat & Timur Tengah
  'london': { city: 'London', country: 'United Kingdom', flag: '🇬🇧' },
  'manchester': { city: 'Manchester', country: 'United Kingdom', flag: '🇬🇧' },
  'new york': { city: 'New York', country: 'United States', flag: '🇺🇸' },
  'nyc': { city: 'New York', country: 'United States', flag: '🇺🇸' },
  'los angeles': { city: 'Los Angeles', country: 'United States', flag: '🇺🇸' },
  'la': { city: 'Los Angeles', country: 'United States', flag: '🇺🇸' },
  'san francisco': { city: 'San Francisco', country: 'United States', flag: '🇺🇸' },
  'chicago': { city: 'Chicago', country: 'United States', flag: '🇺🇸' },
  'seattle': { city: 'Seattle', country: 'United States', flag: '🇺🇸' },
  'sydney': { city: 'Sydney', country: 'Australia', flag: '🇦🇺' },
  'melbourne': { city: 'Melbourne', country: 'Australia', flag: '🇦🇺' },
  'brisbane': { city: 'Brisbane', country: 'Australia', flag: '🇦🇺' },
  'perth': { city: 'Perth', country: 'Australia', flag: '🇦🇺' },
  'toronto': { city: 'Toronto', country: 'Kanada', flag: '🇨🇦' },
  'vancouver': { city: 'Vancouver', country: 'Kanada', flag: '🇨🇦' },
  'paris': { city: 'Paris', country: 'Prancis', flag: '🇫🇷' },
  'berlin': { city: 'Berlin', country: 'Jerman', flag: '🇩🇪' },
  'amsterdam': { city: 'Amsterdam', country: 'Belanda', flag: '🇳🇱' },
  'riyadh': { city: 'Riyadh', country: 'Arab Saudi', flag: '🇸🇦' },
  'jeddah': { city: 'Jeddah', country: 'Arab Saudi', flag: '🇸🇦' },
  'makkah': { city: 'Makkah', country: 'Arab Saudi', flag: '🇸🇦' },
  'madinah': { city: 'Madinah', country: 'Arab Saudi', flag: '🇸🇦' },
  'dubai': { city: 'Dubai', country: 'Uni Emirat Arab', flag: '🇦🇪' },
  'abu dhabi': { city: 'Abu Dhabi', country: 'Uni Emirat Arab', flag: '🇦🇪' }
};

// 38 Provinsi Indonesia
const INDONESIA_PROVINCES = {
  'jawa barat': 'Jawa Barat',
  'jabar': 'Jawa Barat',
  'jawa tengah': 'Jawa Tengah',
  'jateng': 'Jawa Tengah',
  'jawa timur': 'Jawa Timur',
  'jatim': 'Jawa Timur',
  'dki jakarta': 'DKI Jakarta',
  'jakarta': 'DKI Jakarta',
  'dki': 'DKI Jakarta',
  'banten': 'Banten',
  'di yogyakarta': 'D.I. Yogyakarta',
  'yogyakarta': 'D.I. Yogyakarta',
  'jogja': 'D.I. Yogyakarta',
  'diy': 'D.I. Yogyakarta',
  'sumatera utara': 'Sumatera Utara',
  'sumut': 'Sumatera Utara',
  'sumatera barat': 'Sumatera Barat',
  'sumbar': 'Sumatera Barat',
  'sumatera selatan': 'Sumatera Selatan',
  'sumsel': 'Sumatera Selatan',
  'riau': 'Riau',
  'kepulauan riau': 'Kepulauan Riau',
  'kepri': 'Kepulauan Riau',
  'jambi': 'Jambi',
  'bengkulu': 'Bengkulu',
  'lampung': 'Lampung',
  'bangka belitung': 'Bangka Belitung',
  'babel': 'Bangka Belitung',
  'aceh': 'Aceh',
  'bali': 'Bali',
  'nusa tenggara barat': 'NTB',
  'ntb': 'NTB',
  'nusa tenggara timur': 'NTT',
  'ntt': 'NTT',
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

// Kamus Kota & Kabupaten Indonesia Lengkap
const INDONESIA_CITIES = {
  // Jabodetabek
  'jakarta': { city: 'Jakarta', province: 'DKI Jakarta' },
  'jkt': { city: 'Jakarta', province: 'DKI Jakarta' },
  'jakarta selatan': { city: 'Jakarta Selatan', province: 'DKI Jakarta' },
  'jaksel': { city: 'Jakarta Selatan', province: 'DKI Jakarta' },
  'jakarta barat': { city: 'Jakarta Barat', province: 'DKI Jakarta' },
  'jakbar': { city: 'Jakarta Barat', province: 'DKI Jakarta' },
  'jakarta pusat': { city: 'Jakarta Pusat', province: 'DKI Jakarta' },
  'jakpus': { city: 'Jakarta Pusat', province: 'DKI Jakarta' },
  'jakarta timur': { city: 'Jakarta Timur', province: 'DKI Jakarta' },
  'jaktim': { city: 'Jakarta Timur', province: 'DKI Jakarta' },
  'jakarta utara': { city: 'Jakarta Utara', province: 'DKI Jakarta' },
  'jakut': { city: 'Jakarta Utara', province: 'DKI Jakarta' },
  'bogor': { city: 'Bogor', province: 'Jawa Barat' },
  'bgr': { city: 'Bogor', province: 'Jawa Barat' },
  'depok': { city: 'Depok', province: 'Jawa Barat' },
  'tangerang': { city: 'Tangerang', province: 'Banten' },
  'tng': { city: 'Tangerang', province: 'Banten' },
  'tangerang selatan': { city: 'Tangerang Selatan', province: 'Banten' },
  'tangsel': { city: 'Tangerang Selatan', province: 'Banten' },
  'bekasi': { city: 'Bekasi', province: 'Jawa Barat' },
  'bks': { city: 'Bekasi', province: 'Jawa Barat' },

  // Jawa Barat
  'indramayu': { city: 'Indramayu', province: 'Jawa Barat' },
  'bandung': { city: 'Bandung', province: 'Jawa Barat' },
  'bdg': { city: 'Bandung', province: 'Jawa Barat' },
  'bandung barat': { city: 'Bandung Barat', province: 'Jawa Barat' },
  'cirebon': { city: 'Cirebon', province: 'Jawa Barat' },
  'crb': { city: 'Cirebon', province: 'Jawa Barat' },
  'majalengka': { city: 'Majalengka', province: 'Jawa Barat' },
  'kuningan': { city: 'Kuningan', province: 'Jawa Barat' },
  'tasikmalaya': { city: 'Tasikmalaya', province: 'Jawa Barat' },
  'tasik': { city: 'Tasikmalaya', province: 'Jawa Barat' },
  'garut': { city: 'Garut', province: 'Jawa Barat' },
  'sukabumi': { city: 'Sukabumi', province: 'Jawa Barat' },
  'cianjur': { city: 'Cianjur', province: 'Jawa Barat' },
  'purwakarta': { city: 'Purwakarta', province: 'Jawa Barat' },
  'subang': { city: 'Subang', province: 'Jawa Barat' },
  'karawang': { city: 'Karawang', province: 'Jawa Barat' },
  'sumedang': { city: 'Sumedang', province: 'Jawa Barat' },
  'cimahi': { city: 'Cimahi', province: 'Jawa Barat' },
  'banjar': { city: 'Banjar', province: 'Jawa Barat' },
  'ciamis': { city: 'Ciamis', province: 'Jawa Barat' },
  'pangandaran': { city: 'Pangandaran', province: 'Jawa Barat' },

  // Banten
  'serang': { city: 'Serang', province: 'Banten' },
  'cilegon': { city: 'Cilegon', province: 'Banten' },
  'pandeglang': { city: 'Pandeglang', province: 'Banten' },
  'lebak': { city: 'Lebak', province: 'Banten' },

  // Jawa Tengah & DIY
  'semarang': { city: 'Semarang', province: 'Jawa Tengah' },
  'smg': { city: 'Semarang', province: 'Jawa Tengah' },
  'surakarta': { city: 'Surakarta', province: 'Jawa Tengah' },
  'solo': { city: 'Surakarta', province: 'Jawa Tengah' },
  'yogyakarta': { city: 'Yogyakarta', province: 'D.I. Yogyakarta' },
  'jogja': { city: 'Yogyakarta', province: 'D.I. Yogyakarta' },
  'sleman': { city: 'Sleman', province: 'D.I. Yogyakarta' },
  'bantul': { city: 'Bantul', province: 'D.I. Yogyakarta' },
  'kulon progo': { city: 'Kulon Progo', province: 'D.I. Yogyakarta' },
  'gunungkidul': { city: 'Gunungkidul', province: 'D.I. Yogyakarta' },
  'magelang': { city: 'Magelang', province: 'Jawa Tengah' },
  'purwokerto': { city: 'Purwokerto', province: 'Jawa Tengah' },
  'banyumas': { city: 'Banyumas', province: 'Jawa Tengah' },
  'cilacap': { city: 'Cilacap', province: 'Jawa Tengah' },
  'tegal': { city: 'Tegal', province: 'Jawa Tengah' },
  'pekalongan': { city: 'Pekalongan', province: 'Jawa Tengah' },
  'kudus': { city: 'Kudus', province: 'Jawa Tengah' },
  'pati': { city: 'Pati', province: 'Jawa Tengah' },
  'jepara': { city: 'Jepara', province: 'Jawa Tengah' },
  'salatiga': { city: 'Salatiga', province: 'Jawa Tengah' },
  'klaten': { city: 'Klaten', province: 'Jawa Tengah' },
  'boyolali': { city: 'Boyolali', province: 'Jawa Tengah' },
  'sukoharjo': { city: 'Sukoharjo', province: 'Jawa Tengah' },
  'karanganyar': { city: 'Karanganyar', province: 'Jawa Tengah' },
  'wonogiri': { city: 'Wonogiri', province: 'Jawa Tengah' },
  'sragen': { city: 'Sragen', province: 'Jawa Tengah' },
  'kebumen': { city: 'Kebumen', province: 'Jawa Tengah' },
  'purworejo': { city: 'Purworejo', province: 'Jawa Tengah' },
  'brebes': { city: 'Brebes', province: 'Jawa Tengah' },
  'pemalang': { city: 'Pemalang', province: 'Jawa Tengah' },
  'batang': { city: 'Batang', province: 'Jawa Tengah' },
  'kendal': { city: 'Kendal', province: 'Jawa Tengah' },
  'demak': { city: 'Demak', province: 'Jawa Tengah' },
  'grobogan': { city: 'Grobogan', province: 'Jawa Tengah' },
  'blora': { city: 'Blora', province: 'Jawa Tengah' },
  'rembang': { city: 'Rembang', province: 'Jawa Tengah' },
  'wonosobo': { city: 'Wonosobo', province: 'Jawa Tengah' },
  'temanggung': { city: 'Temanggung', province: 'Jawa Tengah' },

  // Jawa Timur
  'surabaya': { city: 'Surabaya', province: 'Jawa Timur' },
  'sby': { city: 'Surabaya', province: 'Jawa Timur' },
  'malang': { city: 'Malang', province: 'Jawa Timur' },
  'mlg': { city: 'Malang', province: 'Jawa Timur' },
  'batu': { city: 'Batu', province: 'Jawa Timur' },
  'sidoarjo': { city: 'Sidoarjo', province: 'Jawa Timur' },
  'gresik': { city: 'Gresik', province: 'Jawa Timur' },
  'mojokerto': { city: 'Mojokerto', province: 'Jawa Timur' },
  'pasuruan': { city: 'Pasuruan', province: 'Jawa Timur' },
  'probolinggo': { city: 'Probolinggo', province: 'Jawa Timur' },
  'jember': { city: 'Jember', province: 'Jawa Timur' },
  'banyuwangi': { city: 'Banyuwangi', province: 'Jawa Timur' },
  'kediri': { city: 'Kediri', province: 'Jawa Timur' },
  'blitar': { city: 'Blitar', province: 'Jawa Timur' },
  'madiun': { city: 'Madiun', province: 'Jawa Timur' },
  'tulungagung': { city: 'Tulungagung', province: 'Jawa Timur' },
  'trenggalek': { city: 'Trenggalek', province: 'Jawa Timur' },
  'ponorogo': { city: 'Ponorogo', province: 'Jawa Timur' },
  'pacitan': { city: 'Pacitan', province: 'Jawa Timur' },
  'magetan': { city: 'Magetan', province: 'Jawa Timur' },
  'ngawi': { city: 'Ngawi', province: 'Jawa Timur' },
  'bojonegoro': { city: 'Bojonegoro', province: 'Jawa Timur' },
  'tuban': { city: 'Tuban', province: 'Jawa Timur' },
  'lamongan': { city: 'Lamongan', province: 'Jawa Timur' },
  'jombang': { city: 'Jombang', province: 'Jawa Timur' },
  'nganjuk': { city: 'Nganjuk', province: 'Jawa Timur' },
  'lumajang': { city: 'Lumajang', province: 'Jawa Timur' },
  'bondowoso': { city: 'Bondowoso', province: 'Jawa Timur' },
  'situbondo': { city: 'Situbondo', province: 'Jawa Timur' },
  'bangkalan': { city: 'Bangkalan', province: 'Jawa Timur' },
  'sampang': { city: 'Sampang', province: 'Jawa Timur' },
  'pamekasan': { city: 'Pamekasan', province: 'Jawa Timur' },
  'sumenep': { city: 'Sumenep', province: 'Jawa Timur' },

  // Sumatera
  'medan': { city: 'Medan', province: 'Sumatera Utara' },
  'palembang': { city: 'Palembang', province: 'Sumatera Selatan' },
  'padang': { city: 'Padang', province: 'Sumatera Barat' },
  'pekanbaru': { city: 'Pekanbaru', province: 'Riau' },
  'batam': { city: 'Batam', province: 'Kepulauan Riau' },
  'tanjungpinang': { city: 'Tanjungpinang', province: 'Kepulauan Riau' },
  'bandar lampung': { city: 'Bandar Lampung', province: 'Lampung' },
  'lampung': { city: 'Lampung', province: 'Lampung' },
  'metro': { city: 'Metro', province: 'Lampung' },
  'jambi': { city: 'Jambi', province: 'Jambi' },
  'bengkulu': { city: 'Bengkulu', province: 'Bengkulu' },
  'pangkalpinang': { city: 'Pangkalpinang', province: 'Bangka Belitung' },
  'belitung': { city: 'Belitung', province: 'Bangka Belitung' },
  'banda aceh': { city: 'Banda Aceh', province: 'Aceh' },
  'aceh': { city: 'Aceh', province: 'Aceh' },
  'lhokseumawe': { city: 'Lhokseumawe', province: 'Aceh' },
  'binjai': { city: 'Binjai', province: 'Sumatera Utara' },
  'pematangsiantar': { city: 'Pematangsiantar', province: 'Sumatera Utara' },
  'bukittinggi': { city: 'Bukittinggi', province: 'Sumatera Barat' },
  'dumai': { city: 'Dumai', province: 'Riau' },

  // Bali & Nusa Tenggara
  'denpasar': { city: 'Denpasar', province: 'Bali' },
  'bali': { city: 'Bali', province: 'Bali' },
  'badung': { city: 'Badung', province: 'Bali' },
  'gianyar': { city: 'Gianyar', province: 'Bali' },
  'buleleng': { city: 'Buleleng', province: 'Bali' },
  'tabanan': { city: 'Tabanan', province: 'Bali' },
  'mataram': { city: 'Mataram', province: 'NTB' },
  'lombok': { city: 'Lombok', province: 'NTB' },
  'bima': { city: 'Bima', province: 'NTB' },
  'sumbawa': { city: 'Sumbawa', province: 'NTB' },
  'kupang': { city: 'Kupang', province: 'NTT' },
  'labuan bajo': { city: 'Labuan Bajo', province: 'NTT' },
  'flores': { city: 'Flores', province: 'NTT' },

  // Kalimantan
  'pontianak': { city: 'Pontianak', province: 'Kalimantan Barat' },
  'singkawang': { city: 'Singkawang', province: 'Kalimantan Barat' },
  'palangkaraya': { city: 'Palangkaraya', province: 'Kalimantan Tengah' },
  'banjarmasin': { city: 'Banjarmasin', province: 'Kalimantan Selatan' },
  'banjarbaru': { city: 'Banjarbaru', province: 'Kalimantan Selatan' },
  'samarinda': { city: 'Samarinda', province: 'Kalimantan Timur' },
  'balikpapan': { city: 'Balikpapan', province: 'Kalimantan Timur' },
  'bontang': { city: 'Bontang', province: 'Kalimantan Timur' },
  'ikn': { city: 'Nusantara (IKN)', province: 'Kalimantan Timur' },
  'nusantara': { city: 'Nusantara (IKN)', province: 'Kalimantan Timur' },
  'tarakan': { city: 'Tarakan', province: 'Kalimantan Utara' },

  // Sulawesi
  'makassar': { city: 'Makassar', province: 'Sulawesi Selatan' },
  'manado': { city: 'Manado', province: 'Sulawesi Utara' },
  'palu': { city: 'Palu', province: 'Sulawesi Tengah' },
  'kendari': { city: 'Kendari', province: 'Sulawesi Tenggara' },
  'gorontalo': { city: 'Gorontalo', province: 'Gorontalo' },
  'mamuju': { city: 'Mamuju', province: 'Sulawesi Barat' },
  'parepare': { city: 'Parepare', province: 'Sulawesi Selatan' },
  'palopo': { city: 'Palopo', province: 'Sulawesi Selatan' },
  'tomohon': { city: 'Tomohon', province: 'Sulawesi Utara' },
  'kotamobagu': { city: 'Kotamobagu', province: 'Sulawesi Utara' },
  'bitung': { city: 'Bitung', province: 'Sulawesi Utara' },

  // Maluku & Papua
  'ambon': { city: 'Ambon', province: 'Maluku' },
  'ternate': { city: 'Ternate', province: 'Maluku Utara' },
  'tidore': { city: 'Tidore', province: 'Maluku Utara' },
  'jayapura': { city: 'Jayapura', province: 'Papua' },
  'sorong': { city: 'Sorong', province: 'Papua Barat Daya' },
  'manokwari': { city: 'Manokwari', province: 'Papua Barat' },
  'merauke': { city: 'Merauke', province: 'Papua Selatan' },
  'timika': { city: 'Timika', province: 'Papua Tengah' },
  'nabire': { city: 'Nabire', province: 'Papua Tengah' },
  'wamena': { city: 'Wamena', province: 'Papua Pegunungan' }
};

/**
 * Parsing & Normalisasi Lokasi Cerdas (Global & Nasional)
 * Output object:
 * {
 *   city: 'Indramayu',
 *   stateOrProvince: 'Jawa Barat',
 *   country: 'Indonesia',
 *   countryCode: 'ID',
 *   flag: '🇮🇩',
 *   display: 'Indramayu, Jawa Barat 🇮🇩',
 *   searchKey: 'Indramayu'
 * }
 */
function parseLocation(input) {
  if (!input || typeof input !== 'string') return null;
  let raw = input.trim();
  if (!raw) return null;

  // Bersihkan imbuhan umum
  let clean = raw
    .toLowerCase()
    .replace(/^(kabupaten|kab\.|kab|kota|city|regency|provinsi|prov\.|state|country|daerah|d\/a|di)\s+/gi, '')
    .replace(/[,\/\-\|\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let detectedCountry = null;
  let detectedFlag = '🇮🇩'; // Default Indonesia jika tidak disebutkan
  let detectedProvince = null;
  let detectedCity = null;

  // 1. Cek apakah ada Negara Global yang disebutkan
  for (const [key, countryInfo] of Object.entries(GLOBAL_COUNTRIES)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(clean)) {
      detectedCountry = countryInfo.name;
      detectedFlag = countryInfo.flag;
      clean = clean.replace(regex, '').trim();
      break;
    }
  }

  // 2. Cek apakah ada Kota Global
  for (const [key, cityInfo] of Object.entries(GLOBAL_CITIES)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(clean) || clean === key) {
      detectedCity = cityInfo.city;
      detectedCountry = cityInfo.country;
      detectedFlag = cityInfo.flag;
      break;
    }
  }

  // 3. Jika bukan kota global, cek apakah ada Provinsi Indonesia
  if (!detectedCity) {
    for (const [key, provName] of Object.entries(INDONESIA_PROVINCES)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(clean)) {
        detectedProvince = provName;
        clean = clean.replace(regex, '').trim();
        break;
      }
    }
  }

  // 4. Cek apakah ada Kota/Kabupaten Indonesia
  if (!detectedCity) {
    for (const [key, cityInfo] of Object.entries(INDONESIA_CITIES)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(clean) || clean === key) {
        detectedCity = cityInfo.city;
        if (!detectedProvince) detectedProvince = cityInfo.province;
        detectedCountry = 'Indonesia';
        detectedFlag = '🇮🇩';
        break;
      }
    }
  }

  // 5. Fallback Title Case jika belum cocok di kamus
  if (!detectedCity) {
    if (clean.length > 0) {
      detectedCity = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } else if (detectedProvince) {
      detectedCity = detectedProvince;
      detectedProvince = null;
    } else if (detectedCountry) {
      detectedCity = detectedCountry;
    } else {
      detectedCity = raw.charAt(0).toUpperCase() + raw.slice(1);
    }
  }

  // 6. Buat format string tampilan akhir
  let displayParts = [];
  if (detectedCity) displayParts.push(detectedCity);
  if (detectedProvince && detectedCity !== detectedProvince) displayParts.push(detectedProvince);
  if (detectedCountry && detectedCountry !== 'Indonesia' && detectedCity !== detectedCountry) displayParts.push(detectedCountry);

  let display = displayParts.join(', ');
  if (detectedFlag) {
    display += ` ${detectedFlag}`;
  }

  return {
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
  GLOBAL_COUNTRIES,
  GLOBAL_CITIES,
  INDONESIA_PROVINCES,
  INDONESIA_CITIES
};
