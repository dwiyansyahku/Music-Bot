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

module.exports = { checkVoiceChannel, checkQueue };
