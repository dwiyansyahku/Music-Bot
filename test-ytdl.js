const path = require('path');
process.env.YTDLP_DIR = path.join(process.cwd(), 'bin');

const { YouTubePlugin } = require('@distube/youtube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { setupCookies } = require('./src/utils/cookies');
require('dotenv').config();

// Initialize cookies helper
const loadedCookies = setupCookies();

// Initialize Plugins
const plugin = new YouTubePlugin({ cookies: loadedCookies });
const ytdlpPlugin = new YtDlpPlugin({ update: false });

// Bypass ytdl-core stream extractor and use highly robust yt-dlp instead
plugin.getStreamURL = async function(song) {
  return ytdlpPlugin.getStreamURL(song);
};

// Bypass broken ytsr search library and use highly robust yt-dlp search instead
plugin.searchSong = async function(query, options) {
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

async function run() {
  try {
    const query = 'beauty and the beat';
    console.log(`🔍 [Test] Searching for: "${query}"`);
    const searchResult = await plugin.searchSong(query, { member: {}, textChannel: {} });
    if (searchResult) {
      console.log('✅ [Test] Search success!');
      console.log(`🎵 Found Song: "${searchResult.name}"`);
      console.log(`🔗 URL: ${searchResult.url}`);
      
      console.log('🔍 [Test] Extracting stream URL for search result...');
      const streamURL = await plugin.getStreamURL(searchResult);
      console.log('✅ [Test] Stream URL extracted successfully!');
      console.log(`🔗 Stream URL starts with: ${streamURL.substring(0, 60)}...`);
    } else {
      console.log('❌ [Test] Search returned no results.');
    }
  } catch (err) {
    console.error('❌ [Test] Failed with error:', err);
  }
  process.exit(0);
}

run();
