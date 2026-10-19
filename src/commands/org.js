const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');
const {
  DIVISIONS,
  getGuildOrg,
  setLeader,
  removeLeader,
  addDivisionMember,
  removeDivisionMember,
  resetOrgData,
  getOrgMessage,
  setOrgMessage,
  clearOrgMessage
} = require('../utils/orgHelper');
const { generateOrgChartImage } = require('../utils/orgChartGenerator');

const DIVISION_CHOICES = [
  { name: 'Head Admin', value: 'head_admin' },
  { name: 'Security', value: 'security' },
  { name: 'Admin TikTok', value: 'admin_tiktok' },
  { name: 'Admin Instagram', value: 'admin_instagram' },
  { name: 'Streamer', value: 'streamer' },
  { name: 'Team Creative', value: 'team_creative' },
];

/**
 * Helper: Membuat embed + attachment untuk org chart
 */
async function buildOrgChartPayload(guildId, guild, client) {
  const orgData = getGuildOrg(guildId);
  const imageBuffer = await generateOrgChartImage(orgData, guild);
  const attachment = new AttachmentBuilder(imageBuffer, {
    name: `struktur_organisasi_${guildId}.png`
  });

  const embed = new EmbedBuilder()
    .setColor(0x00F2FE)
    .setTitle(`STRUKTUR ORGANISASI — ${(orgData.title || guild.name).toUpperCase()}`)
    .setDescription(
      `Bagan resmi kepengurusan dan divisi komunitas **${orgData.title || guild.name}**.\n\n` +
      `◈ **Divisi Aktif:**\n` +
      `• **Head Admin** • **Security** • **Admin TikTok**\n` +
      `• **Admin Instagram** • **Streamer** • **Team Creative**\n\n` +
      `💡 *Gunakan \`/org list\` untuk melihat rincian anggota dalam bentuk teks.*`
    )
    .setImage(`attachment://struktur_organisasi_${guildId}.png`)
    .setFooter({
      text: `Qumpruy Community System • Terakhir diperbarui`,
      iconURL: guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL()
    })
    .setTimestamp();

  return { embed, attachment };
}

/**
 * Helper: Refresh / auto-update pesan org chart yang sudah di-post ("live message").
 * Jika pesan lama sudah dihapus atau tidak bisa diedit, otomatis kirim ulang di channel yang sama
 * dan simpan referensi baru.
 */
async function refreshLiveOrgChart(guildId, guild, client) {
  const liveMsg = getOrgMessage(guildId);
  if (!liveMsg) return; // Belum pernah di-post, skip

  try {
    const channel = guild.channels.cache.get(liveMsg.channelId) ||
                    await guild.channels.fetch(liveMsg.channelId).catch(() => null);
    if (!channel) {
      clearOrgMessage(guildId);
      return;
    }

    const { embed, attachment } = await buildOrgChartPayload(guildId, guild, client);

    // Coba edit pesan lama
    try {
      const oldMsg = await channel.messages.fetch(liveMsg.messageId);
      await oldMsg.edit({
        embeds: [embed],
        files: [attachment]
      });
      // Berhasil di-edit, referensi tetap sama
    } catch (fetchErr) {
      // Pesan lama sudah dihapus / tidak accessible — kirim ulang dan simpan referensi baru
      const newMsg = await channel.send({
        embeds: [embed],
        files: [attachment]
      });
      setOrgMessage(guildId, channel.id, newMsg.id);
    }
  } catch (err) {
    console.warn('[/org] Gagal refresh live org chart:', err.message);
    // Jika channel sudah tidak ada, bersihkan referensi
    clearOrgMessage(guildId);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('org')
    .setDescription('Sistem manajemen & tampilan bagan struktur organisasi QUMPRUY')
    // 1. SHOW
    .addSubcommand(sub =>
      sub
        .setName('show')
        .setDescription('Tampilkan bagan visual struktur organisasi QUMPRUY (auto-update realtime)')
    )
    // 2. LIST
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Lihat daftar teks seluruh anggota pengurus & divisi organisasi')
    )
    // 3. SETKETUA
    .addSubcommand(sub =>
      sub
        .setName('setketua')
        .setDescription('Atur Ketua Umum organisasi (Admin/Mod only)')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('Member Discord yang dijadikan Ketua')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('nama')
            .setDescription('Nama panggilan / nama lengkap custom (opsional)')
            .setRequired(false)
        )
        .addAttachmentOption(opt =>
          opt
            .setName('foto')
            .setDescription('Upload foto custom name tag/profil (opsional, default: avatar Discord)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('jabatan')
            .setDescription('Label jabatan (default: Ketua Umum)')
            .setRequired(false)
        )
    )
    // 4. REMOVEKETUA
    .addSubcommand(sub =>
      sub
        .setName('removeketua')
        .setDescription('Hapus jabatan Ketua organisasi saat ini (Admin/Mod only)')
    )
    // 5. ADDMEMBER
    .addSubcommand(sub =>
      sub
        .setName('addmember')
        .setDescription('Tambahkan atau perbarui anggota di divisi (Admin/Mod only)')
        .addStringOption(opt =>
          opt
            .setName('divisi')
            .setDescription('Pilih divisi tujuan')
            .setRequired(true)
            .addChoices(...DIVISION_CHOICES)
        )
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('Member Discord yang ditambahkan')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('nama')
            .setDescription('Nama tampilan / panggilan custom (opsional)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('jabatan')
            .setDescription('Peran/tugas khusus (misal: Koordinator, Staff, Host)')
            .setRequired(false)
        )
        .addAttachmentOption(opt =>
          opt
            .setName('foto')
            .setDescription('Upload foto custom name tag/profil (opsional, default: avatar Discord)')
            .setRequired(false)
        )
    )
    // 6. REMOVEMEMBER
    .addSubcommand(sub =>
      sub
        .setName('removemember')
        .setDescription('Hapus anggota dari divisi tertentu (Admin/Mod only)')
        .addStringOption(opt =>
          opt
            .setName('divisi')
            .setDescription('Pilih divisi')
            .setRequired(true)
            .addChoices(...DIVISION_CHOICES)
        )
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('Member yang ingin dihapus dari divisi ini')
            .setRequired(true)
        )
    )
    // 7. RESET
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription('Reset seluruh bagan organisasi server ke keadaan kosong (Admin/Mod only)')
        .addBooleanOption(opt =>
          opt
            .setName('konfirmasi')
            .setDescription('Konfirmasi apakah Anda benar-benar yakin ingin mereset')
            .setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const guildId = guild.id;

    // ==========================================
    // 1. SUBCOMMAND: SHOW
    // ==========================================
    if (sub === 'show') {
      await interaction.deferReply();

      try {
        const { embed, attachment } = await buildOrgChartPayload(guildId, guild, client);

        const sentMsg = await interaction.editReply({
          embeds: [embed],
          files: [attachment]
        });

        // Simpan referensi pesan ini sebagai "live message" yang akan auto-update
        setOrgMessage(guildId, interaction.channelId, sentMsg.id);

        return sentMsg;
      } catch (err) {
        console.error('[/org show] Error:', err);
        return await interaction.editReply({
          content: `❌ Gagal menghasilkan bagan struktur organisasi: ${err.message}`
        });
      }
    }

    // ==========================================
    // 2. SUBCOMMAND: LIST
    // ==========================================
    if (sub === 'list') {
      await interaction.deferReply();

      const orgData = getGuildOrg(guildId);
      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle(`DAFTAR PENGURUS — ${(orgData.title || guild.name).toUpperCase()}`)
        .setDescription(`Daftar lengkap pimpinan dan divisi organisasi server saat ini.`);

      // Leader
      if (orgData.leader) {
        embed.addFields({
          name: `👑 ${orgData.leader.roleTitle || 'Ketua Umum'}`,
          value: `• **${orgData.leader.name}** (<@${orgData.leader.userId}>)`,
          inline: false
        });
      } else {
        embed.addFields({
          name: `Ketua Umum`,
          value: `*Belum ada Ketua yang ditentukan.*`,
          inline: false
        });
      }

      // Divisions
      for (const [divKey, divConfig] of Object.entries(DIVISIONS)) {
        const divData = orgData.divisions?.[divKey] || { members: [] };
        const members = divData.members || [];

        let listText = '*Belum ada anggota.*';
        if (members.length > 0) {
          listText = members
            .map(m => `• **${m.name}** (<@${m.userId}>) — *${m.roleDetail || 'Anggota'}*`)
            .join('\n');
        }

        embed.addFields({
          name: `${divConfig.icon} ${divConfig.name} (${members.length})`,
          value: listText,
          inline: true
        });
      }

      embed.setFooter({ text: 'Gunakan /org show untuk menampilkan gambar bagan visual' });
      return await interaction.editReply({ embeds: [embed] });
    }

    // ==========================================
    // PERMISSION CHECK UNTUK AKSI ADMIN/MOD
    // ==========================================
    if (!(await isOwnerOrMod(interaction, client))) {
      return replyNoAccessMod(interaction);
    }

    // ==========================================
    // 3. SUBCOMMAND: SETKETUA
    // ==========================================
    if (sub === 'setketua') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const targetUser = interaction.options.getUser('user', true);
      const customName = interaction.options.getString('nama');
      const photoAttachment = interaction.options.getAttachment('foto');
      const roleTitle = interaction.options.getString('jabatan') || 'Ketua Umum';

      const guildMember = await guild.members.fetch(targetUser.id).catch(() => null);
      const displayName = customName || guildMember?.displayName || targetUser.username;

      let photoUrl = null;
      if (photoAttachment) {
        if (!photoAttachment.contentType?.startsWith('image/')) {
          return interaction.editReply({
            content: '❌ Lampiran foto harus berupa file gambar valid (.png, .jpg, .webp).'
          });
        }
        photoUrl = photoAttachment.url;
      } else if (guildMember) {
        photoUrl = guildMember.user.displayAvatarURL({ extension: 'png', size: 256 });
      }

      const leaderData = await setLeader(guildId, {
        userId: targetUser.id,
        name: displayName,
        customPhotoUrl: photoUrl,
        roleTitle
      });

      // Auto-refresh live org chart
      refreshLiveOrgChart(guildId, guild, client).catch(e =>
        console.warn('[/org setketua] Auto-refresh failed:', e.message)
      );

      return await interaction.editReply({
        content:
          `✅ Berhasil mengatur **${leaderData.name}** (<@${targetUser.id}>) sebagai **${leaderData.roleTitle}**!\n` +
          `🖼️ Foto: ${photoAttachment ? 'Custom upload tersimpan di database lokal' : 'Avatar Discord'}\n\n` +
          `🔄 *Bagan struktur organisasi telah otomatis diperbarui.*`
      });
    }

    // ==========================================
    // 4. SUBCOMMAND: REMOVEKETUA
    // ==========================================
    if (sub === 'removeketua') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      removeLeader(guildId);

      // Auto-refresh live org chart
      refreshLiveOrgChart(guildId, guild, client).catch(e =>
        console.warn('[/org removeketua] Auto-refresh failed:', e.message)
      );

      return await interaction.editReply({
        content: '✅ Jabatan Ketua Umum berhasil dikosongkan.\n\n🔄 *Bagan struktur organisasi telah otomatis diperbarui.*'
      });
    }

    // ==========================================
    // 5. SUBCOMMAND: ADDMEMBER
    // ==========================================
    if (sub === 'addmember') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const divisionKey = interaction.options.getString('divisi', true);
      const targetUser = interaction.options.getUser('user', true);
      const customName = interaction.options.getString('nama');
      const roleDetail = interaction.options.getString('jabatan') || 'Anggota';
      const photoAttachment = interaction.options.getAttachment('foto');

      const guildMember = await guild.members.fetch(targetUser.id).catch(() => null);
      const displayName = customName || guildMember?.displayName || targetUser.username;

      let photoUrl = null;
      if (photoAttachment) {
        if (!photoAttachment.contentType?.startsWith('image/')) {
          return interaction.editReply({
            content: '❌ Lampiran foto harus berupa file gambar valid (.png, .jpg, .webp).'
          });
        }
        photoUrl = photoAttachment.url;
      } else if (guildMember) {
        photoUrl = guildMember.user.displayAvatarURL({ extension: 'png', size: 256 });
      }

      const divConfig = DIVISIONS[divisionKey];
      const memberData = await addDivisionMember(guildId, divisionKey, {
        userId: targetUser.id,
        name: displayName,
        customPhotoUrl: photoUrl,
        roleDetail
      });

      // Auto-refresh live org chart
      refreshLiveOrgChart(guildId, guild, client).catch(e =>
        console.warn('[/org addmember] Auto-refresh failed:', e.message)
      );

      return await interaction.editReply({
        content:
          `✅ Berhasil menambahkan/memperbarui **${memberData.name}** (<@${targetUser.id}>) ke divisi **${divConfig.name}**!\n` +
          `🏷️ Peran: **${memberData.roleDetail}**\n` +
          `🖼️ Foto: ${photoAttachment ? 'Custom upload tersimpan di database lokal' : 'Avatar Discord'}\n\n` +
          `🔄 *Bagan struktur organisasi telah otomatis diperbarui.*`
      });
    }

    // ==========================================
    // 6. SUBCOMMAND: REMOVEMEMBER
    // ==========================================
    if (sub === 'removemember') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const divisionKey = interaction.options.getString('divisi', true);
      const targetUser = interaction.options.getUser('user', true);
      const divConfig = DIVISIONS[divisionKey];

      const removed = removeDivisionMember(guildId, divisionKey, targetUser.id);
      if (removed) {
        // Auto-refresh live org chart
        refreshLiveOrgChart(guildId, guild, client).catch(e =>
          console.warn('[/org removemember] Auto-refresh failed:', e.message)
        );

        return await interaction.editReply({
          content: `✅ Berhasil menghapus <@${targetUser.id}> dari divisi **${divConfig.name}**.\n\n🔄 *Bagan struktur organisasi telah otomatis diperbarui.*`
        });
      } else {
        return await interaction.editReply({
          content: `⚠️ Member <@${targetUser.id}> tidak ditemukan di divisi **${divConfig.name}**.`
        });
      }
    }

    // ==========================================
    // 7. SUBCOMMAND: RESET
    // ==========================================
    if (sub === 'reset') {
      const konfirmasi = interaction.options.getBoolean('konfirmasi', true);
      if (!konfirmasi) {
        return interaction.reply({
          content: '❌ Reset dibatalkan karena opsi konfirmasi bernilai `False`.',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      resetOrgData(guildId);

      // Auto-refresh live org chart
      refreshLiveOrgChart(guildId, guild, client).catch(e =>
        console.warn('[/org reset] Auto-refresh failed:', e.message)
      );

      return await interaction.editReply({
        content: '🗑️ Seluruh data struktur organisasi telah berhasil direset ke keadaan kosong.\n\n🔄 *Bagan struktur organisasi telah otomatis diperbarui.*'
      });
    }
  }
};
