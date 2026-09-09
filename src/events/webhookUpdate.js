const { AuditLogEvent, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { isBotOwner } = require('../utils/helpers');
const { sendModLog } = require('../utils/modlog');

module.exports = {
  name: 'webhookUpdate',
  async execute(channel, client) {
    if (!channel || !channel.guild) return;

    const guild = channel.guild;
    try {
      if (!guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) return;

      await new Promise(r => setTimeout(r, 700));

      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.WebhookCreate,
        limit: 1
      }).catch(() => null);

      const entry = auditLogs?.entries.first();
      if (!entry) return;

      // Pastikan audit log ini baru dibuat dalam 6 detik terakhir
      if (Date.now() - entry.createdTimestamp > 6000) return;

      const executor = entry.executor;
      if (!executor) return;

      // Izinkan Bot sendiri, Pemilik Server, atau Bot Owner
      if (executor.id === client.user.id) return;
      if (guild.ownerId === executor.id) return;
      if (isBotOwner(executor.id)) return;

      console.warn(`🚨 [Anti-Webhook] Webhook dibuat oleh ${executor.tag} (${executor.id}) di #${channel.name}!`);

      // Cari dan hapus webhook yang baru dibuat tersebut
      const webhooks = await channel.fetchWebhooks().catch(() => null);
      let deletedWebhookName = entry.target?.name || 'Unknown Webhook';

      if (webhooks && webhooks.size > 0) {
        for (const [, wh] of webhooks) {
          if (wh.id === entry.target?.id || wh.owner?.id === executor.id) {
            deletedWebhookName = wh.name;
            await wh.delete('Anti-Webhook: Dilarang membuat Webhook tanpa izin Administrator').catch(err => {
              console.error('[Anti-Webhook] Gagal menghapus webhook:', err.message);
            });
          }
        }
      }

      // Catat ke Mod Log
      await sendModLog(guild, client, {
        action: 'WEBHOOK_PROTECTION',
        moderator: executor,
        reason: 'Percobaan pembuatan Webhook liar (Anti-Webhook Hijack)',
        details: `• **Saluran:** <#${channel.id}> (\`#${channel.name}\`)\n` +
                 `• **Pembuat Webhook:** <@${executor.id}> (\`${executor.tag}\`)\n` +
                 `• **Nama Webhook Dihapus:** \`${deletedWebhookName}\`\n` +
                 `• **Tindakan:** Webhook langsung dihapus demi mencegah broadcast phising/spam.`,
        color: 0xED4245
      });

    } catch (err) {
      console.warn('[webhookUpdate AntiWebhook Error]:', err.message);
    }
  }
};
