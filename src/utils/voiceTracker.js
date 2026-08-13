const storage = require('./storage');

// Map to hold in-memory active voice sessions: `${guildId}_${userId}` -> { channelId, joinedAt }
const activeSessions = new Map();

/**
 * Format duration in milliseconds to clean readable text
 */
function formatDuration(ms) {
  if (!ms || ms < 60000) return '< 1m';
  const totalMins = Math.floor(ms / 60000);
  if (totalMins < 60) return `${totalMins}m`;
  
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

/**
 * Initialize active sessions on bot ready (scans all voice channels)
 */
function initVoiceTracker(client) {
  let count = 0;
  for (const guild of client.guilds.cache.values()) {
    const voiceChannels = guild.channels.cache.filter(c => c.isVoiceBased());
    for (const channel of voiceChannels.values()) {
      for (const member of channel.members.values()) {
        if (!member.user.bot) {
          activeSessions.set(`${guild.id}_${member.id}`, {
            channelId: channel.id,
            joinedAt: Date.now()
          });
          count++;
        }
      }
    }
  }
  console.log(`🎙️ [VoiceTracker] Initialized ${count} active voice sessions.`);
}

/**
 * Handle voiceStateUpdate event to track voice time and companion overlapping
 */
function handleVoiceStateUpdate(oldState, newState, client) {
  const guild = oldState.guild || newState.guild;
  if (!guild) return;

  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const guildId = guild.id;
  const userId = member.id;
  const sessionKey = `${guildId}_${userId}`;
  const now = Date.now();

  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  // No channel change (mute/deafen toggle)
  if (oldChannelId === newChannelId) return;

  const statsData = storage.read('voiceStats');
  if (!statsData[guildId]) statsData[guildId] = {};

  // 1. User left an old channel (disconnect or switch)
  if (oldChannelId && activeSessions.has(sessionKey)) {
    const session = activeSessions.get(sessionKey);
    const elapsed = now - session.joinedAt;
    activeSessions.delete(sessionKey);

    if (elapsed > 1000) {
      if (!statsData[guildId][userId]) {
        statsData[guildId][userId] = { totalTime: 0, companions: {} };
      }
      const userStats = statsData[guildId][userId];
      userStats.totalTime = (userStats.totalTime || 0) + elapsed;
      if (!userStats.companions) userStats.companions = {};

      // Calculate shared time with everyone else in oldChannelId
      for (const [key, otherSession] of activeSessions.entries()) {
        if (key !== sessionKey && key.startsWith(`${guildId}_`) && otherSession.channelId === oldChannelId) {
          const otherUserId = key.replace(`${guildId}_`, '');
          const overlapStart = Math.max(session.joinedAt, otherSession.joinedAt);
          const sharedTime = now - overlapStart;

          if (sharedTime > 1000) {
            // Update user A
            userStats.companions[otherUserId] = (userStats.companions[otherUserId] || 0) + sharedTime;

            // Update user B
            if (!statsData[guildId][otherUserId]) {
              statsData[guildId][otherUserId] = { totalTime: 0, companions: {} };
            }
            const otherStats = statsData[guildId][otherUserId];
            if (!otherStats.companions) otherStats.companions = {};
            otherStats.companions[userId] = (otherStats.companions[userId] || 0) + sharedTime;

            // Flush partial time for B so far & advance B's joinedAt to now to prevent double-counting
            const bElapsed = now - otherSession.joinedAt;
            otherStats.totalTime = (otherStats.totalTime || 0) + bElapsed;
            otherSession.joinedAt = now;
          }
        }
      }

      storage.write('voiceStats', statsData);

      // Auto-update published card in gallery if user has one
      const cardsData = storage.read('cards');
      if (cardsData[guildId]?.[userId]?.publishedMessageId && client) {
        const { publishCardToChannel } = require('./cardHandler');
        publishCardToChannel(guild, member, client).catch(() => {});
      }
    }
  }

  // 2. User joined a new channel (connect or switch)
  if (newChannelId) {
    activeSessions.set(sessionKey, {
      channelId: newChannelId,
      joinedAt: now
    });
  }
}

/**
 * Get real-time voice stats for a user (total voice time + top 3 companions)
 */
function getVoiceStats(guildId, userId, guild) {
  const statsData = storage.read('voiceStats');
  const userStats = statsData[guildId]?.[userId] || { totalTime: 0, companions: {} };

  let totalMs = userStats.totalTime || 0;

  // Add live session time if currently in voice
  const sessionKey = `${guildId}_${userId}`;
  const now = Date.now();
  if (activeSessions.has(sessionKey)) {
    const session = activeSessions.get(sessionKey);
    totalMs += (now - session.joinedAt);
  }

  const formattedTime = formatDuration(totalMs);

  // Calculate companions including live shared time
  const companionsMap = { ...(userStats.companions || {}) };

  if (activeSessions.has(sessionKey)) {
    const session = activeSessions.get(sessionKey);
    for (const [key, otherSession] of activeSessions.entries()) {
      if (key !== sessionKey && key.startsWith(`${guildId}_`) && otherSession.channelId === session.channelId) {
        const otherUserId = key.replace(`${guildId}_`, '');
        const overlapStart = Math.max(session.joinedAt, otherSession.joinedAt);
        const liveShared = now - overlapStart;
        if (liveShared > 0) {
          companionsMap[otherUserId] = (companionsMap[otherUserId] || 0) + liveShared;
        }
      }
    }
  }

  const sortedCompanions = Object.entries(companionsMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const topCompanions = [];
  for (const [cId, timeMs] of sortedCompanions) {
    if (timeMs < 60000) continue; // Skip less than 1 min
    const companionMember = guild?.members?.cache?.get(cId);
    const name = companionMember ? companionMember.displayName : 'Member';
    topCompanions.push({
      id: cId,
      name,
      timeFormatted: formatDuration(timeMs)
    });
  }

  return {
    totalMs,
    formattedTime,
    topCompanions
  };
}

/**
 * Check if a user is currently in an active voice session
 */
function isUserInVoice(guildId, userId) {
  return activeSessions.has(`${guildId}_${userId}`);
}

/**
 * Flush all active voice sessions incrementally to disk.
 * Ensures 0 data loss during bot restarts, updates, or redeploys.
 */
function flushAllActiveSessions() {
  if (activeSessions.size === 0) return;
  const now = Date.now();
  const statsData = storage.read('voiceStats');

  for (const [key, session] of activeSessions.entries()) {
    const [guildId, userId] = key.split('_');
    const elapsed = now - session.joinedAt;
    if (elapsed < 1000) continue;

    if (!statsData[guildId]) statsData[guildId] = {};
    if (!statsData[guildId][userId]) {
      statsData[guildId][userId] = { totalTime: 0, companions: {} };
    }

    const userStats = statsData[guildId][userId];
    userStats.totalTime = (userStats.totalTime || 0) + elapsed;
    if (!userStats.companions) userStats.companions = {};

    // Calculate companion shared times
    for (const [otherKey, otherSession] of activeSessions.entries()) {
      if (otherKey !== key && otherKey.startsWith(`${guildId}_`) && otherSession.channelId === session.channelId) {
        const otherUserId = otherKey.replace(`${guildId}_`, '');
        const overlapStart = Math.max(session.joinedAt, otherSession.joinedAt);
        const shared = now - overlapStart;
        if (shared > 1000) {
          userStats.companions[otherUserId] = (userStats.companions[otherUserId] || 0) + shared;
        }
      }
    }

    session.joinedAt = now;
  }

  storage.write('voiceStats', statsData);
}

// Hook process termination signals to flush before exit
process.on('SIGTERM', () => {
  flushAllActiveSessions();
});
process.on('SIGINT', () => {
  flushAllActiveSessions();
});

module.exports = {
  initVoiceTracker,
  handleVoiceStateUpdate,
  getVoiceStats,
  formatDuration,
  isUserInVoice,
  flushAllActiveSessions
};
