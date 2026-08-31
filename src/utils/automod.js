// ══════════════════════════════════════════════════════════════
// AUTO-MODERATION & ANTI-PHISHING SYSTEM
// Deteksi Kata Kurang Pantas, Bypasses, Phishing, Scam MrBeast & Fake QR
// ══════════════════════════════════════════════════════════════

const storage = require('./storage');

// Daftar kata kasar, umpatan daerah, internasional, dan singkatannya (Super Lengkap)
const DEFAULT_BAD_WORDS = [
  // ─── 1. SINGKATAN GAUL & BYPASS INDONESIA (ACRONYMS & LEETSPEAK) ───
  'kntl', 'knttl', 'kntol', 'kontl', 'mmk', 'memk', 'ppk', 'pepk', 'pntk', 'pukmk', 'kmk',
  'anj', 'ajg', 'anjg', 'anjr', 'anjir', 'anying', 'njir', 'anjim', 'njing', 'jing', 'bgst', 'bngst', 'bngsd', 'bjngn',
  'jncok', 'jncuk', 'gblk', 'gblg', 'tlol', 'bgo', 'idt', 'cct', 'ngntt', 'ngntd', 'ngntot', 'ntot', 'tbrt', 'tobrut',
  'cuki', 'ckm', 'ckmy', 'tls', 'tlso', 'sundl', 'sndl', 'sndla', 'bngul', 'bngk', 'kmpng',
  'jmbt', 'prk', 'lont', 'jbly', 'bkp', 'clmk', 'vcs', 'openbo', 'nyoli',

  // ─── 2. SINGKATAN INTERNASIONAL (GLOBAL ACRONYMS) ───
  'fck', 'fkr', 'fuk', 'fckn', 'btc', 'btch', 'mf', 'mofo', 'stfu', 'wtf', 'kys',
  'rtrd', 'bs', 'bstrd', 'dck', 'cnt', 'pssy', 'asshle', 'wanker', 'hdp', 'sb', 'shabi',

  // ─── 3. INDONESIA (ORGAN INTIM, SEKSUAL VULGAR & PORNOGRAFI) ───
  'kontol', 'memek', 'ngentot', 'ngentit', 'ngentud', 'pepek', 'pantek', 'puki', 'pukimak', 'kimak',
  'jembut', 'itil', 'lonte', 'perek', 'pelacur', 'jablay', 'bokep', 'porno', 'colmek', 'ngocok', 'nyoli', 'coli',
  'titit', 'pler', 'peler', 'peli', 'tempik', 'turuk', 'silit', 'tetek', 'toket', 'nenen', 'bool', 'cangcut',
  'kancut', 'kanjut', 'kanyut', 'ngaloco', 'heunceut', 'hencet', 'bujur', 'ngewe', 'ewe', 'ngeweuk',

  // ─── 4. INDONESIA DAERAH (JAWA) ───
  'jancok', 'dancok', 'jancuk', 'dancuk', 'cok', 'cuk', 'asu', 'matamu', 'ndasmu', 'raimu',
  'lambemu', 'cangkemu', 'cocotmu', 'cocote', 'bajindul', 'kirik', 'kirek', 'pekok', 'kopet',
  'ndlogok', 'semprul', 'modar', 'modaro', 'kenthir', 'mbadog', 'bangkek', 'gendeng', 'gendheng',
  'picek', 'picekan', 'sakadung', 'gathel', 'gatel', 'gapleki', 'kopler', 'ndableg', 'nyocot',

  // ─── 5. INDONESIA DAERAH (SUNDA) ───
  'bagong', 'belegug', 'blegug', 'kehed', 'keheng', 'kehen', 'teu hideng', 'jurig', 'sianying',
  'syalantt', 'tangkurak', 'munding', 'gegelan', 'sengklek', 'ngehe', 'lodse', 'borokokok',
  'bondon', 'goblog',

  // ─── 6. INDONESIA DAERAH (SUMATERA: BATAK, MINANG, PALEMBANG, MEDAN, LAMPUNG) ───
  'bodat', 'bujang inam', 'kalera', 'sundal', 'kampang', 'kampank', 'bongak', 'bengak',
  'palak bae', 'cukimay', 'parlente', 'mancik', 'kabau', 'bujangga', 'tenggen', 'teong',
  'burit', 'sangean', 'pantek amak ang',

  // ─── 7. INDONESIA DAERAH (SULAWESI: MAKASSAR, BUGIS, MANADO) ───
  'telaso', 'laso', 'telo', 'sundala', 'panyingkul', 'cukimai', 'fuki', 'tibo', 'paniki',
  'anjing pe kong', 'bapa lante', 'kodi',

  // ─── 8. INDONESIA DAERAH (KALIMANTAN, BALI, MALUKU, PAPUA, NTT) ───
  'bungul', 'tambuk', 'kalir', 'hanta', 'kuyang', 'sangkal', 'bungut', 'cicing', 'celeng',
  'nasibangke', 'leklek', 'bebotoh', 'bangkung', 'suanggi', 'anjing tanah', 'doti-doti',

  // ─── 9. PENGHINAAN UMUM & HATE SPEECH INDONESIA ───
  'anjing', 'babi', 'monyet', 'bangsat', 'bangsad', 'bajingan', 'kampret', 'bacot', 'keparat',
  'pantat', 'tai', 'taik', 'taee', 'telek', 'bejad', 'kunyuk', 'goblok', 'tolol', 'bego',
  'idiot', 'cacat', 'longor', 'bolot', 'plongo', 'budeg', 'kontet', 'gelay', 'mampus', 'mampuz',

  // ─── 10. INTERNASIONAL: INGGRIS (ENGLISH VULGAR & HARASSMENT) ───
  'fuck', 'fucking', 'fucker', 'motherfucker', 'bitch', 'bitches', 'asshole', 'dick', 'pussy',
  'cunt', 'whore', 'slut', 'nigger', 'nigga', 'bastard', 'dumbass', 'dipshit', 'jackass',
  'retard', 'retarded', 'cocksucker', 'blowjob', 'handjob', 'twat', 'prick', 'tosser',
  'shit', 'bullshit', 'damn', 'kys', 'kill yourself', 'douchebag', 'scumbag', 'cock',

  // ─── 11. INTERNASIONAL: ASIA (KOREA & JEPANG SLANG) ───
  'shibal', 'ssibal', 'sibal', 'saekki', 'saekkiya', 'sekki', 'sekkiya', 'gae saekki', 'gaesekki',
  'byungshin', 'jiral', 'michin', 'michinnom', 'michinnyeon', 'go chu', 'ssibalkoma',
  'baka', 'aho', 'yarou', 'konoyaro', 'kisama', 'chikushou', 'kusotare', 'kuso', 'temee', 'hentai',

  // ─── 12. INTERNASIONAL: SPANYOL, RUSIA, TAGALOG, ARAB & MANDARIN ───
  'puta', 'puto', 'mierda', 'pendejo', 'pendeja', 'cabron', 'coño', 'verga', 'maricon', 'culiao', 'chupa',
  'suka', 'blyat', 'cyka', 'nahui', 'pizdetz', 'debil', 'mudak',
  'putangina', 'tangina', 'gago', 'tarantado', 'ulol', 'leche',
  'sharmouta', 'kuss emmak', 'hayawan', 'kalb', 'khara', 'conima',
  'caonima', 'chao ni ma', 'wangba dan', 'hundan', 'tamade'
];

// Kata-kata resmi / aman yang mirip agar tidak salah dideteksi (Innocent Words)
const INNOCENT_WORDS = [
  'kontrol', 'kontrak', 'konten', 'kontak', 'kantor', 'kental', 'kancing',
  'bantal', 'banteng', 'memantau', 'mementingkan', 'membeli', 'meminta', 'memang',
  'pohon', 'kucing', 'kelinci', 'teman', 'nanti', 'bisa', 'pasti', 'bintang',
  'kabar', 'sabang', 'pasar', 'kapal', 'tidur', 'makar', 'siapa', 'kemarin',
  'kamu', 'kami', 'mereka', 'makan', 'minum', 'jalan', 'bukan', 'sudah', 'sedang'
];

// Domain resmi Discord, Steam, YouTube, Google (Whitelisted)
const OFFICIAL_DOMAINS = [
  'discord.com',
  'discord.gg',
  'discord.media',
  'discordapp.com',
  'discordstatus.com',
  'discord.me',
  'discord.io',
  'discordapp.net',
  'discordcdn.com',
  'steampowered.com',
  'steamcommunity.com',
  'spotify.com',
  'youtube.com',
  'youtu.be',
  'github.com',
  'google.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'tiktok.com'
];

// Domain IP logger / Grabber / Phishing yang sudah dikenal
const KNOWN_MALICIOUS_DOMAINS = [
  'grabify.link',
  'iplogger.org',
  '2no.co',
  'yip.su',
  'blasze.tk',
  'link-discord.ru',
  'steamcommunity-nitro.com',
  'steam-nitro.ru',
  'free-nitro.site',
  'disord-nitro.gift',
  'dlscord.app',
  'discord-gift.me',
  'discord-free.ru',
  'nitro-discord.app',
  'discord-airdrop.com',
  'mrbeast-promo.com',
  'mrbeast-gift.xyz',
  'beastgiveaway.net',
  'claim-mrbeast.org',
  'mrbeastdrop.com',
  'free-robux.site'
];

/**
 * Menghitung Damerau-Levenshtein Distance (Mendukung Insert, Delete, Substitute & Transposisi/Huruf Tertukar)
 */
function getLevenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const d = [];
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // Deletion
        d[i][j - 1] + 1,       // Insertion
        d[i - 1][j - 1] + cost // Substitution
      );

      // Transposition check (huruf tertukar, misal: bicth -> bitch)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Normalisasi teks: Hapus leetspeak, simbol pemisah, dan karakter berulang
 */
function normalizeText(text) {
  if (!text) return '';

  return text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/([a-z])\1{2,}/g, '$1$1');
}

/**
 * Deteksi apakah teks mengandung kata yang tidak pantas (Exact Match & Fuzzy Similarity)
 */
function checkBadWords(content, customBadWords = [], whitelistedWords = []) {
  if (!content) return { found: false, word: null, isFuzzy: false };

  const rawLower = content.toLowerCase();
  const normalized = normalizeText(content);
  const wordsInRaw = rawLower.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(Boolean);
  const wordsInNormalized = normalized.split(/\s+/).filter(Boolean);

  const allWhitelisted = [...whitelistedWords, ...INNOCENT_WORDS];

  const combinedBadWords = [...DEFAULT_BAD_WORDS, ...customBadWords]
    .map(w => w.toLowerCase().trim())
    .filter(w => w && !allWhitelisted.includes(w));

  // 1. TAHAP PERTAMA: EXACT & SUBSTRING MATCHING
  for (const badWord of combinedBadWords) {
    if (badWord.length <= 4) {
      if (wordsInRaw.includes(badWord) || wordsInNormalized.includes(badWord)) {
        return { found: true, word: badWord, isFuzzy: false };
      }
      continue;
    }

    if (wordsInRaw.includes(badWord) || wordsInNormalized.includes(badWord)) {
      return { found: true, word: badWord, isFuzzy: false };
    }

    const regex = new RegExp(`\\b${badWord}\\b`, 'i');
    if (regex.test(rawLower) || regex.test(normalized) || normalized.includes(badWord)) {
      return { found: true, word: badWord, isFuzzy: false };
    }
  }

  // 2. TAHAP KEDUA: FUZZY SIMILARITY MATCHING (Deteksi Typo & Disguised Bad Words)
  const candidateWords = Array.from(new Set([...wordsInRaw, ...wordsInNormalized]))
    .filter(w => w.length >= 4 && !allWhitelisted.includes(w));

  for (const userWord of candidateWords) {
    for (const badWord of combinedBadWords) {
      if (badWord.length < 4) continue;
      if (Math.abs(userWord.length - badWord.length) > 2) continue;

      const dist = getLevenshteinDistance(userWord, badWord);
      const maxLen = Math.max(userWord.length, badWord.length);
      const similarity = 1 - (dist / maxLen);

      if (
        (maxLen <= 5 && dist === 1 && similarity >= 0.80) ||
        (maxLen >= 6 && dist <= 2 && similarity >= 0.75)
      ) {
        return { found: true, word: `${userWord} (mirip: ${badWord})`, isFuzzy: true };
      }
    }
  }

  return { found: false, word: null, isFuzzy: false };
}

/**
 * Deteksi apakah pesan/gambar mengandung link phishing, scam MrBeast, atau jebakan QR Code Login
 */
function checkPhishing(messageOrContent) {
  let content = '';
  let attachments = [];
  let embeds = [];

  if (typeof messageOrContent === 'string') {
    content = messageOrContent;
  } else if (messageOrContent && typeof messageOrContent === 'object') {
    content = messageOrContent.content || '';
    if (messageOrContent.attachments) {
      attachments = Array.from(messageOrContent.attachments.values());
    }
    if (messageOrContent.embeds) {
      embeds = messageOrContent.embeds;
    }
  }

  const rawLower = content.toLowerCase();
  const normalized = normalizeText(content);

  // 1. CEK URL & DOMAIN PHISHING
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = content.match(urlRegex) || [];

  for (const rawUrl of urls) {
    try {
      const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
      const hostname = parsed.hostname.toLowerCase();

      // A. Cek domain terkonfirmasi berbahaya
      for (const malDomain of KNOWN_MALICIOUS_DOMAINS) {
        if (hostname === malDomain || hostname.endsWith(`.${malDomain}`)) {
          return { isPhishing: true, reason: 'Domain terindikasi IP Logger / Scam link berbahaya.', url: rawUrl };
        }
      }

      // B. Cek Typosquatting / Fake Discord Nitro / Fake MrBeast URL
      const isOfficial = OFFICIAL_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
      if (!isOfficial) {
        // Domain meniru kata 'discord', 'nitro', 'steam'
        const fakeDiscordMatch = hostname.match(/(disord|dlscord|dlsord|dicord|discrod|disccord|discorcl)/i);
        const nitroKeywordsMatch = hostname.match(/(discord.*nitro|nitro.*discord|discord.*gift|free.*nitro|claim.*nitro|steam.*nitro|nitro.*drop)/i);
        const mrBeastDomainMatch = hostname.match(/(mrbeast|beast.*gift|beast.*drop|beast.*claim|beast.*promo|elon.*crypto|free.*robux)/i);

        if (fakeDiscordMatch || nitroKeywordsMatch) {
          return { isPhishing: true, reason: 'Domain meniru layanan resmi Discord/Nitro (Fake Nitro Phishing).', url: rawUrl };
        }

        if (mrBeastDomainMatch) {
          return { isPhishing: true, reason: 'Domain palsu mengatasnamakan MrBeast / Giveaway Scam.', url: rawUrl };
        }
      }
    } catch (_) {}
  }

  // 2. CEK POLA SCAM MRBEAST & CELEBRITY GIVEAWAY
  const isMrBeastScam = (
    rawLower.includes('mrbeast') || rawLower.includes('mr beast') ||
    rawLower.includes('beast giveaway') || rawLower.includes('beast promo') ||
    rawLower.includes('elon musk giveaway') || rawLower.includes('crypto airdrop')
  );

  const hasGiveawayKeywords = (
    rawLower.includes('giveaway') || rawLower.includes('claim') ||
    rawLower.includes('1000$') || rawLower.includes('10,000$') ||
    rawLower.includes('gift card') || rawLower.includes('free robux') ||
    rawLower.includes('airdrop') || rawLower.includes('prize')
  );

  // Jika menyebut MrBeast/Giveaway besar dan menyertakan URL tidak resmi atau attachment
  if (isMrBeastScam && (urls.length > 0 || attachments.length > 0 || hasGiveawayKeywords)) {
    return {
      isPhishing: true,
      reason: 'Pesan terindikasi Scam / Phishing palsu mengatasnamakan MrBeast / Giveaway.',
      url: urls[0] || 'Gambar / Banner Giveaway Palsu'
    };
  }

  // 3. CEK JEBAKAN QR CODE LOGIN DISCORD (TOKEN STEALER VIA QR CODE)
  const isQrCodeLoginTrap = (
    (rawLower.includes('scan qr') || rawLower.includes('scan this qr') ||
     rawLower.includes('scan code') || rawLower.includes('qr code') ||
     rawLower.includes('scan to verify') || rawLower.includes('scan to claim')) &&
    (rawLower.includes('discord') || rawLower.includes('nitro') || rawLower.includes('login') ||
     rawLower.includes('verify') || rawLower.includes('claim') || rawLower.includes('prize') || attachments.length > 0)
  );

  if (isQrCodeLoginTrap) {
    return {
      isPhishing: true,
      reason: 'Jebakan Scam QR Code Login (Mencuri Akun / Token Discord via Scan QR).',
      url: 'QR Code Scam Image'
    };
  }

  // 4. CEK ATTACHMENT GAMBAR DENGAN NAMA FILE MENCURIGAKAN
  for (const att of attachments) {
    const fn = (att.name || '').toLowerCase();
    if (
      fn.includes('mrbeast') || fn.includes('nitro_gift') ||
      fn.includes('free_nitro') || fn.includes('qr_login') ||
      fn.includes('claim_reward') || fn.includes('airdrop_proof')
    ) {
      return {
        isPhishing: true,
        reason: 'Gambar lampiran terindikasi banner promosi phishing / scam.',
        url: att.name
      };
    }
  }

  // 5. DETEKSI BROADCAST SPAM MASSAL (@everyone + Link Scam)
  const hasMassMention = rawLower.includes('@everyone') || rawLower.includes('@here');
  const hasScamKeywords = (
    rawLower.includes('free nitro') || rawLower.includes('nitro free') ||
    rawLower.includes('steam gift') || rawLower.includes('airdrop') ||
    rawLower.includes('claim your')
  ) && urls.length > 0;

  if (hasMassMention && hasScamKeywords) {
    return { isPhishing: true, reason: 'Pola pesan terdeteksi sebagai broadcast scam massal.', url: urls[0] || 'Tautan Eksternal' };
  }

  return { isPhishing: false, reason: null, url: null };
}

/**
 * Ambil konfigurasi automod guild dari settings
 */
function getGuildAutomodSettings(guildId) {
  const allSettings = storage.read('settings') || {};
  const guildSettings = allSettings[guildId] || {};

  return {
    enabled: guildSettings.automodEnabled !== false, // default: true
    antiPhishing: guildSettings.antiPhishing !== false, // default: true
    badWords: guildSettings.badWords !== false, // default: true
    timeoutOnPhishing: guildSettings.timeoutOnPhishing !== false, // default: true (1 jam)
    logChannelId: guildSettings.modLogChannelId || null,
    customBadWords: guildSettings.customBadWords || [],
    whitelistedWords: guildSettings.whitelistedWords || [],
    ignoredRoles: guildSettings.automodIgnoredRoles || [],
    ignoredChannels: guildSettings.automodIgnoredChannels || []
  };
}

module.exports = {
  checkBadWords,
  checkPhishing,
  getGuildAutomodSettings,
  DEFAULT_BAD_WORDS,
  OFFICIAL_DOMAINS
};
