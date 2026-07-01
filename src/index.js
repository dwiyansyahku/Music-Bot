require('dotenv').config();
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


const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { YouTubePlugin } = require('@distube/youtube');




const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const { setupCookies } = require('./utils/cookies');
const loadedCookies = setupCookies();

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

function customYtdlpJson(url, flags, timeoutMs = 120000) {
  const ytdlpDir = process.env.YTDLP_DIR || path.join(process.cwd(), 'bin');
  const ytdlpFilename = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const ytdlpPath = path.join(ytdlpDir, ytdlpFilename);
  
  const cmdArgs = [url].concat(formatFlags(flags)).filter(Boolean);
  
  return new Promise((resolve, reject) => {
    console.log(`⚡ [customYtdlpJson] Spawning: "${ytdlpPath}" ${cmdArgs.join(' ')}`);
    const proc = spawn(ytdlpPath, cmdArgs);
    
    let stdout = '';
    let stderr = '';
    
    const timeout = setTimeout(() => {
      console.warn(`⚠️ [customYtdlpJson] Process timed out after ${timeoutMs}ms. Killing process pid: ${proc.pid}`);
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
  
  const flags = {
    dumpSingleJson: true,
    noWarnings: true,
    preferFreeFormats: true,
    skipDownload: true,
    simulate: true,
    forceIpv4: true,
    extractorArgs: 'youtubetab:skip=authcheck',
    retries: 1,
    socketTimeout: 5
  };

  // If cookies.txt exists, pass it explicitly via command line
  const cookiesTxtPath = path.join(process.cwd(), 'cookies.txt');
  if (fs.existsSync(cookiesTxtPath)) {
    flags.cookies = cookiesTxtPath.replace(/\\/g, '/');
    console.log(`🍪 [ytdlpPlugin.resolve] Passing cookies file: "${flags.cookies}"`);
  } else {
    console.log('ℹ️ [ytdlpPlugin.resolve] No cookies.txt found, resolving without cookies.');
  }

  // Smart playlist detection:
  // - list=PL...  → user-created playlist (fetch up to 50 items)
  // - list=RD/LL/WL/FL... with video ID → YouTube Mix/auto-generated (play single video only)
  if (url.includes('list=')) {
    try {
      const parsedUrl = new URL(url);
      const listParam = parsedUrl.searchParams.get('list');
      const videoId = parsedUrl.searchParams.get('v') ||
                      url.match(/youtu\.be\/([^?&#]+)/)?.[1];

      if (listParam && listParam.startsWith('PL')) {
        // User-created playlist — fetch up to 50 items
        flags.playlistEnd = 50;
        flags.flatPlaylist = true;
        console.log(`📜 [ytdlpPlugin.resolve] User playlist detected (${listParam}), limiting to 50 items.`);
      } else if (listParam && videoId) {
        // YouTube Mix / Radio / auto-generated — strip list param, play single video
        url = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`🎵 [ytdlpPlugin.resolve] YouTube Mix detected (${listParam}), playing single video: ${videoId}`);
      } else {
        // Unknown list type without a clear video ID — treat as playlist
        flags.playlistEnd = 50;
        flags.flatPlaylist = true;
        console.log(`📜 [ytdlpPlugin.resolve] Unknown playlist type (${listParam}), limiting to 50 items.`);
      }
    } catch {
      // URL parse failed — fall back to safe playlist limit
      flags.playlistEnd = 50;
      flags.flatPlaylist = true;
    }
  }

  console.log('⚡ [ytdlpPlugin.resolve] Executing yt-dlp process...');
  const startTime = Date.now();
  
  const info = await customYtdlpJson(url, flags).catch((e2) => {
    console.error(`❌ [ytdlpPlugin.resolve] Execution failed after ${Date.now() - startTime}ms. Error:`, e2.stderr || e2);
    throw new Error(`${e2.stderr || e2}`);
  });

  console.log(`✅ [ytdlpPlugin.resolve] Execution completed successfully in ${Date.now() - startTime}ms`);

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

// Override ytdlpPlugin.getStreamURL to avoid passing deprecated --no-call-home option
ytdlpPlugin.getStreamURL = async function(song) {
  if (!song.url) {
    throw new Error("Cannot get stream URL from invalid song.");
  }
  
  console.log(`🌐 [ytdlpPlugin.getStreamURL] Fetching stream URL for: "${song.name}" (${song.url})`);
  
  const flags = {
    dumpSingleJson: true,
    noWarnings: true,
    preferFreeFormats: true,
    skipDownload: true,
    simulate: true,
    format: "ba/ba*",
    forceIpv4: true,
    extractorArgs: 'youtubetab:skip=authcheck',
    retries: 1,
    socketTimeout: 5
  };

  const cookiesTxtPath = path.join(process.cwd(), 'cookies.txt');
  if (fs.existsSync(cookiesTxtPath)) {
    flags.cookies = cookiesTxtPath.replace(/\\/g, '/');
    console.log(`🍪 [ytdlpPlugin.getStreamURL] Passing cookies file: "${flags.cookies}"`);
  }

  console.log('⚡ [ytdlpPlugin.getStreamURL] Executing yt-dlp process...');
  const startTime = Date.now();

  const info = await customYtdlpJson(song.url, flags).catch((e2) => {
    console.error(`❌ [ytdlpPlugin.getStreamURL] Execution failed after ${Date.now() - startTime}ms. Error:`, e2.stderr || e2);
    throw new Error(`${e2.stderr || e2}`);
  });

  console.log(`✅ [ytdlpPlugin.getStreamURL] Stream URL fetched successfully in ${Date.now() - startTime}ms`);
  
  if (Array.isArray(info.entries)) throw new Error("Cannot get stream URL of an entire playlist");
  return info.url;
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

client.distube = new DisTube(client, {
  plugins,
  emitNewSongOnly: false,
  joinNewVoiceChannel: true,
  nsfw: false,
  emitAddSongWhenCreatingQueue: true,
  emitAddListWhenCreatingQueue: true,
});

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const mod = require(path.join(commandsPath, file));
  const cmds = Array.isArray(mod) ? mod : [mod];
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
client.on('voiceStateUpdate', (oldState, newState) => {
  const guildId = oldState.guild.id;

  // 24/7 Enforcer: If the bot itself disconnects (or gets kicked) and 24/7 is enabled, force it to rejoin!
  if (oldState.id === client.user.id && oldState.channelId && !newState.channelId) {
    if (client.stay247 && client.stay247.has(guildId)) {
      console.log(`♻️ [24/7 Enforcer] Bot terputus dari voice channel di guild ${guildId}. Memaksa masuk kembali...`);
      setTimeout(() => {
        if (client.stay247.has(guildId)) {
          const channelToJoin = oldState.channel || client.channels.cache.get(oldState.channelId);
          if (channelToJoin) {
            client.distube.voices.join(channelToJoin).catch(console.error);
          } else {
            console.log(`♻️ [24/7 Enforcer] Channel ID ${oldState.channelId} tidak ditemukan (mungkin dihapus oleh bot TempVoice). Menonaktifkan 24/7 untuk guild ini.`);
            client.stay247.delete(guildId);
          }
        }
      }, 2000); // Wait 2s to avoid API spam if the disconnection was violent
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

client.on('debug', (info) => {
  if (info.includes('voice') || info.includes('Voice') || info.includes('packet') || info.includes('Gateway') || info.includes('Heartbeat')) {
    console.log(`🤖 [Discord Debug] ${info}`);
  }
});

// DisTube Events
const { nowPlayingEmbed, addedToQueueEmbed, addedPlaylistEmbed, autoplayEmbed } = require('./utils/embeds');

// Track lagu terakhir per guild untuk fitur autoplay
const lastSongPerGuild = new Map();

client.distube
  .on('playSong', (queue, song) => {
    // Play berhasil — hapus tracking notifikasi (tidak perlu di-cleanup)
    client._playNotifications?.delete(queue.id);
    // Simpan lagu yang sedang diputar sebagai "lagu terakhir" untuk autoplay
    lastSongPerGuild.set(queue.id, { name: song.name, uploader: song.uploader?.name });
    queue.textChannel?.send({ embeds: [nowPlayingEmbed(song, queue)] });
  })
  .on('addSong', (queue, song) => {
    queue.textChannel?.send({ embeds: [addedToQueueEmbed(song, queue)] })
      .then(msg => {
        // Track pesan ini agar bisa dihapus jika play gagal (VOICE_CONNECT_FAILED)
        const tracked = client._playNotifications?.get(queue.id);
        if (Array.isArray(tracked)) tracked.push(msg);
      })
      .catch(() => {});
  })
  .on('addList', (queue, playlist) => {
    queue.textChannel?.send({ embeds: [addedPlaylistEmbed(playlist, queue)] })
      .then(msg => {
        // Track pesan ini agar bisa dihapus jika play gagal (VOICE_CONNECT_FAILED)
        const tracked = client._playNotifications?.get(queue.id);
        if (Array.isArray(tracked)) tracked.push(msg);
      })
      .catch(() => {});
  })
  .on('error', (error, queue) => {
    console.error('DisTube Error:', error);
    let msg = `❌ **Error:** ${error.message?.slice(0, 200)}`;
    if (error.message?.includes('connect to the voice channel') || error.message?.includes('VOICE_CONNECT_FAILED')) {
      msg += `\n💡 *Tips: Koneksi suara ke Discord gagal. Jika Anda mengetes di laptop, kemungkinan besar ISP/antivirus Anda memblokir lalu lintas UDP Discord. Jika di Railway/hosting, coba ubah "Region Override" pada Voice Channel di Discord ke region lain (seperti Singapore atau India).*`;
    }
    queue?.textChannel?.send(msg).catch(() => {});
  })
  .on('initQueue', (queue) => {
    const guildId = queue.textChannel?.guild?.id;
    const persistentAutoplay = client.autoplaySettings?.get(guildId) || false;
    queue.autoplay = persistentAutoplay;
    console.log(`🤖 [Autoplay] Antrean diinisialisasi untuk server: ${queue.textChannel?.guild?.name}. Autoplay: ${persistentAutoplay}`);
  })
  .on('finish', (queue) => {
    // Autoplay dihandle oleh getRelatedSongs — ini hanya fallback saat autoplay off
    if (!queue.autoplay) {
      const lastUser = queue.previousSongs && queue.previousSongs.length > 0 
        ? queue.previousSongs[queue.previousSongs.length - 1].user 
        : null;

      if (client.stay247 && client.stay247.has(queue.textChannel?.guild?.id)) {
        if (lastUser) {
          queue.textChannel?.send(`✅ Halo <@${lastUser.id}>, **antrean lagu telah selesai!** Bot tetap standby di voice channel (Mode 24/7).`);
        } else {
          queue.textChannel?.send('✅ **Antrean lagu telah selesai!** Bot tetap standby di voice channel (Mode 24/7).');
        }
      } else {
        queue.textChannel?.send('✅ **Antrean lagu telah selesai!** Bot akan keluar dalam 2 menit jika tidak ada lagu baru.');
        setTimeout(() => {
          if (queue.voice && !queue.playing && client.stay247 && !client.stay247.has(queue.textChannel?.guild?.id)) {
            const lastUser = queue.previousSongs && queue.previousSongs.length > 0 
              ? queue.previousSongs[queue.previousSongs.length - 1].user 
              : null;
            
            queue.voice.leave();
            
            if (lastUser) {
              queue.textChannel?.send(`👋 Halo <@${lastUser.id}>, bot telah keluar dari voice channel karena antrean lagu sudah habis dan tidak ada lagu baru.`);
            } else {
              queue.textChannel?.send('👋 Bot telah keluar dari voice channel karena antrean lagu sudah habis.');
            }
          }
        }, 120000);
      }
    }
  })
  .on('disconnect', (queue) => {
    queue.textChannel?.send('👋 **Bot terputus dari voice channel.**');
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
  })
  .on('ffmpegDebug', (message) => {
    console.log(`🔊 [FFmpeg Debug] ${message}`);
  })
  .on('debug', (message) => {
    console.log(`🤖 [DisTube Debug] ${message}`);
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
