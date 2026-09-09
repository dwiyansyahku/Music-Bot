/**
 * Test Arena Duel Panel Deployment, Refresh, and Button Interactions
 */
const assert = require('assert');
const {
  createDuelPanelPayload,
  deployGachaPanel,
  updateDuelPanelIfExists,
  executeGachaDuelStatus,
  executeGachaDuelHelp,
  execute: executeGachaCommand
} = require('../src/commands/gacha');
const storage = require('../src/utils/storage');

async function runTests() {
  console.log('--- Starting Arena Duel Panel Unit Tests ---');

  const testGuildId = 'guild_duel_test_99';
  const duelChannelId = 'ch_duel_arena_99';
  const playChannelId = 'ch_main_play_99';

  // Setup mock storage
  const mockSettings = {
    [testGuildId]: {
      gachaRoles: {
        MYTHIC: 'role_mythic_99',
        LEGENDARY: 'role_legend_99'
      },
      gachaChannels: {
        duel: duelChannelId,
        play: playChannelId
      }
    }
  };
  storage.write('settings', mockSettings);

  const mockGachaData = {
    [testGuildId]: {
      'user_king': {
        tickets: 5,
        stardust: 100,
        inventory: ['Pedang Raja'],
        badges: [],
        titles: [],
        activeRole: {
          tier: 'MYTHIC',
          roleId: 'role_mythic_99',
          obtainedAt: Date.now()
        },
        duelDefenseStreak: 2,
        duelHistory: [
          { opponent: 'user_challenger', tier: 'MYTHIC', result: 'win', role: 'defender', date: Date.now() }
        ]
      }
    }
  };
  storage.write('gacha_data', mockGachaData);

  const mockThroneDuels = {
    [testGuildId]: {
      activeDuels: {
        'duel_001': {
          id: 'duel_001',
          guildId: testGuildId,
          challengerId: 'user_challenger',
          defenderId: 'user_king',
          itemTier: 'MYTHIC',
          status: 'WAITING_TACTICS',
          tactics: { challenger: ['attack', 'skill', 'attack'], defender: null },
          expiresAt: Date.now() + 3600000
        }
      },
      queues: {
        MYTHIC: [],
        LEGENDARY: []
      }
    }
  };
  storage.write('throne_duels', mockThroneDuels);

  const mockGuild = {
    id: testGuildId,
    name: 'Kingdom of Valor',
    channels: {
      cache: new Map(),
      fetch: async (id) => mockGuild.channels.cache.get(id)
    }
  };

  // 1. Test createDuelPanelPayload
  console.log('[Test 1] Verifying createDuelPanelPayload...');
  const payload = createDuelPanelPayload(mockGuild);
  assert(payload.embeds && payload.embeds.length === 1, 'Embed should exist');
  const embed = payload.embeds[0].data;
  assert(embed.title.includes('ARENA DUEL TAHTA'), 'Title should mention ARENA DUEL TAHTA');
  assert(embed.description.includes('user_king'), 'Description should list current Mythic holder');
  assert(embed.description.includes('Bertahan: 2x'), 'Description should show defense streak');
  assert(embed.description.includes('duel_001') || embed.description.includes('user_challenger'), 'Active duel should be listed');

  assert(payload.components && payload.components.length === 1, 'Components row should exist');
  const buttons = payload.components[0].components;
  assert.strictEqual(buttons.length, 5, 'Should have exactly 5 action buttons');
  const customIds = buttons.map(b => b.data.custom_id);
  assert(customIds.includes('gacha_btn_duel_mythic'), 'Should include Tantang Mythic button');
  assert(customIds.includes('gacha_btn_duel_legendary'), 'Should include Tantang Legendary button');
  assert(customIds.includes('gacha_btn_duel_status'), 'Should include Status & Riwayat button');
  assert(customIds.includes('gacha_btn_inv'), 'Should include Cek Inventory button');
  assert(customIds.includes('gacha_btn_duel_help'), 'Should include Panduan Taktik button');
  console.log('✓ createDuelPanelPayload verified successfully');

  // 2. Test deployGachaPanel
  console.log('[Test 2] Verifying deployGachaPanel in duel channel...');
  let sentMsg = null;
  let editedMsg = null;
  const mockChannel = {
    id: duelChannelId,
    isTextBased: () => true,
    isThread: () => false,
    messages: {
      fetch: async () => new Map()
    },
    send: async (msgData) => {
      sentMsg = {
        id: 'msg_panel_123',
        author: { id: 'bot_id' },
        ...msgData,
        edit: async (upd) => { editedMsg = upd; }
      };
      return sentMsg;
    }
  };
  mockGuild.channels.cache.set(duelChannelId, mockChannel);

  const mockClient = {
    user: { id: 'bot_id' },
    application: {
      owner: { id: 'admin_user' },
      fetch: async () => ({ owner: { id: 'admin_user' } })
    },
    channels: {
      fetch: async (id) => (id === duelChannelId ? mockChannel : null)
    },
    guilds: {
      cache: new Map([[testGuildId, mockGuild]])
    }
  };

  const deployed = await deployGachaPanel(mockGuild, mockChannel, 'duel', mockClient);
  assert(deployed && deployed.id === 'msg_panel_123', 'deployGachaPanel should send panel message');
  assert(sentMsg !== null, 'Message should have been sent to channel');
  console.log('✓ deployGachaPanel deployed panel message successfully');

  // 3. Test updateDuelPanelIfExists
  console.log('[Test 3] Verifying updateDuelPanelIfExists...');
  mockChannel.messages.fetch = async () => new Map([['msg_panel_123', sentMsg]]);
  await updateDuelPanelIfExists(mockGuild, mockClient);
  assert(editedMsg !== null, 'Existing panel should have been edited in-place');
  console.log('✓ updateDuelPanelIfExists refreshed panel message in-place');

  // 4. Test executeGachaDuelStatus
  console.log('[Test 4] Verifying executeGachaDuelStatus...');
  let statusReply = null;
  const mockStatusInteraction = {
    guild: mockGuild,
    replied: false,
    deferred: false,
    reply: async (opt) => { statusReply = opt; }
  };
  await executeGachaDuelStatus(mockStatusInteraction, mockClient);
  assert(statusReply && statusReply.embeds && statusReply.embeds.length === 1, 'Status reply must have embed');
  const statusFields = statusReply.embeds[0].data.fields;
  assert(statusFields.some(f => f.name.includes('Tahta MYTHIC')), 'Field Tahta MYTHIC must be present');
  assert(statusFields.some(f => f.name.includes('Pertarungan Duel Aktif')), 'Field Duel Aktif must be present');
  console.log('✓ executeGachaDuelStatus generated comprehensive throne & duel breakdown');

  // 5. Test executeGachaDuelHelp
  console.log('[Test 5] Verifying executeGachaDuelHelp...');
  let helpReply = null;
  const mockHelpInteraction = {
    guild: mockGuild,
    replied: false,
    deferred: false,
    reply: async (opt) => { helpReply = opt; }
  };
  await executeGachaDuelHelp(mockHelpInteraction);
  assert(helpReply && helpReply.embeds && helpReply.embeds.length === 1, 'Help reply must have embed');
  assert(helpReply.embeds[0].data.title.includes('Panduan Pertarungan Tahta'), 'Help title must match');
  console.log('✓ executeGachaDuelHelp generated tactics guide');

  // 6. Test /gacha setchannel type:duel auto-deploy
  console.log('[Test 6] Verifying /gacha setchannel type:duel auto-deploys Arena Duel Panel...');
  let setChReply = null;
  const mockSetChInteraction = {
    guildId: testGuildId,
    guild: mockGuild,
    user: { id: 'admin_user' },
    member: { permissions: { has: () => true } },
    options: {
      getSubcommand: () => 'setchannel',
      getString: (n) => (n === 'type' ? 'duel' : null),
      getChannel: (n) => (n === 'channel' ? mockChannel : null)
    },
    reply: async (opt) => { setChReply = opt; }
  };
  await executeGachaCommand(mockSetChInteraction, mockClient);
  assert(setChReply && setChReply.embeds, 'setchannel should reply with embed');
  const setChDesc = setChReply.embeds[0].data.description;
  assert(setChDesc.includes('Panel Arena Duel Tahta interaktif otomatis dipasang'), 'Should confirm panel auto-deploy');
  console.log('✓ /gacha setchannel type:duel auto-deploys Arena Duel Panel');

  // 7. Test /gacha panel type:duel
  console.log('[Test 7] Verifying /gacha panel type:duel...');
  let panelReply = null;
  const mockPanelInteraction = {
    guildId: testGuildId,
    guild: mockGuild,
    user: { id: 'admin_user' },
    member: { permissions: { has: () => true } },
    channel: mockChannel,
    options: {
      getSubcommand: () => 'panel',
      getString: (n) => (n === 'type' ? 'duel' : null),
      getChannel: () => null
    },
    deferReply: async () => {},
    editReply: async (opt) => { panelReply = opt; }
  };
  await executeGachaCommand(mockPanelInteraction, mockClient);
  assert(panelReply && panelReply.embeds, 'panel command should editReply with embed');
  assert(panelReply.embeds[0].data.description.includes('Panel Arena Duel Tahta'), 'Should confirm duel panel deployment');
  console.log('✓ /gacha panel type:duel deployed panel successfully');

  // 8. Test Button Redirection when clicking duel button outside duel channel
  console.log('[Test 8] Verifying duel button redirection if clicked outside duel channel...');
  const interactionCreate = require('../src/events/interactionCreate');
  let redirectReply = null;
  const mockOutsideBtnInteraction = {
    isButton: () => true,
    isStringSelectMenu: () => false,
    isCommand: () => false,
    isChatInputCommand: () => false,
    isAutocomplete: () => false,
    customId: 'gacha_btn_duel_mythic',
    guildId: testGuildId,
    channelId: 'ch_random_other',
    guild: mockGuild,
    user: { id: 'regular_user' },
    member: { permissions: { has: () => false } },
    reply: async (opt) => { redirectReply = opt; }
  };
  await interactionCreate.execute(mockOutsideBtnInteraction, mockClient);
  assert(redirectReply && redirectReply.embeds, 'Should reply with redirection embed');
  assert(redirectReply.embeds[0].data.title.includes('Pengalihan Saluran Gacha'), 'Should have redirection title');
  assert(redirectReply.components[0].components[0].data.url.includes(duelChannelId), 'Should have button directing to duel channel');
  console.log('✓ Button redirection outside duel channel verified successfully');

  // 9. Test Button Handling inside duel channel (duel_status & duel_help)
  console.log('[Test 9] Verifying duel panel buttons inside duel channel...');
  let btnStatusReply = null;
  const mockInsideStatusBtn = {
    isButton: () => true,
    isStringSelectMenu: () => false,
    isCommand: () => false,
    isChatInputCommand: () => false,
    isAutocomplete: () => false,
    customId: 'gacha_btn_duel_status',
    guildId: testGuildId,
    channelId: duelChannelId,
    guild: mockGuild,
    user: { id: 'regular_user' },
    member: { permissions: { has: () => false } },
    deferred: false,
    replied: false,
    deferReply: async function() { this.deferred = true; },
    editReply: async (opt) => { btnStatusReply = opt; }
  };
  await interactionCreate.execute(mockInsideStatusBtn, mockClient);
  assert(btnStatusReply && btnStatusReply.embeds, 'Status button should return embeds');
  assert(btnStatusReply.embeds[0].data.title.includes('Status Tahta & Duel'), 'Should display status title');
  console.log('✓ Status button in duel channel verified successfully');

  console.log('\n>>> All Arena Duel Panel tests PASSED! <<<');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
