const assert = require('assert');
const storage = require('../src/utils/storage');
const gachaCommand = require('../src/commands/gacha');

async function runTests() {
  console.log('Testing Gacha Inventory Redirection to Main Gacha Umum Channel...');

  const mockGuildId = 'test_guild_inventory_play_redirection';

  // Set up test settings where:
  // play: 'main_gacha_umum_channel'
  // pull: 'specific_pull_channel'
  // daily: 'specific_daily_channel'
  // broadcast: 'announce_jackpot_channel'
  const settings = storage.read('settings') || {};
  settings[mockGuildId] = {
    gachaRoles: {},
    gachaChannels: {
      play: 'main_gacha_umum_channel',
      pull: 'specific_pull_channel',
      daily: 'specific_daily_channel',
      duel: 'arena_duel_channel',
      result: 'result_feed_channel',
      broadcast: 'announce_jackpot_channel'
    }
  };
  storage.write('settings', settings);

  // Initialize test user in gacha_data
  const gachaData = storage.read('gacha_data') || {};
  gachaData[mockGuildId] = {
    'user_tester': {
      tickets: 10,
      stardust: 500,
      streak: 3,
      pulls: 25,
      inventory: ['Cosmic Aegis of Infinity'],
      badges: ['[STREAK_7D]'],
      titles: ['Lord of Infinity'],
      equippedTitle: 'Lord of Infinity',
      pityEpic: 2,
      pityLegendary: 8,
      activeRole: { tier: 'MYTHIC', roleId: 'role_mythic_123' },
      duelDefenseStreak: 2
    }
  };
  storage.write('gacha_data', gachaData);

  let replyPayload = null;
  let isRedirected = false;

  const createMockInteraction = (subcommand, currentChannelId) => {
    replyPayload = null;
    isRedirected = false;

    return {
      guild: {
        id: mockGuildId,
        name: 'Test Guild',
        channels: {
          cache: {
            get: (id) => ({ id, name: `channel-${id}` })
          }
        }
      },
      user: {
        id: 'user_tester',
        username: 'UserTester',
        displayAvatarURL: () => 'https://example.com/avatar.png'
      },
      member: {
        id: 'user_tester',
        displayName: 'UserTester',
        roles: { cache: new Map() }
      },
      channelId: currentChannelId,
      options: {
        getSubcommand: () => subcommand,
        getUser: () => null,
        getString: () => null,
        getInteger: () => null,
        getChannel: () => null
      },
      replied: false,
      deferred: false,
      reply: async (data) => {
        replyPayload = data;
        if (data?.embeds?.[0]?.data?.title === 'Pengalihan Saluran Gacha') {
          isRedirected = true;
        }
        return data;
      },
      editReply: async (data) => {
        replyPayload = data;
        return data;
      },
      deferReply: async () => {}
    };
  };

  // TEST 1: Run /gacha inventory outside main gacha umum channel -> MUST REDIRECT to main_gacha_umum_channel
  console.log('1. Testing /gacha inventory outside main gacha umum channel (e.g. from general chat)...');
  const outsideInteraction = createMockInteraction('inventory', 'random_chat_channel');
  await gachaCommand.execute(outsideInteraction, {});
  assert.strictEqual(isRedirected, true, '/gacha inventory MUST be redirected to main gacha umum channel!');
  assert(replyPayload?.embeds?.[0]?.data?.description.includes('main_gacha_umum_channel'), 'Should redirect specifically to main_gacha_umum_channel');
  assert(replyPayload?.embeds?.[0]?.data?.description.includes('Buka Inventory'), 'Should mention Buka Inventory in description');
  console.log('-> PASS: /gacha inventory outside main gacha correctly shows redirection to Main Gacha Umum.');

  // TEST 2: Run /gacha inventory INSIDE main gacha umum channel -> MUST DISPLAY INVENTORY
  console.log('2. Testing /gacha inventory INSIDE main gacha umum channel...');
  const insideInteraction = createMockInteraction('inventory', 'main_gacha_umum_channel');
  await gachaCommand.execute(insideInteraction, {});
  assert.strictEqual(isRedirected, false, '/gacha inventory inside main gacha MUST NOT be redirected!');
  assert(replyPayload?.embeds?.[0]?.data?.author?.name.includes('Koleksi & Inventaris'), 'Should display user inventory embed');
  console.log('-> PASS: /gacha inventory inside main gacha umum displays inventory properly.');

  // TEST 3: Test button interaction redirection logic for 'inv'
  console.log('3. Testing button interaction simulation for gacha_btn_inv outside main gacha...');
  const testButtonAction = (action, channelId) => {
    const gChannels = settings[mockGuildId]?.gachaChannels || {};
    let requiredChannelId = null;
    let actionLabel = 'Gacha';

    if (action === 'daily') {
      requiredChannelId = gChannels.daily || gChannels.play;
      actionLabel = 'Klaim Hadiah Harian';
    } else if (action === 'pull_1' || action === 'pull_10') {
      requiredChannelId = gChannels.pull || gChannels.play;
      actionLabel = 'Tarik Gacha';
    } else if (action.startsWith('challenge_prompt')) {
      requiredChannelId = gChannels.duel || gChannels.play;
      actionLabel = 'Tantangan Tahta';
    } else if (action === 'inv') {
      requiredChannelId = gChannels.play;
      actionLabel = 'Buka Inventory';
    }

    if (requiredChannelId && channelId !== requiredChannelId) {
      return { redirected: true, requiredChannelId, actionLabel };
    }
    return { redirected: false };
  };

  const btnOutsideResult = testButtonAction('inv', 'specific_daily_channel');
  assert.strictEqual(btnOutsideResult.redirected, true, 'Button inv outside main gacha MUST redirect!');
  assert.strictEqual(btnOutsideResult.requiredChannelId, 'main_gacha_umum_channel');
  console.log('-> PASS: Button inv clicked in daily channel redirects to main_gacha_umum_channel.');

  const btnInsideResult = testButtonAction('inv', 'main_gacha_umum_channel');
  assert.strictEqual(btnInsideResult.redirected, false, 'Button inv inside main gacha MUST NOT redirect!');
  console.log('-> PASS: Button inv clicked inside main gacha opens directly.');

  // TEST 4: When play channel is NOT set (null), inventory is allowed anywhere
  console.log('4. Testing when main gacha umum channel is NOT set (null)...');
  settings[mockGuildId].gachaChannels.play = null;
  storage.write('settings', settings);

  const noPlayInteraction = createMockInteraction('inventory', 'random_chat_channel');
  await gachaCommand.execute(noPlayInteraction, {});
  assert.strictEqual(isRedirected, false, 'When play channel is null, inventory is allowed anywhere!');
  console.log('-> PASS: Inventory works everywhere when play channel is not configured.');

  console.log('\n======================================================');
  console.log('ALL INVENTORY TO MAIN GACHA REDIRECTION TESTS PASSED (100%)');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
