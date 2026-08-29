/**
 * Smart Global Location Normalizer & Parser
 * Mendukung seluruh Kota/Kabupaten di Indonesia + Kota-Kota Metropolitan Dunia + Seluruh Negara Global
 */

// Blacklist Kata Anomali / Bukan Nama Lokasi Riil
const ANOMALY_LOCATIONS = new Set([
  'home', 'rumah', 'kamar', 'surga', 'bumi', 'earth', 'mars', 'galaxy',
  'discord', 'server', 'secret', 'rahasia', 'unknown', 'lainnya', 'other',
  'none', '-', 'null', 'undefined', 'barat', 'timur', 'tengah', 'utara', 'selatan', 'pusat',
  'indonesia', 'indo', 'id', 'wib', 'wita', 'wit', 'here', 'dimana', 'ntah', 'gatau',
  'somewhere', 'anywhere', 'nowhere', 'heart', 'hati', 'planet', 'universe'
]);

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
  'kuala lumpur': { city: 'Kuala Lumpur', country: 'Malaysia', flag: '🇲🇾' },
  'penang': { city: 'Penang', country: 'Malaysia', flag: '🇲🇾' },
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
  'singaraja': { city: 'Buleleng', province: 'Bali' },
  'mataram': { city: 'Mataram', province: 'Nusa Tenggara Barat' },
  'lombok': { city: 'Lombok', province: 'Nusa Tenggara Barat' },
  'kupang': { city: 'Kupang', province: 'Nusa Tenggara Timur' },

  // Kalimantan
  'pontianak': { city: 'Pontianak', province: 'Kalimantan Barat' },
  'singkawang': { city: 'Singkawang', province: 'Kalimantan Barat' },
  'banjarmasin': { city: 'Banjarmasin', province: 'Kalimantan Selatan' },
  'banjarbaru': { city: 'Banjarbaru', province: 'Kalimantan Selatan' },
  'palangkaraya': { city: 'Palangka Raya', province: 'Kalimantan Tengah' },
  'samarinda': { city: 'Samarinda', province: 'Kalimantan Timur' },
  'balikpapan': { city: 'Balikpapan', province: 'Kalimantan Timur' },
  'bontang': { city: 'Bontang', province: 'Kalimantan Timur' },
  'tarakan': { city: 'Tarakan', province: 'Kalimantan Utara' },

  // Sumatera
  'medan': { city: 'Medan', province: 'Sumatera Utara' },
  'padang': { city: 'Padang', province: 'Sumatera Barat' },
  'pekanbaru': { city: 'Pekanbaru', province: 'Riau' },
  'batam': { city: 'Batam', province: 'Kepulauan Riau' },
  'tanjungpinang': { city: 'Tanjungpinang', province: 'Kepulauan Riau' },
  'palembang': { city: 'Palembang', province: 'Sumatera Selatan' },
  'bandar lampung': { city: 'Bandar Lampung', province: 'Lampung' },
  'pangkalpinang': { city: 'Pangkalpinang', province: 'Kepulauan Bangka Belitung' },
  'banda aceh': { city: 'Banda Aceh', province: 'Aceh' },

  // Sulawesi & Maluku & Papua
  'makassar': { city: 'Makassar', province: 'Sulawesi Selatan' },
  'manado': { city: 'Manado', province: 'Sulawesi Utara' },
  'palu': { city: 'Palu', province: 'Sulawesi Tengah' },
  'kendari': { city: 'Kendari', province: 'Sulawesi Tenggara' },
  'ambon': { city: 'Ambon', province: 'Maluku' },
  'jayapura': { city: 'Jayapura', province: 'Papua' }
};

/**
 * Normalisasi dan deteksi lokasi
 */
function parseLocation(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const original = raw.trim();
  let clean = original
    .toLowerCase()
    .replace(/[,\.\-\/\\_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length < 2) return null;

  // Cek kata-kata anomali langsung
  if (ANOMALY_LOCATIONS.has(clean)) {
    return { isAnomaly: true, city: original, country: 'Unknown', display: original };
  }

  let detectedCountry = null;
  let detectedFlag = '🇮🇩';
  let detectedProvince = null;
  let detectedCity = null;

  // 1. Cek Negara Global (kecuali Indonesia)
  for (const [key, countryInfo] of Object.entries(GLOBAL_COUNTRIES)) {
    if (key === 'indonesia' || key === 'id' || key === 'indo') continue;
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(clean)) {
      detectedCountry = countryInfo.name;
      detectedFlag = countryInfo.flag;
      break;
    }
  }

  // 2. Cek Kota Global
  for (const [key, cityInfo] of Object.entries(GLOBAL_CITIES)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(clean)) {
      detectedCity = cityInfo.city;
      detectedCountry = cityInfo.country;
      detectedFlag = cityInfo.flag;
      break;
    }
  }

  // 3. Cek Kota/Kabupaten Indonesia (Urutkan dari nama terpanjang)
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

  // 4. Cek Provinsi Indonesia (jika belum ada kota spesifik)
  if (!detectedCity) {
    const sortedProvKeys = Object.keys(INDONESIA_PROVINCES).sort((a, b) => b.length - a.length);
    for (const key of sortedProvKeys) {
      const provName = INDONESIA_PROVINCES[key];
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(clean)) {
        detectedCity = provName; // Jadikan nama provinsi sebagai judul
        detectedCountry = 'Indonesia';
        detectedFlag = '🇮🇩';
        break;
      }
    }
  }

  // 5. Cek jika masih clean adalah anomali setelah stripping
  if (detectedCity && ANOMALY_LOCATIONS.has(detectedCity.toLowerCase())) {
    return { isAnomaly: true, city: detectedCity, country: 'Unknown', display: original };
  }

  // 6. Fallback jika tidak terdaftar di kamus
  if (!detectedCity) {
    // Jika mengandung kata anomali, flag as anomaly
    for (const anom of ANOMALY_LOCATIONS) {
      if (clean === anom || clean.startsWith(anom + ' ') || clean.endsWith(' ' + anom)) {
        return { isAnomaly: true, city: original, country: 'Unknown', display: original };
      }
    }

    detectedCity = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Format string display
  let displayParts = [];
  if (detectedCity) displayParts.push(detectedCity);
  if (detectedProvince && detectedCity !== detectedProvince) displayParts.push(detectedProvince);
  if (detectedCountry && detectedCountry !== 'Indonesia' && detectedCity !== detectedCountry) displayParts.push(detectedCountry);

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
  GLOBAL_COUNTRIES,
  GLOBAL_CITIES,
  INDONESIA_PROVINCES,
  INDONESIA_CITIES
};
