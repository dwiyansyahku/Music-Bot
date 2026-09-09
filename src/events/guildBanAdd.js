const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { checkAntiNuke } = require('../utils/antiNuke');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    if (!ban || !ban.guild) return;

    try {
      const guild = ban.guild;
      if (!guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) return;

      await new Promise(r => setTimeout(r, 600));

      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
        limit: 1
      }).catch(() => null);

      const entry = auditLogs?.entries.first();
      if (!entry) return;

      if (Date.now() - entry.createdTimestamp < 5000) {
        if (entry.executor) {
          await checkAntiNuke(guild, entry.executor, 'ban', ban.user?.tag || ban.user?.username || 'Unknown', client);
        }
      }
    } catch (err) {
      console.warn('[guildBanAdd AntiNuke Error]:', err.message);
    }
  }
};
