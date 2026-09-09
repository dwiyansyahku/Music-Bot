/**
 * Automated test suite for Clash of Thrones Duel QoL enhancements:
 * 1. 2-Hour Expiry Reminder
 * 2. Surrender / Forfeit ([Menyerah]) Button
 * 3. Duel Record Tracking in /gacha inventory
 * 4. Auto-Refresh Throne/Duel Panel on Startup
 */
const assert = require('assert');
const storage = require('../src/utils/storage');
const gachaModule = require('../src/commands/gacha');

const {
  checkAndExpireThroneDuels,
  processDuelButton,
  executeGachaInventory,
  updateDuelPanelIfExists
} = gachaModule;

// Save original storage state
const origGachaData = storage.read('gacha_data') || {};
const origThroneData = storage.read('throne_duels') || {};
const origSettingsData = storage.read('settings') || {};

const TEST_GUILD_ID = 'test_guild_qol_123';
const CHALLENGER_ID = 'challenger_qol_1';
const DEFENDER_ID = 'defender_qol_2';
const STRANGER_ID = 'stranger_qol_9';
const DUEL_CH_ID = 'duel_ch_456';
const THRONE_CH_ID = 'throne_lounge_789';
const MYTHIC_ROLE_ID = 'role_mythic_999';

async function runTests() {
  console.log('--- Starting Clash of Thrones QoL Tests ---');

  // Setup initial test data
  const testSettings = {
    [TEST_GUILD_ID]: {
      gachaRoles: {
        MYTHIC: MYTHIC_ROLE_ID,
        LEGENDARY: 'role_leg_888'
      },
      gachaChannels: {
        throne: THRONE_CH_ID,
        duel_mythic: DUEL_CH_ID
      },
      gachaPanels: {}
    }
  };
  storage.write('settings', testSettings);

  const testGachaData = {
    [TEST_GUILD_ID]: {
      [CHALLENGER_ID]: {
        tickets: 5,
        stardust: 100,
        inventory: ['Cincin Nebula'],
        badges: [],
        titles: [],
        duelWins: 0,
        duelLosses: 0,
        duelDefenseStreak: 0,
        activeRole: null
      },
      [DEFENDER_ID]: {
        tickets: 5,
        stardust: 100,
        inventory: ['Cincin Nebula'],
        badges: [],
        titles: [],
        duelWins: 0,
        duelLosses: 0,
        duelDefenseStreak: 2,
        activeRole: {
          tier: 'MYTHIC',
          roleId: MYTHIC_ROLE_ID,
          obtainedAt: Date.now() - 100000
        }
      }
    }
  };
  storage.write('gacha_data', testGachaData);

  const sentDMs = [];
  const sentChannelMsgs = [];
  const editedMessages = [];

  const mockDuelChannel = {
    id: DUEL_CH_ID,
    name: 'arena-mythic',
    isTextBased: () => true,
    isThread: () => false,
    send: async (payload) => {
      sentChannelMsgs.push(payload);
      return { id: 'msg_' + Date.now(), url: 'https://discord.com/msg/duel' };
    },
    messages: {
      fetch: async (msgId) => ({
        id: msgId,
        edit: async (data) => {
          editedMessages.push(data);
          return true;
        }
      })
    }
  };

  const mockThroneChannel = {
    id: THRONE_CH_ID,
    name: 'throne-lounge',
    isTextBased: () => true,
    isThread: () => false,
    send: async (payload) => {
      sentChannelMsgs.push(payload);
      return { id: 'msg_' + Date.now(), url: 'https://discord.com/msg/throne' };
    },
    messages: {
      fetch: async (msgId) => ({
        id: msgId,
        edit: async (data) => {
          editedMessages.push(data);
          return true;
        }
      })
    }
  };

  const mockGuild = {
    id: TEST_GUILD_ID,
    name: 'Test Server QoL',
    channels: {
      cache: new Map([
        [DUEL_CH_ID, mockDuelChannel],
        [THRONE_CH_ID, mockThroneChannel]
      ])
    },
    members: {
      cache: new Map(),
      fetch: async (userId) => ({
        id: userId,
        displayName: userId === CHALLENGER_ID ? 'ChallengerOne' : 'DefenderTwo',
        roles: {
          cache: new Map(userId === DEFENDER_ID ? [[MYTHIC_ROLE_ID, true]] : []),
          add: async () => {},
          remove: async () => {}
        }
      })
    }
  };

  const mockClient = {
    guilds: {
      cache: new Map([[TEST_GUILD_ID, mockGuild]])
    },
    channels: {
      fetch: async (chId) => {
        if (chId === DUEL_CH_ID) return mockDuelChannel;
        if (chId === THRONE_CH_ID) return mockThroneChannel;
        return null;
      }
    },
    users: {
      fetch: async (uId) => ({
        id: uId,
        username: uId,
        send: async (payload) => {
          sentDMs.push({ userId: uId, payload });
          return true;
        }
      })
    }
  };

  // =============================================
  // TEST 1: 2-Hour Expiry Reminder
  // =============================================
  console.log('\n[Test 1] 2-Hour Expiry Reminder');
  const duelId1 = 'duel_reminder_test';
  const now = Date.now();
  // Duel with 1.5 hours remaining (<= 2 hours)
  const duel1 = {
    id: duelId1,
    guildId: TEST_GUILD_ID,
    challengerId: CHALLENGER_ID,
    defenderId: DEFENDER_ID,
    itemTier: 'MYTHIC',
    configuredRoleId: MYTHIC_ROLE_ID,
    tactics: { challenger: null, defender: null },
    status: 'WAITING_TACTICS',
    channelId: DUEL_CH_ID,
    messageId: 'card_msg_1',
    createdAt: now - (10.5 * 3600 * 1000),
    expiresAt: now + (1.5 * 3600 * 1000), // 1.5 hours remaining
    reminderSent: false
  };

  storage.write('throne_duels', {
    [TEST_GUILD_ID]: {
      activeDuels: { [duelId1]: duel1 },
      queues: { MYTHIC: [], LEGENDARY: [] }
    }
  });

  await checkAndExpireThroneDuels(mockClient);

  // Assertions for Test 1
  assert.strictEqual(sentDMs.length, 2, 'Should send DM to both pending participants');
  assert(sentDMs.some(d => d.userId === CHALLENGER_ID), 'Challenger should get DM');
  assert(sentDMs.some(d => d.userId === DEFENDER_ID), 'Defender should get DM');
  assert(sentChannelMsgs.some(m => m.content && m.content.includes('kurang dari 2 jam')), 'Channel should receive reminder notice');

  const reloadedThrone = storage.read('throne_duels');
  assert.strictEqual(reloadedThrone[TEST_GUILD_ID].activeDuels[duelId1].reminderSent, true, 'reminderSent flag should be set to true');

  // Verify no duplicate reminder on 2nd run
  const initialDMLen = sentDMs.length;
  await checkAndExpireThroneDuels(mockClient);
  assert.strictEqual(sentDMs.length, initialDMLen, 'Should NOT send duplicate reminder on subsequent tick');
  console.log('✅ Test 1 Passed: 2-Hour reminder sent cleanly without duplicates.');

  // =============================================
  // TEST 2: Surrender / Forfeit ([Menyerah])
  // =============================================
  console.log('\n[Test 2] Surrender / Forfeit Button');

  // 2A: Unauthorized User attempt
  let repliedContent = null;
  const mockStrangerInteraction = {
    customId: `throne_duel:forfeit:${duelId1}`,
    user: { id: STRANGER_ID },
    reply: async ({ content }) => { repliedContent = content; }
  };
  await processDuelButton(mockStrangerInteraction, mockClient);
  assert(repliedContent && repliedContent.includes('bukan peserta duel'), 'Stranger should be rejected from forfeiting');

  // 2B: Defender Forfeits
  let defenderReplied = null;
  const mockDefenderInteraction = {
    customId: `throne_duel:forfeit:${duelId1}`,
    user: { id: DEFENDER_ID },
    reply: async ({ content }) => { defenderReplied = content; }
  };
  await processDuelButton(mockDefenderInteraction, mockClient);
  assert(defenderReplied && defenderReplied.includes('menyerah'), 'Defender forfeit interaction replied');

  const afterDefenderForfeitGacha = storage.read('gacha_data')[TEST_GUILD_ID];
  const afterDefenderForfeitThrone = storage.read('throne_duels')[TEST_GUILD_ID];

  assert.strictEqual(afterDefenderForfeitGacha[CHALLENGER_ID].duelWins, 1, 'Challenger should get 1 win');
  assert.strictEqual(afterDefenderForfeitGacha[DEFENDER_ID].duelLosses, 1, 'Defender should get 1 loss');
  assert.strictEqual(afterDefenderForfeitGacha[DEFENDER_ID].activeRole, null, 'Defender activeRole should be stripped');
  assert.strictEqual(afterDefenderForfeitGacha[DEFENDER_ID].stardust, 200, 'Defender should receive +100 compensation (100 + 100 = 200)');
  assert.strictEqual(afterDefenderForfeitGacha[CHALLENGER_ID].activeRole.tier, 'MYTHIC', 'Challenger should receive MYTHIC role');
  assert.strictEqual(afterDefenderForfeitThrone.activeDuels[duelId1], undefined, 'Duel should be removed from activeDuels');
  console.log('✅ Test 2A & 2B Passed: Defender forfeit successfully handled.');

  // 2C: Challenger Forfeits
  const duelId2 = 'duel_forfeit_challenger_test';
  const duel2 = {
    id: duelId2,
    guildId: TEST_GUILD_ID,
    challengerId: CHALLENGER_ID,
    defenderId: DEFENDER_ID,
    itemTier: 'LEGENDARY',
    configuredRoleId: 'role_leg_888',
    tactics: { challenger: null, defender: null },
    status: 'WAITING_TACTICS',
    channelId: DUEL_CH_ID,
    messageId: 'card_msg_2',
    createdAt: now,
    expiresAt: now + (12 * 3600 * 1000),
    reminderSent: false
  };
  afterDefenderForfeitThrone.activeDuels[duelId2] = duel2;
  storage.write('throne_duels', { [TEST_GUILD_ID]: afterDefenderForfeitThrone });

  let challengerReplied = null;
  const mockChallengerInteraction = {
    customId: `throne_duel:forfeit:${duelId2}`,
    user: { id: CHALLENGER_ID },
    reply: async ({ content }) => { challengerReplied = content; }
  };
  await processDuelButton(mockChallengerInteraction, mockClient);
  assert(challengerReplied && challengerReplied.includes('menyerah'), 'Challenger forfeit acknowledged');

  const afterChallengerForfeitGacha = storage.read('gacha_data')[TEST_GUILD_ID];
  assert.strictEqual(afterChallengerForfeitGacha[DEFENDER_ID].duelWins, 1, 'Defender should gain 1 win');
  assert.strictEqual(afterChallengerForfeitGacha[CHALLENGER_ID].duelLosses, 1, 'Challenger should gain 1 loss');
  assert(afterChallengerForfeitGacha[CHALLENGER_ID].challengeCooldownUntil > Date.now(), 'Challenger should receive cooldown');
  console.log('✅ Test 2C Passed: Challenger forfeit successfully handled.');

  // =============================================
  // TEST 3: Duel Record in /gacha inventory
  // =============================================
  console.log('\n[Test 3] Duel Record Tracking in /gacha inventory');

  // Set specific record: 7 Wins, 3 Losses (70% Winrate)
  afterChallengerForfeitGacha[CHALLENGER_ID].duelWins = 7;
  afterChallengerForfeitGacha[CHALLENGER_ID].duelLosses = 3;
  storage.write('gacha_data', { [TEST_GUILD_ID]: afterChallengerForfeitGacha });

  let invEmbed = null;
  const mockInvInteraction = {
    guild: { id: TEST_GUILD_ID },
    user: { id: CHALLENGER_ID, username: 'ChallengerOne', displayAvatarURL: () => 'https://avatar.url' },
    reply: async ({ embeds }) => { invEmbed = embeds[0]; }
  };
  await executeGachaInventory(mockInvInteraction, null, mockClient);

  assert(invEmbed, 'Inventory embed should be produced');
  const activeRoleField = invEmbed.data.fields.find(f => f.name === 'Tahta Role Aktif');
  assert(activeRoleField, 'Tahta Role Aktif field must exist');
  assert(activeRoleField.value.includes('7 Menang — 3 Kalah (70% Winrate)'), 'Should format win/loss and winrate correctly');

  // Test zero duels
  afterChallengerForfeitGacha[STRANGER_ID] = {
    tickets: 1,
    stardust: 0,
    inventory: [],
    badges: [],
    titles: [],
    duelWins: 0,
    duelLosses: 0
  };
  storage.write('gacha_data', { [TEST_GUILD_ID]: afterChallengerForfeitGacha });

  let strangerEmbed = null;
  const mockStrangerInv = {
    guild: { id: TEST_GUILD_ID },
    user: { id: STRANGER_ID, username: 'StrangerZero', displayAvatarURL: () => 'https://avatar.url' },
    reply: async ({ embeds }) => { strangerEmbed = embeds[0]; }
  };
  await executeGachaInventory(mockStrangerInv, null, mockClient);
  const strangerRoleField = strangerEmbed.data.fields.find(f => f.name === 'Tahta Role Aktif');
  assert(strangerRoleField.value.includes('Belum ada catatan'), 'Zero duels should display "Belum ada catatan"');
  console.log('✅ Test 3 Passed: Inventory displays win/loss record and winrate accurately.');

  // =============================================
  // TEST 4: Auto-Refresh Throne & Duel Panel on Startup
  // =============================================
  console.log('\n[Test 4] Auto-Refresh Duel Panel on Startup');
  await updateDuelPanelIfExists(mockGuild, mockClient);
  const updatedSettings = storage.read('settings');
  assert(updatedSettings[TEST_GUILD_ID].gachaPanels.duel, 'Duel panel message ID should be tracked and deployed in settings');
  console.log('✅ Test 4 Passed: updateDuelPanelIfExists runs cleanly and tracks panel ID.');

  // Cleanup: Restore original storage
  storage.write('gacha_data', origGachaData);
  storage.write('throne_duels', origThroneData);
  storage.write('settings', origSettingsData);

  console.log('\n🌟 ALL 4 QOL TESTS PASSED 100% SUCCESSFULLY! 🌟');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  // Restore original storage on failure
  storage.write('gacha_data', origGachaData);
  storage.write('throne_duels', origThroneData);
  storage.write('settings', origSettingsData);
  process.exit(1);
});
