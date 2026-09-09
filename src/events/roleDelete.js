const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { checkAntiNuke } = require('../utils/antiNuke');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    if (!role || !role.guild) return;

    try {
      const guild = role.guild;
      if (!guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) return;

      await new Promise(r => setTimeout(r, 600));

      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 1
      }).catch(() => null);

      const entry = auditLogs?.entries.first();
      if (!entry) return;

      if (Date.now() - entry.createdTimestamp < 5000) {
        if (entry.executor) {
          await checkAntiNuke(guild, entry.executor, 'roleDelete', role.name, client);
        }
      }
    } catch (err) {
      console.warn('[roleDelete AntiNuke Error]:', err.message);
    }
  }
};
