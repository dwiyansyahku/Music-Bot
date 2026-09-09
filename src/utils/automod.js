const { PermissionFlagsBits } = require('discord.js');
const storage = require('./storage');

// Ekstensi file langsung berbahaya (Executables, Scripts, & Installers)
const MALICIOUS_FILE_EXTENSIONS = [
  '.exe', '.scr', '.bat', '.cmd', '.vbs', '.vbe', '.js', '.jse',
  '.wsf', '.wsh', '.ps1', '.ps1xml', '.jar', '.apk', '.com', '.pif',
  '.hta', '.cpl', '.msi', '.msp', '.gadget', '.reg', '.dll', '.drv',
  '.sys', '.deb', '.rpm', '.sh', '.bash', '.appimage'
];

// Ekstensi file arsip yang sering digunakan untuk menyamarkan Trojan / Token Grabber
const ARCHIVE_FILE_EXTENSIONS = [
  '.zip', '.rar', '.7z', '.tar', '.gz', '.iso', '.img', '.bin', '.cab', '.xz', '.bz2'
];

// Kata kunci nama file malware / trojan yang sangat mencurigakan (contoh: FPS_BOOST.zip)
const SUSPICIOUS_FILENAME_KEYWORDS = [
  'boost', 'fps', 'cheat', 'hack', 'crack', 'patch', 'stealer', 'grabber',
  'token', 'generator', 'nitro', 'promo', 'bypass', 'spoofer', 'injector',
  'aimbot', 'robux', 'free', 'gift', 'modmenu', 'mod_menu', 'exploit',
  'wallet', 'crypto', 'airdrop', 'giveaway', 'reshade', 'res shade', 'unlocker',
  'fps_boost', 'fpsboost', 'gingamb', 'free_nitro', 'nitro_free', 'trojan'
];

// Pola regex link undangan Discord
const DISCORD_INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li|com\/invite)|discordapp\.com\/invite)\/([a-zA-Z0-9-]{2,32})/gi;

// Pola regex Token Discord (User Account & Bot Token) untuk mencegah kebocoran kredensial
const DISCORD_TOKEN_REGEX = /(?:mfa\.[a-zA-Z0-9_-]{84}|[a-zA-Z0-9_-]{24,28}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27,38})/g;

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
  'free-robux.site',
  'steamcommuniity.com',
  'steamcomminuty.com',
  'trade-steamcommunity.com',
  'discordapp.click',
  'discord.gifts',
  'discorcl.app',
  'discorcl.com',
  'dlscord.com',
  'ps3cfw.com',
  'shorte.st',
  'gingamb.at',
  'gingamb.com',
  'gingamb.net',
  'mrbeast-promo.at',
  'mrbeast-bonus.com',
  'claim-usdt.com',
  'free-usdt.net',
  'crypto-bonus.net',
  'usdt-giveaway.org'
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
 * Deteksi apakah pesan/gambar mengandung link phishing, scam, malware grabber, invite terlarang, atau kebocoran token
 */
function checkPhishing(messageOrContent) {
  let content = '';
  let attachments = [];
  let embeds = [];
  let isForwarded = false;
  let member = null;

  if (typeof messageOrContent === 'string') {
    content = messageOrContent;
  } else if (messageOrContent && typeof messageOrContent === 'object') {
    content = messageOrContent.content || '';
    member = messageOrContent.member || null;

    if (messageOrContent.attachments) {
      attachments = Array.from(messageOrContent.attachments.values());
    }
    if (messageOrContent.embeds) {
      embeds = [...messageOrContent.embeds];
    }

    // ─── DUKUNGAN PESAN FORWARDED (messageSnapshots di Discord.js) ───
    if (messageOrContent.messageSnapshots && messageOrContent.messageSnapshots.size > 0) {
      isForwarded = true;
      for (const [, snapshot] of messageOrContent.messageSnapshots) {
        if (snapshot.content) {
          content += '\n' + snapshot.content;
        }
        if (snapshot.attachments && snapshot.attachments.size > 0) {
          attachments.push(...snapshot.attachments.values());
        }
        if (snapshot.embeds && snapshot.embeds.length > 0) {
          embeds.push(...snapshot.embeds);
        }
      }
    }
  }

  // Ekstrak teks dari embeds (url, title, description, fields)
  for (const emb of embeds) {
    if (emb.url) content += `\n${emb.url}`;
    if (emb.title) content += `\n${emb.title}`;
    if (emb.description) content += `\n${emb.description}`;
    if (emb.fields && Array.isArray(emb.fields)) {
      for (const f of emb.fields) {
        content += `\n${f.name || ''} ${f.value || ''}`;
      }
    }
  }

  const rawLower = content.toLowerCase();
  const normalized = normalizeText(content);

  // 0. CEK KEBOCORAN TOKEN DISCORD (MENCEGAH PEMBAJAKAN AKUN ATAU BOT DISCORD)
  const tokenMatches = content.match(DISCORD_TOKEN_REGEX);
  if (tokenMatches && tokenMatches.length > 0) {
    return {
      isPhishing: true,
      isTokenLeak: true,
      isForwarded,
      reason: 'Kebocoran Token Discord (Akun/Bot) terdeteksi di dalam pesan.',
      url: 'TOKEN_DISCORD_RAHASIA'
    };
  }

  // 0B. CEK LAMPIRAN FILE BERBAHAYA (TROJAN, TOKEN STEALER, RAT, MALWARE & ARSIP MENCURIGAKAN)
  const doubleExtRegex = /\.(png|jpg|jpeg|gif|pdf|docx|xlsx|txt|mp4|mp3)\.(exe|scr|bat|cmd|vbs|ps1|apk|msi|zip|rar)$/i;

  for (const att of attachments) {
    const fn = (att.name || '').toLowerCase();

    // 1. Ekstensi berbahaya langsung (.exe, .scr, .bat, .cmd, dll.)
    const isMaliciousDirect = MALICIOUS_FILE_EXTENSIONS.some(ext => fn.endsWith(ext) || fn.includes(ext + '.'));
    if (isMaliciousDirect) {
      return {
        isPhishing: true,
        isMalware: true,
        isForwarded,
        reason: `Lampiran file berbahaya / Trojan / Executable terdeteksi (\`${att.name}\`).`,
        filename: att.name,
        url: att.name
      };
    }

    // 2. Serangan ekstensi ganda (Double Extension Attack, misal: invoice.pdf.exe)
    if (doubleExtRegex.test(fn)) {
      return {
        isPhishing: true,
        isMalware: true,
        isForwarded,
        reason: `Lampiran file manipulatif dengan ekstensi ganda terdeteksi (\`${att.name}\`).`,
        filename: att.name,
        url: att.name
      };
    }

    // 3. File arsip (.zip, .rar, .7z) dengan nama mencurigakan (seperti FPS_BOOST.zip, Nitro_Gen.rar)
    const isArchive = ARCHIVE_FILE_EXTENSIONS.some(ext => fn.endsWith(ext));
    if (isArchive) {
      const hasSuspiciousKeyword = SUSPICIOUS_FILENAME_KEYWORDS.some(kw => fn.includes(kw));
      if (hasSuspiciousKeyword) {
        return {
          isPhishing: true,
          isMalware: true,
          isForwarded,
          reason: `Lampiran arsip berbahaya terindikasi Trojan / Token Grabber (\`${att.name}\`).`,
          filename: att.name,
          url: att.name
        };
      }
    }
  }

  // 0C. CEK LINK UNDANGAN DISCORD (ANTI-INVITE)
  const isStaff = member && (
    member.permissions?.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions?.has(PermissionFlagsBits.Administrator)
  );

  const inviteMatches = content.match(DISCORD_INVITE_REGEX);
  if (inviteMatches && inviteMatches.length > 0) {
    if (!isStaff) {
      return {
        isPhishing: true,
        isInvite: true,
        isForwarded,
        reason: 'Link undangan Discord server lain (Anti-Invite). Promosi server tidak diizinkan.',
        url: inviteMatches[0]
      };
    }
  }

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
          return { isPhishing: true, isForwarded, reason: 'Domain terindikasi IP Logger / Scam link berbahaya.', url: rawUrl };
        }
      }

      // B. Cek Typosquatting / Fake Discord Nitro / Fake MrBeast / Fake Steam URL
      const isOfficial = OFFICIAL_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
      if (!isOfficial) {
        // Domain meniru kata 'discord', 'nitro', 'steam'
        const fakeDiscordMatch = hostname.match(/(disord|dlscord|dlsord|dicord|discrod|disccord|discorcl|discort|discrold|discood)/i);
        const fakeSteamMatch = hostname.match(/(steamcommuntiy|steamcomminuty|steamcommuniity|steamcommunitys|steamcomunty|steancommunity|steam-trade|steam-gift|steam-nitro|trade-offer.*steam)/i);
        const nitroKeywordsMatch = hostname.match(/(discord.*nitro|nitro.*discord|discord.*gift|free.*nitro|claim.*nitro|steam.*nitro|nitro.*drop|discord.*airdrop|nitro.*boost|discord.*event|nitro.*claim)/i);
        const mrBeastDomainMatch = hostname.match(/(mrbeast|beast.*gift|beast.*drop|beast.*claim|beast.*promo|elon.*crypto|free.*robux|gingamb)/i);

        if (fakeDiscordMatch || fakeSteamMatch || nitroKeywordsMatch) {
          return { isPhishing: true, isForwarded, reason: 'Domain meniru layanan resmi Discord/Nitro/Steam (Fake Phishing Scam).', url: rawUrl };
        }

        if (mrBeastDomainMatch) {
          return { isPhishing: true, isForwarded, reason: 'Domain palsu mengatasnamakan MrBeast / Giveaway Scam.', url: rawUrl };
        }
      }
    } catch (_) {}
  }

  // 2. CEK POLA SCAM MRBEAST, GINGAMB & CRYPTO GIVEAWAY
  const isMrBeastScam = (
    rawLower.includes('mrbeast') || rawLower.includes('mr beast') ||
    rawLower.includes('beast giveaway') || rawLower.includes('beast promo') ||
    rawLower.includes('gingamb') || rawLower.includes('elon musk giveaway') ||
    rawLower.includes('crypto airdrop') || rawLower.includes('crypto casino')
  );

  const hasGiveawayKeywords = (
    rawLower.includes('giveaway') || rawLower.includes('claim') ||
    rawLower.includes('bonus') || rawLower.includes('5400') ||
    rawLower.includes('5,400') || rawLower.includes('usdt') ||
    rawLower.includes('promo code') || rawLower.includes('reward received') ||
    rawLower.includes('withdrawal') || rawLower.includes('activate code') ||
    rawLower.includes('1000$') || rawLower.includes('10,000$') ||
    rawLower.includes('gift card') || rawLower.includes('free robux') ||
    rawLower.includes('airdrop') || rawLower.includes('prize')
  );

  // Jika menyebut MrBeast/Gingamb/Giveaway besar dan menyertakan URL tidak resmi atau attachment/scam keyword
  if (isMrBeastScam && (urls.length > 0 || attachments.length > 0 || hasGiveawayKeywords)) {
    return {
      isPhishing: true,
      isForwarded,
      reason: 'Pesan terindikasi Scam Crypto / Phishing palsu mengatasnamakan MrBeast / Giveaway USDT.',
      url: urls[0] || (attachments[0]?.name ? `Lampiran: ${attachments[0].name}` : 'Gambar / Banner Giveaway Palsu')
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
      isForwarded,
      reason: 'Jebakan Scam QR Code Login (Mencuri Akun / Token Discord via Scan QR).',
      url: 'QR Code Scam Image'
    };
  }

  // 4. CEK MODUS "TRY MY GAME" / "TEST MY GAME" (TROJAN TOKEN GRABBER)
  const isGameBetaScam = (
    (rawLower.includes('try my game') || rawLower.includes('test my game') || rawLower.includes('beta test my game') || rawLower.includes('play my game')) &&
    (urls.length > 0 || attachments.length > 0)
  );

  if (isGameBetaScam) {
    return {
      isPhishing: true,
      isForwarded,
      reason: 'Pesan terindikasi modus Trojan Grabber berkedok uji coba game baru (Beta Game Scam).',
      url: urls[0] || 'Game Installer'
    };
  }

  // 5. CEK ATTACHMENT GAMBAR DENGAN NAMA FILE MENCURIGAKAN
  for (const att of attachments) {
    const fn = (att.name || '').toLowerCase();
    if (
      fn.includes('mrbeast') || fn.includes('nitro_gift') ||
      fn.includes('free_nitro') || fn.includes('qr_login') ||
      fn.includes('claim_reward') || fn.includes('airdrop_proof') ||
      fn.includes('gingamb') || fn.includes('fps_boost') || fn.includes('usdt')
    ) {
      return {
        isPhishing: true,
        isForwarded,
        reason: 'Gambar lampiran terindikasi banner promosi phishing / scam.',
        url: att.name
      };
    }
  }

  // 6. DETEKSI BROADCAST SPAM MASSAL (@everyone + Link Scam)
  const hasMassMention = rawLower.includes('@everyone') || rawLower.includes('@here');
  const hasScamKeywords = (
    rawLower.includes('free nitro') || rawLower.includes('nitro free') ||
    rawLower.includes('steam gift') || rawLower.includes('airdrop') ||
    rawLower.includes('claim your')
  ) && urls.length > 0;

  if (hasMassMention && hasScamKeywords) {
    return { isPhishing: true, isForwarded, reason: 'Pola pesan terdeteksi sebagai broadcast scam massal.', url: urls[0] || 'Tautan Eksternal' };
  }

  return { isPhishing: false, reason: null, url: null };
}

// ══════════════════════════════════════════════════════════════
// ANTI-SPAM DETECTION ENGINE
// ══════════════════════════════════════════════════════════════

// In-memory sliding window tracker: key = `${guildId}_${userId}`
const spamTracker = new Map();

/**
 * Bersihkan record spam tracker yang tidak aktif lebih dari 5 menit
 */
function cleanExpiredSpamRecords() {
  const now = Date.now();
  for (const [key, data] of spamTracker.entries()) {
    if (now - (data.lastActivity || 0) > 5 * 60 * 1000) {
      spamTracker.delete(key);
    }
  }
}

// Timer pembersihan berkala tiap 3 menit
if (typeof setInterval !== 'undefined') {
  setInterval(cleanExpiredSpamRecords, 3 * 60 * 1000).unref?.();
}

/**
 * Deteksi apakah pesan tergolong spam (Fast flood, duplikasi teks, mass mention, capslock, emoji spam)
 */
function checkSpam(message, automodConfig = {}) {
  if (!message || !message.guild || !message.author || message.author.bot) {
    return { isSpam: false };
  }

  // Bypass jika member memiliki izin ManageMessages / Administrator
  if (message.member) {
    if (
      message.member.permissions?.has(PermissionFlagsBits.ManageMessages) ||
      message.member.permissions?.has(PermissionFlagsBits.Administrator)
    ) {
      return { isSpam: false };
    }

    // Bypass jika role di-ignore
    if (
      automodConfig.ignoredRoles &&
      automodConfig.ignoredRoles.length > 0 &&
      message.member.roles?.cache?.some(r => automodConfig.ignoredRoles.includes(r.id))
    ) {
      return { isSpam: false };
    }
  }

  // Bypass jika channel di-ignore
  if (
    automodConfig.ignoredChannels &&
    automodConfig.ignoredChannels.length > 0 &&
    automodConfig.ignoredChannels.includes(message.channel.id)
  ) {
    return { isSpam: false };
  }

  const guildId = message.guild.id;
  const userId = message.author.id;
  const key = `${guildId}_${userId}`;
  const now = Date.now();

  let data = spamTracker.get(key);
  if (!data) {
    data = {
      timestamps: [],
      lastContent: '',
      repeatCount: 0,
      strikes: 0,
      lastStrikeTime: 0,
      lastActivity: now
    };
    spamTracker.set(key, data);
  }
  data.lastActivity = now;

  // Reset strikes jika tidak melanggar dalam 60 detik
  if (data.lastStrikeTime && now - data.lastStrikeTime > 60 * 1000) {
    data.strikes = 0;
  }

  // ─── 1. CEK FLOOD PESAN CEPAT (RATE LIMITING) ───
  // Pertahankan hanya timestamp dalam 4 detik terakhir
  data.timestamps = data.timestamps.filter(t => now - t <= 4000);
  data.timestamps.push(now);

  if (data.timestamps.length >= 5) {
    data.strikes += 2;
    data.lastStrikeTime = now;
    return {
      isSpam: true,
      type: 'flood',
      reason: 'Mengirim pesan terlalu cepat (Flood Spam)',
      action: 'timeout'
    };
  }

  const rawContent = message.content || '';
  const normContent = rawContent.toLowerCase().trim().replace(/\s+/g, ' ');

  // ─── 2. CEK PESAN DUPLIKAT BERULANG ───
  if (normContent.length >= 3) {
    if (normContent === data.lastContent) {
      data.repeatCount = (data.repeatCount || 1) + 1;
    } else {
      data.lastContent = normContent;
      data.repeatCount = 1;
    }

    if (data.repeatCount >= 3) {
      data.strikes += 1;
      data.lastStrikeTime = now;
      return {
        isSpam: true,
        type: 'duplicate',
        reason: 'Mengirim pesan yang sama berulang kali (Duplicate Spam)',
        action: data.strikes >= 2 ? 'timeout' : 'delete'
      };
    }
  }

  // ─── 3. CEK MASS MENTION / TAG MASSAL ───
  const userMentions = message.mentions.users ? message.mentions.users.size : 0;
  const roleMentions = message.mentions.roles ? message.mentions.roles.size : 0;
  const hasMassPing = rawContent.includes('@everyone') || rawContent.includes('@here');

  if (
    userMentions >= 5 ||
    roleMentions >= 3 ||
    (hasMassPing && !message.member?.permissions?.has(PermissionFlagsBits.MentionEveryone))
  ) {
    data.strikes += 2;
    data.lastStrikeTime = now;
    return {
      isSpam: true,
      type: 'mass_mention',
      reason: 'Melakukan mass-mention / tag berlebihan',
      action: 'timeout'
    };
  }

  // ─── 4. CEK HURUF KAPITAL BERLEBIHAN (CAPSLOCK FLOOD) ───
  if (rawContent.length >= 15) {
    const letters = rawContent.replace(/[^a-zA-Z]/g, '');
    if (letters.length >= 12) {
      const upperCount = (rawContent.match(/[A-Z]/g) || []).length;
      const ratio = upperCount / letters.length;
      if (ratio >= 0.75) {
        data.strikes += 1;
        data.lastStrikeTime = now;
        return {
          isSpam: true,
          type: 'caps',
          reason: 'Penggunaan HURUF KAPITAL / Capslock berlebihan',
          action: data.strikes >= 2 ? 'timeout' : 'delete'
        };
      }
    }
  }

  // ─── 5. CEK SPAM EMOJI BERLEBIHAN ───
  const customEmojis = rawContent.match(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g) || [];
  const unicodeEmojis = rawContent.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu) || [];
  const totalEmojis = customEmojis.length + unicodeEmojis.length;

  if (totalEmojis >= 8) {
    data.strikes += 1;
    data.lastStrikeTime = now;
    return {
      isSpam: true,
      type: 'emoji',
      reason: 'Spam emoji berlebihan dalam satu pesan',
      action: data.strikes >= 2 ? 'timeout' : 'delete'
    };
  }

  return { isSpam: false, reason: null, type: null, action: null };
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
    antiSpam: guildSettings.antiSpam !== false, // default: true
    antiMalware: guildSettings.antiMalware !== false, // default: true
    antiTokenLeak: guildSettings.antiTokenLeak !== false, // default: true
    antiInvite: guildSettings.antiInvite !== false, // default: true
    kickOnMalware: guildSettings.kickOnMalware !== false, // default: true (Auto-Kick pelaku)
    timeoutOnPhishing: guildSettings.timeoutOnPhishing !== false, // default: true (1 jam fallback)
    timeoutOnSpam: guildSettings.timeoutOnSpam !== false, // default: true (1 menit)
    logChannelId: guildSettings.modLogChannel || guildSettings.modLogChannelId || null,
    customBadWords: guildSettings.customBadWords || [],
    whitelistedWords: guildSettings.whitelistedWords || [],
    ignoredRoles: guildSettings.automodIgnoredRoles || [],
    ignoredChannels: guildSettings.automodIgnoredChannels || []
  };
}

module.exports = {
  checkBadWords,
  checkPhishing,
  checkSpam,
  getGuildAutomodSettings,
  DEFAULT_BAD_WORDS,
  OFFICIAL_DOMAINS,
  KNOWN_MALICIOUS_DOMAINS,
  MALICIOUS_FILE_EXTENSIONS,
  ARCHIVE_FILE_EXTENSIONS,
  SUSPICIOUS_FILENAME_KEYWORDS,
  DISCORD_INVITE_REGEX,
  DISCORD_TOKEN_REGEX
};
