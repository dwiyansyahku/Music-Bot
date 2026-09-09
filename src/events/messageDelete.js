const { sendModLog } = require('../utils/modlog');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message || !message.guild || !message.author || message.author.bot) return;

    // Cek apakah pesan yang dihapus mengandung mention pengguna, role, atau everyone/here
    const userMentions = message.mentions?.users?.filter(u => u.id !== message.author.id) || new Map();
    const roleMentions = message.mentions?.roles || new Map();
    const hasEveryone = message.content?.includes('@everyone') || message.content?.includes('@here');

    const totalMentions = userMentions.size + roleMentions.size + (hasEveryone ? 1 : 0);
    if (totalMentions === 0) return;

    // Abaikan jika pesan sudah lama dibuat (> 5 menit), fokus pada ghost ping cepat
    const messageAgeMs = Date.now() - message.createdTimestamp;
    if (messageAgeMs > 5 * 60 * 1000) return;

    const mentionedList = [
      ...Array.from(userMentions.values()).map(u => `<@${u.id}> (${u.tag || u.username})`),
      ...Array.from(roleMentions.values()).map(r => `<@&${r.id}>`),
      hasEveryone ? '`@everyone/@here`' : null
    ].filter(Boolean);

    console.warn(`👻 [Ghost Ping] Terdeteksi dari ${message.author.tag} (${message.author.id}) di #${message.channel.name}`);

    // Catat ke Mod Log
    await sendModLog(message.guild, client, {
      action: 'GHOST_PING',
      moderator: message.author,
      reason: 'Ghost Ping Terdeteksi (Pesan yang me-mention member/role sengaja dihapus).',
      details: `• **Pengirim Pesan:** <@${message.author.id}> (\`${message.author.tag}\`)\n` +
               `• **Saluran:** <#${message.channel.id}> (\`#${message.channel.name}\`)\n` +
               `• **Target Di-tag:** ${mentionedList.join(', ')}\n` +
               `• **Isi Pesan yang Dihapus:**\n\`\`\`\n${(message.content || '(Lampiran/Embed tanpa teks)').substring(0, 800)}\n\`\`\``,
      color: 0xFEE75C
    });
  }
};
