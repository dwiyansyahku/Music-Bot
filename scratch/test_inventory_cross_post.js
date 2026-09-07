const assert = require('assert');
const storage = require('../src/utils/storage');
const gachaCommand = require('../src/commands/gacha');

async function testInventoryCrossPost() {
  console.log('[TEST] Verifying Inventory Cross-Post to Main Gacha Channel...');

  const mockGuildId = 'test_guild_cross_post';
  const mainGachaChannelId = 'ch_main_gacha_123';
  const dailyChannelId = 'ch_daily_rewards_456';

  const mockMainGachaChannel = {
    id: mainGachaChannelId,
    name: 'main-gacha-umum',
    isTextBased: () => true,
    sentMessages: [],
    send: async function(payload) {
      this.sentMessages.push(payload);
      return { id: 'msg_' + Date.now() };
    }
  };

  const mockDailyChannel = {
    id: dailyChannelId,
    name: 'daily-rewards',
    isTextBased: () => true
  };

  const mockClient = {
    channels: {
      fetch: async (id) => {
        if (id === mainGachaChannelId) return mockMainGachaChannel;
        if (id === dailyChannelId) return mockDailyChannel;
        return null;
      }
    }
  };

  const settings = storage.read('settings') || {};
  settings[mockGuildId] = {
    gachaRoles: {},
    gachaChannels: {
      play: mainGachaChannelId,
      daily: dailyChannelId
    }
  };
  storage.write('settings', settings);

  const testUserId = 'user_gacha_fanatic';
  const gachaData = storage.read('gacha_data') || {};
  gachaData[mockGuildId] = {
    [testUserId]: {
      tickets: 8,
      stardust: 250,
      streak: 4,
      pulls: 40,
      inventory: ['Cosmic Aegis of Infinity', 'Aura of the Celestial Dragon'],
      badges: ['✦ Supreme Celestial'],
      titles: ['Lord of Infinity'],
      equippedTitle: 'Lord of Infinity',
      pityEpic: 1,
      pityLegendary: 3,
      activeRole: { tier: 'MYTHIC', roleId: 'role_mythic' },
      duelDefenseStreak: 1
    }
  };
  storage.write('gacha_data', gachaData);

  // Helper to create interaction
  function createInteraction(channelId) {
    let replyData = null;
    let editReplyData = null;
    let deferredFlags = null;

    return {
      guild: {
        id: mockGuildId,
        name: 'Gacha Kingdom',
        channels: {
          cache: new Map([
            [mainGachaChannelId, mockMainGachaChannel],
            [dailyChannelId, mockDailyChannel]
          ])
        }
      },
      user: {
        id: testUserId,
        username: 'GachaFanatic',
        displayAvatarURL: () => 'https://example.com/avatar.png'
      },
      member: {
        id: testUserId,
        displayName: 'GachaFanatic',
        roles: { cache: new Map() }
      },
      channelId,
      options: {
        getSubcommand: () => 'inventory',
        getUser: () => null
      },
      replied: false,
      deferred: false,
      deferReply: async function(opts) {
        this.deferred = true;
        deferredFlags = opts?.flags;
      },
      reply: async function(payload) {
        this.replied = true;
        replyData = payload;
        return payload;
      },
      editReply: async function(payload) {
        editReplyData = payload;
        return payload;
      },
      getReplyData: () => replyData,
      getEditReplyData: () => editReplyData,
      getDeferredFlags: () => deferredFlags
    };
  }

  // --- TEST 1: Member triggers inventory from OUTSIDE (e.g. daily-rewards) ---
  console.log('1. Testing inventory triggered from daily-rewards channel...');
  mockMainGachaChannel.sentMessages = [];
  const outsideInteraction = createInteraction(dailyChannelId);

  await gachaCommand.execute(outsideInteraction, mockClient);

  // Assert message was sent publicly to Main Gacha Umum
  assert.strictEqual(mockMainGachaChannel.sentMessages.length, 1, 'Inventory MUST be posted to Main Gacha Umum channel!');
  const publicMsg = mockMainGachaChannel.sentMessages[0];
  assert(publicMsg.content.includes(`<@${testUserId}>`), 'Public post must tag/summon the member!');
  assert(publicMsg.embeds[0].data.author.name.includes('Koleksi & Inventaris — GachaFanatic'));
  console.log('✓ Test 1A Passed: Public inventory embed sent to Main Gacha Umum with member mention.');

  // Assert member in daily channel receives link button to Main Gacha Umum
  const editData = outsideInteraction.getEditReplyData();
  assert(editData.embeds[0].data.description.includes(mainGachaChannelId));
  assert.strictEqual(editData.components[0].components[0].data.label, 'Menuju ke #main-gacha-umum');
  console.log('✓ Test 1B Passed: Member in daily channel receives direct link button to Main Gacha Umum.');

  // --- TEST 2: Member triggers inventory INSIDE Main Gacha Umum ---
  console.log('2. Testing inventory triggered INSIDE Main Gacha Umum channel...');
  mockMainGachaChannel.sentMessages = [];
  const insideInteraction = createInteraction(mainGachaChannelId);

  await gachaCommand.execute(insideInteraction, mockClient);

  // Assert direct reply is edited with inventory embed (no separate cross-post needed)
  const insideEditData = insideInteraction.getEditReplyData();
  assert(insideEditData.embeds[0].data.author.name.includes('Koleksi & Inventaris — GachaFanatic'));
  assert.strictEqual(insideInteraction.getDeferredFlags(), undefined, 'Inside response must be public (not ephemeral)');
  console.log('✓ Test 2 Passed: When inside Main Gacha channel, inventory renders directly & publicly.');

  // --- TEST 3: When Main Gacha channel is NOT configured (null) ---
  console.log('3. Testing inventory when play channel is null...');
  settings[mockGuildId].gachaChannels.play = null;
  storage.write('settings', settings);

  const noPlayInteraction = createInteraction(dailyChannelId);
  await gachaCommand.execute(noPlayInteraction, mockClient);
  const noPlayEditData = noPlayInteraction.getEditReplyData();
  assert(noPlayEditData.embeds[0].data.author.name.includes('Koleksi & Inventaris — GachaFanatic'));
  assert.strictEqual(noPlayInteraction.getDeferredFlags(), undefined, 'When play is null, renders directly & publicly');
  console.log('✓ Test 3 Passed: When play channel is not set, renders publicly in current channel.');

  console.log('\n======================================================');
  console.log('ALL INVENTORY CROSS-POST & SUMMON TESTS PASSED (100%)');
  console.log('======================================================\n');
}

testInventoryCrossPost().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
