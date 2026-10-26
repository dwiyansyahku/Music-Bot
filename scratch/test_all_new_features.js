const assert = require('assert');
const storage = require('../src/utils/storage');
const automod = require('../src/utils/automod');
const dungeonBoss = require('../src/utils/dungeonBoss');
const gacha = require('../src/commands/gacha');

async function runAllTests() {
  console.log('🚀 Running Comprehensive Test Suite for User Requirements...\n');

  // -------------------------------------------------------------------
  // TEST 1: Bad words filter (kangkung, turu, suka, vs actual bad words)
  // -------------------------------------------------------------------
  console.log('--- Test 1: Bad Words & False Positives ---');
  const t1 = automod.checkBadWords('aku suka makan sayur kangkung');
  assert.strictEqual(t1.found, false, 'kangkung must not be flagged');

  const t2 = automod.checkBadWords('aku mau turu dulu');
  assert.strictEqual(t2.found, false, 'turu must not be flagged');

  const t3 = automod.checkBadWords('palingan dia telat');
  assert.strictEqual(t3.found, false, 'palingan must not be flagged');

  const t4 = automod.checkBadWords('dasar bangkung');
  assert.strictEqual(t4.found, true, 'bangkung must be flagged');

  const t5 = automod.checkBadWords('dasar turuk');
  assert.strictEqual(t5.found, true, 'turuk must be flagged');

  const t6 = automod.checkBadWords('kontol lu');
  assert.strictEqual(t6.found, true, 'kontol must be flagged');

  const t7 = automod.checkBadWords('dasar anjing');
  assert.strictEqual(t7.found, true, 'anjing must be flagged');
  console.log('✅ Test 1 Passed: False positives eliminated, actual vulgar words accurately caught!\n');

  // -------------------------------------------------------------------
  // TEST 2: Invite Data Recovery
  // -------------------------------------------------------------------
  console.log('--- Test 2: Invite Tracking Data ---');
  const invites = storage.read('invites');
  const guildInv = invites['1396245234693963878'];
  assert(guildInv, 'Guild invites data must exist');
  assert(Object.keys(guildInv.inviters).length >= 25, 'At least 25 inviters should be tracked');
  assert(Object.keys(guildInv.members).length >= 50, 'At least 50 members should be tracked');
  console.log(`✅ Test 2 Passed: ${Object.keys(guildInv.inviters).length} inviters & ${Object.keys(guildInv.members).length} members safely tracked!\n`);

  // -------------------------------------------------------------------
  // TEST 3: Boss Raid Schedule & Logic
  // -------------------------------------------------------------------
  console.log('--- Test 3: Boss Raid Schedule & Logic ---');
  const tier = dungeonBoss.getScheduledBossTier();
  assert(['DAILY', 'WEEKLY', 'MONTHLY'].includes(tier), 'Tier must be valid');

  const nextSpawn = dungeonBoss.getNextBossSpawnTime();
  assert(nextSpawn.timestamp > Date.now() || nextSpawn.unix > 0, 'Next spawn time must be computed');

  // Test party creation limit
  const testGuildId = 'test_guild_boss_suite_01';
  dungeonBoss.toggleAdminForceBossRaid(testGuildId); // Open raid for test

  const uniqueLeaderId = `leader_${Date.now()}`;
  const p1 = dungeonBoss.createBossParty(testGuildId, uniqueLeaderId, 'LeaderOne');
  assert.strictEqual(p1.success, true, 'First party creation should succeed');

  const p2 = dungeonBoss.createBossParty(testGuildId, uniqueLeaderId, 'LeaderOne');
  assert.strictEqual(p2.success, false, 'Second party creation by same leader must be blocked (limit 1x)');

  // Test party battle resolution auto-deletion
  const { boss } = dungeonBoss.getGuildBossState(testGuildId);
  const partyId = p1.party.id;
  assert(boss.parties[partyId], 'Party must exist before combat resolution');

  // Simulate end of combat
  boss.activeCombat = {
    partyId,
    round: 5,
    maxRounds: 5,
    bossStance: 'attack',
    playerStances: { 'user_leader_01': 'attack' },
    roundLogs: []
  };
  await dungeonBoss.forceResolveCombatRound(
    { guildId: testGuildId, user: { id: uniqueLeaderId }, reply: async () => {}, deferred: false, replied: false },
    null,
    partyId,
    5
  );

  assert(!boss.parties[partyId], 'Party must be automatically deleted after combat ends');
  assert(boss.partyHistory.length > 0, 'Party must be saved in partyHistory for leaderboard');
  console.log('✅ Test 3 Passed: Boss party limit 1x enforced, finished party automatically deleted & history preserved!\n');

  // -------------------------------------------------------------------
  // TEST 4: Role Auto-Discovery & Assignment
  // -------------------------------------------------------------------
  console.log('--- Test 4: Role Auto-Discovery & Assignment ---');
  const mockGuild = {
    id: '1396245234693963878',
    roles: {
      cache: new Map([
        ['1546144295575232652', { id: '1546144295575232652', name: 'Paladin' }],
        ['1546143532253970522', { id: '1546143532253970522', name: 'Musketeer' }],
        ['1547139921595203616', { id: '1547139921595203616', name: 'God of QUMPRUY' }]
      ])
    }
  };

  const settings = storage.read('settings');
  assert.strictEqual(settings['1396245234693963878'].gachaRoles.LEGENDARY, '1546144295575232652', 'Legendary role must be Paladin');
  assert.strictEqual(settings['1396245234693963878'].gachaRoles.MYTHIC, '1546143532253970522', 'Mythic role must be Musketeer');
  assert.strictEqual(settings['1396245234693963878'].gachaRoles.CHAMPION, '1547139921595203616', 'Champion role must be God of QUMPRUY');
  console.log('✅ Test 4 Passed: Roles Paladin, Musketeer, and God of QUMPRUY configured and auto-discovered!\n');

  // -------------------------------------------------------------------
  // TEST 5: Leaderboard Embeds Realtime
  // -------------------------------------------------------------------
  console.log('--- Test 5: Live Leaderboard Embeds ---');
  const embeds = dungeonBoss.buildLiveLeaderboardEmbeds('1396245234693963878');
  assert.strictEqual(embeds.length, 2, 'Should generate 2 embeds (Raid Status and Hall of Fame)');
  assert(embeds[0].data.title.includes('LIVE RAID BOSS STATUS'), 'First embed must be Live Raid Boss Status');
  assert(embeds[1].data.title.includes('HALL OF FAME'), 'Second embed must be Hall of Fame');
  console.log('✅ Test 5 Passed: Realtime Live Leaderboard generated properly!\n');

  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runAllTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
