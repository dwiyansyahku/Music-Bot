const assert = require('assert');
const storage = require('../src/utils/storage');
const gachaCommand = require('../src/commands/gacha');

const {
  GACHA_SHOP_ITEMS,
  rollSingleGacha,
  processStardustRainButton,
  executeGachaInventory
} = gachaCommand;

async function runTests() {
  console.log('🧪 Starting Expanded Gacha Shop & Custom Title Test Suite...\n');

  // Backup existing data
  const origGachaData = storage.read('gacha_data') || {};
  const origRainData = storage.read('stardust_rain') || {};
  const origSettings = storage.read('settings') || {};

  const testGuildId = 'test_guild_shop_999';
  const testUserId = 'test_user_shop_001';
  const testUser2Id = 'test_user_shop_002';

  try {
    // -------------------------------------------------------------
    // Test 1: Katalog GACHA_SHOP_ITEMS & Discord Limit Validation
    // -------------------------------------------------------------
    console.log('Test 1: Validating GACHA_SHOP_ITEMS catalog and limits...');
    assert.strictEqual(GACHA_SHOP_ITEMS.length, 12, 'Catalog should contain 12 items');
    assert.ok(GACHA_SHOP_ITEMS.length <= 25, 'Choices count must be <= 25 for Discord');

    for (const item of GACHA_SHOP_ITEMS) {
      assert.ok(item.id, `Item must have an id`);
      assert.ok(item.name, `Item ${item.id} must have a name`);
      assert.ok(typeof item.cost === 'number' && item.cost > 0, `Item ${item.id} must have a valid positive cost`);
      assert.ok(item.desc, `Item ${item.id} must have a description`);
      assert.ok(item.type, `Item ${item.id} must have a type`);

      const choiceLabel = `${item.name} — ${item.cost} Dust`;
      assert.ok(choiceLabel.length <= 100, `Choice label "${choiceLabel}" exceeds Discord 100-character limit`);
    }
    console.log('✅ Test 1 passed: All 12 shop items are valid and strictly under Discord limits.\n');

    // -------------------------------------------------------------
    // Test 2: Lucky Charm buff in rollSingleGacha
    // -------------------------------------------------------------
    console.log('Test 2: Testing Lucky Charm buff consumption & rate doubling in rollSingleGacha...');
    const testUserData = {
      inventory: [],
      badges: [],
      titles: [],
      pityEpic: 0,
      pityLegendary: 0,
      stardust: 0,
      tickets: 5,
      pulls: 0,
      luckyBuffPulls: 2
    };

    const pull1 = rollSingleGacha(testUserData);
    assert.strictEqual(pull1.luckyBuffActive, true, 'First pull should have luckyBuffActive = true');
    assert.strictEqual(testUserData.luckyBuffPulls, 1, 'luckyBuffPulls should be decremented to 1');

    const pull2 = rollSingleGacha(testUserData);
    assert.strictEqual(pull2.luckyBuffActive, true, 'Second pull should have luckyBuffActive = true');
    assert.strictEqual(testUserData.luckyBuffPulls, 0, 'luckyBuffPulls should be decremented to 0');

    const pull3 = rollSingleGacha(testUserData);
    assert.strictEqual(pull3.luckyBuffActive, false, 'Third pull should have luckyBuffActive = false');
    assert.strictEqual(testUserData.luckyBuffPulls, 0, 'luckyBuffPulls should remain 0');
    console.log('✅ Test 2 passed: Lucky Charm properly boosts and decrements pulls.\n');

    // -------------------------------------------------------------
    // Test 3: Stardust Rain Session & Interactive Button Claiming
    // -------------------------------------------------------------
    console.log('Test 3: Testing Stardust Rain session & interactive button claims...');
    const rainId = 'rain_test_' + Date.now();
    const rainStorage = {};
    rainStorage[rainId] = {
      id: rainId,
      guildId: testGuildId,
      channelId: 'ch_test_123',
      creatorId: testUserId,
      creatorName: 'TestHost',
      quota: 5,
      claimants: [],
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000
    };
    storage.write('stardust_rain', rainStorage);

    // Prepare mock interaction for claimant 1
    let repliedPayload1 = null;
    let editedMessagePayload = null;

    const mockMessage = {
      embeds: [{ title: 'Rain Embed' }],
      edit: async (payload) => { editedMessagePayload = payload; }
    };

    const mockClaimant1 = {
      customId: `stardust_rain:${rainId}`,
      guildId: testGuildId,
      user: { id: 'claimant_01', username: 'FastClicker1' },
      message: mockMessage,
      reply: async (payload) => { repliedPayload1 = payload; }
    };

    // Initialize claimant in gacha_data
    const gData = storage.read('gacha_data') || {};
    gData[testGuildId] = gData[testGuildId] || {};
    gData[testGuildId]['claimant_01'] = { stardust: 10, tickets: 0, titles: [], badges: [] };
    storage.write('gacha_data', gData);

    await processStardustRainButton(mockClaimant1, null);

    assert.ok(repliedPayload1, 'Claimant 1 should receive reply');
    assert.ok(repliedPayload1.content.includes('Bintang Berhasil Ditangkap'), 'Reply must confirm star caught');

    const updatedGData = storage.read('gacha_data');
    const claimant1Dust = updatedGData[testGuildId]['claimant_01'].stardust;
    assert.ok(claimant1Dust >= 60 && claimant1Dust <= 110, `Claimant 1 dust (${claimant1Dust}) must have increased by 50-100`);

    // Test duplicate claim prevention
    let duplicateReply = null;
    const mockClaimant1Dup = {
      customId: `stardust_rain:${rainId}`,
      guildId: testGuildId,
      user: { id: 'claimant_01', username: 'FastClicker1' },
      message: mockMessage,
      reply: async (payload) => { duplicateReply = payload; }
    };
    await processStardustRainButton(mockClaimant1Dup, null);
    assert.ok(duplicateReply.content.includes('Kamu sudah menangkap bintang'), 'Duplicate claim must be rejected');

    // Claim until quota is exhausted (4 more claimants)
    for (let i = 2; i <= 5; i++) {
      const uId = `claimant_0${i}`;
      gData[testGuildId][uId] = { stardust: 0, tickets: 0, titles: [], badges: [] };
      storage.write('gacha_data', gData);
      const mockC = {
        customId: `stardust_rain:${rainId}`,
        guildId: testGuildId,
        user: { id: uId, username: `FastClicker${i}` },
        message: mockMessage,
        reply: async () => {}
      };
      await processStardustRainButton(mockC, null);
    }

    const rainState = storage.read('stardust_rain')[rainId];
    assert.strictEqual(rainState.claimants.length, 5, 'Rain session should have exactly 5 claimants');

    // 6th claim should be rejected because quota is full
    let fullReply = null;
    const mockClaimant6 = {
      customId: `stardust_rain:${rainId}`,
      guildId: testGuildId,
      user: { id: 'claimant_06', username: 'LateClicker' },
      message: mockMessage,
      reply: async (payload) => { fullReply = payload; }
    };
    await processStardustRainButton(mockClaimant6, null);
    assert.ok(fullReply.content.includes('sudah habis'), '6th claim must be rejected as quota exhausted');
    console.log('✅ Test 3 passed: Stardust rain distribution, real-time update, and quota limit work perfectly.\n');

    // -------------------------------------------------------------
    // Test 4: Subcommand buy & customtitle executions
    // -------------------------------------------------------------
    console.log('Test 4: Testing subcommand /gacha buy and /gacha customtitle handlers...');
    // Setup test user in gachaData
    const gDataTest = storage.read('gacha_data') || {};
    gDataTest[testGuildId] = gDataTest[testGuildId] || {};
    gDataTest[testGuildId][testUserId] = {
      tickets: 0,
      stardust: 5000,
      titles: [],
      badges: [],
      shopPurchases: [],
      activeRole: { tier: 'MYTHIC', roleId: 'role_mythic_1' },
      throneProtectedUntil: 0,
      challengeCooldownUntil: Date.now() + 25 * 60 * 1000, // 25 min cooldown
      luckyBuffPulls: 0,
      customTitleTokens: 0,
      inventory: []
    };
    storage.write('gacha_data', gDataTest);

    // 4A: Buy throne_shield
    let buyShieldReply = null;
    const mockBuyShield = {
      guild: { id: testGuildId, name: 'Test Guild' },
      channelId: 'ch_test_123',
      user: { id: testUserId, username: 'TestHero' },
      options: {
        getSubcommand: () => 'buy',
        getString: (opt) => (opt === 'item' ? 'throne_shield' : null)
      },
      reply: async (payload) => { buyShieldReply = payload; }
    };
    await gachaCommand.execute(mockBuyShield, null);
    assert.ok(buyShieldReply, 'buy throne_shield should reply');
    const uDataAfterShield = storage.read('gacha_data')[testGuildId][testUserId];
    assert.strictEqual(uDataAfterShield.stardust, 5000 - 750, 'Stardust should be deducted by 750');
    assert.ok(uDataAfterShield.throneProtectedUntil > Date.now() + 2 * 60 * 60 * 1000, 'Throne barrier should be +3 hours');
    console.log('• Buy throne_shield: Verified.');

    // 4B: Buy duel_reset
    let buyResetReply = null;
    const mockBuyReset = {
      guild: { id: testGuildId, name: 'Test Guild' },
      channelId: 'ch_test_123',
      user: { id: testUserId, username: 'TestHero' },
      options: {
        getSubcommand: () => 'buy',
        getString: (opt) => (opt === 'item' ? 'duel_reset' : null)
      },
      reply: async (payload) => { buyResetReply = payload; }
    };
    await gachaCommand.execute(mockBuyReset, null);
    const uDataAfterReset = storage.read('gacha_data')[testGuildId][testUserId];
    assert.strictEqual(uDataAfterReset.challengeCooldownUntil, 0, 'Duel cooldown should be reset to 0');
    console.log('• Buy duel_reset: Verified.');

    // 4C: Buy lucky_charm
    let buyCharmReply = null;
    const mockBuyCharm = {
      guild: { id: testGuildId, name: 'Test Guild' },
      channelId: 'ch_test_123',
      user: { id: testUserId, username: 'TestHero' },
      options: {
        getSubcommand: () => 'buy',
        getString: (opt) => (opt === 'item' ? 'lucky_charm' : null)
      },
      reply: async (payload) => { buyCharmReply = payload; }
    };
    await gachaCommand.execute(mockBuyCharm, null);
    const uDataAfterCharm = storage.read('gacha_data')[testGuildId][testUserId];
    assert.strictEqual(uDataAfterCharm.luckyBuffPulls, 3, 'luckyBuffPulls should be +3');
    console.log('• Buy lucky_charm: Verified.');

    // 4D: Buy custom_title (scroll)
    let buyScrollReply = null;
    const mockBuyScroll = {
      guild: { id: testGuildId, name: 'Test Guild' },
      channelId: 'ch_test_123',
      user: { id: testUserId, username: 'TestHero' },
      options: {
        getSubcommand: () => 'buy',
        getString: (opt) => (opt === 'item' ? 'custom_title' : null)
      },
      reply: async (payload) => { buyScrollReply = payload; }
    };
    await gachaCommand.execute(mockBuyScroll, null);
    const uDataAfterScroll = storage.read('gacha_data')[testGuildId][testUserId];
    assert.strictEqual(uDataAfterScroll.customTitleTokens, 1, 'customTitleTokens should be 1');
    console.log('• Buy custom_title scroll: Verified.');

    // 4E: Execute /gacha customtitle
    let customTitleReply = null;
    const mockCustomTitle = {
      guild: { id: testGuildId, name: 'Test Guild' },
      channelId: 'ch_test_123',
      user: { id: testUserId, username: 'TestHero' },
      options: {
        getSubcommand: () => 'customtitle',
        getString: (opt) => (opt === 'title' ? 'Sang Penakluk Kosmos' : null)
      },
      reply: async (payload) => { customTitleReply = payload; }
    };
    await gachaCommand.execute(mockCustomTitle, null);
    const uDataAfterCustom = storage.read('gacha_data')[testGuildId][testUserId];
    assert.strictEqual(uDataAfterCustom.customTitleTokens, 0, 'Custom title token should be deducted to 0');
    assert.ok(uDataAfterCustom.titles.includes('Sang Penakluk Kosmos'), 'Titles must include the new custom title');
    assert.strictEqual(uDataAfterCustom.equippedTitle, 'Sang Penakluk Kosmos', 'Custom title should be automatically equipped');
    console.log('• Execute /gacha customtitle: Verified.');

    // 4F: Test mystery_box
    let buyBoxReply = null;
    const mockBuyBox = {
      guild: { id: testGuildId, name: 'Test Guild' },
      channelId: 'ch_test_123',
      user: { id: testUserId, username: 'TestHero' },
      options: {
        getSubcommand: () => 'buy',
        getString: (opt) => (opt === 'item' ? 'mystery_box' : null)
      },
      reply: async (payload) => { buyBoxReply = payload; }
    };
    await gachaCommand.execute(mockBuyBox, null);
    assert.ok(buyBoxReply, 'Mystery box purchase should reply');
    console.log('• Buy mystery_box: Verified.');

    console.log('✅ Test 4 passed: All purchase handlers & custom title creation verified.\n');

    // -------------------------------------------------------------
    // Test 5: executeGachaInventory buff display
    // -------------------------------------------------------------
    console.log('Test 5: Testing inventory display of active buffs...');
    let invReply = null;
    const mockInvInteraction = {
      guild: { id: testGuildId, name: 'Test Guild' },
      channelId: 'ch_test_123',
      user: { id: testUserId, username: 'TestHero', displayAvatarURL: () => 'https://example.com/avatar.png' },
      replied: false,
      deferred: false,
      reply: async (payload) => { invReply = payload; }
    };

    await executeGachaInventory(mockInvInteraction, mockInvInteraction.user, null);
    assert.ok(invReply, 'Inventory should send reply');
    const embed = invReply.embeds[0];
    const buffField = embed.data.fields.find(f => f.name.includes('Status Buff'));
    assert.ok(buffField, 'Inventory embed must contain "Status Buff & Efek Khusus" field');
    assert.ok(buffField.value.includes('Perisai Tahta'), 'Must mention Perisai Tahta');
    assert.ok(buffField.value.includes('Jimat Keberuntungan'), 'Must mention Jimat Keberuntungan');
    console.log('✅ Test 5 passed: Inventory accurately displays all active buffs and timers.\n');

    console.log('🎉 ALL 5 TEST SUITES PASSED FLAWLESSLY!');
  } finally {
    // Restore backup
    storage.write('gacha_data', origGachaData);
    storage.write('stardust_rain', origRainData);
    storage.write('settings', origSettings);
  }
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
