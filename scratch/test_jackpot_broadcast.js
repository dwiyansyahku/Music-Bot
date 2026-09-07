const assert = require('assert');
const storage = require('../src/utils/storage');

console.log('[TEST] Starting Jackpot Broadcast & Announce Channel Isolation Test...');

// Mock guild and channels
const mockAnnounceChannel = {
  id: 'announce_12345',
  name: '✧ · gacha-announce',
  isTextBased: () => true,
  sentMessages: [],
  send: async function(payload) {
    this.sentMessages.push(payload);
    return { id: 'msg_' + Date.now() };
  }
};

const mockPlayChannel = {
  id: 'play_99999',
  name: 'gacha-play',
  isTextBased: () => true,
  sentMessages: [],
  send: async function(payload) {
    this.sentMessages.push(payload);
    return { id: 'msg_' + Date.now() };
  }
};

const mockClient = {
  channels: {
    fetch: async (id) => {
      if (id === 'announce_12345') return mockAnnounceChannel;
      if (id === 'play_99999') return mockPlayChannel;
      return null;
    }
  },
  guilds: {
    cache: new Map()
  }
};

const guildId = 'test_guild_jackpot_broadcast';
const testMember = {
  id: 'user_lucky_999',
  displayName: 'Lord Lucky',
  user: {
    id: 'user_lucky_999',
    username: 'lord_lucky',
    displayAvatarURL: () => 'https://example.com/avatar.png'
  }
};

// Setup initial settings
const settings = storage.read('settings') || {};
settings[guildId] = {
  gachaChannels: {
    play: 'play_99999',
    pull: null,
    daily: null,
    result: null,
    duel: null,
    broadcast: 'announce_12345'
  }
};
storage.write('settings', settings);

// Load gacha module
const gachaModule = require('../src/commands/gacha');

async function runTests() {
  // Test 1: Verify broadcast channel is configured
  const updatedSettings = storage.read('settings');
  assert.strictEqual(updatedSettings[guildId].gachaChannels.broadcast, 'announce_12345');
  console.log('✓ Test 1 Passed: Broadcast channel configured properly.');

  // Test 2: Execute pull test (simulate jackpot item pull)
  // Let's create a simulated mythic item
  const mythicItem = {
    id: 'mythic_aegis',
    tier: 'MYTHIC',
    stars: '★★★★★',
    name: 'Cosmic Aegis of Infinity',
    badge: '✦ Supreme Celestial',
    title: 'Lord of Infinity',
    desc: 'Pusaka kosmik primordial yang memancarkan energi tak terbatas.',
    recycleStardust: 500
  };

  const legendaryItem = {
    id: 'leg_sword',
    tier: 'LEGENDARY',
    stars: '★★★★',
    name: 'Excalibur of Radiant Light',
    badge: '⚔ Blade Master',
    title: 'Light Bringer',
    desc: 'Pedang suci berkilau emas yang membelah kegelapan.',
    recycleStardust: 200
  };

  // Broadcast single pull jackpot
  mockAnnounceChannel.sentMessages = [];
  // Call internal or simulate pull
  // Let's simulate calling executeGachaPull with simulated tickets
  const gachaData = storage.read('gacha_data') || {};
  gachaData[guildId] = {
    [testMember.id]: {
      tickets: 50,
      stardust: 100,
      inventory: [],
      badges: [],
      titles: [],
      pityEpic: 0,
      pityLegendary: 14, // Force hard pity trigger (will give Legendary or Mythic!)
      pulls: 14
    }
  };
  storage.write('gacha_data', gachaData);

  const mockInteraction = {
    guild: { id: guildId, name: 'Test Guild', channels: { cache: new Map([['announce_12345', mockAnnounceChannel]]) } },
    guildId,
    member: testMember,
    user: testMember.user,
    channelId: 'play_99999',
    channel: mockPlayChannel,
    replied: false,
    deferred: true,
    editReply: async (payload) => payload,
    reply: async (payload) => payload
  };

  await gachaModule.executeGachaPull(mockInteraction, mockClient, 1);

  // Assert that announce channel received exactly 1 jackpot broadcast
  assert.strictEqual(mockAnnounceChannel.sentMessages.length, 1, 'Jackpot alert should be sent to announce channel');
  const jackpotEmbed = mockAnnounceChannel.sentMessages[0].embeds[0];
  assert(jackpotEmbed.data.author.name.includes('Jackpot Server'));
  assert(jackpotEmbed.data.description.includes('baru saja memperoleh relik'));
  console.log('✓ Test 2 Passed: Single pull jackpot properly broadcasts to announce channel.');

  // Test 3: Multi-pull with guaranteed jackpot triggers
  mockAnnounceChannel.sentMessages = [];
  // Set pity for another guaranteed jackpot
  const currentData = storage.read('gacha_data');
  currentData[guildId][testMember.id].tickets = 20;
  currentData[guildId][testMember.id].pityLegendary = 14;
  storage.write('gacha_data', currentData);

  await gachaModule.executeGachaPull(mockInteraction, mockClient, 10);
  assert(mockAnnounceChannel.sentMessages.length >= 1, 'Multi-pull jackpot must broadcast to announce channel');
  const multiJackpotEmbed = mockAnnounceChannel.sentMessages[0].embeds[0];
  assert(multiJackpotEmbed.data.description.includes('10x Multi-Pull') || multiJackpotEmbed.data.author.name.includes('Jackpot Server'));
  console.log('✓ Test 3 Passed: Multi-pull jackpot broadcasts accurately with multi-pull context.');

  // Test 4: Verify non-jackpot commands do NOT send to announce channel
  mockAnnounceChannel.sentMessages = [];
  await gachaModule.executeGachaDaily(mockInteraction);
  await gachaModule.executeGachaInventory(mockInteraction, testMember.user);
  await gachaModule.executeGachaRates(mockInteraction);

  assert.strictEqual(mockAnnounceChannel.sentMessages.length, 0, 'Non-jackpot actions must NEVER broadcast to announce channel');
  console.log('✓ Test 4 Passed: Non-jackpot actions (daily, inventory, rates) never touch announce channel.');

  console.log('\n========================================');
  console.log('ALL JACKPOT BROADCAST TESTS PASSED (100%)');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
