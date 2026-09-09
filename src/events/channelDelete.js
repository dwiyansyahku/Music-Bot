const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { checkAntiNuke } = require('../utils/antiNuke');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel || !channel.guild) return;

    try {
      const guild = channel.guild;
      if (!guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) return;

      await new Promise(r => setTimeout(r, 600));

      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1
      }).catch(() => null);

      const entry = auditLogs?.entries.first();
      if (!entry) return;

      if (Date.now() - entry.createdTimestamp < 5000) {
        if (entry.executor) {
          await checkAntiNuke(guild, entry.executor, 'channelDelete', channel.name, client);
        }
      }
    } catch (err) {
      console.warn('[channelDelete AntiNuke Error]:', err.message);
    }
  }
};
