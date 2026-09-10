const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage');

/**
 * Default color palette based on action category
 */
const ACTION_COLORS = {
  BAN: 0xED4245,           // Red
  KICK: 0xED4245,          // Red
  JAIL: 0xED4245,          // Red
  AUTOMOD: 0xED4245,       // Red
  AUTOMOD_KICK: 0xED4245,  // Red
  AUTOMOD_TIMEOUT: 0xED4245,
  AUTOMOD_DELETE: 0xED4245,
  ANTI_NUKE: 0xED4245,     // Red (Emergency Alert)
  ANTI_RAID: 0xED4245,     // Red
  WEBHOOK_PROTECTION: 0xED4245, // Red

  WARN: 0xFEE75C,          // Yellow / Orange
  MUTE: 0xFEE75C,          // Yellow / Orange
  CLEARWARNS: 0xFEE75C,    // Yellow / Orange
  VOICE_DISCONNECT: 0xFEE75C, // Yellow / Orange
  VOICE_SERVER_MUTE: 0xFEE75C,
  VOICE_SERVER_DEAF: 0xED4245,
  GHOST_PING: 0xFEE75C,    // Yellow
  NEW_MEMBER_MEDIA: 0xFEE75C, // Yellow
  BOT_DEFENSE_MOVE: 0xFEE75C, // Yellow (Bot anti-move defense)
  BOT_DEFENSE_DISCONNECT: 0xED4245, // Red (Bot forced disconnect defense)
  BOT_DEFENSE_IMMUNITY: 0x5865F2, // Blurple (Bot mute/deafen immunity)

  UNMUTE: 0x57F287,        // Green
  UNJAIL: 0x57F287,        // Green
  VOICE_SERVER_UNMUTE: 0x57F287,
  VOICE_SERVER_UNDEAF: 0x57F287,

  CLEAR_MESSAGES: 0x5865F2,// Blurple
  SETLOGCHANNEL: 0x5865F2,
  SETCHANNEL: 0x5865F2,
  SETROLE: 0x5865F2,
  VOICE_MOVE: 0x5865F2,

  GACHA_BOOST: 0x9B59B6,   // Purple
  GACHA_AWARDVOICE: 0x9B59B6,
  GACHA_RESETSEASON: 0x9B59B6,
};

/**
 * Mendapatkan ID channel log yang diatur via /automod setlog atau /mod setlogchannel
 * @param {string} guildId
 * @returns {string|null}
 */
function getModLogChannelId(guildId) {
  if (!guildId) return null;
  const settings = storage.read('settings') || {};
  const guildSettings = settings[guildId] || {};
  return (
    guildSettings.modLogChannel ||
    guildSettings.modLogChannelId ||
    guildSettings.automod?.logChannelId ||
    guildSettings.automodLogChannel ||
    null
  );
}

/**
 * Send structured moderation/admin audit log to configured log channel
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 * @param {Object} logData
 * @param {string} logData.action - Action name (e.g. 'WARN', 'KICK', 'BAN', 'JAIL', etc.)
 * @param {import('discord.js').User|Object} logData.moderator - Moderator user object
 * @param {import('discord.js').User|import('discord.js').GuildMember|Object} [logData.target] - Target user if applicable
 * @param {string} [logData.reason] - Moderation reason
 * @param {string} [logData.details] - Extra details or parameters
 * @param {number} [logData.color] - Custom embed color
 * @param {Array<{name: string, value: string, inline?: boolean}>} [logData.fields] - Extra custom embed fields
 */
async function sendModLog(guild, client, logData) {
  if (!guild) return null;

  try {
    const logChannelId = getModLogChannelId(guild.id);
    if (!logChannelId) return null;

    let logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) {
      logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
    }
    if (!logChannel) return null;

    // Check permissions
    const botMember = guild.members.me;
    if (botMember) {
      const perms = logChannel.permissionsFor(botMember);
      if (perms && !perms.has(PermissionFlagsBits.SendMessages)) {
        return null;
      }
    }

    const {
      action = 'ACTION',
      moderator,
      target,
      reason,
      details,
      color,
      fields = []
    } = logData;

    const embedColor = color || ACTION_COLORS[action] || 0x2B2D31;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setAuthor({
        name: `MOD LOG — [${action}]`,
        iconURL: guild.iconURL({ dynamic: true }) || undefined
      })
      .setTimestamp();

    if (moderator) {
      const modTag = moderator.tag || moderator.username || 'Unknown Mod';
      embed.addFields({
        name: '👮 Moderator',
        value: `<@${moderator.id}> (${modTag})`,
        inline: true
      });
    }

    if (target) {
      const targetTag = target.user ? (target.user.tag || target.user.username) : (target.tag || target.username || 'Unknown Target');
      const targetId = target.id;
      embed.addFields({
        name: '🎯 Target',
        value: `<@${targetId}> (${targetTag} • \`${targetId}\`)`,
        inline: true
      });
    }

    if (reason) {
      embed.addFields({
        name: '📝 Alasan',
        value: reason.length > 1024 ? reason.substring(0, 1020) + '...' : reason,
        inline: false
      });
    }

    if (details) {
      embed.addFields({
        name: 'ℹ️ Detail',
        value: details.length > 1024 ? details.substring(0, 1020) + '...' : details,
        inline: false
      });
    }

    if (Array.isArray(fields) && fields.length > 0) {
      for (const field of fields) {
        if (field.name && field.value) {
          embed.addFields({
            name: field.name,
            value: field.value.length > 1024 ? field.value.substring(0, 1020) + '...' : field.value,
            inline: field.inline ?? true
          });
        }
      }
    }

    embed.setFooter({
      text: `${guild.name} • Audit Log ID: ${Date.now().toString(36).toUpperCase()}`
    });

    return await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (err) {
    console.error('[sendModLog Error]:', err.message);
    return null;
  }
}

module.exports = {
  sendModLog,
  getModLogChannelId,
  ACTION_COLORS
};
