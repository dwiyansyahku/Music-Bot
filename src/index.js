require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const fs = require('fs');
const path = require('path');

// Set YTDLP_DIR to point to committed standalone binaries inside bin/
process.env.YTDLP_DIR = path.join(process.cwd(), 'bin');

// Anti-crash handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});


// Automatically find yt-dlp and ffmpeg in WinGet Packages and add them to PATH
const wingetPackagesPath = 'C:\\Users\\ASUS\\AppData\\Local\\Microsoft\\WinGet\\Packages';
if (fs.existsSync(wingetPackagesPath)) {
  try {
    const dirs = fs.readdirSync(wingetPackagesPath);
    const addedPaths = [];
    
    // Find yt-dlp dir
    const ytdlpDir = dirs.find(d => d.includes('yt-dlp.yt-dlp'));
    if (ytdlpDir) {
      addedPaths.push(path.join(wingetPackagesPath, ytdlpDir));
    }
    
    // Find ffmpeg dir
    const ffmpegPkgDir = dirs.find(d => d.includes('yt-dlp.FFmpeg'));
    if (ffmpegPkgDir) {
      const ffmpegSubDirs = fs.readdirSync(path.join(wingetPackagesPath, ffmpegPkgDir));
      if (ffmpegSubDirs.length > 0) {
        addedPaths.push(path.join(wingetPackagesPath, ffmpegPkgDir, ffmpegSubDirs[0], 'bin'));
      }
    }

    // Find Deno dir (required JS runtime for yt-dlp YouTube signature decryption)
    const denoDir = dirs.find(d => d.includes('DenoLand.Deno'));
    if (denoDir) {
      addedPaths.push(path.join(wingetPackagesPath, denoDir));
    }
    
    if (addedPaths.length > 0) {
      process.env.PATH = `${addedPaths.join(';')};${process.env.PATH}`;
      console.log('✅ Auto-configured PATH with binaries:', addedPaths);
    }
  } catch (err) {
    console.error('⚠️ Failed to auto-configure PATH:', err);
  }
}


const { Client, GatewayIntentBits, Collection, PermissionFlagsBits } = require('discord.js');
const storage = require('./utils/storage');
const circuitBreaker = require('./utils/circuitBreaker');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { YouTubePlugin } = require('@distube/youtube');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const http = require('http');

// Stream concurrency limiter — max 1 concurrent yt-dlp stream to reduce YouTube detection
let activeStreams = 0;
const MAX_CONCURRENT_STREAMS = 1;
const streamQueue = [];

let proxyServerPort = 0;

function startProxyServer() {
  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    if (parsedUrl.pathname === '/stream') {
      const videoUrl = parsedUrl.searchParams.get('url');
      if (!videoUrl) {
        res.writeHead(400);
        return res.end('Missing url parameter');
      }

      console.log(`🔌 [Proxy Server] Streaming: "${videoUrl}"`);
      
      const flags = {
        format: "ba[protocol^=http]",
        extractorArgs: 'youtube:player_skip=webpage,configs;youtube:player_client=android;youtubetab:skip=authcheck',
        userAgent: USER_AGENT,
        retries: 3,
        fragmentRetries: 3,
        socketTimeout: 15,
        sleepInterval: 3,
        maxSleepInterval: 10,
        jsRuntimes: 'node',
        output: '-'
      };

      const cookiesTxtPath = path.join(process.cwd(), 'cookies.txt');
      if (fs.existsSync(cookiesTxtPath)) {
        flags.cookies = cookiesTxtPath.replace(/\\/g, '/');
        console.log(`🍪 [Proxy Server] Passing cookies file: "${flags.cookies}"`);
      }

      const proxyUrl = process.env.PROXY_URL || process.env.YTDL_PROXY;
      if (proxyUrl) {
        flags.proxy = proxyUrl;
        console.log(`🌐 [Proxy Server] Using proxy: "${proxyUrl.replace(/:[^:@]+@/, ':***@')}"`);
      }

      const args = formatFlags(flags);
      args.push(videoUrl);

      res.writeHead(200, {
        'Content-Type': 'audio/webm',
        'Transfer-Encoding': 'chunked'
      });

      const ytdlpPath = process.platform === 'win32'
        ? path.join(process.cwd(), 'bin', 'yt-dlp.exe')
        : 'yt-dlp';

      const ytdlpProcess = spawn(ytdlpPath, args);

      ytdlpProcess.stdout.pipe(res);

      ytdlpProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('ERROR:')) {
          console.error(`❌ [Proxy Server] yt-dlp error: ${msg.trim()}`);
        }
      });

      req.on('close', () => {
        console.log(`🔌 [Proxy Server] Connection closed for: "${videoUrl}"`);
        ytdlpProcess.kill();
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(0, '127.0.0.1', () => {
    proxyServerPort = server.address().port;
    console.log(`🔌 [Proxy Server] Local stream proxy running on http://127.0.0.1:${proxyServerPort}`);
  });
}

startProxyServer();


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,   // Required for guildMemberAdd event (welcome feature)
    GatewayIntentBits.GuildPresences, // Required for online status in /userinfo
  ],
  rest: { timeout: 30_000 }, // 30s timeout to prevent AbortError on image uploads
});

client.commands = new Collection();
client.welcomeSettings = new Map(); // Per-guild welcome channel config: { channelId, enabled }
client.morningSettings = new Map(); // Per-guild morning reminder config: { channelId, enabled, hour, minute }
client.nightSettings = new Map();   // Per-guild night reminder config: { channelId, enabled, hour, minute }
client.afkUsers = new Map();        // Per-guild AFK user tracking: key=guildId_userId, value={ reason, timestamp, displayName }

const { setupCookies, getCookiesHealth } = require('./utils/cookies');
const loadedCookies = setupCookies();

// ============================================================
// Metadata Cache — hindari spawn yt-dlp berulang untuk URL sama
// TTL 10 menit agar data tidak basi
// ============================================================
const METADATA_CACHE_TTL = 10 * 60 * 1000; // 10 menit
const metadataCache = new Map();

// Cache menyimpan RAW JSON dari yt-dlp (bukan Song object),
// sehingga setiap request tetap membuat Song baru dengan options (member) yang benar.
function getCachedMetadata(url) {
  const entry = metadataCache.get(url);
  if (entry && Date.now() - entry.ts < METADATA_CACHE_TTL) {
    console.log(`📦 [Metadata Cache] HIT for: "${url}"`);
    return entry.data; // raw JSON info
  }
  return null;
}

function setCachedMetadata(url, data) {
  metadataCache.set(url, { data, ts: Date.now() });
  // Bersihkan cache lama jika terlalu besar (>100 entri)
  if (metadataCache.size > 100) {
    const oldest = [...metadataCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    metadataCache.delete(oldest[0]);
  }
}

// Plugins - yt-dlp handles YouTube and 1000+ other sites
const ytPlugin = new YouTubePlugin({ cookies: loadedCookies });
const ytdlpPlugin = new YtDlpPlugin({ update: false });

const { Song, Playlist } = require('distube');
const { spawn } = require('child_process');

function formatFlags(flags) {
  const args = [];
  for (const [key, value] of Object.entries(flags)) {
    const flagName = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    if (value === true) {
      args.push(flagName);
    } else if (value !== false && value !== null && value !== undefined) {
      args.push(flagName);
      args.push(String(value));
    }
  }
  return args;
}

function executeYtdlpRaw(url, flags, timeoutMs = 120000) {
  // Gunakan executable global 'yt-dlp' hasil pip3 di Linux (Railway),
  // sedangkan di Windows gunakan bin/yt-dlp.exe local.
  const ytdlpPath = process.platform === 'win32'
    ? path.join(process.cwd(), 'bin', 'yt-dlp.exe')
    : 'yt-dlp';
  
  const cmdArgs = [url].concat(formatFlags(flags)).filter(Boolean);
  
  return new Promise((resolve, reject) => {
    console.log(`⚡ [executeYtdlpRaw] Spawning: "${ytdlpPath}" ${cmdArgs.join(' ')}`);
    const proc = spawn(ytdlpPath, cmdArgs);
    
    let stdout = '';
    let stderr = '';
    
    const timeout = setTimeout(() => {
      console.warn(`⚠️ [executeYtdlpRaw] Process timed out after ${timeoutMs}ms. Killing process pid: ${proc.pid}`);
      proc.kill('SIGKILL');
      reject(new Error(`yt-dlp resolution timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);
    
    proc.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    
    proc.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    
    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        try {
          const firstBrace = stdout.indexOf('{');
          const firstBracket = stdout.indexOf('[');
          let startIndex = -1;
          if (firstBrace !== -1 && firstBracket !== -1) {
            startIndex = Math.min(firstBrace, firstBracket);
          } else {
            startIndex = firstBrace !== -1 ? firstBrace : firstBracket;
          }
          const cleanOutput = startIndex !== -1 ? stdout.slice(startIndex) : stdout;
          resolve(JSON.parse(cleanOutput));
        } catch (err) {
          reject(new Error(`JSON Parse Error: ${err.message}. Original Output: ${stdout}`));
        }
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || `Process exited with code ${code}`));
      }
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function customYtdlpJson(url, flags, timeoutMs = 120000) {
  try {
    return await executeYtdlpRaw(url, flags, timeoutMs);
  } catch (err) {
    const errText = err.message || '';
    const errLower = errText.toLowerCase();

    // Retry on rate limit (429) with a short delay
    if (errLower.includes('429') || errLower.includes('too many requests')) {
      console.warn('⚠️ [Rate Limit] YouTube 429 terdeteksi. Tunggu 3 detik lalu retry...');
      await new Promise(r => setTimeout(r, 3000));
      return await executeYtdlpRaw(url, flags, timeoutMs);
    }

    // Auto-fallback: Jika cookies kadaluarsa / bot check, coba multi-client fallback
    if (errLower.includes('rotated in the browser') || errLower.includes('cookies are no longer valid') ||
        errLower.includes('sign in') || errLower.includes('confirm you\'re not a bot') || errLower.includes('login_required')) {
      console.warn('🔄 [Cookies Fallback] YouTube bot-check/login terdeteksi. Mencoba multi-client fallback...');
      
      const fallbackClients = [
        'youtube:player_skip=webpage,configs;youtube:player_client=android;youtubetab:skip=authcheck',
        'youtube:player_skip=webpage,configs;youtube:player_client=android,ios;youtubetab:skip=authcheck',
        'youtube:player_skip=webpage,configs;youtube:player_client=ios,mweb;youtubetab:skip=authcheck',
        'youtube:player_skip=webpage,configs;youtube:player_client=tv_embedded,android;youtubetab:skip=authcheck'
      ];

      for (const clientArgs of fallbackClients) {
        // Coba dengan cookies
        const fallbackFlagsWithCookies = { ...flags };
        fallbackFlagsWithCookies.extractorArgs = clientArgs;
        try {
          console.log(`🔄 [Cookies Fallback] Mencoba fallback dengan cookies & extractorArgs: "${clientArgs}"...`);
          return await executeYtdlpRaw(url, fallbackFlagsWithCookies, timeoutMs);
        } catch (_) {}

        // Coba tanpa cookies jika dengan cookies tetap terblokir
        const fallbackFlagsNoCookies = { ...flags };
        delete fallbackFlagsNoCookies.cookies;
        fallbackFlagsNoCookies.extractorArgs = clientArgs;
        try {
          console.log(`🔄 [Cookies Fallback] Mencoba fallback tanpa cookies & extractorArgs: "${clientArgs}"...`);
          return await executeYtdlpRaw(url, fallbackFlagsNoCookies, timeoutMs);
        } catch (fErr) {
          console.warn(`⚠️ [Cookies Fallback] Client "${clientArgs}" gagal:`, fErr.message?.split('\n')?.[0] || fErr.message);
        }
      }
    }

    if (errLower.includes('sign in') || errLower.includes('login_required') ||
        errLower.includes('confirm you\'re not a bot')) {
      console.warn(`⚠️ [Auth Error] YouTube meminta login. Pastikan cookies diexport dari Incognito dan Incognito langsung ditutup.`);
    }

    throw err;
  }
}


// Helper to convert yt-dlp info to DisTube Song
function createYtDlpSong(plugin, info, options) {
  return new Song({
    plugin,
    source: info.extractor || 'youtube',
    playFromSource: true,
    id: info.id,
    name: info.title || info.fulltitle,
    url: info.webpage_url || info.original_url || info.url || `https://www.youtube.com/watch?v=${info.id}`,
    isLive: info.is_live,
    thumbnail: info.thumbnail || info.thumbnails?.[0]?.url,
    duration: info.is_live ? 0 : info.duration,
    uploader: {
      name: info.uploader,
      url: info.uploader_url
    },
    views: info.view_count,
    likes: info.like_count,
    dislikes: info.dislike_count,
    reposts: info.repost_count,
    ageRestricted: Boolean(info.age_limit) && info.age_limit >= 18
  }, options);
}

// Override ytdlpPlugin.resolve to avoid passing deprecated --no-call-home option
ytdlpPlugin.resolve = async function(url, options) {
  console.log(`🌐 [ytdlpPlugin.resolve] Starting resolution for URL: "${url}"`);
  
  // Circuit breaker check — jangan request jika YouTube sedang blokir
  const cbCheck = circuitBreaker.canRequest();
  if (!cbCheck.allowed) {
    throw new Error(cbCheck.message);
  }

  const flags = {
    dumpSingleJson: true,
    noWarnings: false,
    verbose: true,
    skipDownload: true,
    simulate: true,
    extractorArgs: 'youtube:player_skip=webpage,configs;youtube:player_client=android;youtubetab:skip=authcheck',
    userAgent: USER_AGENT,
    retries: 3,
    fragmentRetries: 3,
    socketTimeout: 15,
    sleepInterval: 3,
    maxSleepInterval: 10,
    noPlaylist: true,
    jsRuntimes: 'node'
  };

  // If cookies.txt exists, pass it explicitly via command line
  const cookiesTxtPath = path.join(process.cwd(), 'cookies.txt');
  if (fs.existsSync(cookiesTxtPath)) {
    flags.cookies = cookiesTxtPath.replace(/\\/g, '/');
    console.log(`🍪 [ytdlpPlugin.resolve] Passing cookies file: "${flags.cookies}"`);
  } else {
    console.log('ℹ️ [ytdlpPlugin.resolve] No cookies.txt found, resolving without cookies.');
  }

  const proxyUrl = process.env.PROXY_URL || process.env.YTDL_PROXY;
  if (proxyUrl) {
    flags.proxy = proxyUrl;
    console.log(`🌐 [ytdlpPlugin.resolve] Using proxy: "${proxyUrl.replace(/:[^:@]+@/, ':***@')}"`);
  }

  // Smart playlist detection berdasarkan jenis URL YouTube:
  //
  // PLAYLIST (fetch banyak lagu):
  //   - list=PL...              → playlist buatan user
  //   - list=... + start_radio=1 → user aktif memulai radio/mix (e.g. list=RDMM&start_radio=1)
  //
  // SINGLE VIDEO (strip list=, main 1 lagu):
  //   - list=RD{videoId}       → YouTube auto-append mix ID saat copy link (tanpa start_radio)
  //   - list=LL/WL/FL/...      → liked/watch later/favorites, ada videoId di URL
  //
  // Contoh:
  //   https://youtu.be/Az94B3MNHBU?list=RDAz94B3MNHBU          → single video ✅
  //   https://youtube.com/watch?v=X&list=RDMM&start_radio=1    → playlist/mix ✅
  //   https://youtube.com/watch?v=X&list=PLxxxxxxxx             → user playlist ✅
  if (url.includes('list=')) {
    try {
      const parsedUrl = new URL(url);
      const listParam = parsedUrl.searchParams.get('list');
      const videoId = parsedUrl.searchParams.get('v') ||
                      url.match(/youtu\.be\/([^?&#]+)/)?.[1];
      const isStartRadio = parsedUrl.searchParams.get('start_radio') === '1';

      if (listParam && listParam.startsWith('PL')) {
        // Playlist buatan user (e.g. PLxxxxxx) — fetch hingga 50 lagu
        flags.noPlaylist = false;    // Izinkan expand playlist
        flags.playlistEnd = 50;
        flags.flatPlaylist = true;
        console.log(`📜 [ytdlpPlugin.resolve] User playlist (${listParam}), limit 50 items.`);
      } else if (isStartRadio) {
        // User aktif mulai radio/mix (start_radio=1) — fetch sebagai playlist
        flags.noPlaylist = false;    // Izinkan expand mix
        flags.playlistEnd = 50;
        flags.flatPlaylist = true;
        console.log(`📣 [ytdlpPlugin.resolve] Radio/Mix aktif (${listParam}, start_radio=1), fetch as playlist.`);
      } else if (videoId) {
        // list= auto-ditambahkan YouTube saat copy link — strip, main 1 lagu saja
        // noPlaylist tetap true (default) untuk memastikan yt-dlp tidak expand
        url = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`🎵 [ytdlpPlugin.resolve] Auto-appended list= stripped (${listParam}), single video: ${videoId}`);
      } else {
        // Tidak ada videoId — treat sebagai playlist
        flags.noPlaylist = false;
        flags.playlistEnd = 50;
        flags.flatPlaylist = true;
        console.log(`📜 [ytdlpPlugin.resolve] Unknown playlist type (${listParam}), limit 50 items.`);
      }
    } catch {
      // URL parse gagal — fallback aman
      flags.noPlaylist = false;
      flags.playlistEnd = 50;
      flags.flatPlaylist = true;
    }
  }


  // Cache check dilakukan SETELAH normalisasi URL (list= stripping) agar key konsisten
  const cacheKey = url;
  const cachedInfo = getCachedMetadata(cacheKey);

  let info;
  if (cachedInfo) {
    info = cachedInfo;
  } else {
    console.log('⚡ [ytdlpPlugin.resolve] Executing yt-dlp process...');
    const startTime = Date.now();

    info = await customYtdlpJson(url, flags).catch((e2) => {
      console.error(`❌ [ytdlpPlugin.resolve] Execution failed after ${Date.now() - startTime}ms. Error:`, e2.stderr || e2);
      throw new Error(`${e2.stderr || e2}`);
    });

    console.log(`✅ [ytdlpPlugin.resolve] Execution completed successfully in ${Date.now() - startTime}ms`);
    circuitBreaker.recordSuccess();

    // Simpan RAW JSON ke cache (bukan Song object) — playlist & pencarian tidak di-cache
    if (!url.startsWith('ytsearch') && !Array.isArray(info.entries)) {
      setCachedMetadata(cacheKey, info);
    }
  }

  // Buat Song/Playlist baru setiap kali agar options (member, interaction) selalu benar
  if (Array.isArray(info.entries)) {
    if (info.entries.length === 0) throw new Error("The playlist is empty");
    console.log(`🎵 [ytdlpPlugin.resolve] Resolved as playlist with ${info.entries.length} songs`);
    return new Playlist({
      source: info.extractor,
      songs: info.entries.map((i) => createYtDlpSong(this, i, options)),
      id: info.id.toString(),
      name: info.title,
      url: info.webpage_url,
      thumbnail: info.thumbnails?.[0]?.url
    }, options);
  }

  console.log(`🎵 [ytdlpPlugin.resolve] Resolved as single song: "${info.title || info.fulltitle}"`);
  return createYtDlpSong(this, info, options);
};

ytdlpPlugin.getStreamURL = async function(song) {
  if (!song.url) {
    throw new Error("Cannot get stream URL from invalid song.");
  }

  // Circuit breaker check
  const cbCheck = circuitBreaker.canRequest();
  if (!cbCheck.allowed) {
    throw new Error(cbCheck.message);
  }

  const ageRestrictedParam = song.ageRestricted ? '&ageRestricted=true' : '';
  const streamUrl = `http://127.0.0.1:${proxyServerPort}/stream?url=${encodeURIComponent(song.url)}${ageRestrictedParam}`;
  console.log(`🔌 [ytdlpPlugin.getStreamURL] Proxying stream for "${song.name}" via port ${proxyServerPort}`);
  return streamUrl;
};

// Bypass ytdl-core stream extractor and use highly robust yt-dlp instead
ytPlugin.getStreamURL = async function(song) {
  return ytdlpPlugin.getStreamURL(song);
};

// Bypass ytdl-core metadata extractor and use highly robust yt-dlp instead
ytPlugin.resolve = async function(url, options) {
  return ytdlpPlugin.resolve(url, options);
};

// Custom autoplay: when queue.autoplay = true, search for a related song via yt-dlp.
// IMPORTANT: songs are created with song.plugin = ytdlpPlugin (via createYtDlpSong),
// so DisTube calls ytdlpPlugin.getRelatedSongs — we must override BOTH plugins.
async function autoplaySearch(song) {
  // Get the queue safely
  let queue = null;
  try {
    const guildId = song.member?.guild?.id || 
                    song.metadata?.message?.guild?.id || 
                    song.metadata?.interaction?.guild?.id || 
                    song.guildId;
    
    if (guildId) {
      queue = client.distube.getQueue(guildId);
    }
    
    // If not found, try searching in active queues for a queue containing this song
    if (!queue && client.distube.queues?.collection) {
      queue = [...client.distube.queues.collection.values()].find(q => 
        q.songs.some(s => s.id === song.id) || 
        q.previousSongs.some(s => s.id === song.id)
      );
    }
    
    // Fallback: if there is only one active queue, use it
    if (!queue && client.distube.queues?.collection && client.distube.queues.collection.size === 1) {
      queue = [...client.distube.queues.collection.values()][0];
    }
  } catch (err) {
    console.error('⚠️ [Autoplay] Failed to fetch queue:', err.message);
  }

  if (!queue?.autoplay) {
    console.log('🔕 [Autoplay] getRelatedSongs dipanggil tapi autoplay off — skip.');
    return [];
  }

  const artist = song.uploader?.name || song.name.split(' ')[0] || 'popular';
  const searchQuery = `${artist} music track`;
  console.log(`🔄 [Autoplay] Mencari lagu serupa: "${searchQuery}"`);

  try {
    const resolved = await ytdlpPlugin.resolve(`ytsearch5:${searchQuery}`, {});
    if (resolved && resolved.songs && resolved.songs.length > 0) {
      // Filter out the currently playing song
      const availableSongs = resolved.songs.filter(s => s.url !== song.url && s.name !== song.name);
      
      if (availableSongs.length > 0) {
        // Pick a random song from the search results to provide variety
        const randomSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
        console.log(`✅ [Autoplay] Lagu serupa ditemukan: "${randomSong.name}"`);
        return [randomSong];
      }
    } else if (resolved && !resolved.songs) {
      // Fallback if it somehow resolved as a single song
      return [resolved];
    }
  } catch (err) {
    console.error('❌ [Autoplay] Gagal cari lagu serupa:', err.message);
  }
  return [];
}

ytPlugin.getRelatedSongs = autoplaySearch;
ytdlpPlugin.getRelatedSongs = autoplaySearch;


// Bypass broken ytsr search library and use highly robust yt-dlp search instead
ytPlugin.searchSong = async function(query, options) {
  try {
    console.log(`🔍 [yt-dlp Search] Searching for: "${query}"`);
    const resolved = await ytdlpPlugin.resolve(`ytsearch1:${query}`, options);
    if (resolved && Array.isArray(resolved.songs)) {
      return resolved.songs[0] || null;
    }
    return resolved;
  } catch (err) {
    console.error('⚠️ [yt-dlp Search] Error:', err.message);
    return null;
  }
};

const plugins = [
  ytPlugin,
  new SoundCloudPlugin(),
  ytdlpPlugin,
];

const spotifyId = process.env.SPOTIFY_CLIENT_ID;
const spotifySecret = process.env.SPOTIFY_CLIENT_SECRET;
const hasSpotifyCreds = spotifyId && spotifySecret && 
                        spotifyId !== 'your_spotify_client_id_here' && 
                        spotifySecret !== 'your_spotify_client_secret_here';

if (hasSpotifyCreds) {
  plugins.unshift(new SpotifyPlugin({
    api: {
      clientId: spotifyId,
      clientSecret: spotifySecret,
    },
  }));
  console.log('✅ Spotify plugin aktif dengan API credentials');
} else {
  plugins.unshift(new SpotifyPlugin());
  console.log('✅ Spotify plugin aktif (auto-credentials)');
}

client.stay247 = new Set();
client.autoplaySettings = new Map();
client.emptyTimeouts = new Map();

// Build headers for FFmpeg from YT_COOKIES to bypass 403 Forbidden on HLS segments
// Build global HTTP headers for FFmpeg from YT_COOKIES to bypass 403 Forbidden on HLS segments
let ffmpegInputArgs = {};
if (process.env.YT_COOKIES) {
  try {
    let rawCookies = process.env.YT_COOKIES.trim();
    if (rawCookies.startsWith('"') && rawCookies.endsWith('"')) {
      rawCookies = rawCookies.substring(1, rawCookies.length - 1);
    } else if (rawCookies.startsWith("'") && rawCookies.endsWith("'")) {
      rawCookies = rawCookies.substring(1, rawCookies.length - 1);
    }
    rawCookies = rawCookies.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
    const cookiesArray = JSON.parse(rawCookies);
    const cookiePairs = cookiesArray
      .map(c => `${c.name}=${c.value}`);
    if (cookiePairs.length > 0) {
      ffmpegInputArgs = {
        'headers': `User-Agent: ${USER_AGENT}\r\nCookie: ${cookiePairs.join('; ')}\r\nOrigin: https://www.youtube.com\r\nReferer: https://www.youtube.com/\r\n`
      };
    }
  } catch (err) {
    console.error('⚠️ [FFmpeg Helper] Gagal memformat cookies untuk FFmpeg headers:', err.message);
  }
}

const distubeOptions = {
  plugins,
  emitNewSongOnly: false,
  joinNewVoiceChannel: true,
  nsfw: false,
  emitAddSongWhenCreatingQueue: true,
  emitAddListWhenCreatingQueue: true,
};

if (Object.keys(ffmpegInputArgs).length > 0) {
  distubeOptions.ffmpeg = {
    args: {
      input: ffmpegInputArgs
    }
  };
  console.log('✅ [FFmpeg Helper] Konfigurasi header HTTP (User-Agent, Cookie, Origin, Referer) dipasang untuk bypass HLS 403');
}

client.distube = new DisTube(client, distubeOptions);

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const mod = require(path.join(commandsPath, file));
  // Support: single export, array export, dan named object export { cmd1, cmd2 }
  const rawCmds = Array.isArray(mod) ? mod : [mod];
  // Flatten named object exports (e.g., { birthday: {...}, ... })
  const cmds = rawCmds.flatMap(item => {
    if (item && item.data) return [item]; // standard single command
    if (item && typeof item === 'object') {
      return Object.values(item).filter(v => v && v.data && v.execute);
    }
    return [];
  });
  for (const cmd of cmds) {
    if (cmd.data && cmd.execute) {
      client.commands.set(cmd.data.name, cmd);
      console.log(`✅ Loaded: /${cmd.data.name}`);
    }
  }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Track and debug voice connection states
const { getVoiceConnection } = require('@discordjs/voice');
const voiceTracker = require('./utils/voiceTracker');
client.on('voiceStateUpdate', (oldState, newState) => {
  const guildId = oldState.guild.id;

  // Track voice channel duration & companions
  voiceTracker.handleVoiceStateUpdate(oldState, newState, client);

  // =============================================
  // ENFORCE JAIL VOICE RULES
  // =============================================
  if (newState.channelId) {
    const settings = storage.read('settings');
    const jailConfig = settings[guildId]?.jail;

    if (jailConfig && jailConfig.voiceChannelId) {
      const jailedData = storage.read('jail');
      const guildJails = jailedData[guildId] || {};
      const isJailed = !!guildJails[newState.id];

      if (isJailed) {
        // Tahanan coba masuk VC lain -> seret balik ke VC penjara!
        if (newState.channelId !== jailConfig.voiceChannelId) {
          const member = newState.member;
          if (member) {
            member.voice.setChannel(jailConfig.voiceChannelId).catch(err => {
              console.error(`[Jail Enforcer] Gagal menyeret balik ${member.user.tag} ke VC penjara:`, err.message);
            });
          }
        }
      } else {
        // Warga biasa coba masuk VC penjara -> tendang keluar dari voice!
        if (newState.channelId === jailConfig.voiceChannelId) {
          const MOD_ROLE_ID = '1396257049884622899';
          const TRUSTED_USER_IDS = ['1363187094973055116'];
          const hasModPerms = newState.member?.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                              newState.member?.roles.cache.has(MOD_ROLE_ID) ||
                              TRUSTED_USER_IDS.includes(newState.member?.id);
          if (!hasModPerms) {
            newState.disconnect('Bukan narapidana atau moderator/admin!').catch(err => {
              console.error(`[Jail Enforcer] Gagal menendang user non-jail dari VC penjara:`, err.message);
            });
          }
        }
      }
    }
  }

  // If the bot itself leaves, clear any pending empty timeouts
  if (oldState.id === client.user.id && !newState.channelId) {
    if (client.emptyTimeouts && client.emptyTimeouts.has(guildId)) {
      clearTimeout(client.emptyTimeouts.get(guildId));
      client.emptyTimeouts.delete(guildId);
    }
  }

  // Empty Channel Handler:
  const botVoiceChannel = oldState.guild.members.me?.voice?.channel;
  if (botVoiceChannel) {
    const nonBotMembers = botVoiceChannel.members.filter(m => !m.user.bot);
    const is247 = client.stay247 && client.stay247.has(guildId);
    
    if (nonBotMembers.size === 0) {
      if (!is247) {
        if (!client.emptyTimeouts.has(guildId)) {
          const queue = client.distube.getQueue(guildId);
          if (queue && queue.textChannel) {
            queue.textChannel.send('🎵 **Voice channel kosong.** Bot akan keluar dalam 1 menit.').catch(() => {});
          }
          
          const timeout = setTimeout(async () => {
            const currentChannel = oldState.guild.members.me?.voice?.channel;
            if (currentChannel) {
              const currentNonBots = currentChannel.members.filter(m => !m.user.bot);
              const stillNot247 = !client.stay247?.has(guildId);
              if (currentNonBots.size === 0 && stillNot247) {
                const currentQueue = client.distube.getQueue(guildId);
                if (currentQueue) {
                  await currentQueue.stop().catch(() => {});
                  if (currentQueue.textChannel) {
                    currentQueue.textChannel.send('👋 **Bot keluar dari voice channel karena kosong.**').catch(() => {});
                  }
                }
                const disTubeVoice = client.distube.voices.get(guildId);
                if (disTubeVoice) disTubeVoice.leave();
              }
            }
            client.emptyTimeouts.delete(guildId);
          }, 60000);
          
          client.emptyTimeouts.set(guildId, timeout);
        }
      }
    } else {
      if (client.emptyTimeouts.has(guildId)) {
        clearTimeout(client.emptyTimeouts.get(guildId));
        client.emptyTimeouts.delete(guildId);
        
        const queue = client.distube.getQueue(guildId);
        if (queue && queue.textChannel) {
          queue.textChannel.send('🎵 **User bergabung kembali.** Otomatis keluar dibatalkan.').catch(() => {});
        }
      }
    }
  }

  // 24/7 Enforcer: If the bot itself disconnects (or gets kicked) and 24/7 is enabled, force it to rejoin!
  if (oldState.id === client.user.id && oldState.channelId && !newState.channelId) {
    if (client.stay247 && client.stay247.has(guildId)) {
      console.log(`♻️ [24/7 Enforcer] Bot terputus dari voice channel di guild ${guildId}. Memaksa masuk kembali...`);

      // Inisialisasi retry counter per guild
      if (!client._enforcerRetries) client._enforcerRetries = new Map();
      const retryCount = client._enforcerRetries.get(guildId) || 0;

      if (retryCount >= 3) {
        console.warn(`♻️ [24/7 Enforcer] Sudah gagal 3x di guild ${guildId}. Menonaktifkan 24/7 sementara agar tidak spam.`);
        client.stay247.delete(guildId);
        client._enforcerRetries.delete(guildId);
        // Kirim notif ke text channel jika ada queue
        const queueForNotif = client.distube.getQueue(guildId);
        if (queueForNotif?.textChannel) {
          queueForNotif.textChannel.send('⚠️ **24/7 dinonaktifkan otomatis** karena bot gagal reconnect 3x berturut-turut. Gunakan `/q247` untuk mengaktifkan kembali.').catch(() => {});
        }
        return;
      }

      // Delay 5 detik sebelum reconnect untuk menghindari API spam
      setTimeout(async () => {
        if (!client.stay247.has(guildId)) return; // Sudah dinonaktifkan saat delay

        const channelToJoin = oldState.channel || client.channels.cache.get(oldState.channelId);
        if (!channelToJoin) {
          console.log(`♻️ [24/7 Enforcer] Channel ${oldState.channelId} tidak ditemukan (mungkin dihapus). Menonaktifkan 24/7 untuk guild ini.`);
          client.stay247.delete(guildId);
          client._enforcerRetries.delete(guildId);
          return;
        }

        // Cek apakah ada user (non-bot) di channel sebelum masuk
        const humanMembers = channelToJoin.members?.filter(m => !m.user.bot);
        if (!humanMembers || humanMembers.size === 0) {
          console.log(`♻️ [24/7 Enforcer] Channel ${channelToJoin.name} kosong (tidak ada user). Menunggu user bergabung...`);
          // Reset retry counter karena ini bukan kegagalan koneksi, tapi memang kosong
          client._enforcerRetries.set(guildId, 0);
          return;
        }

        try {
          // Bersihkan ghost connection @discordjs/voice sebelum DisTube join
          const ghostConn = getVoiceConnection(guildId);
          if (ghostConn) {
            console.log(`♻️ [24/7 Enforcer] Destroying ghost voice connection di guild ${guildId}...`);
            ghostConn.destroy();
            await new Promise(r => setTimeout(r, 500));
          }
          await client.distube.voices.join(channelToJoin);
          console.log(`♻️ [24/7 Enforcer] Berhasil reconnect ke ${channelToJoin.name} di guild ${guildId}.`);
          client._enforcerRetries.set(guildId, 0); // Reset counter setelah berhasil
        } catch (err) {
          const attempt = (client._enforcerRetries.get(guildId) || 0) + 1;
          client._enforcerRetries.set(guildId, attempt);
          if (err.errorCode === 'VOICE_CONNECT_FAILED') {
            console.warn(`♻️ [24/7 Enforcer] Gagal reconnect (percobaan ${attempt}/3) ke guild ${guildId}: VOICE_CONNECT_FAILED — timeout 30s.`);
          } else {
            console.warn(`♻️ [24/7 Enforcer] Gagal reconnect (percobaan ${attempt}/3) ke guild ${guildId}:`, err.message);
          }
          // Reset retry counter setelah 2 menit agar tidak terblokir permanen
          setTimeout(() => {
            if ((client._enforcerRetries.get(guildId) || 0) > 0) {
              client._enforcerRetries.set(guildId, 0);
              console.log(`♻️ [24/7 Enforcer] Retry counter di-reset untuk guild ${guildId}.`);
            }
          }, 2 * 60 * 1000);
        }
      }, 5000); // Tunggu 5 detik sebelum coba reconnect
    }
  }

  const connection = getVoiceConnection(guildId);
  if (connection && !connection.listenerAdded) {
    connection.listenerAdded = true;
    console.log(`🔊 [Voice Connection] Found connection for guild: ${guildId}. Attaching stateChange tracker.`);
    connection.on('stateChange', (oldVoiceState, newVoiceState) => {
      console.log(`🔊 [Voice Connection] State changed from "${oldVoiceState.status}" to "${newVoiceState.status}"`);
      if (newVoiceState.status === 'disconnected') {
        console.log(`❌ [Voice Connection] Disconnected.`);
      }
    });
  }
});

// Debug logging disabled for performance

// DisTube Events
const { nowPlayingEmbed, addedToQueueEmbed, addedPlaylistEmbed, autoplayEmbed } = require('./utils/embeds');
const { createMusicControlRows } = require('./utils/musicButtons');

// Helper untuk live-update progress bar Now Playing secara periodik (setiap 6s aman dari rate limit)
function startLiveProgressUpdater(queue) {
  if (queue._progressInterval) {
    clearInterval(queue._progressInterval);
    queue._progressInterval = null;
  }

  queue._progressInterval = setInterval(async () => {
    if (!queue || !queue.playing || queue.paused || !queue.songs || queue.songs.length === 0 || !queue._nowPlayingMsg) {
      return;
    }

    try {
      const embed = nowPlayingEmbed(queue.songs[0], queue);
      await queue._nowPlayingMsg.edit({ embeds: [embed] });
    } catch (err) {
      if (err.code === 10008) { // Unknown Message
        clearInterval(queue._progressInterval);
        queue._progressInterval = null;
        queue._nowPlayingMsg = null;
      }
    }
  }, 6000);
}

function stopLiveProgressUpdater(queue) {
  if (queue && queue._progressInterval) {
    clearInterval(queue._progressInterval);
    queue._progressInterval = null;
  }
}

// Track lagu terakhir per guild untuk fitur autoplay
const lastSongPerGuild = new Map();

client.distube
  .on('playSong', async (queue, song) => {
    // Jangan kirim kartu "Sedang Diputar" jika lagu berasal dari Music Quiz (agar tidak membocorkan jawaban!)
    if (song.metadata?.isQuiz || queue.isQuiz) {
      stopLiveProgressUpdater(queue);
      if (queue._nowPlayingMsg) {
        queue._nowPlayingMsg.delete().catch(() => {});
        queue._nowPlayingMsg = null;
      }
      return;
    }

    // Simpan lagu yang sedang diputar sebagai "lagu terakhir" untuk autoplay
    lastSongPerGuild.set(queue.id, { name: song.name, uploader: song.uploader?.name });

    // Hapus pesan "Mencari..." dari slash command /play jika ada
    if (song.metadata?.interaction) {
      song.metadata.interaction.deleteReply().catch(() => {});
    }

    const embed = nowPlayingEmbed(song, queue);
    const rows = createMusicControlRows(queue);

    // Edit pesan NowPlaying yang sama (persistent) — simpan referensi di queue object
    if (queue._nowPlayingMsg) {
      try {
        await queue._nowPlayingMsg.edit({ embeds: [embed], components: rows });
        startLiveProgressUpdater(queue);
        return;
      } catch {
        // Pesan dihapus atau tidak bisa diedit — kirim baru
        queue._nowPlayingMsg = null;
      }
    }

    // Kirim pesan baru dan simpan referensinya
    queue._nowPlayingMsg = await queue.textChannel?.send({ embeds: [embed], components: rows }).catch(() => null);
    startLiveProgressUpdater(queue);
  })
  .on('addSong', (queue, song) => {
    // Jangan kirim notifikasi jika lagu berasal dari Music Quiz
    if (song.metadata?.isQuiz || queue.isQuiz) {
      return;
    }

    // Hanya tampilkan notifikasi jika lagu ditambahkan ke antrian yang SUDAH BERJALAN
    // (queue.songs.length > 1 artinya sudah ada lagu yang sedang diputar)
    if (queue.songs.length > 1) {
      queue.textChannel?.send({ embeds: [addedToQueueEmbed(song, queue)] }).catch(() => {});
    }
  })
  .on('addList', (queue, playlist) => {
    // Hanya tampilkan notifikasi jika playlist ditambahkan ke antrian yang SUDAH BERJALAN
    // (queue.songs.length > playlist.songs.length artinya ada lagu lain sebelumnya)
    if (queue.songs.length > playlist.songs.length) {
      queue.textChannel?.send({ embeds: [addedPlaylistEmbed(playlist, queue)] }).catch(() => {});
    }
  })
  .on('error', async (error, queue) => {
    console.error('DisTube Error:', error);

    const errMsg = error.message || '';
    const errLower = errMsg.toLowerCase();
    let userMsg = `❌ **Gagal memutar lagu ini.**`;

    // Circuit breaker: laporkan error
    const cbResult = circuitBreaker.recordError(errMsg);

    // Pesan error yang informatif berdasarkan jenis error
    if (circuitBreaker.isAuthError(errMsg)) {
      userMsg += `\n🍪 **YouTube membatasi bot.** Cookies mungkin expired atau terlalu banyak request.`;

      // Jika circuit breaker trip ATAU terlalu banyak error berturut → STOP queue, jangan skip
      if (cbResult.shouldStop) {
        userMsg += `\n\n${cbResult.message}`;
        userMsg += `\n⏹️ Antrian dihentikan otomatis untuk mencegah spam error.`;
        queue?.textChannel?.send(userMsg).catch(() => {});

        // Stop queue tanpa leave VC
        try {
          if (queue && queue.songs) queue.songs.length = 0;
          await queue?.stop().catch(() => {});
        } catch (_) {}
        return;
      }

      // Alert ke owner via DM (hanya sekali, saat pertama kali)
      const cbStatus = circuitBreaker.getStatus();
      if (cbStatus.consecutiveStreamErrors === 1) {
        try {
          if (!client.application.owner) await client.application.fetch();
          const owner = client.application.owner;
          const ownerId = owner?.id || owner?.members?.first()?.id;
          if (ownerId) {
            const ownerUser = await client.users.fetch(ownerId).catch(() => null);
            if (ownerUser) {
              ownerUser.send([
                `🚨 **[Bot Alert] YouTube Auth Error!**`,
                `Server: **${queue?.textChannel?.guild?.name || 'Unknown'}**`,
                `Error: \`${errMsg.slice(0, 200)}\``,
                `Cek cookies atau tunggu cooldown otomatis.`
              ].join('\n')).catch(() => {});
            }
          }
        } catch (alertErr) {
          console.warn('[Alert] Gagal kirim DM ke owner:', alertErr.message);
        }
      }
    } else if (errLower.includes('429') || errLower.includes('too many requests')) {
      userMsg += `\n⏳ YouTube membatasi request bot. Tunggu sebentar sebelum request lagu lagi.`;
    } else if (errLower.includes('video unavailable') || errLower.includes('not available')) {
      userMsg += `\n🚫 Video tidak tersedia atau diblokir di region server.`;
    } else if (errLower.includes('connect to the voice channel') || errLower.includes('voice_connect_failed')) {
      userMsg += `\n📶 Koneksi suara ke Discord gagal. Coba pindah ke voice channel lain atau ubah region voice channel.`;
    } else if (errLower.includes('age') || errLower.includes('age_restricted')) {
      userMsg += `\n🔞 Video dibatasi umur dan tidak bisa diputar.`;
    } else if (errMsg.length > 0) {
      userMsg += `\n\`${errMsg.slice(0, 150)}\``;
    }

    // Auto-skip HANYA jika bukan auth error (auth error → semua lagu berikutnya juga pasti gagal)
    if (!circuitBreaker.isAuthError(errMsg) && queue && queue.songs && queue.songs.length > 1) {
      userMsg += `\n⏩ Melanjutkan ke lagu berikutnya...`;
      try {
        await queue.skip();
      } catch (skipErr) {
        console.warn('[Error Handler] Gagal skip lagu:', skipErr.message);
      }
    }

    queue?.textChannel?.send(userMsg).catch(() => {});
  })
  .on('initQueue', (queue) => {
    const guildId = queue.textChannel?.guild?.id;
    const persistentAutoplay = client.autoplaySettings?.get(guildId) || false;
    queue.autoplay = persistentAutoplay;
    console.log(`🤖 [Autoplay] Antrean diinisialisasi untuk server: ${queue.textChannel?.guild?.name}. Autoplay: ${persistentAutoplay}`);
  })
  .on('finish', async (queue) => {
    stopLiveProgressUpdater(queue);
    // Jika sedang dalam sesi Music Quiz, abaikan notifikasi antrean selesai
    if (queue.isQuiz) return;

    // Update pesan NowPlaying — antrean selesai
    if (queue._nowPlayingMsg) {
      queue._nowPlayingMsg.edit({ embeds: [], content: '✅ **Antrean lagu telah selesai.**' }).catch(() => {});
      queue._nowPlayingMsg = null;
    }

    if (!queue.autoplay) {
      const lastUser = queue.previousSongs && queue.previousSongs.length > 0
        ? queue.previousSongs[queue.previousSongs.length - 1].user
        : null;

      if (client.stay247 && client.stay247.has(queue.textChannel?.guild?.id)) {
        const mention = lastUser ? `<@${lastUser.id}>, ` : '';
        queue.textChannel?.send(`✅ ${mention}**Antrean lagu telah selesai!** Bot tetap standby di voice channel (Mode 24/7).`);
      } else {
        queue.textChannel?.send('✅ **Antrean lagu telah selesai!** Bot akan keluar dalam 2 menit jika tidak ada lagu baru.');
        setTimeout(() => {
          if (queue.voice && !queue.playing && client.stay247 && !client.stay247.has(queue.textChannel?.guild?.id)) {
            queue.voice.leave();
            const mention = lastUser ? `<@${lastUser.id}>, ` : '';
            queue.textChannel?.send(`👋 ${mention}Bot telah keluar dari voice channel karena antrean lagu sudah habis.`);
          }
        }, 120000);
      }
    }
  })
  .on('disconnect', (queue) => {
    if (queue._stoppedByCmd) {
      queue._stoppedByCmd = false;
      if (queue._nowPlayingMsg) {
        queue._nowPlayingMsg.delete().catch(() => {});
        queue._nowPlayingMsg = null;
      }
      return;
    }
    if (queue._nowPlayingMsg) {
      queue._nowPlayingMsg.edit({ embeds: [], content: '👋 **Bot terputus dari voice channel.**' }).catch(() => {});
      queue._nowPlayingMsg = null;
    } else {
      queue.textChannel?.send('👋 **Bot terputus dari voice channel.**').catch(() => {});
    }
  })
  .on('empty', (queue) => {
    if (client.stay247 && client.stay247.has(queue.textChannel?.guild?.id)) {
      queue.textChannel?.send('🎵 **Voice channel kosong.** Bot tetap standby di sini (Mode 24/7).');
    } else {
      queue.textChannel?.send('🎵 **Voice channel kosong.** Bot akan keluar dalam 1 menit.');
      setTimeout(() => {
        const guild = queue.textChannel?.guild;
        const voiceChannel = guild?.members.me?.voice?.channel;
        if (voiceChannel && voiceChannel.members.filter(m => !m.user.bot).size === 0 && client.stay247 && !client.stay247.has(guild.id)) {
          if (queue.voice) queue.voice.leave();
          queue.textChannel?.send('👋 **Bot keluar dari voice channel karena kosong.**');
        }
      }, 60000);
    }
  });

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN tidak ditemukan di .env!');
  process.exit(1);
}

console.log('🤖 Logging in to Discord...');
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Login gagal:', err.message);
  process.exit(1);
});
