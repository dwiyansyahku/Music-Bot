/**
 * Test Suite: Split Duel Channels (Mythic & Legendary) & Safe Panel Deployment
 */
const assert = require('assert');
const storage = require('../src/utils/storage');
const gachaCommand = require('../src/commands/gacha');

async function runTests() {
  console.log('🧪 Starting Split Duel Channels & Safe Panel Deployment Test Suite...\n');

  const origSettings = storage.read('settings') || {};
  const origGachaData = storage.read('gacha_data') || {};
  const origThroneData = storage.read('throne_duels') || {};

  const testGuildId = 'test_guild_split_tiers_001';
  const testChallengerId = 'user_challenger_99';
  const testDefenderMythic = 'user_mythic_defender_1';
  const testDefenderLegendary = 'user_legendary_defender_2';

  try {
    // -------------------------------------------------------------
    // Test 1: SlashCommandBuilder & Choices Validation
    // -------------------------------------------------------------
    console.log('Test 1: Validating SlashCommandBuilder choices & subcommands...');
    const commandData = gachaCommand.data.toJSON();
    const setchannelSub = commandData.options.find(o => o.name === 'setchannel');
    assert(setchannelSub, 'Subcommand setchannel should exist');
    const typeOpt = setchannelSub.options.find(o => o.name === 'type');
    const choiceValues = typeOpt.choices.map(c => c.value);

    assert(choiceValues.includes('throne'), 'setchannel should have choice throne');
    assert(choiceValues.includes('duel_mythic'), 'setchannel should have choice duel_mythic');
    assert(choiceValues.includes('duel_legendary'), 'setchannel should have choice duel_legendary');
    assert(choiceValues.includes('pull'), 'setchannel should have choice pull');
    assert(choiceValues.includes('daily'), 'setchannel should have choice daily');
    assert(!choiceValues.includes('duel'), 'setchannel should omit redundant alias duel');
    assert(!choiceValues.includes('tactics'), 'setchannel should omit redundant alias tactics');

    const taktikSub = commandData.options.find(o => o.name === 'taktik');
    assert(taktikSub, 'Subcommand taktik should exist');

    const panelSub = commandData.options.find(o => o.name === 'panel');
    const panelTypeOpt = panelSub.options.find(o => o.name === 'type');
    const panelChoiceValues = panelTypeOpt.choices.map(c => c.value);
    assert(panelChoiceValues.includes('throne'), 'panel should have choice throne');

    console.log('✅ Test 1 passed: SlashCommandBuilder updated perfectly.\n');

    // -------------------------------------------------------------
    // Test 2: Channel Resolution Helper (resolveDuelChannel & resolveThroneLoungeChannel)
    // -------------------------------------------------------------
    console.log('Test 2: Testing resolveDuelChannel & resolveThroneLoungeChannel...');
    const mockChannels = {
      ch_lounge: { id: 'ch_lounge', name: 'throne-lounge', isTextBased: () => true },
      ch_mythic: { id: 'ch_mythic', name: 'duel-mythic', isTextBased: () => true },
      ch_legendary: { id: 'ch_legendary', name: 'duel-legendary', isTextBased: () => true },
      ch_fallback: { id: 'ch_fallback', name: 'general', isTextBased: () => true }
    };

    const mockClient = {
      application: {
        fetch: async () => ({ owner: { id: 'owner_id' } })
      },
      channels: {
        fetch: async (id) => mockChannels[id] || null
      }
    };

    const testSettings = {
      [testGuildId]: {
        gachaChannels: {
          throne: 'ch_lounge',
          duel_mythic: 'ch_mythic',
          duel_legendary: 'ch_legendary'
        }
      }
    };
    storage.write('settings', testSettings);

    const mythicTarget = await gachaCommand.resolveDuelChannel(testGuildId, 'MYTHIC', mockClient, mockChannels.ch_fallback);
    assert.strictEqual(mythicTarget.id, 'ch_mythic', 'Mythic duel should resolve to duel_mythic channel');

    const legTarget = await gachaCommand.resolveDuelChannel(testGuildId, 'LEGENDARY', mockClient, mockChannels.ch_fallback);
    assert.strictEqual(legTarget.id, 'ch_legendary', 'Legendary duel should resolve to duel_legendary channel');

    const loungeTarget = await gachaCommand.resolveThroneLoungeChannel(testGuildId, mockClient, mockChannels.ch_fallback);
    assert.strictEqual(loungeTarget.id, 'ch_lounge', 'Throne Lounge should resolve to throne channel');

    // Test fallback when channels are not specifically split
    const fallbackSettings = {
      [testGuildId]: {
        gachaChannels: {
          duel: 'ch_lounge'
        }
      }
    };
    storage.write('settings', fallbackSettings);

    const fallbackMythic = await gachaCommand.resolveDuelChannel(testGuildId, 'MYTHIC', mockClient, mockChannels.ch_fallback);
    assert.strictEqual(fallbackMythic.id, 'ch_lounge', 'Mythic should fallback to duel/lounge channel if not split');

    console.log('✅ Test 2 passed: Channel resolvers work accurately with full fallback support.\n');

    // -------------------------------------------------------------
    // Test 3: Safe deployGachaPanel (No Overwrite / No Delete of Duel Cards)
    // -------------------------------------------------------------
    console.log('Test 3: Testing safe deployGachaPanel tracking & duel card protection...');
    let channelMessages = [];
    const mockChannel = {
      id: 'ch_test_duel',
      isTextBased: () => true,
      isThread: () => false,
      send: async (payload) => {
        const msg = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          content: payload.content || '',
          embeds: payload.embeds || [],
          components: payload.components || [],
          edit: async (newPayload) => {
            msg.embeds = newPayload.embeds;
            msg.components = newPayload.components;
            return msg;
          },
          delete: async () => {
            channelMessages = channelMessages.filter(m => m.id !== msg.id);
          }
        };
        channelMessages.push(msg);
        return msg;
      },
      messages: {
        fetch: async (id) => channelMessages.find(m => m.id === id) || null
      }
    };

    const mockGuild = { id: testGuildId, name: 'Test Guild' };

    // Step A: Deploy panel first time
    const initialPanel = await gachaCommand.deployGachaPanel(mockGuild, mockChannel, 'duel', mockClient);
    assert(initialPanel, 'Initial panel should be sent');
    assert.strictEqual(channelMessages.length, 1, 'Channel should contain 1 message (the panel)');

    const savedSettings = storage.read('settings');
    assert.strictEqual(savedSettings[testGuildId].gachaPanels.duel, initialPanel.id, 'gachaPanels should record panel message id');

    // Step B: A duel challenge message is sent in the channel
    const duelCardMsg = await mockChannel.send({
      content: '<@challenger> menantang <@defender>!',
      embeds: [{ title: 'Tantangan Perebutan Kursi' }]
    });
    assert.strictEqual(channelMessages.length, 2, 'Channel now has panel AND duelCardMsg');

    // Step C: Trigger updateDuelPanelIfExists or deployGachaPanel again
    const refreshedPanel = await gachaCommand.deployGachaPanel(mockGuild, mockChannel, 'duel', mockClient);
    assert.strictEqual(refreshedPanel.id, initialPanel.id, 'deployGachaPanel should edit the existing panel message');
    assert.strictEqual(channelMessages.length, 2, 'Channel must STILL have 2 messages (duel card MUST NOT be deleted)');
    assert(channelMessages.some(m => m.id === duelCardMsg.id), 'Duel card message must still exist untouched');

    console.log('✅ Test 3 passed: Panel ID is tracked safely, duel cards are NEVER overwritten or deleted.\n');

    // -------------------------------------------------------------
    // Test 4: Subcommand /gacha taktik execution
    // -------------------------------------------------------------
    console.log('Test 4: Testing /gacha taktik handling...');
    const testThroneData = {
      [testGuildId]: {
        activeDuels: {
          duel_active_1: {
            id: 'duel_active_1',
            guildId: testGuildId,
            challengerId: testChallengerId,
            defenderId: testDefenderMythic,
            itemTier: 'MYTHIC',
            status: 'WAITING_TACTICS',
            tactics: { challenger: null, defender: null }
          }
        },
        queues: { MYTHIC: [], LEGENDARY: [] }
      }
    };
    storage.write('throne_duels', testThroneData);

    // Case 4A: User not in duel
    let replyPayload = null;
    await gachaCommand.execute({
      options: { getSubcommand: () => 'taktik' },
      user: { id: 'random_user_123' },
      guild: { id: testGuildId },
      channelId: 'ch_lounge',
      reply: async (payload) => { replyPayload = payload; return payload; }
    }, mockClient);
    assert(replyPayload.content.includes('tidak memiliki duel tahta'), 'Should reject user without active duel');

    // Case 4B: Participant in active duel waiting for tactics
    await gachaCommand.execute({
      options: { getSubcommand: () => 'taktik' },
      user: { id: testChallengerId },
      guild: { id: testGuildId },
      channelId: 'ch_lounge',
      reply: async (payload) => { replyPayload = payload; return payload; }
    }, mockClient);
    assert(replyPayload.content.includes('Ronde 1 dari 3'), 'Should prompt for Round 1 moves');
    assert(replyPayload.components.length > 0, 'Should provide Serang/Bertahan/Jurus buttons');

    console.log('✅ Test 4 passed: /gacha taktik provides instant move choices for duel participants.\n');

    // -------------------------------------------------------------
    // Test 5: Quick [Pasang Taktik] in executeGachaDuelStatus
    // -------------------------------------------------------------
    console.log('Test 5: Testing quick [Pasang Taktik] button in executeGachaDuelStatus...');
    let statusReply = null;
    const mockStatusInteraction = {
      guild: { id: testGuildId, name: 'Test Guild' },
      user: { id: testChallengerId },
      replied: false,
      deferred: false,
      reply: async (payload) => { statusReply = payload; return payload; }
    };

    await gachaCommand.executeGachaDuelStatus(mockStatusInteraction, mockClient);
    assert(statusReply.components && statusReply.components.length > 0, 'Status must include action row with button');
    const button = statusReply.components[0].components[0];
    assert.strictEqual(button.data.custom_id, 'throne_duel:set:duel_active_1', 'Button should link directly to user pending duel ID');
    console.log('✅ Test 5 passed: executeGachaDuelStatus includes instant [Pasang Taktik] button for participants.\n');

    console.log('🎉 ALL 5 TEST SUITES PASSED FLAWLESSLY!');
  } finally {
    // Restore original storage
    storage.write('settings', origSettings);
    storage.write('gacha_data', origGachaData);
    storage.write('throne_duels', origThroneData);
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
