/**
 * Cek apakah user ada di voice channel yang sama dengan bot
 */
function checkVoiceChannel(context) {
  const member = context.member;
  const voiceChannel = member?.voice?.channel;

  const isInteraction = typeof context.isChatInputCommand === 'function';

  if (!voiceChannel) {
    const replyOptions = { content: '❌ Kamu harus masuk ke **Voice Channel** dulu!' };
    if (isInteraction) replyOptions.ephemeral = true;
    context.reply(replyOptions);
    return null;
  }

  // Cek apakah bot sudah di voice channel lain
  const botVoice = context.guild.members.me?.voice?.channel;
  if (botVoice && botVoice.id !== voiceChannel.id) {
    const replyOptions = { content: `❌ Bot sedang digunakan di <#${botVoice.id}>!` };
    if (isInteraction) replyOptions.ephemeral = true;
    context.reply(replyOptions);
    return null;
  }

  return voiceChannel;
}

/**
 * Cek apakah ada queue yang aktif
 */
function checkQueue(context, client) {
  const queue = client.distube.getQueue(context.guild.id);
  const isInteraction = typeof context.isChatInputCommand === 'function';

  if (!queue) {
    const replyOptions = { content: '❌ Tidak ada lagu yang sedang diputar!' };
    if (isInteraction) replyOptions.ephemeral = true;
    context.reply(replyOptions);
    return null;
  }
  return queue;
}

/**
 * Cek apakah user adalah owner bot (secara dinamis dari Discord API / env)
 * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>}
 */
async function isBotOwner(context, client) {
  const userId = context.user ? context.user.id : context.author ? context.author.id : null;
  if (!userId) return false;

  // Cek override via env
  if (process.env.OWNER_ID && userId === process.env.OWNER_ID) {
    return true;
  }

  try {
    if (!client.application.owner) {
      await client.application.fetch();
    }
    const owner = client.application.owner;
    if (owner.members) {
      // Jika owner berbentuk Developer Team
      return owner.members.has(userId);
    }
    return owner.id === userId;
  } catch (err) {
    console.error('[Helper] Gagal mengambil data owner bot:', err);
    return false;
  }
}

module.exports = { checkVoiceChannel, checkQueue, isBotOwner };
