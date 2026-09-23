const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags,
  AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');
const { saveGuildSetting } = require('../utils/storage');
const storage = require('../utils/storage');
const {
  createDedicatedInviteChannel,
  buildInviteEmbed,
  getInviterStats,
  getLeaderboard,
  cacheGuildInvites,
  renderQumpruyTicket
} = require('../utils/inviteTracker');

const qinvite = {
  data: new SlashCommandBuilder()
    .setName('qinvite')
    .setDescription('Pengaturan pelacakan tautan undangan (Invite Tracker)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Otomatis buat channel khusus invite-logs dan aktifkan pelacakan')
    )
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Tentukan channel untuk log member bergabung & pengundangnya')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel tujuan pengiriman log undangan')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('enable')
        .setDescription('Aktifkan pengiriman log undangan')
    )
    .addSubcommand(sub =>
      sub
        .setName('disable')
        .setDescription('Nonaktifkan pengiriman log undangan')
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Lihat status konfigurasi invite tracker dan izin bot')
    )
    .addSubcommand(sub =>
      sub
        .setName('test')
        .setDescription('Kirim simulasi tampilan pesan invite tracker ke channel log')
    )
    .addSubcommand(sub =>
      sub
        .setName('leaderboard')
        .setDescription('Lihat daftar 10 pengundang terbanyak di server')
    )
    .addSubcommand(sub =>
      sub
        .setName('stats')
        .setDescription('Lihat detail statistik undangan member tertentu')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('Member yang ingin dicek statistik undangannya')
            .setRequired(false)
        )
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const guildId = guild.id;

    // Leaderboard dan Stats dapat diakses oleh semua member
    if (sub !== 'leaderboard' && sub !== 'stats') {
      if (!await isOwnerOrMod(interaction, client)) {
        return replyNoAccessMod(interaction);
      }
    }

    const settings = storage.read('settings');
    if (!settings[guildId]) settings[guildId] = {};
    const config = settings[guildId].inviteTracking || { enabled: false, channelId: null };

    // === SETUP (AUTO CREATE CHANNEL) ===
    if (sub === 'setup') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const { channel, created } = await createDedicatedInviteChannel(guild);

        config.channelId = channel.id;
        config.enabled = true;
        saveGuildSetting(guildId, 'inviteTracking', config);

        // Perbarui cache invite server
        await cacheGuildInvites(guild, client);

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setAuthor({
            name: 'INVITE TRACKER | Konfigurasi Channel',
            iconURL: guild.iconURL({ dynamic: true }) || undefined
          })
          .setTitle(created ? 'Channel Khusus Berhasil Dibuat' : 'Channel Khusus Terhubung')
          .setDescription(
            `Saluran <#${channel.id}> telah disiapkan sebagai channel khusus log undangan.\n` +
            `• Izin: Hanya bot yang dapat mengirim pesan di saluran ini agar pesan tetap rapi.\n` +
            `• Status: Pelacakan aktif secara otomatis.`
          )
          .setFooter({ text: `${guild.name} • Invite Tracker` })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({
          content: `Gagal membuat channel khusus: ${err.message}`
        });
      }
    }

    // === SETCHANNEL (MANUAL) ===
    if (sub === 'setchannel') {
      const channel = interaction.options.getChannel('channel');
      const botPerms = channel.permissionsFor(guild.members.me);

      if (!botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
        return interaction.reply({
          content: `Bot membutuhkan izin **Send Messages** dan **Embed Links** di <#${channel.id}>.`,
          flags: MessageFlags.Ephemeral
        });
      }

      config.channelId = channel.id;
      config.enabled = true;
      saveGuildSetting(guildId, 'inviteTracking', config);

      await cacheGuildInvites(guild, client);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({
          name: 'INVITE TRACKER | Channel Diatur',
          iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('Channel Log Undangan Disetel')
        .setDescription(`Log member bergabung dan pengundangnya akan dikirim ke <#${channel.id}>.`)
        .setFooter({ text: `${guild.name} • Fitur otomatis aktif` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // === ENABLE ===
    if (sub === 'enable') {
      if (!config.channelId) {
        return interaction.reply({
          content: 'Belum ada channel log yang diatur. Gunakan `/qinvite setup` atau `/qinvite setchannel`.',
          flags: MessageFlags.Ephemeral
        });
      }

      config.enabled = true;
      saveGuildSetting(guildId, 'inviteTracking', config);

      return interaction.reply({
        content: `Fitur pelacakan undangan diaktifkan. Log akan dikirim ke <#${config.channelId}>.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // === DISABLE ===
    if (sub === 'disable') {
      config.enabled = false;
      saveGuildSetting(guildId, 'inviteTracking', config);

      return interaction.reply({
        content: 'Fitur pelacakan undangan dinonaktifkan sementara.',
        flags: MessageFlags.Ephemeral
      });
    }

    // === STATUS ===
    if (sub === 'status') {
      const hasManageGuild = guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild);
      const invitesData = storage.read('invites');
      const guildData = invitesData[guildId] || {};
      const totalTrackedJoins = Object.keys(guildData.members || {}).length;
      const totalInviters = Object.keys(guildData.inviters || {}).length;

      const embed = new EmbedBuilder()
        .setColor(config.enabled ? 0x57F287 : 0xED4245)
        .setAuthor({
          name: 'INVITE TRACKER | Status Konfigurasi',
          iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('Status Pelacakan Undangan')
        .addFields(
          {
            name: 'Status Fitur',
            value: config.enabled ? '• Aktif' : '• Nonaktif',
            inline: true
          },
          {
            name: 'Saluran Log',
            value: config.channelId ? `• <#${config.channelId}>` : '• Belum diatur',
            inline: true
          },
          {
            name: 'Izin Kelola Server (Bot)',
            value: hasManageGuild ? '• Terpenuhi (Akurat)' : '• Tidak ada (Dibutuhkan untuk fetch invite)',
            inline: true
          },
          {
            name: 'Total Join Tercatat',
            value: `• **${totalTrackedJoins}** member`,
            inline: true
          },
          {
            name: 'Total Pengundang Aktif',
            value: `• **${totalInviters}** pengundang`,
            inline: true
          },
          {
            name: 'Vanity URL Server',
            value: guild.features.includes('VANITY_URL') ? '• Didukung' : '• Tidak aktif',
            inline: true
          }
        )
        .setFooter({ text: 'Gunakan /qinvite setup untuk konfigurasi otomatis' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // === TEST (PREVIEW UI) ===
    if (sub === 'test') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const targetChannelId = config.channelId || interaction.channel.id;
      const targetChannel = guild.channels.cache.get(targetChannelId)
        || await client.channels.fetch(targetChannelId).catch(() => null);

      if (!targetChannel) {
        return interaction.editReply({
          content: 'Saluran tujuan tidak ditemukan. Atur channel terlebih dahulu dengan `/qinvite setup`.'
        });
      }

      try {
        const ticketBuffer = await renderQumpruyTicket({
          member: interaction.member,
          inviter: interaction.user,
          inviteType: 'regular',
          inviteCode: 'qumpruy',
          memberCount: guild.memberCount
        });

        const attachment = new AttachmentBuilder(ticketBuffer, { name: 'qumpruy-ticket.png' });

        const rulesChannelId = settings[guildId]?.rulesChannelId
          || guild.rulesChannelId
          || guild.channels.cache.find(c => c.name.includes('rules'))?.id;

        const components = [];
        if (rulesChannelId) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('READ RULES')
              .setStyle(ButtonStyle.Link)
              .setURL(`https://discord.com/channels/${guildId}/${rulesChannelId}`)
          );
          components.push(row);
        }

        const dateFormatted = new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        const embed = new EmbedBuilder()
          .setColor(0x0c0a14)
          .setImage('attachment://qumpruy-ticket.png')
          .setFooter({
            text: `${guild.name} | ${dateFormatted}`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
          });

        let sent = false;
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts && !sent; attempt++) {
          try {
            await targetChannel.send({
              content: `Hii <@${interaction.member.id}>\n\nMember ke - **${guild.memberCount}**\nInvited by: <@${interaction.user.id}> *(Preview Simulasi)*`,
              embeds: [embed],
              files: [new AttachmentBuilder(ticketBuffer, { name: 'qumpruy-ticket.png' })],
              components
            });
            sent = true;
          } catch (sendErr) {
            const isNetErr = /other side closed|aborted|socket|econnreset|etimedout/i.test(sendErr.message || '');
            if (isNetErr && attempt < maxAttempts) {
              const delay = attempt * 2000;
              await new Promise(r => setTimeout(r, delay));
            } else {
              throw sendErr;
            }
          }
        }

        return interaction.editReply({
          content: `Simulasi UI Tiket QUMPRUY berhasil dikirim ke <#${targetChannel.id}>.`
        });
      } catch (err) {
        return interaction.editReply({
          content: `Gagal membuat simulasi tiket: ${err.message}`
        });
      }
    }

    // === LEADERBOARD ===
    if (sub === 'leaderboard') {
      const topEntries = getLeaderboard(guildId, 10);

      if (topEntries.length === 0) {
        return interaction.reply({
          content: 'Belum ada data pengundang yang tercatat di server ini.',
          flags: MessageFlags.Ephemeral
        });
      }

      const descriptionLines = topEntries.map((entry, idx) => {
        const rank = idx + 1;
        return `**${rank}.** <@${entry.userId}> — **${entry.total}** invite (\`${entry.regular}\` valid, \`${entry.leaves}\` left)`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: 'PAPAN PERINGKAT PENGUNDANG',
          iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle(`Top 10 Pengundang Terbanyak — ${guild.name}`)
        .setDescription(descriptionLines.join('\n'))
        .setFooter({ text: `${guild.name} • Total net dihitung dari (Valid - Left)` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // === STATS ===
    if (sub === 'stats') {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const stats = getInviterStats(guildId, targetUser.id);

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: 'STATISTIK PENGUNDANG',
          iconURL: targetUser.displayAvatarURL({ dynamic: true })
        })
        .setTitle(`Statistik Undangan: ${targetUser.username}`)
        .addFields(
          {
            name: 'Total Net Invites',
            value: `**${stats.total}** invite`,
            inline: true
          },
          {
            name: 'Join Valid',
            value: `**${stats.regular}** member`,
            inline: true
          },
          {
            name: 'Meninggalkan Server',
            value: `**${stats.leaves}** member`,
            inline: true
          },
          {
            name: 'Akun Baru / Suspek',
            value: `**${stats.fake}** akun`,
            inline: true
          },
          {
            name: 'Bonus Invites',
            value: `**${stats.bonus}** invite`,
            inline: true
          }
        )
        .setFooter({ text: `${guild.name} • Invite Tracker` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};

module.exports = qinvite;
