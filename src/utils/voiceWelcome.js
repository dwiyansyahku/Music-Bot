const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
  joinVoiceChannel,
  getVoiceConnection
} = require('@discordjs/voice');
const { PermissionFlagsBits } = require('discord.js');
const { Readable } = require('stream');
const storage = require('./storage');
const { sendModLog } = require('./modlog');

// Tracking cooldown per user per guild: key = `${guildId}_${userId}` -> timestamp
const userCooldowns = new Map();

// Tracking cooldown per channel: key = `${guildId}_${channelId}` -> timestamp
const channelDebounce = new Map();

// Tracking spam keluar-masuk voice: key = `${guildId}_${userId}` -> array of timestamps
const voiceFloodTracker = new Map();

// Cooldown default: 15 menit per user
const USER_COOLDOWN_MS = 15 * 60 * 1000;

// Jeda minimal antar sapaan di channel yang sama: 15 detik
const CHANNEL_DEBOUNCE_MS = 15 * 1000;

// Auto-cleanup memori setiap 30 menit agar map tidak membengkak dalam jangka panjang
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of userCooldowns.entries()) {
    if (now - ts > USER_COOLDOWN_MS) userCooldowns.delete(key);
  }
  for (const [key, ts] of channelDebounce.entries()) {
    if (now - ts > CHANNEL_DEBOUNCE_MS) channelDebounce.delete(key);
  }
  for (const [key, timestamps] of voiceFloodTracker.entries()) {
    const recent = timestamps.filter(t => now - t <= 10000);
    if (recent.length === 0) voiceFloodTracker.delete(key);
    else voiceFloodTracker.set(key, recent);
  }
}, 30 * 60 * 1000);
cleanupInterval.unref();

// Map karakter phonetic small-caps Unicode (misal: ᴀɴᴅɪ -> andi)
const SMALL_CAPS_MAP = {
  'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ғ': 'f', 'ɢ': 'g', 'ʜ': 'h',
  'ɪ': 'i', 'ᴊ': 'j', 'ᴋ': 'k', 'ʟ': 'l', 'ᴍ': 'm', 'ɴ': 'n', 'ᴏ': 'o', 'ᴘ': 'p',
  'ǫ': 'q', 'ʀ': 'r', 'ꜱ': 's', 'ᴛ': 't', 'ᴜ': 'u', 'ᴠ': 'v', 'ᴡ': 'w', 'ʏ': 'y', 'ᴢ': 'z'
};

/**
 * Normalisasi font aesthetic / fancy unicode yang sulit dibaca manusia
 * Mengubah Fraktur, Cursive, Small Caps, Double-Struck, Monospace, Fullwidth, Zalgo
 * menjadi huruf latin standar (a-z, A-Z) yang dapat dilafalkan oleh AI TTS secara sempurna.
 */
function normalizeFancyFonts(text) {
  if (!text) return '';
  // 1. Konversi phonetic small-caps
  let s = text.split('').map(c => SMALL_CAPS_MAP[c] || c).join('');
  // 2. Dekomposisi kanonikal Unicode (NFKD)
  s = s.normalize('NFKD');
  // 3. Buang combining marks / zalgo / aksen aneh
  s = s.replace(/[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff]/g, '');
  return s;
}

/**
 * Pembersih nama akun Discord cerdas
 * Menghilangkan emoji, tag klan, simbol dekoratif, font aneh, dan angka buntut
 * agar suara AI melafalkan nama secara sangat natural dan ramah
 */
function getCleanMemberName(member) {
  if (!member) return 'Kawan';

  let rawName = member.displayName || member.user?.globalName || member.user?.username || 'Kawan';

  // 1. Normalisasi font aesthetic / fancy unicode menjadi latin standar
  let clean = normalizeFancyFonts(rawName);

  // 2. Hapus emoji unicode & discord custom emoji
  clean = clean
    .replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '');

  // 3. Hapus tag klan berpasangan (misal: [RRQ], (BTR), 【ONIC】, <clan>) & karakter dekoratif
  clean = clean
    .replace(/\[.*?\]|\(.*?\)|【.*?】|「.*?」|<.*?>/g, ' ')
    .replace(/[|•★⚔️\-_/\\#@~!$%^&*()+=`~[\]{}<>:;"'?.,†‡§¶•°©®™✓✔︎✗✘☠︎༒꧁༺༻꧂]/g, ' ')
    .trim();

  // 4. Deteksi nama dengan spasi antar huruf (misal: 'A n d i' atau 'S a r a h')
  const rawWords = clean.split(/\s+/).filter(Boolean);
  if (rawWords.length >= 2 && rawWords.every(w => w.length === 1 && /[a-zA-Z]/.test(w))) {
    clean = rawWords.join('');
  }

  // 5. Ambil kata pertama (nama panggilan utama)
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    let firstWord = words[0];

    // Hapus angka buntut jika kata memiliki huruf (misal: "Sarah99" -> "Sarah", "Andi123" -> "Andi")
    const withoutTrailingDigits = firstWord.replace(/\d+$/, '');
    if (withoutTrailingDigits.length >= 2) {
      firstWord = withoutTrailingDigits;
    }

    if (firstWord.length >= 2 && firstWord.length <= 15) {
      clean = firstWord;
    } else {
      clean = words.slice(0, 2).join(' ');
    }
  }

  // 6. Jika setelah dibersihkan terlalu pendek atau kosong, gunakan username dasar
  if (!clean || clean.length < 2) {
    const rawUsername = member.user?.username || '';
    const cleanUser = normalizeFancyFonts(rawUsername).replace(/[^a-zA-Z0-9]/g, '').replace(/\d+$/, '');
    clean = (cleanUser.length >= 2) ? cleanUser : 'Kawan';
  }

  // 7. Ubah ke Title Case (Huruf depan kapital, sisanya huruf kecil)
  // Mencegah Google TTS mengeja nama huruf-demi-huruf jika member memakai ALL CAPS
  clean = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();

  return clean;
}

/**
 * Dapatkan salam waktu berdasarkan zona waktu Indonesia (WIB - UTC+7)
 */
function getTimeGreetingWIB() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const wibHour = (utcHour + 7) % 24;

  if (wibHour >= 4 && wibHour < 11) return 'Selamat pagi';
  if (wibHour >= 11 && wibHour < 15) return 'Selamat siang';
  if (wibHour >= 15 && wibHour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/**
 * Kumpulan 20+ variasi sapaan ramah dan acak
 */
function getRandomVoiceGreeting(name) {
  const timeGreeting = getTimeGreetingWIB();

  const GREETINGS = [
    // Kategori Sapaan Berbasis Waktu
    `${timeGreeting} ${name}, selamat datang di voice channel!`,
    `${timeGreeting} ${name}, senang melihatmu bergabung hari ini!`,
    `${timeGreeting} ${name}! Semoga harimu menyenangkan ya.`,
    `${timeGreeting} ${name}, selamat bersantai bareng teman-teman di sini!`,

    // Kategori Ramah & Santai
    `Halo ${name}, selamat bergabung di tongkrongan!`,
    `Hai ${name}! Yuk langsung open mic dan ngobrol bareng!`,
    `Welcome ${name}! Akhirnya mampir ke voice channel juga nih.`,
    `Halo ${name}! Tarik kursi dan nikmati obrolan seru di sini ya.`,
    `Hai hai ${name}! Senang kamu bisa bergabung bersama kita.`,
    `Halo ${name}, apa kabar? Selamat datang di voice room!`,
    `Welcome ${name}! Ada teman-teman yang sudah menunggu kamu nih.`,
    `Hai ${name}! Selamat datang, jangan ragu untuk bersuara ya!`,

    // Kategori Akrab & Seru
    `Wah, ada ${name} datang! Welcome welcome!`,
    `Halo ${name}! Suaramu ditunggu-tunggu nih, selamat bergabung ya!`,
    `Hai ${name}, selamat datang! Mau mabar atau sekadar ngobrol santai nih?`,
    `Welcome ${name}! Selamat datang di ruang obrolan server!`,
    `Halo ${name}! Senang banget kamu hadir di voice hari ini.`,
    `Hai ${name}, selamat datang kembali di tongkrongan kita!`,
    `Welcome ${name}! Nikmati harimu dan selamat bersenang-senang di voice channel!`,
    `Halo ${name}, salam kenal dan selamat menikmati obrolan di server!`
  ];

  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

/**
 * Download audio MP3 sapaan dari Google TTS Neural Bahasa Indonesia
 */
async function fetchTTSAudio(text) {
  const encoded = encodeURIComponent(text);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=id&client=tw-ob`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000), // Timeout 5 detik agar tidak menggantung
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Gagal mengunduh audio TTS: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Memutar audio sapaan ke voice channel tertentu secara modular dan aman
 *
 * @param {import('discord.js').VoiceBasedChannel} channel
 * @param {string} text
 * @param {import('discord.js').Client} client
 * @returns {Promise<void>}
 */
async function playVoiceAudio(channel, text, client) {
  const guild = channel.guild;
  const guildId = guild.id;
  const botMember = guild.members.me;

  // Cek izin bot Connect & Speak di channel sebelum mencoba join
  if (!botMember) return;
  const perms = channel.permissionsFor(botMember);
  if (!perms || !perms.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
    console.warn(`⚠️ [Voice Welcome] Bot tidak memiliki izin Connect/Speak di channel "${channel.name}" (${channel.id}).`);
    return;
  }

  const botCurrentVoiceChannelId = botMember.voice?.channelId;
  const wasAlreadyInChannel = (botCurrentVoiceChannelId === channel.id);

  const audioBuffer = await fetchTTSAudio(text);

  let connection = getVoiceConnection(guildId);
  if (!connection || connection.joinConfig.channelId !== channel.id) {
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guildId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });
  }

  const resource = createAudioResource(Readable.from(audioBuffer), {
    inputType: StreamType.Arbitrary
  });

  const player = createAudioPlayer();
  connection.subscribe(player);
  player.play(resource);

  return new Promise((resolve, reject) => {
    player.on(AudioPlayerStatus.Idle, () => {
      setTimeout(() => {
        try {
          const is247 = client.stay247 && client.stay247.has(guildId);
          if (!wasAlreadyInChannel && !is247) {
            const currentConn = getVoiceConnection(guildId);
            if (currentConn && currentConn.joinConfig.channelId === channel.id) {
              currentConn.destroy();
              console.log(`👋 [Voice Welcome AI] Audio selesai diputar. Bot keluar otomatis.`);
            }
          }
        } catch (leaveErr) {
          console.warn('[Voice Welcome Auto-Leave Error]:', leaveErr.message);
        }
        resolve();
      }, 1200);
    });

    player.on('error', (err) => {
      console.error('[Voice Welcome Player Error]:', err.message);
      reject(err);
    });
  });
}

/**
 * Handle utama sapaan suara member masuk voice channel
 *
 * @param {import('discord.js').VoiceState} oldState
 * @param {import('discord.js').VoiceState} newState
 * @param {import('discord.js').Client} client
 */
async function handleVoiceWelcome(oldState, newState, client) {
  // Hanya proses jika member masuk ke voice channel (bukan keluar / bukan bot)
  if (!newState.channelId) return;
  if (!newState.member || newState.member.user.bot) return;

  // Cek apakah baru masuk dari luar VC, atau pindah ke channel baru
  const isEntering = !oldState.channelId && newState.channelId;
  const isMoving = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;
  if (!isEntering && !isMoving) return;

  const guild = newState.guild;
  const guildId = guild.id;
  const userId = newState.member.id;
  const channelId = newState.channelId;
  const now = Date.now();

  // ─── 1. CEK PENGATURAN GUILD & FILTER SALURAN KHUSUS ───
  // Jangan sapa jika masuk ke voice channel AFK server
  if (guild.afkChannelId && channelId === guild.afkChannelId) return;

  // Jangan sapa jika member sedang dalam kondisi server-deafened (tidak bisa mendengar suara)
  if (newState.serverDeaf) return;

  const allSettings = storage.read('settings') || {};
  const guildSettings = allSettings[guildId] || {};
  const vwConfig = guildSettings.voiceWelcome || { enabled: true, specificChannelId: null };

  // Jika admin mematikan fitur voice welcome di server ini
  if (vwConfig.enabled === false) return;

  // Jika admin mengunci sapaan hanya di channel tertentu (misal: #Lounge)
  if (vwConfig.specificChannelId && vwConfig.specificChannelId !== channelId) return;

  // Jangan menyapa jika masuk ke voice channel Penjara (Jail)
  const jailVoiceId = guildSettings.jail?.voiceChannelId;
  if (jailVoiceId && channelId === jailVoiceId) return;

  // Jangan menyapa narapidana yang sedang ditahan
  const jailedData = storage.read('jail') || {};
  const guildJails = jailedData[guildId] || {};
  if (guildJails[userId]) return;

  // ─── 2. ANTI-TROLL VOICE FLOOD (Deteksi member iseng keluar-masuk cepat) ───
  const floodKey = `${guildId}_${userId}`;
  let floodTimestamps = voiceFloodTracker.get(floodKey) || [];
  floodTimestamps = floodTimestamps.filter(t => now - t <= 10000); // 10 detik terakhir
  floodTimestamps.push(now);
  voiceFloodTracker.set(floodKey, floodTimestamps);

  if (floodTimestamps.length >= 4) {
    console.warn(`🚨 [Voice Spam Flood] ${newState.member.user.tag} terdeteksi spam keluar-masuk VC di ${guild.name}!`);

    // Terapkan Timeout 3 menit jika member moderatable
    if (newState.member.moderatable) {
      await newState.member.timeout(3 * 60 * 1000, 'Anti-Troll: Spam reconnect Voice Channel').catch(() => { });
    }

    // Catat ke Mod Log
    await sendModLog(guild, client, {
      action: 'MUTE',
      moderator: { id: client.user.id, username: 'Voice Guardian', tag: client.user.tag },
      target: newState.member.user,
      reason: 'Spam reconnect Voice Channel (Keluar-masuk lebih dari 3 kali dalam 10 detik).',
      details: `• **Pengguna:** <@${userId}> (\`${newState.member.user.tag}\`)\n` +
        `• **Saluran Voice:** <#${channelId}>\n` +
        `• **Tindakan:** Timeout 3 menit untuk menghentikan gangguan suara.`,
      color: 0xFEE75C
    });

    return;
  }

  // ─── 3. COOLDOWN USER (Anti-Spam Reconnect: Max 1x per 15 Menit) ───
  const userKey = `${guildId}_${userId}`;
  const lastUserGreeted = userCooldowns.get(userKey) || 0;
  if (now - lastUserGreeted < USER_COOLDOWN_MS) {
    // Member keluar-masuk dalam 15 menit -> abaikan secara diam-diam
    return;
  }

  // ─── 4. DEBOUNCE CHANNEL (Mencegah tabrakan audio jika beberapa orang masuk barengan) ───
  const chKey = `${guildId}_${channelId}`;
  const lastChannelGreeted = channelDebounce.get(chKey) || 0;
  if (now - lastChannelGreeted < CHANNEL_DEBOUNCE_MS) {
    // Channel baru saja memutar sapaan < 15 detik lalu -> abaikan agar tidak bising
    return;
  }

  // ─── 5. HARMONISASI DENGAN PEMUTAR MUSIK (DisTube Guard) ───
  // Jika bot sedang memutar musik di voice channel, JANGAN potong musik yang sedang dinikmati!
  const botCurrentVoiceChannelId = guild.members.me?.voice?.channelId;
  const queue = client.distube?.getQueue(guildId);
  const isMusicPlaying = queue && queue.playing;

  if (isMusicPlaying && botCurrentVoiceChannelId === channelId) {
    // Lagu sedang jalan di VC ini -> jangan tiban dengan suara bicara
    return;
  }

  // Jika bot sedang terhubung di channel voice lain dan sedang memutar lagu
  if (isMusicPlaying && botCurrentVoiceChannelId && botCurrentVoiceChannelId !== channelId) {
    return;
  }

  // ─── 6. EKSEKUSI SAPAAN SUARA AI PEREMPUAN ───
  try {
    const cleanName = getCleanMemberName(newState.member);
    const greetingText = getRandomVoiceGreeting(cleanName);
    console.log(`🎙️ [Voice Welcome AI] Menyiapkan sapaan untuk ${cleanName} di "${newState.channel?.name}": "${greetingText}"`);

    // Tandai cooldown segera agar tidak ter-trigger ganda
    userCooldowns.set(userKey, now);
    channelDebounce.set(chKey, now);

    // Putar audio sapaan ke voice channel
    await playVoiceAudio(newState.channel, greetingText, client);

  } catch (err) {
    console.error('[Voice Welcome Execution Error]:', err.message);
  }
}

/**
 * Kumpulan 15+ variasi ucapan pengingat istirahat malam (22:00 WIB)
 * Kalimat santai, hangat, dan perhatian agar suasana malam tetap menyenangkan
 */
const NIGHT_VOICE_REMINDERS = [
  'Halo semuanya! Waktu sudah menunjukkan pukul sepuluh malam WIB. Sudah saatnya untuk menyudahi kegiatan malam ini dan beristirahat ya. Selamat malam dan mimpi indah semuanya!',
  'Perhatian kawan-kawan di voice channel! Jam sudah menunjukkan pukul sepuluh malam. Yuk mulai rapikan aktivitas malam ini, istirahatkan mata dan pulihkan energi untuk hari esok. Selamat rehat ya!',
  'Malam kawan-kawan! Mengingatkan sekarang sudah jam sepuluh malam nih. Jangan begadang terlalu larut ya, kesehatan kalian jauh lebih penting. Selamat beristirahat semuanya!',
  'Halo guys! Sekadar mengingatkan dengan ramah, sekarang sudah jam sepuluh malam WIB. Terima kasih sudah seru-seruan di voice hari ini. Waktunya rebahan dan istirahat yang cukup ya!',
  'Pemberitahuan santai untuk teman-teman di voice. Sudah pukul sepuluh malam nih! Yuk akhiri obrolan seru malam ini dan tarik selimut. Sampai jumpa besok dengan semangat baru!',
  'Halo teman-teman! Jarum jam sudah di angka sepuluh malam. Waktu yang tepat untuk melepas penat dan rehat dari layar monitor. Selamat beristirahat dan jaga kesehatan kalian ya!',
  'Malam semuanya! Bot cuma mau menyapa dan mengingatkan, sekarang sudah jam sepuluh malam WIB. Sudah waktunya bersiap untuk tidur malam. Semoga mimpi indah dan tidur nyenyak ya!',
  'Halo kawan-kawan! Senang sekali melihat kebersamaan kalian di voice hari ini. Tapi ingat ya, sekarang sudah pukul sepuluh malam. Yuk mulai sudahi aktivitas dan istirahat yang cukup!',
  'Perhatian kawan-kawan! Waktu istirahat telah tiba di pukul sepuluh malam ini. Luangkan waktu untuk relaksasi tubuh dan pikiran kalian. Selamat malam dan selamat tidur semuanya!',
  'Halo semuanya! Sudah pukul sepuluh malam WIB nih. Terima kasih sudah meramaikan server hari ini. Jangan lupa minum air putih dan segera beristirahat ya. Good night all!',
  'Hai hai kawan-kawan! Waktu malam sudah larut di jam sepuluh. Yuk mulai disudahi mabar dan ngobrolnya, saatnya tidur agar besok bangun dengan tubuh segar. Selamat beristirahat!',
  'Halo kawan! Mengingatkan sekarang sudah pukul sepuluh malam WIB. Sudah waktunya istirahat dan sudahi kegiatan hari ini. Semoga malam kalian tenang dan menyenangkan ya!',
  'Selamat malam kawan-kawan! Jam sepuluh malam sudah berdentang. Istirahatkan pikiran kalian sejenak dan nikmati malam yang damai. Selamat tidur dan sampai jumpa besok!',
  'Perhatian semuanya! Sudah jam sepuluh malam nih kawan-kawan. Yuk rehat sejenak dari dunia game dan obrolan, pulihkan tenaga untuk petualangan besok. Selamat istirahat ya!',
  'Halo teman-teman tersayang! Sekarang sudah pukul sepuluh malam WIB. Jangan lupa untuk beristirahat dengan cukup malam ini ya. Jaga kesehatan dan selamat tidur lelap!'
];

/**
 * Dapatkan kalimat pengingat malam 22:00 WIB secara acak
 */
function getRandomNightVoiceReminder() {
  return NIGHT_VOICE_REMINDERS[Math.floor(Math.random() * NIGHT_VOICE_REMINDERS.length)];
}

/**
 * Broadcast pengingat istirahat pukul 22:00 WIB ke seluruh voice channel yang ada botnya
 * Syarat: Terdapat LEBIH DARI 1 ORANG member non-bot di voice channel tersebut
 *
 * @param {import('discord.js').Client} client
 */
async function broadcastVoiceNightReminder(client) {
  console.log('🌙 [Voice Night Reminder] Menjalankan pengecekan pengingat istirahat 22:00 WIB di seluruh guild...');

  for (const guild of client.guilds.cache.values()) {
    try {
      const voiceChannel = guild.members.me?.voice?.channel;
      if (!voiceChannel) continue;

      // Cek jumlah member non-bot di saluran tersebut: harus LEBIH DARI 1 ORANG
      const nonBots = voiceChannel.members.filter(m => !m.user.bot);
      if (nonBots.size <= 1) {
        console.log(`🌙 [Voice Night Reminder] Channel "${voiceChannel.name}" di ${guild.name} hanya memiliki ${nonBots.size} orang. Diabaikan.`);
        continue;
      }

      // Pastikan bot tidak dalam keadaan mute/deafen
      await enforceBotVoiceImmunity(guild, client);

      // Pilih kalimat pengingat secara acak
      const reminderText = getRandomNightVoiceReminder();
      console.log(`🎙️ [Voice Night Reminder] Memutar pengingat 22:00 WIB di "${voiceChannel.name}" (${guild.name}) untuk ${nonBots.size} member.`);

      // Cek apakah ada antrean musik yang sedang berputar via DisTube
      const queue = client.distube?.getQueue(guild.id);
      let wasPlayingMusic = false;
      if (queue && queue.playing) {
        wasPlayingMusic = true;
        try {
          queue.pause();
          console.log(`⏸️ [Voice Night Reminder] Musik di-pause sementara untuk pengumuman malam.`);
        } catch (_) { }
      }

      // Putar audio suara AI pengingat malam
      await playVoiceAudio(voiceChannel, reminderText, client);

      // Jika sebelumnya musik sedang berputar, resume kembali setelah jeda
      if (wasPlayingMusic && queue) {
        setTimeout(() => {
          try {
            if (queue.paused) {
              queue.resume();
              console.log(`▶️ [Voice Night Reminder] Musik di-resume kembali.`);
            }
          } catch (_) { }
        }, 1500);
      }

      // Kirim pesan teks embed yang menenangkan di text channel voice
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🌙 Pengingat Istirahat Malam — 22:00 WIB')
        .setDescription(
          `> *" ${reminderText} "*\n\n` +
          `• **Saluran Voice:** <#${voiceChannel.id}>\n` +
          `• **Jumlah Member Aktif:** **${nonBots.size} orang**\n` +
          `• **Pesan:** Waktu sudah menunjukkan pukul 22:00 WIB. Terima kasih sudah meramaikan obrolan hari ini. Yuk sudahi kegiatan malam dan istirahat yang cukup ya! 💤`
        )
        .setFooter({ text: 'Sistem Pengingat Istirahat Otomatis Server' })
        .setTimestamp();

      let targetTextChannel = voiceChannel;
      if (typeof targetTextChannel.send !== 'function') {
        targetTextChannel = queue?.textChannel || guild.systemChannel;
      }

      if (targetTextChannel && typeof targetTextChannel.send === 'function') {
        targetTextChannel.send({ embeds: [embed] }).catch(() => { });
      }

    } catch (err) {
      console.error(`⚠️ [Voice Night Reminder] Gagal memutar di guild ${guild.name}:`, err.message);
    }
  }
}

/**
 * Memastikan bot tidak terkena Server Mute, Server Deafen, atau Self-Mute di guild.
 * Menghapus mute/deafen yang terlanjur terpasang sebelumnya pada bot.
 */
async function enforceBotVoiceImmunity(guild, client) {
  try {
    const me = guild.members.me;
    if (!me || !me.voice?.channelId) return;

    // 1. Melepaskan Server Mute jika aktif pada bot
    if (me.voice.serverMute) {
      console.log(`🔊 [Voice Immunity] Melepaskan Server Mute yang terpasang pada bot di "${guild.name}"...`);
      await me.voice.setMute(false, 'Auto-Recovery: Bot wajib dapat bersuara').catch(err => {
        console.warn(`⚠️ [Voice Immunity] Gagal melepas server mute di ${guild.name}:`, err.message);
      });
    }

    // 2. Melepaskan Server Deafen jika aktif pada bot
    if (me.voice.serverDeaf) {
      console.log(`🎧 [Voice Immunity] Melepaskan Server Deafen yang terpasang pada bot di "${guild.name}"...`);
      await me.voice.setDeaf(false, 'Auto-Recovery: Bot wajib dapat beroperasi normal').catch(err => {
        console.warn(`⚠️ [Voice Immunity] Gagal melepas server deafen di ${guild.name}:`, err.message);
      });
    }

    // 3. Melepaskan Self-Mute jika bot ter-self mute
    if (me.voice.selfMute) {
      me.voice.setMute(false).catch(() => { });
    }
  } catch (err) {
    console.warn(`⚠️ [Voice Immunity] Error checking voice immunity di ${guild.name}:`, err.message);
  }
}

module.exports = {
  handleVoiceWelcome,
  playVoiceAudio,
  getCleanMemberName,
  getRandomVoiceGreeting,
  getRandomNightVoiceReminder,
  broadcastVoiceNightReminder,
  enforceBotVoiceImmunity,
  fetchTTSAudio,
  userCooldowns,
  channelDebounce,
  USER_COOLDOWN_MS,
  NIGHT_VOICE_REMINDERS
};
