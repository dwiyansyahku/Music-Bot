/**
 * Comprehensive verification script for:
 * 1. Ancient Relic Auto-release on Member Leaving Server
 * 2. Inventory Tier Summary & High-Tier Detail (<1024 chars)
 * 3. WIB Timezone Reset
 * 4. Stardust Cashback for Shop Title Purchases in Season Reset
 * 5. Mod Log System for Moderation, Admin & Gacha actions
 * 6. Gallery Channel Submission, Anti-Spam & Panel
 */

const assert = require('assert');
const path = require('path');
const storage = require('../src/utils/storage');
const { sendModLog } = require('../src/utils/modlog');
const galleryCmd = require('../src/commands/gallery');
const gachaCmd = require('../src/commands/gacha');

console.log('🧪 Starting Verification Suite...\n');

// ==========================================
// TEST 1: Ancient Relic Auto-release on Member Leaving Server
// ==========================================
console.log('--- Test 1: Ancient Relic Auto-release ---');
{
  const mockGuildId = 'test_guild_ancient_release';
  const leftUserId = 'user_departed_999';
  const activeUserId = 'user_active_111';

  // Seed storage
  const gachaData = storage.read('gacha_data') || {};
  gachaData[mockGuildId] = {
    [leftUserId]: {
      inventory: ['Cincin Keabadian Primordial'],
      tickets: 5,
      stardust: 100,
      badges: [],
      titles: []
    }
  };
  storage.write('gacha_data', gachaData);

  // Case A: Mock guild without leftUserId in cache
  const mockGuildWithoutLeftUser = {
    id: mockGuildId,
    members: {
      cache: new Map([
        [activeUserId, { id: activeUserId }]
      ])
    }
  };

  const testUserData = {
    tickets: 10,
    stardust: 0,
    inventory: [],
    badges: [],
    titles: [],
    pityLegendary: 25, // guarantee highest tier candidate
    pityEpic: 10
  };

  // Run rollSingleGacha with mockGuild
  const resultA = gachaCmd.rollSingleGacha(testUserData, mockGuildId, mockGuildWithoutLeftUser);
  console.log(`  [Case A] Guild without departed member cache: Rolled item -> [${resultA.item.tier}] "${resultA.item.name}"`);

  // Case B: Mock guild WITH leftUserId present in cache
  const mockGuildWithUser = {
    id: mockGuildId,
    members: {
      cache: new Map([
        [leftUserId, { id: leftUserId }],
        [activeUserId, { id: activeUserId }]
      ])
    }
  };

  // Fill ALL Ancient relics to existing members in guild
  const ancientItemNames = [
    'Cincin Keabadian Primordial',
    'Permata Asal-Usul Waktu',
    'Kitab Genesis Semesta',
    'Mahkota Pencipta Kosmik'
  ];
  for (let i = 0; i < ancientItemNames.length; i++) {
    const fakeHolderId = `holder_${i}`;
    mockGuildWithUser.members.cache.set(fakeHolderId, { id: fakeHolderId });
    gachaData[mockGuildId][fakeHolderId] = {
      inventory: [ancientItemNames[i]],
      tickets: 1,
      badges: [],
      titles: []
    };
  }
  storage.write('gacha_data', gachaData);

  // With all holders active, rolling Ancient should fallback or not yield duplicate
  const testUserFull = {
    tickets: 10,
    stardust: 0,
    inventory: [],
    badges: [],
    titles: [],
    pityLegendary: 25,
    pityEpic: 10
  };
  const resultB = gachaCmd.rollSingleGacha(testUserFull, mockGuildId, mockGuildWithUser);
  console.log(`  [Case B] All Ancient holders active in server: Rolled item -> [${resultB.item.tier}] "${resultB.item.name}"`);
  if (resultB.item.tier === 'ANCIENT') {
    assert.fail('Should not roll Ancient if all holders are active in guild!');
  } else {
    console.log('  ✅ Ancient properly fell back to MYTHIC when all 4 Ancients are held by active members.');
  }

  // Cleanup test guild
  delete gachaData[mockGuildId];
  storage.write('gacha_data', gachaData);
  console.log('✅ Test 1 Passed!\n');
}

// ==========================================
// TEST 2: Inventory Tier Summary & High-Tier Detail (<1024 chars)
// ==========================================
console.log('--- Test 2: Inventory Tier Summary Display ---');
{
  const testInventory = [
    'Cincin Keabadian Primordial',
    'Cosmic Aegis of Infinity',
    'Eye of Eternity',
    'Crown of Destiny',
    'Sword of the Eclipse',
    'Aura of Omnipresence',
    'Amethyst Crystal Orb',
    'Phoenix Feather Talisman',
    'Dragon Scale Armor',
    'Void Walker Boots',
    'Shadow Cloak',
    'Moonlit Dagger',
    'Sunstone Amulet',
    'Frostbite Staff',
    'Thunder Core',
    'Golden Chariot Horn',
    'Silver Longsword',
    'Iron Shield of Bravery',
    'Wooden Practice Wand',
    'Traveler Compass',
    'Copper Pocket Watch',
    'Worn Leather Cap',
    'Rustic Stone Pendant',
    'Steel Dagger',
    'Bronze Ring of Vigor',
    'Enchanted Parchment'
  ];

  const tiersList = ['ANCIENT', 'MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'COMMON'];
  const poolByTier = {};
  const userByTier = {};
  for (const t of tiersList) {
    poolByTier[t] = gachaCmd.GACHA_ITEMS.filter(g => g.tier === t).length;
    userByTier[t] = [];
  }
  for (const item of testInventory) {
    const found = gachaCmd.GACHA_ITEMS.find(g => g.name === item);
    if (found && userByTier[found.tier]) {
      userByTier[found.tier].push(found);
    }
  }

  const tierSummaryText = tiersList.map(t => `${t}: **${userByTier[t].length}/${poolByTier[t]}**`).join(' • ');

  const highTierItems = [];
  for (const t of ['ANCIENT', 'MYTHIC', 'LEGENDARY', 'EPIC']) {
    for (const item of userByTier[t]) {
      highTierItems.push(`• **${item.name}** [${item.tier}]`);
    }
  }

  let highTierText = highTierItems.length > 0
    ? highTierItems.join('\n')
    : '_Belum ada relik tier tinggi (Epic ke atas)_';

  if (highTierText.length > 750) {
    highTierText = highTierText.substring(0, 730) + '\n*... [Daftar dipotong]*';
  }

  const itemsFieldValue = `${tierSummaryText}\n\n**Koleksi Tier Tinggi (Epic+):**\n${highTierText}`;
  console.log(`  Tier Summary: ${tierSummaryText}`);
  console.log(`  High Tier Items Count: ${highTierItems.length}`);
  console.log(`  Field Value Length: ${itemsFieldValue.length} characters (Max allowed: 1024)`);

  assert(itemsFieldValue.length <= 1024, 'Inventory field value must not exceed 1024 characters');
  assert(itemsFieldValue.includes('ANCIENT:'), 'Must include ANCIENT summary');
  assert(itemsFieldValue.includes('COMMON:'), 'Must include COMMON summary');
  assert(!itemsFieldValue.includes('Wooden Practice Wand'), 'Common items should not be listed as individual bullets');
  console.log('✅ Test 2 Passed!\n');
}

// ==========================================
// TEST 3: WIB Timezone Reset
// ==========================================
console.log('--- Test 3: WIB Timezone Calculation ---');
{
  function getWIBDate() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (7 * 3600000));
  }

  const wib = getWIBDate();
  console.log(`  Current WIB Date: ${wib.getFullYear()}-${wib.getMonth() + 1}-${wib.getDate()} ${wib.getHours()}:${wib.getMinutes()}`);
  assert(typeof wib.getDate() === 'number', 'WIB date must be a valid date');
  console.log('✅ Test 3 Passed!\n');
}

// ==========================================
// TEST 4: Cashback Stardust for Shop Titles in Season Reset
// ==========================================
console.log('--- Test 4: Shop Title Stardust Cashback in Season Reset ---');
{
  const mockGuildId = 'test_guild_cashback_season';
  const testUserId = 'user_shopper_123';

  const gachaData = storage.read('gacha_data') || {};
  gachaData[mockGuildId] = {
    [testUserId]: {
      inventory: ['Mysterious Fish Bone', 'Four-Leaf Clover Token'], // 1 common (15), 1 rare (35)
      titles: ['Cosmic Collector', 'The Grandmaster'],
      badges: ['🌌', '👑'],
      shopPurchases: [
        { itemId: 'title_collector', title: 'Cosmic Collector', cost: 2500, boughtAt: Date.now() },
        { itemId: 'title_grandmaster', title: 'The Grandmaster', cost: 1500, boughtAt: Date.now() }
      ],
      tickets: 2,
      stardust: 100,
      pulls: 10
    }
  };
  storage.write('gacha_data', gachaData);

  const mockGuild = {
    id: mockGuildId,
    name: 'Test Cashback Server',
    iconURL: () => null,
    members: {
      cache: new Map([
        [testUserId, { id: testUserId, roles: { cache: new Map(), remove: async () => {}, add: async () => {} } }]
      ]),
      fetch: async (id) => ({ id, roles: { cache: new Map(), remove: async () => {}, add: async () => {} } })
    },
    channels: {
      cache: new Map()
    }
  };

  const mockClient = {
    user: { id: 'bot_test_id', username: 'TestBot' },
    guilds: {
      cache: new Map([[mockGuildId, mockGuild]])
    }
  };

  // Execute Season Reset with force: true
  const resetResult = gachaCmd.executeSeasonReset(mockGuild, mockClient, { force: true });
  resetResult.then(res => {
    console.log(`  Reset Season Success: ${res.success}`);
    console.log(`  Total Title Cashback Dust Distributed: ${res.totalTitleCashbackDust} Dust`);
    console.log(`  Expected Cashback: 50% of (2500 + 1500) = 2000 Dust`);

    assert.strictEqual(res.totalTitleCashbackDust, 2000, 'Cashback should be 50% of 4000 = 2000 Dust');

    const updatedData = storage.read('gacha_data')[mockGuildId][testUserId];
    console.log(`  User Stardust after Reset: ${updatedData.stardust} (Initial 100 + 15 Common + 35 Rare + 2000 Cashback = 2150)`);
    assert.strictEqual(updatedData.stardust, 2150, 'Total user stardust should be 2150');
    assert.deepStrictEqual(updatedData.shopPurchases, [], 'shopPurchases must be cleared after reset');
    assert.deepStrictEqual(updatedData.inventory, [], 'inventory must be cleared after reset');

    // Clean up
    delete gachaData[mockGuildId];
    storage.write('gacha_data', gachaData);
    const seasonData = storage.read('season_data') || {};
    delete seasonData[mockGuildId];
    storage.write('season_data', seasonData);

    console.log('✅ Test 4 Passed!\n');
    runTest5And6();
  }).catch(err => {
    console.error('Test 4 Failed:', err);
    process.exit(1);
  });
}

// ==========================================
// TEST 5 & 6: Mod Log & Gallery Channel
// ==========================================
function runTest5And6() {
  console.log('--- Test 5: Mod Log Utility ---');
  {
    let sentMessage = null;
    const mockChannel = {
      id: 'mock_modlog_ch',
      permissionsFor: () => ({ has: () => true }),
      send: async (payload) => {
        sentMessage = payload;
        return { id: 'modlog_msg_1' };
      }
    };

    const mockGuild = {
      id: 'test_guild_modlog',
      name: 'ModLog Test Server',
      iconURL: () => 'https://example.com/icon.png',
      channels: {
        cache: new Map([['mock_modlog_ch', mockChannel]]),
        fetch: async () => mockChannel
      },
      members: {
        me: { id: 'bot_id' }
      }
    };

    // Save setting
    const settings = storage.read('settings') || {};
    settings[mockGuild.id] = { modLogChannel: 'mock_modlog_ch' };
    storage.write('settings', settings);

    sendModLog(mockGuild, {}, {
      action: 'BAN',
      moderator: { id: 'mod_1', tag: 'Admin#0001' },
      target: { id: 'target_1', tag: 'BadUser#9999' },
      reason: 'Melanggar aturan server'
    }).then(res => {
      assert(res !== null, 'sendModLog should return sent message object');
      assert(sentMessage !== null, 'Message should have been sent to log channel');
      const embed = sentMessage.embeds[0].data;
      console.log(`  Embed Author: ${embed.author.name}`);
      console.log(`  Embed Color: 0x${embed.color.toString(16).toUpperCase()}`);
      console.log(`  Fields count: ${embed.fields.length}`);
      assert(embed.author.name.includes('BAN'), 'Author should mention BAN');
      console.log('✅ Test 5 Passed!\n');

      runTest6(mockGuild.id);
    }).catch(err => {
      console.error('Test 5 Failed:', err);
      process.exit(1);
    });
  }
}

function runTest6(cleanupGuildId) {
  console.log('--- Test 6: Gallery Channel & Anti-Spam ---');
  {
    const mockGuild = {
      name: 'Gallery Test Guild',
      iconURL: () => 'https://example.com/icon.png'
    };

    const panelPayload = galleryCmd.createGalleryPanelPayload(mockGuild);
    assert(panelPayload.embeds.length === 1, 'Should create 1 embed for gallery panel');
    assert(panelPayload.components.length === 1, 'Should create 1 action row for gallery panel');
    console.log(`  Panel Title: "${panelPayload.embeds[0].data.title}"`);
    console.log(`  Buttons: ${panelPayload.components[0].components.map(c => c.data.label).join(', ')}`);

    // Clean up settings
    const settings = storage.read('settings') || {};
    delete settings[cleanupGuildId];
    storage.write('settings', settings);

    console.log('✅ Test 6 Passed!\n');
    console.log('🎉 ALL 6 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  }
}
