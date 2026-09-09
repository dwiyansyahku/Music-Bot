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
  AUTOMOD_TIMEOUT: 0xED4245,
  AUTOMOD_DELETE: 0xED4245,

  WARN: 0xFEE75C,          // Yellow / Orange
  MUTE: 0xFEE75C,          // Yellow / Orange
  CLEARWARNS: 0xFEE75C,    // Yellow / Orange

  UNMUTE: 0x57F287,        // Green
  UNJAIL: 0x57F287,        // Green

  CLEAR_MESSAGES: 0x5865F2,// Blurple
  SETLOGCHANNEL: 0x5865F2,
  SETCHANNEL: 0x5865F2,
  SETROLE: 0x5865F2,

  GACHA_BOOST: 0x9B59B6,   // Purple
  GACHA_AWARDVOICE: 0x9B59B6,
  GACHA_RESETSEASON: 0x9B59B6,
};

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
    const settings = storage.read('settings') || {};
    const guildSettings = settings[guild.id] || {};

    // Check modLogChannel first, fall back to automod.logChannelId
    const logChannelId = guildSettings.modLogChannel || guildSettings.automod?.logChannelId;
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
  ACTION_COLORS
};
