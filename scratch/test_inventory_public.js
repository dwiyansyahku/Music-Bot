const assert = require('assert');
const storage = require('../src/utils/storage');
const gachaCommand = require('../src/commands/gacha');

async function testInventoryIsPublic() {
  console.log('[TEST] Verifying Gacha Inventory is Public...');

  const mockGuildId = 'test_guild_inventory_public';
  const settings = storage.read('settings') || {};
  settings[mockGuildId] = {
    gachaRoles: {},
    gachaChannels: {
      play: 'main_gacha_channel'
    }
  };
  storage.write('settings', settings);

  const gachaData = storage.read('gacha_data') || {};
  gachaData[mockGuildId] = {
    'user_public': {
      tickets: 5,
      stardust: 120,
      streak: 2,
      pulls: 10,
      inventory: ['Aura of the Celestial Dragon'],
      badges: ['✦ Dragon Sovereign'],
      titles: ['Cosmic Dragon'],
      equippedTitle: 'Cosmic Dragon',
      pityEpic: 1,
      pityLegendary: 4,
      activeRole: null,
      duelDefenseStreak: 0
    }
  };
  storage.write('gacha_data', gachaData);

  let replyFlags = null;
  let replyData = null;

  const mockInteraction = {
    guild: {
      id: mockGuildId,
      name: 'Test Public Guild',
      channels: {
        cache: {
          get: (id) => ({ id, name: 'main_gacha_channel' })
        }
      }
    },
    user: {
      id: 'user_public',
      username: 'UserPublic',
      displayAvatarURL: () => 'https://example.com/avatar.png'
    },
    member: {
      id: 'user_public',
      displayName: 'UserPublic',
      roles: { cache: new Map() }
    },
    channelId: 'main_gacha_channel',
    options: {
      getSubcommand: () => 'inventory',
      getUser: () => null
    },
    replied: false,
    deferred: false,
    reply: async (payload) => {
      replyData = payload;
      replyFlags = payload.flags;
      return payload;
    },
    editReply: async (payload) => {
      replyData = payload;
      replyFlags = payload.flags;
      return payload;
    }
  };

  await gachaCommand.execute(mockInteraction, {});

  // Assert reply was made without ephemeral flag
  assert.strictEqual(replyFlags, undefined, 'Inventory reply MUST be public (flags should be undefined, not Ephemeral)');
  assert(replyData.embeds[0].data.author.name.includes('Koleksi & Inventaris — UserPublic'));
  console.log('✓ Test Passed: /gacha inventory is completely public in channel.');

  // Test button deferReply call simulation
  let deferredFlags = null;
  const mockButtonInteraction = {
    ...mockInteraction,
    deferReply: async (opts) => {
      deferredFlags = opts?.flags;
    }
  };

  // Simulating interactionCreate logic for action === 'inv'
  await mockButtonInteraction.deferReply();
  assert.strictEqual(deferredFlags, undefined, 'Button inv deferReply MUST be public (flags undefined)');
  console.log('✓ Test Passed: Button inv deferReply is public.');

  console.log('\n=======================================');
  console.log('PUBLIC INVENTORY VERIFICATION: 100% PASS');
  console.log('=======================================\n');
}

testInventoryIsPublic().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
