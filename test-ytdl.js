const { DisTube } = require('distube');
const { YouTubePlugin } = require('@distube/youtube');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const distube = new DisTube(client, {
  plugins: [new YouTubePlugin()],
});

distube.on('error', (err) => {
  console.error('DisTube Error:', err);
});

async function run() {
  console.log('Searching for "domba kuring dj"...');
  try {
    const res = await distube.search('domba kuring dj', { limit: 1 });
    console.log('Search result found:', res[0].name, 'ID:', res[0].id);
    console.log('URL:', res[0].url);
    
    // Now let's try to get stream info or play it (this would fail without a voice connection, but we can check if it gets formats)
    console.log('Resolving song...');
    const song = res[0];
    // Check if plugin can validate it
    const plugin = distube.plugins.find(p => p.validate(song.url));
    console.log('Validating plugin found:', plugin ? plugin.constructor.name : 'None');
    
    if (plugin) {
      console.log('Resolving song via plugin...');
      const resolved = await plugin.resolve(song.url, { member: {}, textChannel: {} });
      console.log('Resolved successfully! Stream URL exists:', resolved.streamURL ? 'Yes' : 'No');
    }
  } catch (err) {
    console.error('Test failed with error:', err);
  }
  process.exit(0);
}

client.once('ready', () => {
  run();
});

// Since we don't login, we can just run the function directly
run();
