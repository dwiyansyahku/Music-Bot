/**
 * Cek apakah user ada di voice channel dan bot punya izin untuk join
 */
function checkVoiceChannel(context) {
  const member = context.member;
  const voiceChannel = member?.voice?.channel;

  const isInteraction = typeof context.isChatInputCommand === 'function';

  if (!voiceChannel) {
    const replyOptions = { content: '❌ Kamu harus masuk ke **Voice Channel** dulu!', ephemeral: true };
    if (!isInteraction) delete replyOptions.ephemeral;
    context.reply(replyOptions);
    return null;
  }

  // Cek apakah bot sudah di voice channel lain
  const botVoice = context.guild.members.me?.voice?.channel;
  if (botVoice && botVoice.id !== voiceChannel.id) {
    const replyOptions = { content: `❌ Bot sedang digunakan di <#${botVoice.id}>! Tunggu giliran atau gunakan channel yang sama.`, ephemeral: true };
    if (!isInteraction) delete replyOptions.ephemeral;
    context.reply(replyOptions);
    return null;
  }

  // Cek permission bot di voice channel
  const { PermissionFlagsBits } = require('discord.js');
  const botPerms = voiceChannel.permissionsFor(context.guild.members.me);
  if (!botPerms.has(PermissionFlagsBits.Connect)) {
    const replyOptions = { content: `❌ Bot tidak punya izin **Connect** di <#${voiceChannel.id}>!`, ephemeral: true };
    if (!isInteraction) delete replyOptions.ephemeral;
    context.reply(replyOptions);
    return null;
  }
  if (!botPerms.has(PermissionFlagsBits.Speak)) {
    const replyOptions = { content: `❌ Bot tidak punya izin **Speak** di <#${voiceChannel.id}>!`, ephemeral: true };
    if (!isInteraction) delete replyOptions.ephemeral;
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

// ID user yang dipercaya selain owner bot (bisa gunakan command owner/mod)
const TRUSTED_USER_IDS = ['1363187094973055116'];

/**
 * Cek apakah user adalah owner bot (secara dinamis dari Discord API / env)
 * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>}
 */
async function isBotOwner(context, client) {
  const userId = context.user ? context.user.id : context.author ? context.author.id : null;
  if (!userId) return false;

  // Cek trusted user IDs
  if (TRUSTED_USER_IDS.includes(userId)) return true;

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

/**
 * Cek apakah user adalah owner bot ATAU punya permission Moderate Members (Moderator).
 * Owner bot selalu diizinkan, terlepas dari role hierarchy di server.
 * @param {import('discord.js').CommandInteraction} interaction
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>}
 */
async function isOwnerOrMod(interaction, client) {
  // Cek owner / trusted user dulu — selalu bisa, apapun rolenya
  const owner = await isBotOwner(interaction, client);
  if (owner) return true;

  // Cek role moderator khusus
  const MOD_ROLE_ID = '1396257049884622899';
  if (interaction.member?.roles?.cache?.has(MOD_ROLE_ID)) {
    return true;
  }

  // Cek permission Moderate Members (standar moderator Discord)
  const { PermissionFlagsBits } = require('discord.js');
  return !!interaction.member?.permissions?.has(PermissionFlagsBits.ModerateMembers);
}

/**
 * Reply "Akses Ditolak" — khusus untuk command owner-only
 * @param {import('discord.js').CommandInteraction} interaction
 */
async function replyNoAccess(interaction) {
  const { EmbedBuilder, MessageFlags } = require('discord.js');
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🚫 Akses Ditolak')
    .setDescription('Perintah ini hanya bisa digunakan oleh **Owner Bot**.')
    .setFooter({ text: 'Ini adalah perintah eksklusif owner bot.' });

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Reply "Akses Ditolak" — untuk command owner-or-moderator
 * @param {import('discord.js').CommandInteraction} interaction
 */
async function replyNoAccessMod(interaction) {
  const { EmbedBuilder, MessageFlags } = require('discord.js');
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🚫 Akses Ditolak')
    .setDescription('Perintah ini hanya bisa digunakan oleh **Owner Bot** atau **Moderator** server.')
    .setFooter({ text: 'Kamu membutuhkan permission Moderate Members atau status Owner Bot.' });

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Update visibilitas channel penjara (text & voice) berdasarkan keberadaan tahanan.
 * Jika ada tahanan -> channel ditampilkan ke @everyone.
 * Jika tidak ada tahanan -> channel disembunyikan dari @everyone.
 * @param {import('discord.js').Guild} guild
 */
async function updateJailVisibility(guild) {
  const storage = require('./storage');
  const { PermissionFlagsBits } = require('discord.js');
  
  const settings = storage.read('settings');
  const jailConfig = settings[guild.id]?.jail;
  if (!jailConfig) return;

  const jailData = storage.read('jail');
  const guildJails = jailData[guild.id] || {};
  const hasPrisoners = Object.keys(guildJails).length > 0;

  // Dapatkan channel text dan voice
  const textChannel = jailConfig.channelId ? await guild.channels.fetch(jailConfig.channelId).catch(() => null) : null;
  const voiceChannel = jailConfig.voiceChannelId ? await guild.channels.fetch(voiceChannelId => {}).catch(() => null) || await guild.channels.fetch(jailConfig.voiceChannelId).catch(() => null) : null;

  if (textChannel) {
    if (hasPrisoners) {
      // Tampilkan channel text untuk @everyone (tapi tidak bisa kirim pesan, hanya lihat)
      await textChannel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: true,
        SendMessages: false
      }).catch(err => console.error(`[Jail Overwrite] Gagal set text show:`, err.message));
      
      // Berikan izin View & Send untuk role penjara khusus
      const jailRole = guild.roles.cache.get(jailConfig.roleId);
      if (jailRole) {
        await textChannel.permissionOverwrites.edit(jailRole, {
          ViewChannel: true,
          SendMessages: true
        }).catch(err => console.error(`[Jail Overwrite] Gagal set jailRole text perms:`, err.message));
      }
    } else {
      // Sembunyikan channel text dari @everyone
      await textChannel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: false
      }).catch(err => console.error(`[Jail Overwrite] Gagal set text hide:`, err.message));
    }
  }

  if (voiceChannel) {
    if (hasPrisoners) {
      // Tampilkan channel voice untuk @everyone (tapi tidak bisa connect)
      await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: true,
        Connect: false
      }).catch(err => console.error(`[Jail Overwrite] Gagal set voice show:`, err.message));
      
      // Berikan izin View & Connect untuk role penjara khusus
      const jailRole = guild.roles.cache.get(jailConfig.roleId);
      if (jailRole) {
        await voiceChannel.permissionOverwrites.edit(jailRole, {
          ViewChannel: true,
          Connect: true,
          Speak: true
        }).catch(err => console.error(`[Jail Overwrite] Gagal set jailRole voice perms:`, err.message));
      }
    } else {
      // Sembunyikan channel voice dari @everyone
      await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: false
      }).catch(err => console.error(`[Jail Overwrite] Gagal set voice hide:`, err.message));
    }
  }
}

module.exports = { checkVoiceChannel, checkQueue, isBotOwner, isOwnerOrMod, replyNoAccess, replyNoAccessMod, updateJailVisibility };
