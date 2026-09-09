const { EmbedBuilder } = require('discord.js');
const { checkPhishing, checkBadWords, getGuildAutomodSettings } = require('../utils/automod');
const { sendModLog } = require('../utils/modlog');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!newMessage || !newMessage.guild || !newMessage.author || newMessage.author.bot) return;

    // Jika konten pesan tidak berubah (misal hanya embed media yang baru selesai dimuat Discord)
    if (oldMessage && oldMessage.content === newMessage.content) return;

    const guildId = newMessage.guild.id;
    const automodConfig = getGuildAutomodSettings(guildId);
    if (!automodConfig.enabled) return;

    const isExempt =
      (automodConfig.ignoredRoles.length > 0 && newMessage.member?.roles?.cache?.some(r => automodConfig.ignoredRoles.includes(r.id))) ||
      (automodConfig.ignoredChannels.length > 0 && automodConfig.ignoredChannels.includes(newMessage.channel.id));

    if (isExempt) return;

    // ─── 1. PEMINDAIAN PHISHING, MALWARE & INVITE PADA PESAN YANG DIEDIT ───
    if (automodConfig.antiPhishing || automodConfig.antiMalware || automodConfig.antiInvite) {
      const phishingCheck = checkPhishing(newMessage);
      if (phishingCheck.isPhishing) {
        await newMessage.delete().catch(() => {});

        let isKicked = false;
        let kickError = null;
        const shouldKick = automodConfig.kickOnMalware && (!phishingCheck.isInvite || phishingCheck.isForwarded);

        if (shouldKick && newMessage.member && newMessage.member.kickable) {
          try {
            await newMessage.member.kick(`AutoMod Sentinel: ${phishingCheck.reason} (Edit Pesan)`);
            isKicked = true;
          } catch (err) {
            kickError = err.message;
          }
        }

        if (!isKicked && newMessage.member && newMessage.member.moderatable) {
          await newMessage.member.timeout(24 * 60 * 60 * 1000, `AutoMod: ${phishingCheck.reason} (Edit Pesan)`).catch(() => {});
        }

        const alertEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setAuthor({
            name: `KEAMANAN SERVER — ${newMessage.guild.name.toUpperCase()}`,
            iconURL: newMessage.guild.iconURL({ dynamic: true }) || undefined
          })
          .setTitle('🚨 Manipulasi Pesan Berbahaya Dicegah')
          .setDescription(
            `Pesan dari <@${newMessage.author.id}> (\`${newMessage.author.tag}\`) telah **dihapus** karena diedit menjadi konten terlarang.\n\n` +
            `• **Pelanggaran:** \`${phishingCheck.reason}\`\n` +
            `• **Tautan/Pemicu:** \`${phishingCheck.url || '-'}\`\n` +
            `• **Tindakan:** ${isKicked ? '🚨 **Pelaku telah di-KICK dari server!**' : '⚠️ Akun di-timeout 24 jam.'}`
          )
          .setFooter({ text: 'Tindakan dicatat di Mod Log • Pesan terhapus dalam 7 detik' })
          .setTimestamp();

        newMessage.channel.send({ embeds: [alertEmbed] })
          .then(m => setTimeout(() => m.delete().catch(() => {}), 7000))
          .catch(() => {});

        await sendModLog(newMessage.guild, client, {
          action: isKicked ? 'KICK' : 'AUTOMOD',
          moderator: { id: client.user.id, username: 'AutoMod Sentinel', tag: client.user.tag },
          target: newMessage.author,
          reason: `${phishingCheck.reason} (Terdeteksi via Edit Pesan)`,
          details: `• **Saluran:** <#${newMessage.channel.id}>\n` +
                   `• **Tautan/File Terdeteksi:** \`${phishingCheck.filename || phishingCheck.url || '-'}\`\n` +
                   `• **Pesan Sebelum Edit:** \`${(oldMessage?.content || '').substring(0, 500) || '(Tidak terekam)'}\`\n` +
                   `• **Pesan Setelah Edit:** \`${(newMessage.content || '').substring(0, 500)}\`\n` +
                   `• **Status Eksekusi:** ${isKicked ? 'Berhasil Di-kick' : (kickError ? `Gagal Kick (${kickError})` : 'Timeout 24 Jam')}`,
          color: 0xED4245
        });

        return;
      }
    }

    // ─── 2. PEMINDAIAN KATA TERLARANG PADA PESAN YANG DIEDIT ───
    if (automodConfig.badWords) {
      const badWordCheck = checkBadWords(newMessage.content, automodConfig.customBadWords, automodConfig.whitelistedWords);
      if (badWordCheck.found) {
        await newMessage.delete().catch(() => {});

        const badWordEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription(`⚠️ <@${newMessage.author.id}>, pesan yang kamu edit mengandung kata yang tidak diperbolehkan.`)
          .setFooter({ text: 'Pesan terhapus otomatis dalam 5 detik' });

        newMessage.channel.send({ embeds: [badWordEmbed] })
          .then(m => setTimeout(() => m.delete().catch(() => {}), 5000))
          .catch(() => {});

        await sendModLog(newMessage.guild, client, {
          action: 'AUTOMOD_DELETE',
          moderator: { id: client.user.id, username: 'AutoMod Filter', tag: client.user.tag },
          target: newMessage.author,
          reason: `Kata tidak pantas terdeteksi setelah pesan diedit: "${badWordCheck.word}"`,
          details: `• **Saluran:** <#${newMessage.channel.id}>\n` +
                   `• **Kata Terdeteksi:** \`${badWordCheck.word}\`\n` +
                   `• **Isi Pesan Diedit:** \`${newMessage.content.substring(0, 500)}\``,
          color: 0xED4245
        });
      }
    }
  }
};
