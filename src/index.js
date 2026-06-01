require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Set YTDLP_DIR to point to committed standalone binaries inside bin/
process.env.YTDLP_DIR = path.join(process.cwd(), 'bin');


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
const { json: ytdlpJson } = require('@distube/yt-dlp');

// Helper to convert yt-dlp info to DisTube Song
function createYtDlpSong(plugin, info, options) {
  return new Song({
    plugin,
    source: info.extractor,
    playFromSource: true,
    id: info.id,
    name: info.title || info.fulltitle,
    url: info.webpage_url || info.original_url,
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
  const flags = {
    dumpSingleJson: true,
    noWarnings: true,
    preferFreeFormats: true,
    skipDownload: true,
    simulate: true
  };

  // Limit playlist extraction to prevent hanging/rate-limiting on large playlists or Mixes
  if (url.includes('list=')) {
    flags.playlistEnd = 25;
  }

  const info = await ytdlpJson(url, flags).catch((e2) => {
    throw new Error(`${e2.stderr || e2}`);
  });


  if (Array.isArray(info.entries)) {
    if (info.entries.length === 0) throw new Error("The playlist is empty");
    return new Playlist({
      source: info.extractor,
      songs: info.entries.map((i) => createYtDlpSong(this, i, options)),
      id: info.id.toString(),
      name: info.title,
      url: info.webpage_url,
      thumbnail: info.thumbnails?.[0]?.url
    }, options);
  }
  return createYtDlpSong(this, info, options);
};

// Override ytdlpPlugin.getStreamURL to avoid passing deprecated --no-call-home option
ytdlpPlugin.getStreamURL = async function(song) {
  if (!song.url) {
    throw new Error("Cannot get stream URL from invalid song.");
  }
  const info = await ytdlpJson(song.url, {
    dumpSingleJson: true,
    noWarnings: true,
    preferFreeFormats: true,
    skipDownload: true,
    simulate: true,
    format: "ba/ba*"
  }).catch((e2) => {
    throw new Error(`${e2.stderr || e2}`);
  });
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

// Disable ytdl-core related songs to prevent 429 rate limit errors
ytPlugin.getRelatedSongs = function() {
  return [];
};


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

client.distube = new DisTube(client, {
  plugins,
  emitNewSongOnly: false,
  joinNewVoiceChannel: true,
  nsfw: false,
  emitAddSongWhenCreatingQueue: true,
  emitAddListWhenCreatingQueue: true,
  ffmpeg: { path: require('ffmpeg-static') },
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

// DisTube Events
const { nowPlayingEmbed, addedToQueueEmbed, addedPlaylistEmbed } = require('./utils/embeds');

client.distube
  .on('playSong', (queue, song) => {
    queue.textChannel?.send({ embeds: [nowPlayingEmbed(song, queue)] });
  })
  .on('addSong', (queue, song) => {
    queue.textChannel?.send({ embeds: [addedToQueueEmbed(song, queue)] });
  })
  .on('addList', (queue, playlist) => {
    queue.textChannel?.send({ embeds: [addedPlaylistEmbed(playlist, queue)] });
  })
  .on('error', (error, queue) => {
    console.error('DisTube Error:', error);
    queue?.textChannel?.send(`❌ **Error:** ${error.message?.slice(0, 200)}`).catch(() => {});
  })
  .on('initQueue', (queue) => {
    queue.autoplay = false;
    console.log(`🤖 [Autoplay] Antrean diinisialisasi untuk server: ${queue.textChannel?.guild?.name}`);
  })
  .on('finish', (queue) => {
    queue.textChannel?.send('✅ **Antrean lagu telah selesai!** Bot tetap standby 24/7 di voice channel.');
  })
  .on('disconnect', (queue) => {
    queue.textChannel?.send('👋 **Bot terputus dari voice channel.**');
  })
  .on('empty', (queue) => {
    queue.textChannel?.send('🎵 **Voice channel kosong.** Bot tetap standby di sini.');
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
