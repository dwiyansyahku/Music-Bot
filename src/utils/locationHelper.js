/**
 * Smart Global & Domestic Location Normalizer & Parser
 * Mendukung 514 Kabupaten/Kota di 38 Provinsi Indonesia + Kawasan Satelit Populer
 * + 195+ Negara Dunia + Negara Bagian Global (US, CA, AU, MY, UK) + 150+ Kota Metropolitan Dunia
 */

// Helper escape regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 1. Blacklist Kata Anomali / Lokasi Fiksi / Meme (Bukan Nama Lokasi Riil di Dunia)
const ANOMALY_LOCATIONS = new Set([
  'home', 'rumah', 'kamar', 'kasur', 'surga', 'bumi', 'earth', 'mars', 'galaxy',
  'discord', 'server', 'secret', 'rahasia', 'unknown', 'lainnya', 'other',
  'none', '-', 'null', 'undefined',
  'wib', 'wita', 'wit', 'here', 'dimana', 'ntah', 'gatau',
  'somewhere', 'anywhere', 'nowhere', 'heart', 'hati', 'planet', 'universe',
  // Lokasi Fiksi / Pop Culture / Meme
  'isekai', 'konoha', 'wakanda', 'bikini bottom', 'namek', 'hogwarts', 'atlantis', 'gotham', 'metropolis',
  'heaven', 'hell', 'neraka', 'kayangan', 'alam gaib', 'alam barzah', 'akhirat', 'alam lain',
  'bulan', 'moon', 'sun', 'matahari', 'pluto', 'jupiter', 'saturnus', 'venus', 'merkurius', 'neptunus', 'uranus',
  'jauh', 'antah berantah', 'dimana mana', 'mana aja', 'hati kamu', 'hatimu', 'lubuk hati', 'pikiran', 'mimpi',
  'anime', 'wibu', 'otaku', '2d', 'dunia 2d', 'genshin', 'teyvat', 'honkai', 'roblox', 'minecraft'
]);

// 2. Kamus Negara Global (~195 Negara Dunia + Teritori Populer + Bendera)
const GLOBAL_COUNTRIES = {
  // Asia Tenggara (ASEAN)
  'indonesia': { name: 'Indonesia', flag: '🇮🇩', code: 'ID' },
  'indo': { name: 'Indonesia', flag: '🇮🇩', code: 'ID' },
  'nkri': { name: 'Indonesia', flag: '🇮🇩', code: 'ID' },
  'singapore': { name: 'Singapore', flag: '🇸🇬', code: 'SG' },
  'singapura': { name: 'Singapore', flag: '🇸🇬', code: 'SG' },
  'malaysia': { name: 'Malaysia', flag: '🇲🇾', code: 'MY' },
  'thailand': { name: 'Thailand', flag: '🇹🇭', code: 'TH' },
  'philippines': { name: 'Filipina', flag: '🇵🇭', code: 'PH' },
  'philippine': { name: 'Filipina', flag: '🇵🇭', code: 'PH' },
  'filipina': { name: 'Filipina', flag: '🇵🇭', code: 'PH' },
  'pilipinas': { name: 'Filipina', flag: '🇵🇭', code: 'PH' },
  'vietnam': { name: 'Vietnam', flag: '🇻🇳', code: 'VN' },
  'brunei': { name: 'Brunei', flag: '🇧🇳', code: 'BN' },
  'brunei darussalam': { name: 'Brunei', flag: '🇧🇳', code: 'BN' },
  'myanmar': { name: 'Myanmar', flag: '🇲🇲', code: 'MM' },
  'burma': { name: 'Myanmar', flag: '🇲🇲', code: 'MM' },
  'cambodia': { name: 'Kamboja', flag: '🇰🇭', code: 'KH' },
  'kamboja': { name: 'Kamboja', flag: '🇰🇭', code: 'KH' },
  'laos': { name: 'Laos', flag: '🇱🇦', code: 'LA' },
  'timor leste': { name: 'Timor Leste', flag: '🇹🇱', code: 'TL' },
  'east timor': { name: 'Timor Leste', flag: '🇹🇱', code: 'TL' },

  // Asia Timur
  'japan': { name: 'Jepang', flag: '🇯🇵', code: 'JP' },
  'jepang': { name: 'Jepang', flag: '🇯🇵', code: 'JP' },
  'south korea': { name: 'Korea Selatan', flag: '🇰🇷', code: 'KR' },
  'korea selatan': { name: 'Korea Selatan', flag: '🇰🇷', code: 'KR' },
  'korea': { name: 'Korea Selatan', flag: '🇰🇷', code: 'KR' },
  'korsel': { name: 'Korea Selatan', flag: '🇰🇷', code: 'KR' },
  'north korea': { name: 'Korea Utara', flag: '🇰🇵', code: 'KP' },
  'korea utara': { name: 'Korea Utara', flag: '🇰🇵', code: 'KP' },
  'china': { name: 'China', flag: '🇨🇳', code: 'CN' },
  'tiongkok': { name: 'China', flag: '🇨🇳', code: 'CN' },
  'taiwan': { name: 'Taiwan', flag: '🇹🇼', code: 'TW' },
  'hong kong': { name: 'Hong Kong', flag: '🇭🇰', code: 'HK' },
  'macau': { name: 'Macau', flag: '🇲🇴', code: 'MO' },
  'mongolia': { name: 'Mongolia', flag: '🇲🇳', code: 'MN' },

  // Asia Selatan
  'india': { name: 'India', flag: '🇮🇳', code: 'IN' },
  'pakistan': { name: 'Pakistan', flag: '🇵🇰', code: 'PK' },
  'bangladesh': { name: 'Bangladesh', flag: '🇧🇩', code: 'BD' },
  'sri lanka': { name: 'Sri Lanka', flag: '🇱🇰', code: 'LK' },
  'nepal': { name: 'Nepal', flag: '🇳🇵', code: 'NP' },
  'bhutan': { name: 'Bhutan', flag: '🇧🇹', code: 'BT' },
  'maldives': { name: 'Maladewa', flag: '🇲🇻', code: 'MV' },
  'maladewa': { name: 'Maladewa', flag: '🇲🇻', code: 'MV' },
  'afghanistan': { name: 'Afghanistan', flag: '🇦🇫', code: 'AF' },

  // Timur Tengah & Asia Tengah
  'saudi arabia': { name: 'Arab Saudi', flag: '🇸🇦', code: 'SA' },
  'arab saudi': { name: 'Arab Saudi', flag: '🇸🇦', code: 'SA' },
  'united arab emirates': { name: 'Uni Emirat Arab', flag: '🇦🇪', code: 'AE' },
  'uni emirat arab': { name: 'Uni Emirat Arab', flag: '🇦🇪', code: 'AE' },
  'uae': { name: 'Uni Emirat Arab', flag: '🇦🇪', code: 'AE' },
  'uea': { name: 'Uni Emirat Arab', flag: '🇦🇪', code: 'AE' },
  'qatar': { name: 'Qatar', flag: '🇶🇦', code: 'QA' },
  'kuwait': { name: 'Kuwait', flag: '🇰🇼', code: 'KW' },
  'bahrain': { name: 'Bahrain', flag: '🇧🇭', code: 'BH' },
  'oman': { name: 'Oman', flag: '🇴🇲', code: 'OM' },
  'yemen': { name: 'Yaman', flag: '🇾🇪', code: 'YE' },
  'yaman': { name: 'Yaman', flag: '🇾🇪', code: 'YE' },
  'jordan': { name: 'Yordania', flag: '🇯🇴', code: 'JO' },
  'yordania': { name: 'Yordania', flag: '🇯🇴', code: 'JO' },
  'lebanon': { name: 'Lebanon', flag: '🇱🇧', code: 'LB' },
  'turkey': { name: 'Turki', flag: '🇹🇷', code: 'TR' },
  'turki': { name: 'Turki', flag: '🇹🇷', code: 'TR' },
  'turkiye': { name: 'Turki', flag: '🇹🇷', code: 'TR' },
  'israel': { name: 'Israel', flag: '🇮🇱', code: 'IL' },
  'palestine': { name: 'Palestina', flag: '🇵🇸', code: 'PS' },
  'palestina': { name: 'Palestina', flag: '🇵🇸', code: 'PS' },
  'iraq': { name: 'Irak', flag: '🇮🇶', code: 'IQ' },
  'irak': { name: 'Irak', flag: '🇮🇶', code: 'IQ' },
  'iran': { name: 'Iran', flag: '🇮🇷', code: 'IR' },
  'kazakhstan': { name: 'Kazakhstan', flag: '🇰🇿', code: 'KZ' },
  'uzbekistan': { name: 'Uzbekistan', flag: 'UZ', code: 'UZ' },
  'azerbaijan': { name: 'Azerbaijan', flag: '🇦🇿', code: 'AZ' },

  // Eropa
  'united kingdom': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'uk': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'great britain': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'britain': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'inggris': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'england': { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  'scotland': { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', code: 'GB-SCT' },
  'wales': { name: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', code: 'GB-WLS' },
  'northern ireland': { name: 'Northern Ireland', flag: '🇬🇧', code: 'GB-NIR' },
  'germany': { name: 'Jerman', flag: '🇩🇪', code: 'DE' },
  'jerman': { name: 'Jerman', flag: '🇩🇪', code: 'DE' },
  'deutschland': { name: 'Jerman', flag: '🇩🇪', code: 'DE' },
  'france': { name: 'Prancis', flag: '🇫🇷', code: 'FR' },
  'prancis': { name: 'Prancis', flag: '🇫🇷', code: 'FR' },
  'netherlands': { name: 'Belanda', flag: '🇳🇱', code: 'NL' },
  'belanda': { name: 'Belanda', flag: '🇳🇱', code: 'NL' },
  'holland': { name: 'Belanda', flag: '🇳🇱', code: 'NL' },
  'belgium': { name: 'Belgia', flag: '🇧🇪', code: 'BE' },
  'belgia': { name: 'Belgia', flag: '🇧🇪', code: 'BE' },
  'italy': { name: 'Italia', flag: '🇮🇹', code: 'IT' },
  'italia': { name: 'Italia', flag: '🇮🇹', code: 'IT' },
  'spain': { name: 'Spanyol', flag: '🇪🇸', code: 'ES' },
  'spanyol': { name: 'Spanyol', flag: '🇪🇸', code: 'ES' },
  'portugal': { name: 'Portugal', flag: '🇵🇹', code: 'PT' },
  'switzerland': { name: 'Swiss', flag: '🇨🇭', code: 'CH' },
  'swiss': { name: 'Swiss', flag: '🇨🇭', code: 'CH' },
  'austria': { name: 'Austria', flag: '🇦🇹', code: 'AT' },
  'sweden': { name: 'Swedia', flag: '🇸🇪', code: 'SE' },
  'swedia': { name: 'Swedia', flag: '🇸🇪', code: 'SE' },
  'norway': { name: 'Norwegia', flag: '🇳🇴', code: 'NO' },
  'norwegia': { name: 'Norwegia', flag: '🇳🇴', code: 'NO' },
  'denmark': { name: 'Denmark', flag: '🇩🇰', code: 'DK' },
  'finland': { name: 'Finlandia', flag: '🇫🇮', code: 'FI' },
  'finlandia': { name: 'Finlandia', flag: '🇫🇮', code: 'FI' },
  'ireland': { name: 'Irlandia', flag: '🇮🇪', code: 'IE' },
  'irlandia': { name: 'Irlandia', flag: '🇮🇪', code: 'IE' },
  'poland': { name: 'Polandia', flag: '🇵🇱', code: 'PL' },
  'polandia': { name: 'Polandia', flag: '🇵🇱', code: 'PL' },
  'ukraine': { name: 'Ukraina', flag: '🇺🇦', code: 'UA' },
  'ukraina': { name: 'Ukraina', flag: '🇺🇦', code: 'UA' },
  'russia': { name: 'Rusia', flag: '🇷🇺', code: 'RU' },
  'rusia': { name: 'Rusia', flag: '🇷🇺', code: 'RU' },
  'greece': { name: 'Yunani', flag: '🇬🇷', code: 'GR' },
  'yunani': { name: 'Yunani', flag: '🇬🇷', code: 'GR' },
  'czech republic': { name: 'Ceko', flag: '🇨🇿', code: 'CZ' },
  'czechia': { name: 'Ceko', flag: '🇨🇿', code: 'CZ' },
  'ceko': { name: 'Ceko', flag: '🇨🇿', code: 'CZ' },
  'hungary': { name: 'Hungaria', flag: '🇭🇺', code: 'HU' },
  'hungaria': { name: 'Hungaria', flag: '🇭🇺', code: 'HU' },
  'romania': { name: 'Rumania', flag: '🇷🇴', code: 'RO' },
  'rumania': { name: 'Rumania', flag: '🇷🇴', code: 'RO' },
  'bulgaria': { name: 'Bulgaria', flag: '🇧🇬', code: 'BG' },
  'croatia': { name: 'Kroasia', flag: '🇭🇷', code: 'HR' },
  'kroasia': { name: 'Kroasia', flag: '🇭🇷', code: 'HR' },
  'serbia': { name: 'Serbia', flag: '🇷🇸', code: 'RS' },
  'slovakia': { name: 'Slowakia', flag: '🇸🇰', code: 'SK' },
  'slowakia': { name: 'Slowakia', flag: '🇸🇰', code: 'SK' },
  'slovenia': { name: 'Slovenia', flag: '🇸🇮', code: 'SI' },
  'iceland': { name: 'Islandia', flag: '🇮🇸', code: 'IS' },
  'islandia': { name: 'Islandia', flag: '🇮🇸', code: 'IS' },
  'luxembourg': { name: 'Luksemburg', flag: '🇱🇺', code: 'LU' },
  'luksemburg': { name: 'Luksemburg', flag: '🇱🇺', code: 'LU' },
  'monaco': { name: 'Monako', flag: '🇲🇨', code: 'MC' },
  'vatican': { name: 'Vatikan', flag: '🇻🇦', code: 'VA' },

  // Amerika Utara
  'united states': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'united states of america': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'usa': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'america': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'amerika': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'amerika serikat': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'as': { name: 'United States', flag: '🇺🇸', code: 'US' },
  'canada': { name: 'Kanada', flag: '🇨🇦', code: 'CA' },
  'kanada': { name: 'Kanada', flag: '🇨🇦', code: 'CA' },
  'mexico': { name: 'Meksiko', flag: '🇲🇽', code: 'MX' },
  'meksiko': { name: 'Meksiko', flag: '🇲🇽', code: 'MX' },

  // Amerika Tengah & Karibia
  'cuba': { name: 'Kuba', flag: '🇨🇺', code: 'CU' },
  'kuba': { name: 'Kuba', flag: '🇨🇺', code: 'CU' },
  'jamaica': { name: 'Jamaika', flag: '🇯🇲', code: 'JM' },
  'costa rica': { name: 'Kosta Rika', flag: '🇨🇷', code: 'CR' },
  'panama': { name: 'Panama', flag: '🇵🇦', code: 'PA' },
  'puerto rico': { name: 'Puerto Rico', flag: '🇵🇷', code: 'PR' },

  // Amerika Selatan
  'brazil': { name: 'Brasil', flag: '🇧🇷', code: 'BR' },
  'brasil': { name: 'Brasil', flag: '🇧🇷', code: 'BR' },
  'argentina': { name: 'Argentina', flag: '🇦🇷', code: 'AR' },
  'colombia': { name: 'Kolombia', flag: '🇨🇴', code: 'CO' },
  'kolombia': { name: 'Kolombia', flag: '🇨🇴', code: 'CO' },
  'chile': { name: 'Chili', flag: '🇨🇱', code: 'CL' },
  'chili': { name: 'Chili', flag: '🇨🇱', code: 'CL' },
  'peru': { name: 'Peru', flag: '🇵🇪', code: 'PE' },
  'venezuela': { name: 'Venezuela', flag: '🇻🇪', code: 'VE' },
  'ecuador': { name: 'Ekuador', flag: '🇪🇨', code: 'EC' },
  'bolivia': { name: 'Bolivia', flag: '🇧🇴', code: 'BO' },
  'uruguay': { name: 'Uruguay', flag: '🇺🇾', code: 'UY' },
  'paraguay': { name: 'Paraguay', flag: '🇵🇾', code: 'PY' },

  // Oseania & Australia
  'australia': { name: 'Australia', flag: '🇦🇺', code: 'AU' },
  'aussie': { name: 'Australia', flag: '🇦🇺', code: 'AU' },
  'new zealand': { name: 'Selandia Baru', flag: '🇳🇿', code: 'NZ' },
  'selandia baru': { name: 'Selandia Baru', flag: '🇳🇿', code: 'NZ' },
  'papua new guinea': { name: 'Papua Nugini', flag: '🇵🇬', code: 'PG' },
  'papua nugini': { name: 'Papua Nugini', flag: '🇵🇬', code: 'PG' },
  'fiji': { name: 'Fiji', flag: '🇫🇯', code: 'FJ' },

  // Afrika
  'egypt': { name: 'Mesir', flag: '🇪🇬', code: 'EG' },
  'mesir': { name: 'Mesir', flag: '🇪🇬', code: 'EG' },
  'south africa': { name: 'Afrika Selatan', flag: '🇿🇦', code: 'ZA' },
  'afrika selatan': { name: 'Afrika Selatan', flag: '🇿🇦', code: 'ZA' },
  'nigeria': { name: 'Nigeria', flag: '🇳🇬', code: 'NG' },
  'kenya': { name: 'Kenya', flag: '🇰🇪', code: 'KE' },
  'morocco': { name: 'Maroko', flag: '🇲🇦', code: 'MA' },
  'maroko': { name: 'Maroko', flag: '🇲🇦', code: 'MA' },
  'algeria': { name: 'Aljazair', flag: '🇩🇿', code: 'DZ' },
  'ghana': { name: 'Ghana', flag: '🇬🇭', code: 'GH' }
};

// 3. Kamus Wilayah / Negara Bagian Populer Dunia (US, Canada, Australia, Malaysia, UK)
const GLOBAL_REGIONS = {
  // Negara Bagian & Wilayah Malaysia (🇲🇾)
  'sarawak': { city: 'Sarawak', region: 'Sarawak', country: 'Malaysia', flag: '🇲🇾' },
  'sabah': { city: 'Sabah', region: 'Sabah', country: 'Malaysia', flag: '🇲🇾' },
  'johor': { city: 'Johor', region: 'Johor', country: 'Malaysia', flag: '🇲🇾' },
  'selangor': { city: 'Selangor', region: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'perak': { city: 'Perak', region: 'Perak', country: 'Malaysia', flag: '🇲🇾' },
  'kedah': { city: 'Kedah', region: 'Kedah', country: 'Malaysia', flag: '🇲🇾' },
  'kelantan': { city: 'Kelantan', region: 'Kelantan', country: 'Malaysia', flag: '🇲🇾' },
  'terengganu': { city: 'Terengganu', region: 'Terengganu', country: 'Malaysia', flag: '🇲🇾' },
  'pahang': { city: 'Pahang', region: 'Pahang', country: 'Malaysia', flag: '🇲🇾' },
  'melaka': { city: 'Melaka', region: 'Melaka', country: 'Malaysia', flag: '🇲🇾' },
  'malacca': { city: 'Melaka', region: 'Melaka', country: 'Malaysia', flag: '🇲🇾' },
  'negeri sembilan': { city: 'Negeri Sembilan', region: 'Negeri Sembilan', country: 'Malaysia', flag: '🇲🇾' },
  'perlis': { city: 'Perlis', region: 'Perlis', country: 'Malaysia', flag: '🇲🇾' },
  'pulau pinang': { city: 'Penang', region: 'Penang', country: 'Malaysia', flag: '🇲🇾' },
  'penang': { city: 'Penang', region: 'Penang', country: 'Malaysia', flag: '🇲🇾' },
  'wilayah persekutuan': { city: 'Wilayah Persekutuan', region: 'Wilayah Persekutuan', country: 'Malaysia', flag: '🇲🇾' },
  'kuala lumpur': { city: 'Kuala Lumpur', region: 'Wilayah Persekutuan', country: 'Malaysia', flag: '🇲🇾' },
  'kl': { city: 'Kuala Lumpur', region: 'Wilayah Persekutuan', country: 'Malaysia', flag: '🇲🇾' },
  'putrajaya': { city: 'Putrajaya', region: 'Wilayah Persekutuan', country: 'Malaysia', flag: '🇲🇾' },
  'labuan': { city: 'Labuan', region: 'Wilayah Persekutuan', country: 'Malaysia', flag: '🇲🇾' },

  // Negara Bagian US Populer (🇺🇸)
  'california': { city: 'California', region: 'California', country: 'United States', flag: '🇺🇸' },
  'texas': { city: 'Texas', region: 'Texas', country: 'United States', flag: '🇺🇸' },
  'florida': { city: 'Florida', region: 'Florida', country: 'United States', flag: '🇺🇸' },
  'new york state': { city: 'New York', region: 'New York', country: 'United States', flag: '🇺🇸' },
  'washington state': { city: 'Washington', region: 'Washington', country: 'United States', flag: '🇺🇸' },
  'illinois': { city: 'Illinois', region: 'Illinois', country: 'United States', flag: '🇺🇸' },
  'pennsylvania': { city: 'Pennsylvania', region: 'Pennsylvania', country: 'United States', flag: '🇺🇸' },
  'ohio': { city: 'Ohio', region: 'Ohio', country: 'United States', flag: '🇺🇸' },
  'georgia': { city: 'Georgia', region: 'Georgia', country: 'United States', flag: '🇺🇸' },
  'north carolina': { city: 'North Carolina', region: 'North Carolina', country: 'United States', flag: '🇺🇸' },
  'michigan': { city: 'Michigan', region: 'Michigan', country: 'United States', flag: '🇺🇸' },
  'new jersey': { city: 'New Jersey', region: 'New Jersey', country: 'United States', flag: '🇺🇸' },
  'virginia': { city: 'Virginia', region: 'Virginia', country: 'United States', flag: '🇺🇸' },
  'arizona': { city: 'Arizona', region: 'Arizona', country: 'United States', flag: '🇺🇸' },
  'massachusetts': { city: 'Massachusetts', region: 'Massachusetts', country: 'United States', flag: '🇺🇸' },
  'colorado': { city: 'Colorado', region: 'Colorado', country: 'United States', flag: '🇺🇸' },
  'oregon': { city: 'Oregon', region: 'Oregon', country: 'United States', flag: '🇺🇸' },
  'nevada': { city: 'Nevada', region: 'Nevada', country: 'United States', flag: '🇺🇸' },
  'hawaii': { city: 'Hawaii', region: 'Hawaii', country: 'United States', flag: '🇺🇸' },
  'alaska': { city: 'Alaska', region: 'Alaska', country: 'United States', flag: '🇺🇸' },

  // Wilayah Kanada (🇨🇦)
  'ontario': { city: 'Ontario', region: 'Ontario', country: 'Kanada', flag: '🇨🇦' },
  'quebec': { city: 'Quebec', region: 'Quebec', country: 'Kanada', flag: '🇨🇦' },
  'british columbia': { city: 'British Columbia', region: 'British Columbia', country: 'Kanada', flag: '🇨🇦' },
  'alberta': { city: 'Alberta', region: 'Alberta', country: 'Kanada', flag: '🇨🇦' },
  'manitoba': { city: 'Manitoba', region: 'Manitoba', country: 'Kanada', flag: '🇨🇦' },

  // Wilayah Australia (🇦🇺)
  'new south wales': { city: 'New South Wales', region: 'New South Wales', country: 'Australia', flag: '🇦🇺' },
  'nsw': { city: 'New South Wales', region: 'New South Wales', country: 'Australia', flag: '🇦🇺' },
  'victoria': { city: 'Victoria', region: 'Victoria', country: 'Australia', flag: '🇦🇺' },
  'queensland': { city: 'Queensland', region: 'Queensland', country: 'Australia', flag: '🇦🇺' },
  'western australia': { city: 'Western Australia', region: 'Western Australia', country: 'Australia', flag: '🇦🇺' },
  'south australia': { city: 'South Australia', region: 'South Australia', country: 'Australia', flag: '🇦🇺' },
  'tasmania': { city: 'Tasmania', region: 'Tasmania', country: 'Australia', flag: '🇦🇺' }
};

// 4. Kamus 150+ Kota Metropolitan Dunia
const GLOBAL_CITIES = {
  // Asia Tenggara
  'singapore': { city: 'Singapore', region: 'Singapore', country: 'Singapore', flag: '🇸🇬' },
  'kuala lumpur': { city: 'Kuala Lumpur', region: 'Wilayah Persekutuan', country: 'Malaysia', flag: '🇲🇾' },
  'george town': { city: 'George Town', region: 'Penang', country: 'Malaysia', flag: '🇲🇾' },
  'georgetown': { city: 'George Town', region: 'Penang', country: 'Malaysia', flag: '🇲🇾' },
  'penang': { city: 'George Town', region: 'Penang', country: 'Malaysia', flag: '🇲🇾' },
  'ipoh': { city: 'Ipoh', region: 'Perak', country: 'Malaysia', flag: '🇲🇾' },
  'shah alam': { city: 'Shah Alam', region: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'petaling jaya': { city: 'Petaling Jaya', region: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'pj': { city: 'Petaling Jaya', region: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'subang jaya': { city: 'Subang Jaya', region: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'klang': { city: 'Klang', region: 'Selangor', country: 'Malaysia', flag: '🇲🇾' },
  'johor bahru': { city: 'Johor Bahru', region: 'Johor', country: 'Malaysia', flag: '🇲🇾' },
  'jb': { city: 'Johor Bahru', region: 'Johor', country: 'Malaysia', flag: '🇲🇾' },
  'kuching': { city: 'Kuching', region: 'Sarawak', country: 'Malaysia', flag: '🇲🇾' },
  'miri': { city: 'Miri', region: 'Sarawak', country: 'Malaysia', flag: '🇲🇾' },
  'sibu': { city: 'Sibu', region: 'Sarawak', country: 'Malaysia', flag: '🇲🇾' },
  'bintulu': { city: 'Bintulu', region: 'Sarawak', country: 'Malaysia', flag: '🇲🇾' },
  'kota kinabalu': { city: 'Kota Kinabalu', region: 'Sabah', country: 'Malaysia', flag: '🇲🇾' },
  'sandakan': { city: 'Sandakan', region: 'Sabah', country: 'Malaysia', flag: '🇲🇾' },
  'tawau': { city: 'Tawau', region: 'Sabah', country: 'Malaysia', flag: '🇲🇾' },
  'alor setar': { city: 'Alor Setar', region: 'Kedah', country: 'Malaysia', flag: '🇲🇾' },
  'kuantan': { city: 'Kuantan', region: 'Pahang', country: 'Malaysia', flag: '🇲🇾' },
  'seremban': { city: 'Seremban', region: 'Negeri Sembilan', country: 'Malaysia', flag: '🇲🇾' },
  'kota bharu': { city: 'Kota Bharu', region: 'Kelantan', country: 'Malaysia', flag: '🇲🇾' },
  'kuala terengganu': { city: 'Kuala Terengganu', region: 'Terengganu', country: 'Malaysia', flag: '🇲🇾' },
  'bangkok': { city: 'Bangkok', region: 'Bangkok', country: 'Thailand', flag: '🇹🇭' },
  'chiang mai': { city: 'Chiang Mai', region: 'Chiang Mai', country: 'Thailand', flag: '🇹🇭' },
  'phuket': { city: 'Phuket', region: 'Phuket', country: 'Thailand', flag: '🇹🇭' },
  'pattaya': { city: 'Pattaya', region: 'Chonburi', country: 'Thailand', flag: '🇹🇭' },
  // Filipina
  'manila': { city: 'Manila', region: 'Metro Manila', country: 'Filipina', flag: '🇵🇭' },
  'metro manila': { city: 'Metro Manila', region: 'Metro Manila', country: 'Filipina', flag: '🇵🇭' },
  'quezon city': { city: 'Quezon City', region: 'Metro Manila', country: 'Filipina', flag: '🇵🇭' },
  'makati': { city: 'Makati', region: 'Metro Manila', country: 'Filipina', flag: '🇵🇭' },
  'taguig': { city: 'Taguig', region: 'Metro Manila', country: 'Filipina', flag: '🇵🇭' },
  'pasig': { city: 'Pasig', region: 'Metro Manila', country: 'Filipina', flag: '🇵🇭' },
  'paranaque': { city: 'Parañaque', region: 'Metro Manila', country: 'Filipina', flag: '🇵🇭' },
  'pasay': { city: 'Pasay', region: 'Metro Manila', country: 'Filipina', flag: '🇵🇭' },
  'mandaluyong': { city: 'Mandaluyong', region: 'Metro Manila', country: 'Filipina', flag: '🇵🇭' },
  'cebu': { city: 'Cebu', region: 'Central Visayas', country: 'Filipina', flag: '🇵🇭' },
  'cebu city': { city: 'Cebu', region: 'Central Visayas', country: 'Filipina', flag: '🇵🇭' },
  'davao': { city: 'Davao', region: 'Davao Region', country: 'Filipina', flag: '🇵🇭' },
  'davao city': { city: 'Davao', region: 'Davao Region', country: 'Filipina', flag: '🇵🇭' },
  'baguio': { city: 'Baguio', region: 'Benguet', country: 'Filipina', flag: '🇵🇭' },
  'angeles': { city: 'Angeles', region: 'Pampanga', country: 'Filipina', flag: '🇵🇭' },
  'iloilo': { city: 'Iloilo', region: 'Western Visayas', country: 'Filipina', flag: '🇵🇭' },
  'bacolod': { city: 'Bacolod', region: 'Negros Occidental', country: 'Filipina', flag: '🇵🇭' },
  'cagayan de oro': { city: 'Cagayan de Oro', region: 'Northern Mindanao', country: 'Filipina', flag: '🇵🇭' },
  'zamboanga': { city: 'Zamboanga', region: 'Zamboanga Peninsula', country: 'Filipina', flag: '🇵🇭' },
  'luzon': { city: 'Luzon', region: 'Luzon', country: 'Filipina', flag: '🇵🇭' },
  'visayas': { city: 'Visayas', region: 'Visayas', country: 'Filipina', flag: '🇵🇭' },
  'mindanao': { city: 'Mindanao', region: 'Mindanao', country: 'Filipina', flag: '🇵🇭' },

  // Vietnam, Kamboja, Laos, Myanmar, Brunei
  'hanoi': { city: 'Hanoi', region: 'Hanoi', country: 'Vietnam', flag: '🇻🇳' },
  'ho chi minh': { city: 'Ho Chi Minh', region: 'Ho Chi Minh', country: 'Vietnam', flag: '🇻🇳' },
  'saigon': { city: 'Ho Chi Minh', region: 'Ho Chi Minh', country: 'Vietnam', flag: '🇻🇳' },
  'da nang': { city: 'Da Nang', region: 'Da Nang', country: 'Vietnam', flag: '🇻🇳' },
  'phnom penh': { city: 'Phnom Penh', region: 'Phnom Penh', country: 'Kamboja', flag: '🇰🇭' },
  'siem reap': { city: 'Siem Reap', region: 'Siem Reap', country: 'Kamboja', flag: '🇰🇭' },
  'battambang': { city: 'Battambang', region: 'Battambang', country: 'Kamboja', flag: '🇰🇭' },
  'sihanoukville': { city: 'Sihanoukville', region: 'Preah Sihanouk', country: 'Kamboja', flag: '🇰🇭' },
  'kampong som': { city: 'Sihanoukville', region: 'Preah Sihanouk', country: 'Kamboja', flag: '🇰🇭' },
  'kampot': { city: 'Kampot', region: 'Kampot', country: 'Kamboja', flag: '🇰🇭' },
  'poipet': { city: 'Poipet', region: 'Banteay Meanchey', country: 'Kamboja', flag: '🇰🇭' },
  'vientiane': { city: 'Vientiane', region: 'Vientiane', country: 'Laos', flag: '🇱🇦' },
  'yangon': { city: 'Yangon', region: 'Yangon', country: 'Myanmar', flag: '🇲🇲' },
  'bandar seri begawan': { city: 'Bandar Seri Begawan', region: 'Brunei-Muara', country: 'Brunei', flag: '🇧🇳' },
  'bsb': { city: 'Bandar Seri Begawan', region: 'Brunei-Muara', country: 'Brunei', flag: '🇧🇳' },
  'kuala belait': { city: 'Kuala Belait', region: 'Belait', country: 'Brunei', flag: '🇧🇳' },
  'seria': { city: 'Seria', region: 'Belait', country: 'Brunei', flag: '🇧🇳' },
  'tutong': { city: 'Tutong', region: 'Tutong', country: 'Brunei', flag: '🇧🇳' },
  'temburong': { city: 'Temburong', region: 'Temburong', country: 'Brunei', flag: '🇧🇳' },
  'bangar': { city: 'Bangar', region: 'Temburong', country: 'Brunei', flag: '🇧🇳' },
  'gadong': { city: 'Gadong', region: 'Brunei-Muara', country: 'Brunei', flag: '🇧🇳' },
  'jerudong': { city: 'Jerudong', region: 'Brunei-Muara', country: 'Brunei', flag: '🇧🇳' },
  'dili': { city: 'Dili', region: 'Dili', country: 'Timor Leste', flag: '🇹🇱' },

  // Asia Timur
  'tokyo': { city: 'Tokyo', region: 'Kanto', country: 'Jepang', flag: '🇯🇵' },
  'osaka': { city: 'Osaka', region: 'Kansai', country: 'Jepang', flag: '🇯🇵' },
  'kyoto': { city: 'Kyoto', region: 'Kansai', country: 'Jepang', flag: '🇯🇵' },
  'yokohama': { city: 'Yokohama', region: 'Kanagawa', country: 'Jepang', flag: '🇯🇵' },
  'nagoya': { city: 'Nagoya', region: 'Aichi', country: 'Jepang', flag: '🇯🇵' },
  'sapporo': { city: 'Sapporo', region: 'Hokkaido', country: 'Jepang', flag: '🇯🇵' },
  'fukuoka': { city: 'Fukuoka', region: 'Kyushu', country: 'Jepang', flag: '🇯🇵' },
  'kobe': { city: 'Kobe', region: 'Hyogo', country: 'Jepang', flag: '🇯🇵' },
  'hiroshima': { city: 'Hiroshima', region: 'Chugoku', country: 'Jepang', flag: '🇯🇵' },
  'sendai': { city: 'Sendai', region: 'Tohoku', country: 'Jepang', flag: '🇯🇵' },
  'seoul': { city: 'Seoul', region: 'Seoul', country: 'Korea Selatan', flag: '🇰🇷' },
  'busan': { city: 'Busan', region: 'Busan', country: 'Korea Selatan', flag: '🇰🇷' },
  'incheon': { city: 'Incheon', region: 'Incheon', country: 'Korea Selatan', flag: '🇰🇷' },
  'daegu': { city: 'Daegu', region: 'Daegu', country: 'Korea Selatan', flag: '🇰🇷' },
  'daejeon': { city: 'Daejeon', region: 'Daejeon', country: 'Korea Selatan', flag: '🇰🇷' },
  'gwangju': { city: 'Gwangju', region: 'Gwangju', country: 'Korea Selatan', flag: '🇰🇷' },
  'beijing': { city: 'Beijing', region: 'Beijing', country: 'China', flag: '🇨🇳' },
  'shanghai': { city: 'Shanghai', region: 'Shanghai', country: 'China', flag: '🇨🇳' },
  'guangzhou': { city: 'Guangzhou', region: 'Guangdong', country: 'China', flag: '🇨🇳' },
  'shenzhen': { city: 'Shenzhen', region: 'Guangdong', country: 'China', flag: '🇨🇳' },
  'chengdu': { city: 'Chengdu', region: 'Sichuan', country: 'China', flag: '🇨🇳' },
  'hangzhou': { city: 'Hangzhou', region: 'Zhejiang', country: 'China', flag: '🇨🇳' },
  'wuhan': { city: 'Wuhan', region: 'Hubei', country: 'China', flag: '🇨🇳' },
  'taipei': { city: 'Taipei', region: 'Taipei', country: 'Taiwan', flag: '🇹🇼' },
  'kaohsiung': { city: 'Kaohsiung', region: 'Kaohsiung', country: 'Taiwan', flag: '🇹🇼' },
  'taichung': { city: 'Taichung', region: 'Taichung', country: 'Taiwan', flag: '🇹🇼' },

  // Asia Selatan & Timur Tengah
  'new delhi': { city: 'New Delhi', region: 'Delhi', country: 'India', flag: '🇮🇳' },
  'delhi': { city: 'Delhi', region: 'Delhi', country: 'India', flag: '🇮🇳' },
  'mumbai': { city: 'Mumbai', region: 'Maharashtra', country: 'India', flag: '🇮🇳' },
  'bangalore': { city: 'Bangalore', region: 'Karnataka', country: 'India', flag: '🇮🇳' },
  'bengaluru': { city: 'Bangalore', region: 'Karnataka', country: 'India', flag: '🇮🇳' },
  'chennai': { city: 'Chennai', region: 'Tamil Nadu', country: 'India', flag: '🇮🇳' },
  'hyderabad': { city: 'Hyderabad', region: 'Telangana', country: 'India', flag: '🇮🇳' },
  'karachi': { city: 'Karachi', region: 'Sindh', country: 'Pakistan', flag: '🇵🇰' },
  'lahore': { city: 'Lahore', region: 'Punjab', country: 'Pakistan', flag: '🇵🇰' },
  'islamabad': { city: 'Islamabad', region: 'Capital', country: 'Pakistan', flag: '🇵🇰' },
  'dhaka': { city: 'Dhaka', region: 'Dhaka', country: 'Bangladesh', flag: '🇧🇩' },
  'dubai': { city: 'Dubai', region: 'Dubai', country: 'Uni Emirat Arab', flag: '🇦🇪' },
  'abu dhabi': { city: 'Abu Dhabi', region: 'Abu Dhabi', country: 'Uni Emirat Arab', flag: '🇦🇪' },
  'riyadh': { city: 'Riyadh', region: 'Riyadh', country: 'Arab Saudi', flag: '🇸🇦' },
  'jeddah': { city: 'Jeddah', region: 'Makkah', country: 'Arab Saudi', flag: '🇸🇦' },
  'mecca': { city: 'Mecca', region: 'Makkah', country: 'Arab Saudi', flag: '🇸🇦' },
  'mekkah': { city: 'Mecca', region: 'Makkah', country: 'Arab Saudi', flag: '🇸🇦' },
  'medina': { city: 'Medina', region: 'Madinah', country: 'Arab Saudi', flag: '🇸🇦' },
  'madinah': { city: 'Medina', region: 'Madinah', country: 'Arab Saudi', flag: '🇸🇦' },
  'doha': { city: 'Doha', region: 'Doha', country: 'Qatar', flag: '🇶🇦' },
  'kuwait city': { city: 'Kuwait City', region: 'Al Asimah', country: 'Kuwait', flag: '🇰🇼' },
  'manama': { city: 'Manama', region: 'Capital', country: 'Bahrain', flag: '🇧🇭' },
  'muscat': { city: 'Muscat', region: 'Muscat', country: 'Oman', flag: '🇴🇲' },
  'istanbul': { city: 'Istanbul', region: 'Marmara', country: 'Turki', flag: '🇹🇷' },
  'ankara': { city: 'Ankara', region: 'Anatolia', country: 'Turki', flag: '🇹🇷' },

  // Eropa
  'london': { city: 'London', region: 'England', country: 'United Kingdom', flag: '🇬🇧' },
  'manchester': { city: 'Manchester', region: 'England', country: 'United Kingdom', flag: '🇬🇧' },
  'birmingham': { city: 'Birmingham', region: 'England', country: 'United Kingdom', flag: '🇬🇧' },
  'liverpool': { city: 'Liverpool', region: 'England', country: 'United Kingdom', flag: '🇬🇧' },
  'leeds': { city: 'Leeds', region: 'England', country: 'United Kingdom', flag: '🇬🇧' },
  'glasgow': { city: 'Glasgow', region: 'Scotland', country: 'United Kingdom', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  'edinburgh': { city: 'Edinburgh', region: 'Scotland', country: 'United Kingdom', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  'bristol': { city: 'Bristol', region: 'England', country: 'United Kingdom', flag: '🇬🇧' },
  'cardiff': { city: 'Cardiff', region: 'Wales', country: 'United Kingdom', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  'belfast': { city: 'Belfast', region: 'Northern Ireland', country: 'United Kingdom', flag: '🇬🇧' },
  'paris': { city: 'Paris', region: 'Ile-de-France', country: 'Prancis', flag: '🇫🇷' },
  'lyon': { city: 'Lyon', region: 'Auvergne-Rhone-Alpes', country: 'Prancis', flag: '🇫🇷' },
  'marseille': { city: 'Marseille', region: 'Provence', country: 'Prancis', flag: '🇫🇷' },
  'berlin': { city: 'Berlin', region: 'Berlin', country: 'Jerman', flag: '🇩🇪' },
  'munich': { city: 'Munich', region: 'Bavaria', country: 'Jerman', flag: '🇩🇪' },
  'munchen': { city: 'Munich', region: 'Bavaria', country: 'Jerman', flag: '🇩🇪' },
  'frankfurt': { city: 'Frankfurt', region: 'Hesse', country: 'Jerman', flag: '🇩🇪' },
  'hamburg': { city: 'Hamburg', region: 'Hamburg', country: 'Jerman', flag: '🇩🇪' },
  'cologne': { city: 'Cologne', region: 'North Rhine-Westphalia', country: 'Jerman', flag: '🇩🇪' },
  'koln': { city: 'Cologne', region: 'North Rhine-Westphalia', country: 'Jerman', flag: '🇩🇪' },
  'stuttgart': { city: 'Stuttgart', region: 'Baden-Wurttemberg', country: 'Jerman', flag: '🇩🇪' },
  'amsterdam': { city: 'Amsterdam', region: 'North Holland', country: 'Belanda', flag: '🇳🇱' },
  'rotterdam': { city: 'Rotterdam', region: 'South Holland', country: 'Belanda', flag: '🇳🇱' },
  'the hague': { city: 'The Hague', region: 'South Holland', country: 'Belanda', flag: '🇳🇱' },
  'den haag': { city: 'The Hague', region: 'South Holland', country: 'Belanda', flag: '🇳🇱' },
  'utrecht': { city: 'Utrecht', region: 'Utrecht', country: 'Belanda', flag: '🇳🇱' },
  'brussels': { city: 'Brussels', region: 'Brussels', country: 'Belgia', flag: '🇧🇪' },
  'rome': { city: 'Rome', region: 'Lazio', country: 'Italia', flag: '🇮🇹' },
  'roma': { city: 'Rome', region: 'Lazio', country: 'Italia', flag: '🇮🇹' },
  'milan': { city: 'Milan', region: 'Lombardy', country: 'Italia', flag: '🇮🇹' },
  'milano': { city: 'Milan', region: 'Lombardy', country: 'Italia', flag: '🇮🇹' },
  'florence': { city: 'Florence', region: 'Tuscany', country: 'Italia', flag: '🇮🇹' },
  'venice': { city: 'Venice', region: 'Veneto', country: 'Italia', flag: '🇮🇹' },
  'madrid': { city: 'Madrid', region: 'Community of Madrid', country: 'Spanyol', flag: '🇪🇸' },
  'barcelona': { city: 'Barcelona', region: 'Catalonia', country: 'Spanyol', flag: '🇪🇸' },
  'valencia': { city: 'Valencia', region: 'Valencia', country: 'Spanyol', flag: '🇪🇸' },
  'seville': { city: 'Seville', region: 'Andalusia', country: 'Spanyol', flag: '🇪🇸' },
  'lisbon': { city: 'Lisbon', region: 'Lisbon', country: 'Portugal', flag: '🇵🇹' },
  'porto': { city: 'Porto', region: 'Porto', country: 'Portugal', flag: '🇵🇹' },
  'vienna': { city: 'Vienna', region: 'Vienna', country: 'Austria', flag: '🇦🇹' },
  'wien': { city: 'Vienna', region: 'Vienna', country: 'Austria', flag: '🇦🇹' },
  'zurich': { city: 'Zurich', region: 'Zurich', country: 'Swiss', flag: '🇨🇭' },
  'geneva': { city: 'Geneva', region: 'Geneva', country: 'Swiss', flag: '🇨🇭' },
  'stockholm': { city: 'Stockholm', region: 'Stockholm', country: 'Swedia', flag: '🇸🇪' },
  'oslo': { city: 'Oslo', region: 'Oslo', country: 'Norwegia', flag: '🇳🇴' },
  'copenhagen': { city: 'Copenhagen', region: 'Capital', country: 'Denmark', flag: '🇩🇰' },
  'helsinki': { city: 'Helsinki', region: 'Uusimaa', country: 'Finlandia', flag: '🇫🇮' },
  'dublin': { city: 'Dublin', region: 'Leinster', country: 'Irlandia', flag: '🇮🇪' },
  'warsaw': { city: 'Warsaw', region: 'Mazovia', country: 'Polandia', flag: '🇵🇱' },
  'krakow': { city: 'Krakow', region: 'Lesser Poland', country: 'Polandia', flag: '🇵🇱' },
  'prague': { city: 'Prague', region: 'Prague', country: 'Ceko', flag: '🇨🇿' },
  'budapest': { city: 'Budapest', region: 'Central Hungary', country: 'Hungaria', flag: '🇭🇺' },
  'athens': { city: 'Athens', region: 'Attica', country: 'Yunani', flag: '🇬🇷' },
  'moscow': { city: 'Moscow', region: 'Central', country: 'Rusia', flag: '🇷🇺' },
  'saint petersburg': { city: 'Saint Petersburg', region: 'Northwestern', country: 'Rusia', flag: '🇷🇺' },
  'kyiv': { city: 'Kyiv', region: 'Kyiv', country: 'Ukraina', flag: '🇺🇦' },

  // Amerika Utara
  'new york': { city: 'New York', region: 'New York', country: 'United States', flag: '🇺🇸' },
  'new york city': { city: 'New York', region: 'New York', country: 'United States', flag: '🇺🇸' },
  'nyc': { city: 'New York', region: 'New York', country: 'United States', flag: '🇺🇸' },
  'los angeles': { city: 'Los Angeles', region: 'California', country: 'United States', flag: '🇺🇸' },
  'la': { city: 'Los Angeles', region: 'California', country: 'United States', flag: '🇺🇸' },
  'san francisco': { city: 'San Francisco', region: 'California', country: 'United States', flag: '🇺🇸' },
  'sf': { city: 'San Francisco', region: 'California', country: 'United States', flag: '🇺🇸' },
  'chicago': { city: 'Chicago', region: 'Illinois', country: 'United States', flag: '🇺🇸' },
  'houston': { city: 'Houston', region: 'Texas', country: 'United States', flag: '🇺🇸' },
  'dallas': { city: 'Dallas', region: 'Texas', country: 'United States', flag: '🇺🇸' },
  'austin': { city: 'Austin', region: 'Texas', country: 'United States', flag: '🇺🇸' },
  'seattle': { city: 'Seattle', region: 'Washington', country: 'United States', flag: '🇺🇸' },
  'boston': { city: 'Boston', region: 'Massachusetts', country: 'United States', flag: '🇺🇸' },
  'miami': { city: 'Miami', region: 'Florida', country: 'United States', flag: '🇺🇸' },
  'orlando': { city: 'Orlando', region: 'Florida', country: 'United States', flag: '🇺🇸' },
  'las vegas': { city: 'Las Vegas', region: 'Nevada', country: 'United States', flag: '🇺🇸' },
  'denver': { city: 'Denver', region: 'Colorado', country: 'United States', flag: '🇺🇸' },
  'san diego': { city: 'San Diego', region: 'California', country: 'United States', flag: '🇺🇸' },
  'san jose': { city: 'San Jose', region: 'California', country: 'United States', flag: '🇺🇸' },
  'atlanta': { city: 'Atlanta', region: 'Georgia', country: 'United States', flag: '🇺🇸' },
  'washington dc': { city: 'Washington DC', region: 'District of Columbia', country: 'United States', flag: '🇺🇸' },
  'philadelphia': { city: 'Philadelphia', region: 'Pennsylvania', country: 'United States', flag: '🇺🇸' },
  'phoenix': { city: 'Phoenix', region: 'Arizona', country: 'United States', flag: '🇺🇸' },
  'detroit': { city: 'Detroit', region: 'Michigan', country: 'United States', flag: '🇺🇸' },
  'toronto': { city: 'Toronto', region: 'Ontario', country: 'Kanada', flag: '🇨🇦' },
  'vancouver': { city: 'Vancouver', region: 'British Columbia', country: 'Kanada', flag: '🇨🇦' },
  'montreal': { city: 'Montreal', region: 'Quebec', country: 'Kanada', flag: '🇨🇦' },
  'calgary': { city: 'Calgary', region: 'Alberta', country: 'Kanada', flag: '🇨🇦' },
  'ottawa': { city: 'Ottawa', region: 'Ontario', country: 'Kanada', flag: '🇨🇦' },
  'edmonton': { city: 'Edmonton', region: 'Alberta', country: 'Kanada', flag: '🇨🇦' },
  'mexico city': { city: 'Mexico City', region: 'CDMX', country: 'Meksiko', flag: '🇲🇽' },
  'guadalajara': { city: 'Guadalajara', region: 'Jalisco', country: 'Meksiko', flag: '🇲🇽' },
  'monterrey': { city: 'Monterrey', region: 'Nuevo Leon', country: 'Meksiko', flag: '🇲🇽' },

  // Oseania & Amerika Selatan
  'sydney': { city: 'Sydney', region: 'New South Wales', country: 'Australia', flag: '🇦🇺' },
  'melbourne': { city: 'Melbourne', region: 'Victoria', country: 'Australia', flag: '🇦🇺' },
  'brisbane': { city: 'Brisbane', region: 'Queensland', country: 'Australia', flag: '🇦🇺' },
  'perth': { city: 'Perth', region: 'Western Australia', country: 'Australia', flag: '🇦🇺' },
  'adelaide': { city: 'Adelaide', region: 'South Australia', country: 'Australia', flag: '🇦🇺' },
  'gold coast': { city: 'Gold Coast', region: 'Queensland', country: 'Australia', flag: '🇦🇺' },
  'canberra': { city: 'Canberra', region: 'ACT', country: 'Australia', flag: '🇦🇺' },
  'auckland': { city: 'Auckland', region: 'Auckland', country: 'Selandia Baru', flag: '🇳🇿' },
  'wellington': { city: 'Wellington', region: 'Wellington', country: 'Selandia Baru', flag: '🇳🇿' },
  'christchurch': { city: 'Christchurch', region: 'Canterbury', country: 'Selandia Baru', flag: '🇳🇿' },
  'sao paulo': { city: 'Sao Paulo', region: 'Sao Paulo', country: 'Brasil', flag: '🇧🇷' },
  'rio de janeiro': { city: 'Rio de Janeiro', region: 'Rio de Janeiro', country: 'Brasil', flag: '🇧🇷' },
  'buenos aires': { city: 'Buenos Aires', region: 'Capital', country: 'Argentina', flag: '🇦🇷' },
  'santiago': { city: 'Santiago', region: 'Santiago', country: 'Chili', flag: '🇨🇱' },
  'bogota': { city: 'Bogota', region: 'Bogota', country: 'Kolombia', flag: '🇨🇴' },
  'lima': { city: 'Lima', region: 'Lima', country: 'Peru', flag: '🇵🇪' },
  'cairo': { city: 'Cairo', region: 'Cairo', country: 'Mesir', flag: '🇪🇬' },
  'johannesburg': { city: 'Johannesburg', region: 'Gauteng', country: 'Afrika Selatan', flag: '🇿🇦' },
  'cape town': { city: 'Cape Town', region: 'Western Cape', country: 'Afrika Selatan', flag: '🇿🇦' }
};

// 5. Kamus Lengkap 38 Provinsi Indonesia + Singkatan Populer
const INDONESIA_PROVINCES = {
  // Pulau Sumatera
  'aceh': 'Aceh',
  'nanggroe aceh darussalam': 'Aceh',
  'nad': 'Aceh',
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
  'bengkulu': 'Bengkulu',
  'lampung': 'Lampung',
  'kepulauan bangka belitung': 'Kepulauan Bangka Belitung',
  'bangka belitung': 'Kepulauan Bangka Belitung',
  'babel': 'Kepulauan Bangka Belitung',

  // Pulau Jawa
  'dki jakarta': 'DKI Jakarta',
  'jawa barat': 'Jawa Barat',
  'jabar': 'Jawa Barat',
  'jawa tengah': 'Jawa Tengah',
  'jateng': 'Jawa Tengah',
  'di yogyakarta': 'DI Yogyakarta',
  'daerah istimewa yogyakarta': 'DI Yogyakarta',
  'yogyakarta': 'DI Yogyakarta',
  'jogja': 'DI Yogyakarta',
  'jogjakarta': 'DI Yogyakarta',
  'jawa timur': 'Jawa Timur',
  'jatim': 'Jawa Timur',
  'banten': 'Banten',

  // Kepulauan Nusa Tenggara & Bali
  'bali': 'Bali',
  'nusa tenggara barat': 'Nusa Tenggara Barat',
  'ntb': 'Nusa Tenggara Barat',
  'nusa tenggara timur': 'Nusa Tenggara Timur',
  'ntt': 'Nusa Tenggara Timur',

  // Pulau Kalimantan
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

  // Pulau Sulawesi
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

  // Kepulauan Maluku
  'maluku': 'Maluku',
  'maluku utara': 'Maluku Utara',
  'malut': 'Maluku Utara',

  // Pulau Papua (6 Provinsi DOB)
  'papua': 'Papua',
  'papua barat': 'Papua Barat',
  'papua selatan': 'Papua Selatan',
  'papua tengah': 'Papua Tengah',
  'papua pegunungan': 'Papua Pegunungan',
  'papua barat daya': 'Papua Barat Daya'
};

// 5.1 Kepulauan / Pulau Besar Indonesia
const INDONESIA_ISLANDS = {
  'sumatera': 'Pulau Sumatera',
  'sumatra': 'Pulau Sumatera',
  'jawa': 'Pulau Jawa',
  'java': 'Pulau Jawa',
  'kalimantan': 'Pulau Kalimantan',
  'borneo': 'Pulau Kalimantan',
  'sulawesi': 'Pulau Sulawesi',
  'celebes': 'Pulau Sulawesi',
  'nusa tenggara': 'Kepulauan Nusa Tenggara'
};

// 6. Kamus Lengkap 514 Kabupaten dan Kota di Indonesia + Kawasan Satelit Populer
const INDONESIA_CITIES = {
  // ==================== DKI JAKARTA ====================
  'jakarta': { city: 'Jakarta', province: 'DKI Jakarta' },
  'dki jakarta': { city: 'DKI Jakarta', province: 'DKI Jakarta' },
  'jakarta barat': { city: 'Jakarta Barat', province: 'DKI Jakarta' },
  'jakbar': { city: 'Jakarta Barat', province: 'DKI Jakarta' },
  'kembangan': { city: 'Kembangan', province: 'DKI Jakarta' },
  'kebon jeruk': { city: 'Kebon Jeruk', province: 'DKI Jakarta' },
  'palmerah': { city: 'Palmerah', province: 'DKI Jakarta' },
  'grogol': { city: 'Grogol', province: 'DKI Jakarta' },
  'grogol petamburan': { city: 'Grogol Petamburan', province: 'DKI Jakarta' },
  'cengkareng': { city: 'Cengkareng', province: 'DKI Jakarta' },
  'kalideres': { city: 'Kalideres', province: 'DKI Jakarta' },
  'tambora': { city: 'Tambora', province: 'DKI Jakarta' },
  'taman sari': { city: 'Taman Sari', province: 'DKI Jakarta' },
  'tamansari': { city: 'Taman Sari', province: 'DKI Jakarta' },
  'slipi': { city: 'Slipi', province: 'DKI Jakarta' },
  'tomang': { city: 'Tomang', province: 'DKI Jakarta' },
  'puri': { city: 'Puri Indah', province: 'DKI Jakarta' },
  'puri indah': { city: 'Puri Indah', province: 'DKI Jakarta' },
  'meruya': { city: 'Meruya', province: 'DKI Jakarta' },
  'kedoya': { city: 'Kedoya', province: 'DKI Jakarta' },
  'tanjung duren': { city: 'Tanjung Duren', province: 'DKI Jakarta' },
  'jelambar': { city: 'Jelambar', province: 'DKI Jakarta' },
  'duri kepa': { city: 'Duri Kepa', province: 'DKI Jakarta' },

  'jakarta selatan': { city: 'Jakarta Selatan', province: 'DKI Jakarta' },
  'jaksel': { city: 'Jakarta Selatan', province: 'DKI Jakarta' },
  'kebayoran': { city: 'Kebayoran', province: 'DKI Jakarta' },
  'kebayoran baru': { city: 'Kebayoran Baru', province: 'DKI Jakarta' },
  'kebayoran lama': { city: 'Kebayoran Lama', province: 'DKI Jakarta' },
  'cilandak': { city: 'Cilandak', province: 'DKI Jakarta' },
  'pasar minggu': { city: 'Pasar Minggu', province: 'DKI Jakarta' },
  'jagakarsa': { city: 'Jagakarsa', province: 'DKI Jakarta' },
  'mampang': { city: 'Mampang', province: 'DKI Jakarta' },
  'mampang prapatan': { city: 'Mampang Prapatan', province: 'DKI Jakarta' },
  'pancoran': { city: 'Pancoran', province: 'DKI Jakarta' },
  'tebet': { city: 'Tebet', province: 'DKI Jakarta' },
  'setiabudi': { city: 'Setiabudi', province: 'DKI Jakarta' },
  'pesanggrahan': { city: 'Pesanggrahan', province: 'DKI Jakarta' },
  'kemang': { city: 'Kemang', province: 'DKI Jakarta' },
  'senopati': { city: 'Senopati', province: 'DKI Jakarta' },
  'pondok indah': { city: 'Pondok Indah', province: 'DKI Jakarta' },
  'fatmawati': { city: 'Fatmawati', province: 'DKI Jakarta' },
  'blok m': { city: 'Blok M', province: 'DKI Jakarta' },
  'senayan': { city: 'Senayan', province: 'DKI Jakarta' },
  'scbd': { city: 'SCBD', province: 'DKI Jakarta' },
  'sudirman': { city: 'Sudirman', province: 'DKI Jakarta' },
  'ragunan': { city: 'Ragunan', province: 'DKI Jakarta' },
  'pejaten': { city: 'Pejaten', province: 'DKI Jakarta' },
  'lebak bulus': { city: 'Lebak Bulus', province: 'DKI Jakarta' },
  'gandaria': { city: 'Gandaria', province: 'DKI Jakarta' },
  'cipete': { city: 'Cipete', province: 'DKI Jakarta' },

  'jakarta pusat': { city: 'Jakarta Pusat', province: 'DKI Jakarta' },
  'jakpus': { city: 'Jakarta Pusat', province: 'DKI Jakarta' },
  'menteng': { city: 'Menteng', province: 'DKI Jakarta' },
  'gambir': { city: 'Gambir', province: 'DKI Jakarta' },
  'tanah abang': { city: 'Tanah Abang', province: 'DKI Jakarta' },
  'senen': { city: 'Senen', province: 'DKI Jakarta' },
  'cempaka putih': { city: 'Cempaka Putih', province: 'DKI Jakarta' },
  'johar baru': { city: 'Johar Baru', province: 'DKI Jakarta' },
  'kemayoran': { city: 'Kemayoran', province: 'DKI Jakarta' },
  'sawah besar': { city: 'Sawah Besar', province: 'DKI Jakarta' },
  'harmoni': { city: 'Harmoni', province: 'DKI Jakarta' },
  'salemba': { city: 'Salemba', province: 'DKI Jakarta' },
  'benhil': { city: 'Bendungan Hilir', province: 'DKI Jakarta' },
  'bendungan hilir': { city: 'Bendungan Hilir', province: 'DKI Jakarta' },
  'thamrin': { city: 'Thamrin', province: 'DKI Jakarta' },

  'jakarta timur': { city: 'Jakarta Timur', province: 'DKI Jakarta' },
  'jaktim': { city: 'Jakarta Timur', province: 'DKI Jakarta' },
  'matraman': { city: 'Matraman', province: 'DKI Jakarta' },
  'pulo gadung': { city: 'Pulo Gadung', province: 'DKI Jakarta' },
  'pulogadung': { city: 'Pulo Gadung', province: 'DKI Jakarta' },
  'jatinegara': { city: 'Jatinegara', province: 'DKI Jakarta' },
  'duren sawit': { city: 'Duren Sawit', province: 'DKI Jakarta' },
  'kramat jati': { city: 'Kramat Jati', province: 'DKI Jakarta' },
  'pasar rebo': { city: 'Pasar Rebo', province: 'DKI Jakarta' },
  'ciracas': { city: 'Ciracas', province: 'DKI Jakarta' },
  'cipayung': { city: 'Cipayung', province: 'DKI Jakarta' },
  'cakung': { city: 'Cakung', province: 'DKI Jakarta' },
  'rawamangun': { city: 'Rawamangun', province: 'DKI Jakarta' },
  'kampung melayu': { city: 'Kampung Melayu', province: 'DKI Jakarta' },
  'halim': { city: 'Halim Perdanakusuma', province: 'DKI Jakarta' },
  'klender': { city: 'Klender', province: 'DKI Jakarta' },
  'condet': { city: 'Condet', province: 'DKI Jakarta' },
  'cijantung': { city: 'Cijantung', province: 'DKI Jakarta' },

  'jakarta utara': { city: 'Jakarta Utara', province: 'DKI Jakarta' },
  'jakut': { city: 'Jakarta Utara', province: 'DKI Jakarta' },
  'tanjung priok': { city: 'Tanjung Priok', province: 'DKI Jakarta' },
  'koja': { city: 'Koja', province: 'DKI Jakarta' },
  'cilincing': { city: 'Cilincing', province: 'DKI Jakarta' },
  'pademangan': { city: 'Pademangan', province: 'DKI Jakarta' },
  'penjaringan': { city: 'Penjaringan', province: 'DKI Jakarta' },
  'pluit': { city: 'Pluit', province: 'DKI Jakarta' },
  'ancol': { city: 'Ancol', province: 'DKI Jakarta' },
  'sunter': { city: 'Sunter', province: 'DKI Jakarta' },
  'marunda': { city: 'Marunda', province: 'DKI Jakarta' },
  'muara karang': { city: 'Muara Karang', province: 'DKI Jakarta' },
  'muara angke': { city: 'Muara Angke', province: 'DKI Jakarta' },
  'pik': { city: 'PIK', province: 'DKI Jakarta' },
  'pantai indah kapuk': { city: 'Pantai Indah Kapuk', province: 'DKI Jakarta' },
  'kelapa gading': { city: 'Kelapa Gading', province: 'DKI Jakarta' },

  'kepulauan seribu': { city: 'Kepulauan Seribu', province: 'DKI Jakarta' },
  'cibubur': { city: 'Cibubur', province: 'DKI Jakarta' },

  // ==================== JAWA BARAT ====================
  'bandung': { city: 'Bandung', province: 'Jawa Barat' },
  'kota bandung': { city: 'Bandung', province: 'Jawa Barat' },
  'bandung barat': { city: 'Bandung Barat', province: 'Jawa Barat' },
  'cimahi': { city: 'Cimahi', province: 'Jawa Barat' },
  'bekasi': { city: 'Bekasi', province: 'Jawa Barat' },
  'kota bekasi': { city: 'Bekasi', province: 'Jawa Barat' },
  'bekasea': { city: 'Bekasi', province: 'Jawa Barat' },
  'cikarang': { city: 'Cikarang', province: 'Jawa Barat' },
  'bogor': { city: 'Bogor', province: 'Jawa Barat' },
  'kota bogor': { city: 'Bogor', province: 'Jawa Barat' },
  'cibinong': { city: 'Cibinong', province: 'Jawa Barat' },
  'sentul': { city: 'Sentul', province: 'Jawa Barat' },
  'cileungsi': { city: 'Cileungsi', province: 'Jawa Barat' },
  'depok': { city: 'Depok', province: 'Jawa Barat' },
  'margonda': { city: 'Margonda', province: 'Jawa Barat' },
  'sukabumi': { city: 'Sukabumi', province: 'Jawa Barat' },
  'cianjur': { city: 'Cianjur', province: 'Jawa Barat' },
  'karawang': { city: 'Karawang', province: 'Jawa Barat' },
  'purwakarta': { city: 'Purwakarta', province: 'Jawa Barat' },
  'subang': { city: 'Subang', province: 'Jawa Barat' },
  'indramayu': { city: 'Indramayu', province: 'Jawa Barat' },
  'cirebon': { city: 'Cirebon', province: 'Jawa Barat' },
  'majalengka': { city: 'Majalengka', province: 'Jawa Barat' },
  'sumedang': { city: 'Sumedang', province: 'Jawa Barat' },
  'jatinangor': { city: 'Jatinangor', province: 'Jawa Barat' },
  'kuningan': { city: 'Kuningan', province: 'Jawa Barat' },
  'garut': { city: 'Garut', province: 'Jawa Barat' },
  'tasikmalaya': { city: 'Tasikmalaya', province: 'Jawa Barat' },
  'ciamis': { city: 'Ciamis', province: 'Jawa Barat' },
  'banjar': { city: 'Banjar', province: 'Jawa Barat' },
  'pangandaran': { city: 'Pangandaran', province: 'Jawa Barat' },
  'dago': { city: 'Dago', province: 'Jawa Barat' },
  'lembang': { city: 'Lembang', province: 'Jawa Barat' },
  'cibubur': { city: 'Cibubur', province: 'DKI Jakarta' },

  // ==================== BANTEN ====================
  'tangerang': { city: 'Tangerang', province: 'Banten' },
  'kota tangerang': { city: 'Tangerang', province: 'Banten' },
  'tangerang selatan': { city: 'Tangerang Selatan', province: 'Banten' },
  'tangsel': { city: 'Tangerang Selatan', province: 'Banten' },
  'bsd': { city: 'BSD', province: 'Banten' },
  'bsd city': { city: 'BSD City', province: 'Banten' },
  'bintaro': { city: 'Bintaro', province: 'Banten' },
  'serpong': { city: 'Serpong', province: 'Banten' },
  'gading serpong': { city: 'Gading Serpong', province: 'Banten' },
  'ciputat': { city: 'Ciputat', province: 'Banten' },
  'pamulang': { city: 'Pamulang', province: 'Banten' },
  'alam sutera': { city: 'Alam Sutera', province: 'Banten' },
  'karawaci': { city: 'Karawaci', province: 'Banten' },
  'lippo karawaci': { city: 'Lippo Karawaci', province: 'Banten' },
  'serang': { city: 'Serang', province: 'Banten' },
  'cilegon': { city: 'Cilegon', province: 'Banten' },
  'pandeglang': { city: 'Pandeglang', province: 'Banten' },
  'lebak': { city: 'Lebak', province: 'Banten' },
  'rangkasbitung': { city: 'Rangkasbitung', province: 'Banten' },

  // ==================== JAWA TENGAH ====================
  'semarang': { city: 'Semarang', province: 'Jawa Tengah' },
  'surakarta': { city: 'Surakarta', province: 'Jawa Tengah' },
  'solo': { city: 'Solo', province: 'Jawa Tengah' },
  'salatiga': { city: 'Salatiga', province: 'Jawa Tengah' },
  'magelang': { city: 'Magelang', province: 'Jawa Tengah' },
  'pekalongan': { city: 'Pekalongan', province: 'Jawa Tengah' },
  'tegal': { city: 'Tegal', province: 'Jawa Tengah' },
  'slawi': { city: 'Slawi', province: 'Jawa Tengah' },
  'banyumas': { city: 'Banyumas', province: 'Jawa Tengah' },
  'purwokerto': { city: 'Purwokerto', province: 'Jawa Tengah' },
  'cilacap': { city: 'Cilacap', province: 'Jawa Tengah' },
  'purbalingga': { city: 'Purbalingga', province: 'Jawa Tengah' },
  'banjarnegara': { city: 'Banjarnegara', province: 'Jawa Tengah' },
  'kebumen': { city: 'Kebumen', province: 'Jawa Tengah' },
  'purworejo': { city: 'Purworejo', province: 'Jawa Tengah' },
  'wonosobo': { city: 'Wonosobo', province: 'Jawa Tengah' },
  'boyolali': { city: 'Boyolali', province: 'Jawa Tengah' },
  'klaten': { city: 'Klaten', province: 'Jawa Tengah' },
  'sukoharjo': { city: 'Sukoharjo', province: 'Jawa Tengah' },
  'wonogiri': { city: 'Wonogiri', province: 'Jawa Tengah' },
  'karanganyar': { city: 'Karanganyar', province: 'Jawa Tengah' },
  'sragen': { city: 'Sragen', province: 'Jawa Tengah' },
  'grobogan': { city: 'Grobogan', province: 'Jawa Tengah' },
  'purwodadi': { city: 'Purwodadi', province: 'Jawa Tengah' },
  'blora': { city: 'Blora', province: 'Jawa Tengah' },
  'cepu': { city: 'Cepu', province: 'Jawa Tengah' },
  'rembang': { city: 'Rembang', province: 'Jawa Tengah' },
  'pati': { city: 'Pati', province: 'Jawa Tengah' },
  'kudus': { city: 'Kudus', province: 'Jawa Tengah' },
  'jepara': { city: 'Jepara', province: 'Jawa Tengah' },
  'demak': { city: 'Demak', province: 'Jawa Tengah' },
  'kendal': { city: 'Kendal', province: 'Jawa Tengah' },
  'batang': { city: 'Batang', province: 'Jawa Tengah' },
  'pemalang': { city: 'Pemalang', province: 'Jawa Tengah' },
  'brebes': { city: 'Brebes', province: 'Jawa Tengah' },
  'bumiayu': { city: 'Bumiayu', province: 'Jawa Tengah' },
  'temanggung': { city: 'Temanggung', province: 'Jawa Tengah' },

  // ==================== DI YOGYAKARTA ====================
  'sleman': { city: 'Sleman', province: 'DI Yogyakarta' },
  'bantul': { city: 'Bantul', province: 'DI Yogyakarta' },
  'kulon progo': { city: 'Kulon Progo', province: 'DI Yogyakarta' },
  'gunungkidul': { city: 'Gunungkidul', province: 'DI Yogyakarta' },
  'gunung kidul': { city: 'Gunungkidul', province: 'DI Yogyakarta' },
  'wonosari': { city: 'Wonosari', province: 'DI Yogyakarta' },
  'wates': { city: 'Wates', province: 'DI Yogyakarta' },

  // ==================== JAWA TIMUR ====================
  'surabaya': { city: 'Surabaya', province: 'Jawa Timur' },
  'malang': { city: 'Malang', province: 'Jawa Timur' },
  'batu': { city: 'Batu', province: 'Jawa Timur' },
  'sidoarjo': { city: 'Sidoarjo', province: 'Jawa Timur' },
  'gresik': { city: 'Gresik', province: 'Jawa Timur' },
  'mojokerto': { city: 'Mojokerto', province: 'Jawa Timur' },
  'pasuruan': { city: 'Pasuruan', province: 'Jawa Timur' },
  'probolinggo': { city: 'Probolinggo', province: 'Jawa Timur' },
  'madiun': { city: 'Madiun', province: 'Jawa Timur' },
  'kediri': { city: 'Kediri', province: 'Jawa Timur' },
  'blitar': { city: 'Blitar', province: 'Jawa Timur' },
  'jombang': { city: 'Jombang', province: 'Jawa Timur' },
  'nganjuk': { city: 'Nganjuk', province: 'Jawa Timur' },
  'lamongan': { city: 'Lamongan', province: 'Jawa Timur' },
  'bojonegoro': { city: 'Bojonegoro', province: 'Jawa Timur' },
  'tuban': { city: 'Tuban', province: 'Jawa Timur' },
  'banyuwangi': { city: 'Banyuwangi', province: 'Jawa Timur' },
  'jember': { city: 'Jember', province: 'Jawa Timur' },
  'bondowoso': { city: 'Bondowoso', province: 'Jawa Timur' },
  'situbondo': { city: 'Situbondo', province: 'Jawa Timur' },
  'lumajang': { city: 'Lumajang', province: 'Jawa Timur' },
  'pacitan': { city: 'Pacitan', province: 'Jawa Timur' },
  'ponorogo': { city: 'Ponorogo', province: 'Jawa Timur' },
  'trenggalek': { city: 'Trenggalek', province: 'Jawa Timur' },
  'tulungagung': { city: 'Tulungagung', province: 'Jawa Timur' },
  'magetan': { city: 'Magetan', province: 'Jawa Timur' },
  'ngawi': { city: 'Ngawi', province: 'Jawa Timur' },
  'bangkalan': { city: 'Bangkalan', province: 'Jawa Timur' },
  'sampang': { city: 'Sampang', province: 'Jawa Timur' },
  'pamekasan': { city: 'Pamekasan', province: 'Jawa Timur' },
  'sumenep': { city: 'Sumenep', province: 'Jawa Timur' },
  'madura': { city: 'Madura', province: 'Jawa Timur' },

  // ==================== BALI & NUSA TENGGARA ====================
  'denpasar': { city: 'Denpasar', province: 'Bali' },
  'badung': { city: 'Badung', province: 'Bali' },
  'kuta': { city: 'Kuta', province: 'Bali' },
  'seminyak': { city: 'Seminyak', province: 'Bali' },
  'canggu': { city: 'Canggu', province: 'Bali' },
  'gianyar': { city: 'Gianyar', province: 'Bali' },
  'ubud': { city: 'Ubud', province: 'Bali' },
  'tabanan': { city: 'Tabanan', province: 'Bali' },
  'buleleng': { city: 'Buleleng', province: 'Bali' },
  'singaraja': { city: 'Singaraja', province: 'Bali' },
  'klungkung': { city: 'Klungkung', province: 'Bali' },
  'karangasem': { city: 'Karangasem', province: 'Bali' },
  'bangli': { city: 'Bangli', province: 'Bali' },
  'jembrana': { city: 'Jembrana', province: 'Bali' },
  'mataram': { city: 'Mataram', province: 'Nusa Tenggara Barat' },
  'lombok': { city: 'Lombok', province: 'Nusa Tenggara Barat' },
  'lombok barat': { city: 'Lombok Barat', province: 'Nusa Tenggara Barat' },
  'lombok tengah': { city: 'Lombok Tengah', province: 'Nusa Tenggara Barat' },
  'lombok timur': { city: 'Lombok Timur', province: 'Nusa Tenggara Barat' },
  'lombok utara': { city: 'Lombok Utara', province: 'Nusa Tenggara Barat' },
  'bima': { city: 'Bima', province: 'Nusa Tenggara Barat' },
  'sumbawa': { city: 'Sumbawa', province: 'Nusa Tenggara Barat' },
  'sumbawa barat': { city: 'Sumbawa Barat', province: 'Nusa Tenggara Barat' },
  'dompu': { city: 'Dompu', province: 'Nusa Tenggara Barat' },
  'kupang': { city: 'Kupang', province: 'Nusa Tenggara Timur' },
  'labuan bajo': { city: 'Labuan Bajo', province: 'Nusa Tenggara Timur' },
  'manggarai barat': { city: 'Manggarai Barat', province: 'Nusa Tenggara Timur' },
  'manggarai': { city: 'Manggarai', province: 'Nusa Tenggara Timur' },
  'ende': { city: 'Ende', province: 'Nusa Tenggara Timur' },
  'sikka': { city: 'Sikka', province: 'Nusa Tenggara Timur' },
  'maumere': { city: 'Maumere', province: 'Nusa Tenggara Timur' },
  'alor': { city: 'Alor', province: 'Nusa Tenggara Timur' },
  'sumba': { city: 'Sumba', province: 'Nusa Tenggara Timur' },
  'sumba timur': { city: 'Sumba Timur', province: 'Nusa Tenggara Timur' },
  'sumba barat': { city: 'Sumba Barat', province: 'Nusa Tenggara Timur' },
  'timor tengah selatan': { city: 'Timor Tengah Selatan', province: 'Nusa Tenggara Timur' },
  'timor tengah utara': { city: 'Timor Tengah Utara', province: 'Nusa Tenggara Timur' },
  'belu': { city: 'Belu', province: 'Nusa Tenggara Timur' },
  'atambua': { city: 'Atambua', province: 'Nusa Tenggara Timur' },
  'rote ndao': { city: 'Rote Ndao', province: 'Nusa Tenggara Timur' },

  // ==================== SUMATERA ====================
  'medan': { city: 'Medan', province: 'Sumatera Utara' },
  'binjai': { city: 'Binjai', province: 'Sumatera Utara' },
  'tebing tinggi': { city: 'Tebing Tinggi', province: 'Sumatera Utara' },
  'pematangsiantar': { city: 'Pematangsiantar', province: 'Sumatera Utara' },
  'siantar': { city: 'Pematangsiantar', province: 'Sumatera Utara' },
  'tanjungbalai': { city: 'Tanjungbalai', province: 'Sumatera Utara' },
  'sibolga': { city: 'Sibolga', province: 'Sumatera Utara' },
  'padangsidimpuan': { city: 'Padangsidimpuan', province: 'Sumatera Utara' },
  'gunungsitoli': { city: 'Gunungsitoli', province: 'Sumatera Utara' },
  'deli serdang': { city: 'Deli Serdang', province: 'Sumatera Utara' },
  'serdang bedagai': { city: 'Serdang Bedagai', province: 'Sumatera Utara' },
  'karo': { city: 'Karo', province: 'Sumatera Utara' },
  'berastagi': { city: 'Berastagi', province: 'Sumatera Utara' },
  'simalungun': { city: 'Simalungun', province: 'Sumatera Utara' },
  'asahan': { city: 'Asahan', province: 'Sumatera Utara' },
  'kisaran': { city: 'Kisaran', province: 'Sumatera Utara' },
  'batubara': { city: 'Batubara', province: 'Sumatera Utara' },
  'labuhanbatu': { city: 'Labuhanbatu', province: 'Sumatera Utara' },
  'toba': { city: 'Toba', province: 'Sumatera Utara' },
  'samosir': { city: 'Samosir', province: 'Sumatera Utara' },
  'tapanuli utara': { city: 'Tapanuli Utara', province: 'Sumatera Utara' },
  'tapanuli tengah': { city: 'Tapanuli Tengah', province: 'Sumatera Utara' },
  'tapanuli selatan': { city: 'Tapanuli Selatan', province: 'Sumatera Utara' },
  'mandailing natal': { city: 'Mandailing Natal', province: 'Sumatera Utara' },
  'madina': { city: 'Mandailing Natal', province: 'Sumatera Utara' },
  'dairi': { city: 'Dairi', province: 'Sumatera Utara' },
  'langkat': { city: 'Langkat', province: 'Sumatera Utara' },
  'nias': { city: 'Nias', province: 'Sumatera Utara' },

  'padang': { city: 'Padang', province: 'Sumatera Barat' },
  'bukittinggi': { city: 'Bukittinggi', province: 'Sumatera Barat' },
  'payakumbuh': { city: 'Payakumbuh', province: 'Sumatera Barat' },
  'pariaman': { city: 'Pariaman', province: 'Sumatera Barat' },
  'solok': { city: 'Solok', province: 'Sumatera Barat' },
  'sawahlunto': { city: 'Sawahlunto', province: 'Sumatera Barat' },
  'padang panjang': { city: 'Padang Panjang', province: 'Sumatera Barat' },
  'agam': { city: 'Agam', province: 'Sumatera Barat' },
  'tanah datar': { city: 'Tanah Datar', province: 'Sumatera Barat' },
  'pasaman': { city: 'Pasaman', province: 'Sumatera Barat' },
  'pasaman barat': { city: 'Pasaman Barat', province: 'Sumatera Barat' },
  'pesisir selatan': { city: 'Pesisir Selatan', province: 'Sumatera Barat' },
  'mentawai': { city: 'Kepulauan Mentawai', province: 'Sumatera Barat' },

  'pekanbaru': { city: 'Pekanbaru', province: 'Riau' },
  'dumai': { city: 'Dumai', province: 'Riau' },
  'duri': { city: 'Duri', province: 'Riau' },
  'kampar': { city: 'Kampar', province: 'Riau' },
  'siak': { city: 'Siak', province: 'Riau' },
  'bengkalis': { city: 'Bengkalis', province: 'Riau' },
  'indragiri hulu': { city: 'Indragiri Hulu', province: 'Riau' },
  'indragiri hilir': { city: 'Indragiri Hilir', province: 'Riau' },
  'pelalawan': { city: 'Pelalawan', province: 'Riau' },
  'rokan hulu': { city: 'Rokan Hulu', province: 'Riau' },
  'rokan hilir': { city: 'Rokan Hilir', province: 'Riau' },
  'kuantan singingi': { city: 'Kuantan Singingi', province: 'Riau' },

  'batam': { city: 'Batam', province: 'Kepulauan Riau' },
  'tanjungpinang': { city: 'Tanjungpinang', province: 'Kepulauan Riau' },
  'bintan': { city: 'Bintan', province: 'Kepulauan Riau' },
  'karimun': { city: 'Karimun', province: 'Kepulauan Riau' },
  'natuna': { city: 'Natuna', province: 'Kepulauan Riau' },
  'anambas': { city: 'Kepulauan Anambas', province: 'Kepulauan Riau' },
  'lingga': { city: 'Lingga', province: 'Kepulauan Riau' },

  'palembang': { city: 'Palembang', province: 'Sumatera Selatan' },
  'prabumulih': { city: 'Prabumulih', province: 'Sumatera Selatan' },
  'pagar alam': { city: 'Pagar Alam', province: 'Sumatera Selatan' },
  'pagaralam': { city: 'Pagar Alam', province: 'Sumatera Selatan' },
  'lubuklinggau': { city: 'Lubuklinggau', province: 'Sumatera Selatan' },
  'lubuk linggau': { city: 'Lubuklinggau', province: 'Sumatera Selatan' },
  'muara enim': { city: 'Muara Enim', province: 'Sumatera Selatan' },
  'lahat': { city: 'Lahat', province: 'Sumatera Selatan' },
  'banyuasin': { city: 'Banyuasin', province: 'Sumatera Selatan' },
  'ogan ilir': { city: 'Ogan Ilir', province: 'Sumatera Selatan' },
  'ogan komering ilir': { city: 'Ogan Komering Ilir', province: 'Sumatera Selatan' },
  'oki': { city: 'Ogan Komering Ilir', province: 'Sumatera Selatan' },
  'oku': { city: 'Ogan Komering Ulu', province: 'Sumatera Selatan' },
  'musi banyuasin': { city: 'Musi Banyuasin', province: 'Sumatera Selatan' },
  'musi rawas': { city: 'Musi Rawas', province: 'Sumatera Selatan' },
  'empat lawang': { city: 'Empat Lawang', province: 'Sumatera Selatan' },

  'bandar lampung': { city: 'Bandar Lampung', province: 'Lampung' },
  'metro': { city: 'Metro', province: 'Lampung' },
  'lampung selatan': { city: 'Lampung Selatan', province: 'Lampung' },
  'lampung tengah': { city: 'Lampung Tengah', province: 'Lampung' },
  'lampung utara': { city: 'Lampung Utara', province: 'Lampung' },
  'lampung barat': { city: 'Lampung Barat', province: 'Lampung' },
  'lampung timur': { city: 'Lampung Timur', province: 'Lampung' },
  'tanggamus': { city: 'Tanggamus', province: 'Lampung' },
  'pringsewu': { city: 'Pringsewu', province: 'Lampung' },
  'tulang bawang': { city: 'Tulang Bawang', province: 'Lampung' },
  'pesawaran': { city: 'Pesawaran', province: 'Lampung' },

  'kepulauan bangka belitung': { city: 'Bangka Belitung', province: 'Kepulauan Bangka Belitung' },
  'bangka belitung': { city: 'Bangka Belitung', province: 'Kepulauan Bangka Belitung' },
  'pangkalpinang': { city: 'Pangkalpinang', province: 'Kepulauan Bangka Belitung' },
  'bangka': { city: 'Bangka', province: 'Kepulauan Bangka Belitung' },
  'belitung': { city: 'Belitung', province: 'Kepulauan Bangka Belitung' },

  'banda aceh': { city: 'Banda Aceh', province: 'Aceh' },
  'sabang': { city: 'Sabang', province: 'Aceh' },
  'lhokseumawe': { city: 'Lhokseumawe', province: 'Aceh' },
  'langsa': { city: 'Langsa', province: 'Aceh' },
  'subulussalam': { city: 'Subulussalam', province: 'Aceh' },
  'aceh besar': { city: 'Aceh Besar', province: 'Aceh' },
  'pidie': { city: 'Pidie', province: 'Aceh' },
  'bireuen': { city: 'Bireuen', province: 'Aceh' },
  'aceh utara': { city: 'Aceh Utara', province: 'Aceh' },
  'aceh timur': { city: 'Aceh Timur', province: 'Aceh' },
  'aceh barat': { city: 'Aceh Barat', province: 'Aceh' },
  'aceh selatan': { city: 'Aceh Selatan', province: 'Aceh' },
  'aceh tengah': { city: 'Aceh Tengah', province: 'Aceh' },
  'takengon': { city: 'Takengon', province: 'Aceh' },

  'bengkulu': { city: 'Kota Bengkulu', province: 'Bengkulu' },
  'kota bengkulu': { city: 'Kota Bengkulu', province: 'Bengkulu' },
  'rejang lebong': { city: 'Rejang Lebong', province: 'Bengkulu' },
  'curup': { city: 'Curup', province: 'Bengkulu' },
  'mukomuko': { city: 'Mukomuko', province: 'Bengkulu' },
  'bengkulu utara': { city: 'Bengkulu Utara', province: 'Bengkulu' },
  'bengkulu selatan': { city: 'Bengkulu Selatan', province: 'Bengkulu' },

  'jambi': { city: 'Kota Jambi', province: 'Jambi' },
  'kota jambi': { city: 'Kota Jambi', province: 'Jambi' },
  'sungai penuh': { city: 'Sungai Penuh', province: 'Jambi' },
  'muaro jambi': { city: 'Muaro Jambi', province: 'Jambi' },
  'bungo': { city: 'Bungo', province: 'Jambi' },
  'merangin': { city: 'Merangin', province: 'Jambi' },
  'kerinci': { city: 'Kerinci', province: 'Jambi' },
  'batanghari': { city: 'Batanghari', province: 'Jambi' },
  'tanjung jabung barat': { city: 'Tanjung Jabung Barat', province: 'Jambi' },

  // ==================== KALIMANTAN ====================
  'pontianak': { city: 'Pontianak', province: 'Kalimantan Barat' },
  'singkawang': { city: 'Singkawang', province: 'Kalimantan Barat' },
  'sambas': { city: 'Sambas', province: 'Kalimantan Barat' },
  'ketapang': { city: 'Ketapang', province: 'Kalimantan Barat' },
  'sintang': { city: 'Sintang', province: 'Kalimantan Barat' },
  'sanggau': { city: 'Sanggau', province: 'Kalimantan Barat' },
  'kubu raya': { city: 'Kubu Raya', province: 'Kalimantan Barat' },

  'palangka raya': { city: 'Palangka Raya', province: 'Kalimantan Tengah' },
  'palangkaraya': { city: 'Palangka Raya', province: 'Kalimantan Tengah' },
  'sampit': { city: 'Sampit', province: 'Kalimantan Tengah' },
  'kotawaringin timur': { city: 'Kotawaringin Timur', province: 'Kalimantan Tengah' },
  'pangkalan bun': { city: 'Pangkalan Bun', province: 'Kalimantan Tengah' },
  'kotawaringin barat': { city: 'Kotawaringin Barat', province: 'Kalimantan Tengah' },
  'kapuas': { city: 'Kapuas', province: 'Kalimantan Tengah' },
  'barito selatan': { city: 'Barito Selatan', province: 'Kalimantan Tengah' },
  'barito utara': { city: 'Barito Utara', province: 'Kalimantan Tengah' },

  'banjarmasin': { city: 'Banjarmasin', province: 'Kalimantan Selatan' },
  'banjarbaru': { city: 'Banjarbaru', province: 'Kalimantan Selatan' },
  'banjar': { city: 'Banjar', province: 'Kalimantan Selatan' },
  'martapura': { city: 'Martapura', province: 'Kalimantan Selatan' },
  'tanah laut': { city: 'Tanah Laut', province: 'Kalimantan Selatan' },
  'pelaihari': { city: 'Pelaihari', province: 'Kalimantan Selatan' },
  'kotabaru': { city: 'Kotabaru', province: 'Kalimantan Selatan' },
  'tanah bumbu': { city: 'Tanah Bumbu', province: 'Kalimantan Selatan' },
  'batulicin': { city: 'Batulicin', province: 'Kalimantan Selatan' },
  'tabalong': { city: 'Tabalong', province: 'Kalimantan Selatan' },

  'samarinda': { city: 'Samarinda', province: 'Kalimantan Timur' },
  'balikpapan': { city: 'Balikpapan', province: 'Kalimantan Timur' },
  'bontang': { city: 'Bontang', province: 'Kalimantan Timur' },
  'kutai kartanegara': { city: 'Kutai Kartanegara', province: 'Kalimantan Timur' },
  'kukar': { city: 'Kutai Kartanegara', province: 'Kalimantan Timur' },
  'tenggarong': { city: 'Tenggarong', province: 'Kalimantan Timur' },
  'kutai timur': { city: 'Kutai Timur', province: 'Kalimantan Timur' },
  'sangatta': { city: 'Sangatta', province: 'Kalimantan Timur' },
  'berau': { city: 'Berau', province: 'Kalimantan Timur' },
  'penajam paser utara': { city: 'Penajam Paser Utara', province: 'Kalimantan Timur' },
  'penajam': { city: 'Penajam', province: 'Kalimantan Timur' },
  'ppu': { city: 'Penajam Paser Utara', province: 'Kalimantan Timur' },
  'ikn': { city: 'Nusantara', province: 'Kalimantan Timur' },
  'nusantara': { city: 'Nusantara', province: 'Kalimantan Timur' },
  'paser': { city: 'Paser', province: 'Kalimantan Timur' },
  'kutai barat': { city: 'Kutai Barat', province: 'Kalimantan Timur' },

  'tarakan': { city: 'Tarakan', province: 'Kalimantan Utara' },
  'bulungan': { city: 'Bulungan', province: 'Kalimantan Utara' },
  'tanjung selor': { city: 'Tanjung Selor', province: 'Kalimantan Utara' },
  'nunukan': { city: 'Nunukan', province: 'Kalimantan Utara' },
  'malinau': { city: 'Malinau', province: 'Kalimantan Utara' },

  // ==================== SULAWESI ====================
  'makassar': { city: 'Makassar', province: 'Sulawesi Selatan' },
  'ujung pandang': { city: 'Makassar', province: 'Sulawesi Selatan' },
  'gowa': { city: 'Gowa', province: 'Sulawesi Selatan' },
  'maros': { city: 'Maros', province: 'Sulawesi Selatan' },
  'bone': { city: 'Bone', province: 'Sulawesi Selatan' },
  'wajo': { city: 'Wajo', province: 'Sulawesi Selatan' },
  'sengkang': { city: 'Sengkang', province: 'Sulawesi Selatan' },
  'soppeng': { city: 'Soppeng', province: 'Sulawesi Selatan' },
  'sidenreng rappang': { city: 'Sidenreng Rappang', province: 'Sulawesi Selatan' },
  'sidrap': { city: 'Sidrap', province: 'Sulawesi Selatan' },
  'pinrang': { city: 'Pinrang', province: 'Sulawesi Selatan' },
  'parepare': { city: 'Parepare', province: 'Sulawesi Selatan' },
  'pare pare': { city: 'Parepare', province: 'Sulawesi Selatan' },
  'palopo': { city: 'Palopo', province: 'Sulawesi Selatan' },
  'toraja': { city: 'Tana Toraja', province: 'Sulawesi Selatan' },
  'tana toraja': { city: 'Tana Toraja', province: 'Sulawesi Selatan' },
  'toraja utara': { city: 'Toraja Utara', province: 'Sulawesi Selatan' },
  'rantepao': { city: 'Rantepao', province: 'Sulawesi Selatan' },
  'bulukumba': { city: 'Bulukumba', province: 'Sulawesi Selatan' },
  'bantaeng': { city: 'Bantaeng', province: 'Sulawesi Selatan' },
  'jeneponto': { city: 'Jeneponto', province: 'Sulawesi Selatan' },
  'takalar': { city: 'Takalar', province: 'Sulawesi Selatan' },
  'sinjai': { city: 'Sinjai', province: 'Sulawesi Selatan' },
  'pangkep': { city: 'Pangkajene Kepulauan', province: 'Sulawesi Selatan' },
  'barru': { city: 'Barru', province: 'Sulawesi Selatan' },
  'enrekang': { city: 'Enrekang', province: 'Sulawesi Selatan' },
  'luwu': { city: 'Luwu', province: 'Sulawesi Selatan' },
  'luwu utara': { city: 'Luwu Utara', province: 'Sulawesi Selatan' },
  'luwu timur': { city: 'Luwu Timur', province: 'Sulawesi Selatan' },
  'selayar': { city: 'Kepulauan Selayar', province: 'Sulawesi Selatan' },

  'manado': { city: 'Manado', province: 'Sulawesi Utara' },
  'bitung': { city: 'Bitung', province: 'Sulawesi Utara' },
  'tomohon': { city: 'Tomohon', province: 'Sulawesi Utara' },
  'kotamobagu': { city: 'Kotamobagu', province: 'Sulawesi Utara' },
  'minahasa': { city: 'Minahasa', province: 'Sulawesi Utara' },
  'minahasa utara': { city: 'Minahasa Utara', province: 'Sulawesi Utara' },
  'minahasa selatan': { city: 'Minahasa Selatan', province: 'Sulawesi Utara' },
  'bolaang mongondow': { city: 'Bolaang Mongondow', province: 'Sulawesi Utara' },
  'bolmong': { city: 'Bolmong', province: 'Sulawesi Utara' },
  'sangihe': { city: 'Kepulauan Sangihe', province: 'Sulawesi Utara' },
  'talaud': { city: 'Kepulauan Talaud', province: 'Sulawesi Utara' },

  'palu': { city: 'Palu', province: 'Sulawesi Tengah' },
  'poso': { city: 'Poso', province: 'Sulawesi Tengah' },
  'donggala': { city: 'Donggala', province: 'Sulawesi Tengah' },
  'tolitoli': { city: 'Tolitoli', province: 'Sulawesi Tengah' },
  'banggai': { city: 'Banggai', province: 'Sulawesi Tengah' },
  'luwuk': { city: 'Luwuk', province: 'Sulawesi Tengah' },
  'morowali': { city: 'Morowali', province: 'Sulawesi Tengah' },
  'morowali utara': { city: 'Morowali Utara', province: 'Sulawesi Tengah' },
  'parigi moutong': { city: 'Parigi Moutong', province: 'Sulawesi Tengah' },

  'kendari': { city: 'Kendari', province: 'Sulawesi Tenggara' },
  'baubau': { city: 'Baubau', province: 'Sulawesi Tenggara' },
  'bau bau': { city: 'Baubau', province: 'Sulawesi Tenggara' },
  'kolaka': { city: 'Kolaka', province: 'Sulawesi Tenggara' },
  'kolaka utara': { city: 'Kolaka Utara', province: 'Sulawesi Tenggara' },
  'konawe': { city: 'Konawe', province: 'Sulawesi Tenggara' },
  'konawe selatan': { city: 'Konawe Selatan', province: 'Sulawesi Tenggara' },
  'muna': { city: 'Muna', province: 'Sulawesi Tenggara' },
  'raha': { city: 'Raha', province: 'Sulawesi Tenggara' },
  'buton': { city: 'Buton', province: 'Sulawesi Tenggara' },
  'wakatobi': { city: 'Wakatobi', province: 'Sulawesi Tenggara' },
  'bombana': { city: 'Bombana', province: 'Sulawesi Tenggara' },

  'mamuju': { city: 'Mamuju', province: 'Sulawesi Barat' },
  'majene': { city: 'Majene', province: 'Sulawesi Barat' },
  'polewali mandar': { city: 'Polewali Mandar', province: 'Sulawesi Barat' },
  'polman': { city: 'Polman', province: 'Sulawesi Barat' },
  'mamasa': { city: 'Mamasa', province: 'Sulawesi Barat' },
  'pasangkayu': { city: 'Pasangkayu', province: 'Sulawesi Barat' },

  'gorontalo': { city: 'Kota Gorontalo', province: 'Gorontalo' },
  'kota gorontalo': { city: 'Kota Gorontalo', province: 'Gorontalo' },
  'boalemo': { city: 'Boalemo', province: 'Gorontalo' },
  'bone bolango': { city: 'Bone Bolango', province: 'Gorontalo' },
  'pohuwato': { city: 'Pohuwato', province: 'Gorontalo' },

  // ==================== MALUKU & PAPUA ====================
  'ambon': { city: 'Ambon', province: 'Maluku' },
  'tual': { city: 'Tual', province: 'Maluku' },
  'maluku tengah': { city: 'Maluku Tengah', province: 'Maluku' },
  'masohi': { city: 'Masohi', province: 'Maluku' },
  'maluku tenggara': { city: 'Maluku Tenggara', province: 'Maluku' },
  'buru': { city: 'Buru', province: 'Maluku' },
  'seram': { city: 'Seram', province: 'Maluku' },

  'ternate': { city: 'Ternate', province: 'Maluku Utara' },
  'tidore': { city: 'Tidore', province: 'Maluku Utara' },
  'halmahera': { city: 'Halmahera', province: 'Maluku Utara' },
  'halmahera barat': { city: 'Halmahera Barat', province: 'Maluku Utara' },
  'halmahera utara': { city: 'Halmahera Utara', province: 'Maluku Utara' },
  'halmahera selatan': { city: 'Halmahera Selatan', province: 'Maluku Utara' },
  'morotai': { city: 'Morotai', province: 'Maluku Utara' },

  'jayapura': { city: 'Jayapura', province: 'Papua' },
  'biak': { city: 'Biak', province: 'Papua' },
  'serui': { city: 'Serui', province: 'Papua' },

  'sorong': { city: 'Sorong', province: 'Papua Barat Daya' },
  'raja ampat': { city: 'Raja Ampat', province: 'Papua Barat Daya' },

  'manokwari': { city: 'Manokwari', province: 'Papua Barat' },
  'fakfak': { city: 'Fakfak', province: 'Papua Barat' },
  'kaimana': { city: 'Kaimana', province: 'Papua Barat' },
  'bintuni': { city: 'Bintuni', province: 'Papua Barat' },

  'merauke': { city: 'Merauke', province: 'Papua Selatan' },
  'asmat': { city: 'Asmat', province: 'Papua Selatan' },
  'boven digoel': { city: 'Boven Digoel', province: 'Papua Selatan' },

  'timika': { city: 'Timika', province: 'Papua Tengah' },
  'mimika': { city: 'Mimika', province: 'Papua Tengah' },
  'nabire': { city: 'Nabire', province: 'Papua Tengah' },

  'wamena': { city: 'Jayawijaya', province: 'Papua Pegunungan' },
  'jayawijaya': { city: 'Jayawijaya', province: 'Papua Pegunungan' }
};

// 7. Satukan Seluruh Kota & Region (Domestik + Global) ke dalam Satu Indeks
// Berikan format seragam: { city, province, country, flag }
const ALL_CITIES_AND_REGIONS = {};

// Tambahkan Kota/Kabupaten Indonesia
for (const [key, val] of Object.entries(INDONESIA_CITIES)) {
  ALL_CITIES_AND_REGIONS[key] = {
    city: val.city,
    province: val.province,
    country: 'Indonesia',
    flag: '🇮🇩'
  };
}

// Tambahkan Kota Global Metropolitan
for (const [key, val] of Object.entries(GLOBAL_CITIES)) {
  // Hanya tambahkan jika belum ada (atau jika key sama, dahulukan data spesifik)
  if (!ALL_CITIES_AND_REGIONS[key]) {
    ALL_CITIES_AND_REGIONS[key] = {
      city: val.city,
      province: val.region || val.country,
      country: val.country,
      flag: val.flag
    };
  }
}

// Tambahkan Region / Negara Bagian Global
for (const [key, val] of Object.entries(GLOBAL_REGIONS)) {
  if (!ALL_CITIES_AND_REGIONS[key]) {
    ALL_CITIES_AND_REGIONS[key] = {
      city: val.city || val.region,
      province: val.region,
      country: val.country,
      flag: val.flag
    };
  }
}

// Tambahkan Pulau & Kepulauan Besar Indonesia
for (const [key, islandName] of Object.entries(INDONESIA_ISLANDS)) {
  if (!ALL_CITIES_AND_REGIONS[key]) {
    ALL_CITIES_AND_REGIONS[key] = {
      city: islandName.replace(/^(Pulau|Kepulauan|Wilayah)\s+/, ''),
      province: islandName,
      country: 'Indonesia',
      flag: '🇮🇩'
    };
  }
}

// Tambahkan 38 Provinsi Indonesia ke dalam Indeks Terpadu agar longest-match berjalan serempak
for (const [key, provName] of Object.entries(INDONESIA_PROVINCES)) {
  if (!ALL_CITIES_AND_REGIONS[key]) {
    ALL_CITIES_AND_REGIONS[key] = {
      city: provName,
      province: provName,
      country: 'Indonesia',
      flag: '🇮🇩'
    };
  }
}

// Set cepat untuk deteksi Provinsi & Kepulauan Indonesia
const INDONESIA_PROVINCE_NAMES = new Set(Object.values(INDONESIA_PROVINCES));
const INDONESIA_ISLAND_NAMES = new Set(Object.values(INDONESIA_ISLANDS).map(n => n.replace(/^(Pulau|Kepulauan|Wilayah)\s+/, '')));

// Urutkan key dari yang TERPANJANG agar pencocokan spesifik (misal: "Labuan Bajo" 11 huruf)
// selalu diuji SEBELUM kata yang lebih pendek (misal: "Labuan" 6 huruf)
const sortedAllCityKeys = Object.keys(ALL_CITIES_AND_REGIONS).sort((a, b) => b.length - a.length);
const sortedIndoProvKeys = Object.keys(INDONESIA_PROVINCES).sort((a, b) => b.length - a.length);
const sortedGlobalCountryKeys = Object.keys(GLOBAL_COUNTRIES).sort((a, b) => b.length - a.length);

/**
 * Normalisasi dan deteksi lokasi otomatis
 * Mampu membedakan kota/provinsi Indonesia, negara bagian internasional, dan negara global
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

  // 1. Cek anomali murni (fiksi / meme langsung)
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

  // 2. Direct Match Negara Global (jika user HANYA mengetik nama negara, misal: "Indonesia", "Japan", "USA", "Singapore")
  if (GLOBAL_COUNTRIES[clean]) {
    const countryObj = GLOBAL_COUNTRIES[clean];
    return {
      isAnomaly: false,
      city: countryObj.name,
      stateOrProvince: countryObj.name,
      country: countryObj.name,
      flag: countryObj.flag,
      display: `${countryObj.name} ${countryObj.flag}`,
      searchKey: countryObj.name
    };
  }

  let detectedCountry = null;
  let detectedFlag = null;
  let detectedProvince = null;
  let detectedCity = null;

  // 3. Cek Kota & Region (Domestik + Global) berdasarkan Longest Match First
  for (const key of sortedAllCityKeys) {
    const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, 'i');
    if (regex.test(clean)) {
      const match = ALL_CITIES_AND_REGIONS[key];
      detectedCity = match.city;
      detectedProvince = match.province;
      detectedCountry = match.country;
      detectedFlag = match.flag;
      break;
    }
  }

  // 4. Cek Provinsi Indonesia (38 Provinsi: Jawa Barat, Jateng, Jatim, Sulsel, Papua Selatan, dll.)
  if (!detectedCity) {
    for (const key of sortedIndoProvKeys) {
      const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, 'i');
      if (regex.test(clean)) {
        const provName = INDONESIA_PROVINCES[key];
        detectedCity = provName;
        detectedProvince = provName;
        detectedCountry = 'Indonesia';
        detectedFlag = '🇮🇩';
        break;
      }
    }
  }

  // 5. Cek Negara Global dalam kalimat / kombinasi bebas (misal: "Oulu, Finland" atau "Munich, Germany")
  if (!detectedCity) {
    for (const key of sortedGlobalCountryKeys) {
      // Abaikan singkatan sangat pendek yang rawan false-positive jika bukan exact match
      if (key === 'as' || key === 'id' || key === 'me') continue;
      const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, 'i');
      if (regex.test(clean)) {
        const countryInfo = GLOBAL_COUNTRIES[key];
        // Coba ekstrak nama kota dari sisa teks jika ada
        const remaining = clean.replace(regex, '').replace(/\s+/g, ' ').trim();
        if (remaining.length >= 2) {
          const capRemaining = remaining.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          detectedCity = capRemaining;
          detectedProvince = countryInfo.name;
        } else {
          detectedCity = countryInfo.name;
          detectedProvince = countryInfo.name;
        }
        detectedCountry = countryInfo.name;
        detectedFlag = countryInfo.flag;
        break;
      }
    }
  }

  // 6. Fallback jika tidak terdaftar di kamus
  if (!detectedCity) {
    // Cek jika mengandung kata anomali di dalam input yang tidak terdaftar
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
  if (detectedProvince && detectedCity !== detectedProvince && detectedProvince !== 'Lainnya' && detectedProvince !== `Pulau ${detectedCity}` && detectedProvince !== `Kepulauan ${detectedCity}`) {
    displayParts.push(detectedProvince);
  }
  if (detectedCountry && detectedCountry !== 'Indonesia' && detectedCity !== detectedCountry && detectedProvince !== detectedCountry) {
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
  GLOBAL_COUNTRIES,
  GLOBAL_REGIONS,
  GLOBAL_CITIES,
  INDONESIA_PROVINCES,
  INDONESIA_ISLANDS,
  INDONESIA_PROVINCE_NAMES,
  INDONESIA_ISLAND_NAMES,
  INDONESIA_CITIES
};
