const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const storage = require('./storage');
const { getModLogChannelId, sendModLog } = require('./modlog');

/**
 * Palet warna elegan untuk Community Desk & Tiket
 */
const DESK_COLORS = {
  PANEL: 0x2B2D31,       // Dark Slate (Elegan)
  REPORT: 0xED4245,      // Crimson Red (Laporan Pelanggaran)
  CONTENT: 0x5865F2,     // Blurple / Indigo (Ide & Kolaborasi Konten)
  FEEDBACK: 0xFEE75C,    // Warm Amber (Kritik & Saran)
  OTHER: 0x4E5058,       // Muted Gray (Pesan Lainnya)
  RESOLVED: 0x57F287,    // Soft Green (Selesai)
  DISMISSED: 0x747F8D     // Subtle Slate (Ditutup/Ditolak)
};

/**
 * Format timestamp ringkas untuk footer
 */
function getTimestampText() {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }) + ' WIB';
}

/**
 * Ambil ID channel penerima tiket laporan
 */
function getDeskReportChannelId(guildId) {
  if (!guildId) return null;
  const settings = storage.read('settings') || {};
  const guildSettings = settings[guildId] || {};
  return (
    guildSettings.deskReportChannelId ||
    guildSettings.reportChannelId ||
    getModLogChannelId(guildId)
  );
}

/**
 * Generate embed panel utama Community Desk
 */
function buildDeskPanelEmbed(guild) {
  return new EmbedBuilder()
    .setColor(DESK_COLORS.PANEL)
    .setAuthor({
      name: 'COMMUNITY DESK — PUSAT LAYANAN & PENGADUAN',
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`Layanan Informasi & Aspirasi Warga — ${guild.name}`)
    .setDescription(
      `Selamat datang di Pusat Layanan Komunitas. Gunakan sarana ini untuk menyampaikan laporan pelanggaran, usulan konten, serta aspirasi demi kenyamanan bersama.\n\n` +
      `**Ketentuan & Kerahasiaan:**\n` +
      `• Seluruh pengiriman bersifat **rahasia** dan langsung ditujukan kepada tim moderator.\n` +
      `• Member lain maupun terlapor **tidak dapat melihat** pesan atau identitas pelapor.\n` +
      `• Dilarang keras menyalahgunakan sistem ini untuk laporan palsu atau spam.\n\n` +
      `*Pilih salah satu tombol di bawah untuk membuka formulir:*`
    )
    .addFields(
      {
        name: 'Layanan yang Tersedia',
        value:
          `• **Laporkan Member** — Pelanggaran aturan, tindakan toksik, spam, atau penipuan.\n` +
          `• **Ide & Kolaborasi** — Usulan topik video, streaming, mabar, atau proyek kreatif.\n` +
          `• **Kritik & Saran** — Masukan dan evaluasi untuk server, bot, maupun pengelolaan acara.\n` +
          `• **Pesan Lainnya** — Pertanyaan atau keperluan umum yang ditujukan ke staf.`
      }
    )
    .setFooter({
      text: `${guild.name} • Community Desk • ${getTimestampText()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTimestamp();
}

/**
 * ActionRow tombol utama panel
 */
function buildDeskPanelButtons() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('cdesk_btn_report')
      .setLabel('Laporkan Member')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('cdesk_btn_content')
      .setLabel('Ide & Kolaborasi')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('cdesk_btn_feedback')
      .setLabel('Kritik & Saran')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('cdesk_btn_other')
      .setLabel('Pesan Lainnya')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row];
}

/**
 * Tampilkan modal pop-up sesuai tombol yang ditekan
 */
async function handleDeskButton(interaction) {
  const customId = interaction.customId;

  // 1. Laporkan Member
  if (customId === 'cdesk_btn_report') {
    const modal = new ModalBuilder()
      .setCustomId('cdesk_modal_report')
      .setTitle('Formulir Laporan Pelanggaran');

    const targetInput = new TextInputBuilder()
      .setCustomId('cdesk_input_target')
      .setLabel('Member Terlapor (Username / ID / Mention)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: @username atau 123456789012345678')
      .setRequired(true)
      .setMaxLength(100);

    const categoryInput = new TextInputBuilder()
      .setCustomId('cdesk_input_category')
      .setLabel('Kategori Pelanggaran')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Spam, Perilaku Toksik, DM Mencurigakan, NSFW')
      .setRequired(true)
      .setMaxLength(100);

    const detailsInput = new TextInputBuilder()
      .setCustomId('cdesk_input_details')
      .setLabel('Kronologi & Penjelasan Kejadian')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Jelaskan secara ringkas dan objektif apa yang terjadi...')
      .setRequired(true)
      .setMaxLength(1000);

    const evidenceInput = new TextInputBuilder()
      .setCustomId('cdesk_input_evidence')
      .setLabel('Tautan Bukti Pesan / Screenshot (Opsional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://discord.com/channels/... atau tautan gambar')
      .setRequired(false)
      .setMaxLength(300);

    modal.addComponents(
      new ActionRowBuilder().addComponents(targetInput),
      new ActionRowBuilder().addComponents(categoryInput),
      new ActionRowBuilder().addComponents(detailsInput),
      new ActionRowBuilder().addComponents(evidenceInput)
    );

    return interaction.showModal(modal);
  }

  // 2. Ide & Kolaborasi Konten
  if (customId === 'cdesk_btn_content') {
    const modal = new ModalBuilder()
      .setCustomId('cdesk_modal_content')
      .setTitle('Usulan Ide & Kolaborasi Konten');

    const titleInput = new TextInputBuilder()
      .setCustomId('cdesk_input_title')
      .setLabel('Topik / Judul Usulan')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Mabar Ranked Valorant, Podcast Cerita Seram, Challenge')
      .setRequired(true)
      .setMaxLength(100);

    const platformInput = new TextInputBuilder()
      .setCustomId('cdesk_input_platform')
      .setLabel('Platform / Format Konten')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: YouTube, TikTok, Discord Stage / Event')
      .setRequired(true)
      .setMaxLength(100);

    const detailsInput = new TextInputBuilder()
      .setCustomId('cdesk_input_details')
      .setLabel('Deskripsi Konsep & Rencana')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Uraikan detail konsep, alur kegiatan, dan hal yang disiapkan...')
      .setRequired(true)
      .setMaxLength(1000);

    const contactInput = new TextInputBuilder()
      .setCustomId('cdesk_input_contact')
      .setLabel('Kontak / Media Sosial (Opsional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: @instagram, link profil YouTube')
      .setRequired(false)
      .setMaxLength(150);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(platformInput),
      new ActionRowBuilder().addComponents(detailsInput),
      new ActionRowBuilder().addComponents(contactInput)
    );

    return interaction.showModal(modal);
  }

  // 3. Kritik & Saran
  if (customId === 'cdesk_btn_feedback') {
    const modal = new ModalBuilder()
      .setCustomId('cdesk_modal_feedback')
      .setTitle('Kritik & Saran Komunitas');

    const topicInput = new TextInputBuilder()
      .setCustomId('cdesk_input_topic')
      .setLabel('Bidang Masukan')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Pengelolaan Server, Bot Discord, Acara / Event, Role')
      .setRequired(true)
      .setMaxLength(100);

    const detailsInput = new TextInputBuilder()
      .setCustomId('cdesk_input_details')
      .setLabel('Uraian Kritik / Masukan')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Sampaikan evaluasi atau kendala yang dirasakan...')
      .setRequired(true)
      .setMaxLength(1000);

    const solutionInput = new TextInputBuilder()
      .setCustomId('cdesk_input_solution')
      .setLabel('Usulan Solusi / Harapan (Opsional)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Saran langkah perbaikan yang diharapkan...')
      .setRequired(false)
      .setMaxLength(500);

    modal.addComponents(
      new ActionRowBuilder().addComponents(topicInput),
      new ActionRowBuilder().addComponents(detailsInput),
      new ActionRowBuilder().addComponents(solutionInput)
    );

    return interaction.showModal(modal);
  }

  // 4. Pesan Lainnya
  if (customId === 'cdesk_btn_other') {
    const modal = new ModalBuilder()
      .setCustomId('cdesk_modal_other')
      .setTitle('Pesan Khusus untuk Staf');

    const subjectInput = new TextInputBuilder()
      .setCustomId('cdesk_input_subject')
      .setLabel('Subjek / Hal yang Ditanyakan')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Pertanyaan Role Donatur, Konfirmasi Event')
      .setRequired(true)
      .setMaxLength(100);

    const detailsInput = new TextInputBuilder()
      .setCustomId('cdesk_input_details')
      .setLabel('Isi Pesan')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Tuliskan pesanmu dengan jelas...')
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(
      new ActionRowBuilder().addComponents(subjectInput),
      new ActionRowBuilder().addComponents(detailsInput)
    );

    return interaction.showModal(modal);
  }
}

/**
 * Handle ketika modal Community Desk di-submit
 */
async function handleDeskModalSubmit(interaction, client) {
  const guild = interaction.guild;
  const user = interaction.user;
  const customId = interaction.customId;

  // Tentukan channel tujuan pengiriman tiket staf
  const reportChannelId = getDeskReportChannelId(guild.id);
  const targetChannel = reportChannelId
    ? (guild.channels.cache.get(reportChannelId) || await client.channels.fetch(reportChannelId).catch(() => null))
    : null;

  if (!targetChannel) {
    return interaction.reply({
      content: 'Saluran penerimaan tiket moderator belum diatur oleh admin. Silakan laporkan kendala ini kepada pengelola server.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Buat ID tiket unik berbasis timestamp acak
  const ticketCode = Math.floor(1000 + Math.random() * 9000);
  const ticketId = `TKT-${ticketCode}`;
  const nowTs = Math.floor(Date.now() / 1000);

  let categoryLabel = '';
  let embedColor = DESK_COLORS.OTHER;
  let fields = [];
  let targetUserId = null;
  let targetMember = null;

  // Baca database tickets
  const ticketsData = storage.read('tickets');
  if (!ticketsData[guild.id]) ticketsData[guild.id] = {};

  if (customId === 'cdesk_modal_report') {
    categoryLabel = 'LAPORAN PELANGGARAN';
    embedColor = DESK_COLORS.REPORT;

    const rawTarget = interaction.fields.getTextInputValue('cdesk_input_target')?.trim() || '-';
    const category = interaction.fields.getTextInputValue('cdesk_input_category')?.trim() || '-';
    const details = interaction.fields.getTextInputValue('cdesk_input_details')?.trim() || '-';
    const evidence = interaction.fields.getTextInputValue('cdesk_input_evidence')?.trim() || '';

    // Coba ekstrak ID jika dalam format mention <@12345>
    const match = rawTarget.match(/\d{17,20}/);
    if (match) {
      targetUserId = match[0];
      targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    }

    // Ambil riwayat warning jika user terlapor terdaftar
    let warnCount = 0;
    if (targetUserId) {
      const warnsData = storage.read('warns');
      const userWarns = warnsData[guild.id]?.[targetUserId] || [];
      warnCount = userWarns.length;
    }

    fields = [
      {
        name: 'Informasi Pelapor',
        value: `• Nama: <@${user.id}> (\`${user.username}\`)\n• ID Pengguna: \`${user.id}\``,
        inline: true
      },
      {
        name: 'Subjek Terlapor',
        value: targetMember
          ? `• Target: <@${targetMember.id}> (\`${targetMember.user.username}\`)\n• ID: \`${targetMember.id}\`\n• Peringatan Aktif: **${warnCount} kali**`
          : `• Input: \`${rawTarget}\``,
        inline: true
      },
      {
        name: 'Kategori Pelanggaran',
        value: `• \`${category}\``,
        inline: false
      },
      {
        name: 'Kronologi Kejadian',
        value: details,
        inline: false
      }
    ];

    if (evidence) {
      fields.push({
        name: 'Tautan Bukti Pendukung',
        value: evidence,
        inline: false
      });
    }

    ticketsData[guild.id][ticketId] = {
      id: ticketId,
      type: 'REPORT',
      reporterId: user.id,
      reporterTag: user.tag || user.username,
      targetId: targetUserId || rawTarget,
      targetTag: targetMember?.user?.tag || rawTarget,
      details,
      category,
      evidence,
      createdAt: Date.now(),
      status: 'OPEN',
      resolvedBy: null
    };

  } else if (customId === 'cdesk_modal_content') {
    categoryLabel = 'IDE & KOLABORASI KONTEN';
    embedColor = DESK_COLORS.CONTENT;

    const title = interaction.fields.getTextInputValue('cdesk_input_title')?.trim() || '-';
    const platform = interaction.fields.getTextInputValue('cdesk_input_platform')?.trim() || '-';
    const details = interaction.fields.getTextInputValue('cdesk_input_details')?.trim() || '-';
    const contact = interaction.fields.getTextInputValue('cdesk_input_contact')?.trim() || '';

    fields = [
      {
        name: 'Pengusul',
        value: `• Nama: <@${user.id}> (\`${user.username}\`)\n• ID: \`${user.id}\``,
        inline: true
      },
      {
        name: 'Format / Platform',
        value: `• \`${platform}\``,
        inline: true
      },
      {
        name: 'Topik Konten',
        value: `**${title}**`,
        inline: false
      },
      {
        name: 'Konsep & Rencana Pelaksanaan',
        value: details,
        inline: false
      }
    ];

    if (contact) {
      fields.push({
        name: 'Kontak / Akun Media Sosial',
        value: contact,
        inline: false
      });
    }

    ticketsData[guild.id][ticketId] = {
      id: ticketId,
      type: 'CONTENT',
      reporterId: user.id,
      reporterTag: user.tag || user.username,
      title,
      platform,
      details,
      contact,
      createdAt: Date.now(),
      status: 'OPEN',
      resolvedBy: null
    };

  } else if (customId === 'cdesk_modal_feedback') {
    categoryLabel = 'KRITIK & SARAN KOMUNITAS';
    embedColor = DESK_COLORS.FEEDBACK;

    const topic = interaction.fields.getTextInputValue('cdesk_input_topic')?.trim() || '-';
    const details = interaction.fields.getTextInputValue('cdesk_input_details')?.trim() || '-';
    const solution = interaction.fields.getTextInputValue('cdesk_input_solution')?.trim() || '';

    fields = [
      {
        name: 'Pengirim Masukan',
        value: `• Nama: <@${user.id}> (\`${user.username}\`)\n• ID: \`${user.id}\``,
        inline: true
      },
      {
        name: 'Bidang',
        value: `• \`${topic}\``,
        inline: true
      },
      {
        name: 'Uraian Masukan / Kendala',
        value: details,
        inline: false
      }
    ];

    if (solution) {
      fields.push({
        name: 'Usulan Solusi / Harapan',
        value: solution,
        inline: false
      });
    }

    ticketsData[guild.id][ticketId] = {
      id: ticketId,
      type: 'FEEDBACK',
      reporterId: user.id,
      reporterTag: user.tag || user.username,
      topic,
      details,
      solution,
      createdAt: Date.now(),
      status: 'OPEN',
      resolvedBy: null
    };

  } else if (customId === 'cdesk_modal_other') {
    categoryLabel = 'PESAN KHUSUS STAF';
    embedColor = DESK_COLORS.OTHER;

    const subject = interaction.fields.getTextInputValue('cdesk_input_subject')?.trim() || '-';
    const details = interaction.fields.getTextInputValue('cdesk_input_details')?.trim() || '-';

    fields = [
      {
        name: 'Pengirim',
        value: `• Nama: <@${user.id}> (\`${user.username}\`)\n• ID: \`${user.id}\``,
        inline: true
      },
      {
        name: 'Subjek',
        value: `• \`${subject}\``,
        inline: true
      },
      {
        name: 'Isi Pesan',
        value: details,
        inline: false
      }
    ];

    ticketsData[guild.id][ticketId] = {
      id: ticketId,
      type: 'OTHER',
      reporterId: user.id,
      reporterTag: user.tag || user.username,
      subject,
      details,
      createdAt: Date.now(),
      status: 'OPEN',
      resolvedBy: null
    };
  }

  // Simpan data tiket
  storage.write('tickets', ticketsData);

  // Buat embed tiket untuk channel staf
  const ticketEmbed = new EmbedBuilder()
    .setColor(embedColor)
    .setAuthor({
      name: `TIKET MASUK #${ticketCode} — ${categoryLabel}`,
      iconURL: user.displayAvatarURL({ dynamic: true })
    })
    .setTitle(`Pesan Baru dari ${user.username}`)
    .setDescription(
      `Pesan diterima pada <t:${nowTs}:f> (<t:${nowTs}:R>).\nStatus saat ini: \`MENUNGGU TINJAUAN\``
    )
    .addFields(fields)
    .setFooter({
      text: `${guild.name} • Tiket #${ticketCode} • ID: ${ticketId}`
    })
    .setTimestamp();

  // Tombol aksi moderator
  const actionRow = new ActionRowBuilder();

  if (customId === 'cdesk_modal_report') {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`cdesk_act_resolve_${ticketId}`)
        .setLabel('Tandai Selesai')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`cdesk_act_dismiss_${ticketId}`)
        .setLabel('Tolak Laporan')
        .setStyle(ButtonStyle.Secondary)
    );

    // Jika target member berhasil dideteksi, sediakan tombol tindakan cepat
    if (targetUserId) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`cdesk_act_warn_${targetUserId}_${ticketId}`)
          .setLabel('Peringatkan Target')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`cdesk_act_timeout_${targetUserId}_${ticketId}`)
          .setLabel('Timeout (1 Jam)')
          .setStyle(ButtonStyle.Danger)
      );
    }
  } else {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`cdesk_act_resolve_${ticketId}`)
        .setLabel('Tandai Diterima')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`cdesk_act_reply_${ticketId}`)
        .setLabel('Balas ke Member')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`cdesk_act_dismiss_${ticketId}`)
        .setLabel('Arsipkan')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // Kirim tiket ke channel staf
  try {
    const sentMsg = await targetChannel.send({
      embeds: [ticketEmbed],
      components: [actionRow]
    });
    // Simpan message ID tiket untuk pembaruan status
    ticketsData[guild.id][ticketId].messageId = sentMsg.id;
    ticketsData[guild.id][ticketId].channelId = targetChannel.id;
    storage.write('tickets', ticketsData);
  } catch (err) {
    console.error('[Community Desk] Gagal mengirim tiket ke channel staf:', err);
  }

  // Respon tertutup (Ephemeral) ke member pelapor
  return interaction.reply({
    content:
      `Informasi atau laporanmu telah berhasil diterima oleh tim moderator dengan kode referensi **#${ticketCode}**.\n\n` +
      `Pesan ini bersifat tertutup dan member lain tidak dapat melihatnya. Terima kasih atas partisipasi dan kepedulianmu.`,
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Handle tombol aksi yang ditekan oleh staf/moderator pada pesan tiket
 */
async function handleDeskAction(interaction, client) {
  const customId = interaction.customId;
  const guild = interaction.guild;
  const member = interaction.member;

  // Izin khusus moderator/admin
  const { isOwnerOrMod, replyNoAccessMod } = require('./helpers');
  if (!await isOwnerOrMod(interaction, client)) {
    return replyNoAccessMod(interaction);
  }

  // Parse ID tiket dari customId
  // Contoh: cdesk_act_resolve_TKT-1234, cdesk_act_warn_USERID_TKT-1234, cdesk_act_reply_TKT-1234
  const parts = customId.split('_');
  const actionType = parts[2]; // resolve, dismiss, warn, timeout, reply

  let ticketId = null;
  let targetId = null;

  if (actionType === 'warn' || actionType === 'timeout') {
    targetId = parts[3];
    ticketId = parts[4];
  } else {
    ticketId = parts[3];
  }

  const ticketsData = storage.read('tickets');
  const ticket = ticketsData[guild.id]?.[ticketId];

  // 1. Aksi: Tandai Selesai (Resolve)
  if (actionType === 'resolve') {
    if (ticket) {
      ticket.status = 'RESOLVED';
      ticket.resolvedBy = member.id;
      ticket.resolvedAt = Date.now();
      storage.write('tickets', ticketsData);
    }

    const currentEmbed = interaction.message.embeds[0];
    if (currentEmbed) {
      const updatedEmbed = EmbedBuilder.from(currentEmbed)
        .setColor(DESK_COLORS.RESOLVED)
        .setDescription(
          `${currentEmbed.description}\n\n` +
          `• **Status:** \`SELESAI / DITINDAKLANJUTI\`\n` +
          `• **Ditangani oleh:** <@${member.id}> pada <t:${Math.floor(Date.now() / 1000)}:R>`
        );

      await interaction.update({
        embeds: [updatedEmbed],
        components: [] // nonaktifkan tombol
      }).catch(() => {});
    }

    // Beri konfirmasi ke moderator
    return interaction.followUp({
      content: `Tiket **${ticketId}** telah ditandai sebagai selesai oleh <@${member.id}>.`,
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }

  // 2. Aksi: Tolak Laporan / Arsipkan (Dismiss)
  if (actionType === 'dismiss') {
    if (ticket) {
      ticket.status = 'DISMISSED';
      ticket.resolvedBy = member.id;
      ticket.resolvedAt = Date.now();
      storage.write('tickets', ticketsData);
    }

    const currentEmbed = interaction.message.embeds[0];
    if (currentEmbed) {
      const updatedEmbed = EmbedBuilder.from(currentEmbed)
        .setColor(DESK_COLORS.DISMISSED)
        .setDescription(
          `${currentEmbed.description}\n\n` +
          `• **Status:** \`DITUTUP / TIDAK VALID\`\n` +
          `• **Ditutup oleh:** <@${member.id}> pada <t:${Math.floor(Date.now() / 1000)}:R>`
        );

      await interaction.update({
        embeds: [updatedEmbed],
        components: []
      }).catch(() => {});
    }

    return interaction.followUp({
      content: `Tiket **${ticketId}** telah ditutup/diarsipkan oleh <@${member.id}>.`,
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }

  // 3. Aksi Cepat: Peringatkan Target (Warn)
  if (actionType === 'warn' && targetId) {
    const targetUser = await client.users.fetch(targetId).catch(() => null);
    if (!targetUser) {
      return interaction.reply({ content: 'Target pengguna tidak ditemukan.', flags: MessageFlags.Ephemeral });
    }

    const reason = `Tindak lanjut laporan tiket ${ticketId}`;
    const warnsData = storage.read('warns');
    if (!warnsData[guild.id]) warnsData[guild.id] = {};
    if (!warnsData[guild.id][targetId]) warnsData[guild.id][targetId] = [];

    const newWarn = {
      id: warnsData[guild.id][targetId].length + 1,
      moderator: member.user.tag,
      moderatorId: member.id,
      reason,
      timestamp: Date.now()
    };
    warnsData[guild.id][targetId].push(newWarn);
    storage.write('warns', warnsData);

    // Kirim ModLog
    await sendModLog(guild, client, {
      action: 'WARN',
      moderator: member.user,
      target: targetUser,
      reason,
      details: `Peringatan ke-${warnsData[guild.id][targetId].length} via tiket pengaduan ${ticketId}`
    }).catch(() => {});

    // Coba kirim DM ke target
    await targetUser.send({
      content: `Kamu menerima peringatan di server **${guild.name}** atas pelanggaran aturan. Alasan: \`${reason}\`.`
    }).catch(() => {});

    return interaction.reply({
      content: `Peringatan berhasil diberikan kepada <@${targetId}> (${newWarn.id} kali peringatan aktif).`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 4. Aksi Cepat: Timeout Target (1 Jam)
  if (actionType === 'timeout' && targetId) {
    const targetMember = await guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ content: 'Member tidak ditemukan di server.', flags: MessageFlags.Ephemeral });
    }

    if (!targetMember.moderatable) {
      return interaction.reply({ content: 'Bot tidak memiliki izin untuk memoderasi member ini (Role lebih tinggi).', flags: MessageFlags.Ephemeral });
    }

    const durationMinutes = 60;
    const reason = `Tindak lanjut pengaduan tiket ${ticketId}`;

    await targetMember.timeout(durationMinutes * 60 * 1000, reason).catch(err => {
      return interaction.reply({ content: `Gagal memberikan timeout: ${err.message}`, flags: MessageFlags.Ephemeral });
    });

    await sendModLog(guild, client, {
      action: 'MUTE',
      moderator: member.user,
      target: targetMember.user,
      reason,
      details: `Durasi: 60 menit via tiket pengaduan ${ticketId}`
    }).catch(() => {});

    return interaction.reply({
      content: `Member <@${targetId}> berhasil diberikan timeout selama 60 menit.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 5. Aksi: Balas ke Member (Reply via DM)
  if (actionType === 'reply' && ticketId) {
    const modal = new ModalBuilder()
      .setCustomId(`cdesk_modal_mod_reply_${ticketId}`)
      .setTitle(`Balas ke Pengirim Tiket #${ticketId}`);

    const replyInput = new TextInputBuilder()
      .setCustomId('cdesk_input_mod_reply')
      .setLabel('Pesan Balasan dari Tim Staf')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Tulis tanggapan atau ucapan apresiasi untuk dikirim ke DM pengirim...')
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(replyInput));
    return interaction.showModal(modal);
  }
}

/**
 * Handle submit balasan moderator ke DM member
 */
async function handleDeskModReplySubmit(interaction, client) {
  const customId = interaction.customId;
  const ticketId = customId.replace('cdesk_modal_mod_reply_', '');
  const guild = interaction.guild;
  const member = interaction.member;

  const replyText = interaction.fields.getTextInputValue('cdesk_input_mod_reply')?.trim() || '';

  const ticketsData = storage.read('tickets');
  const ticket = ticketsData[guild.id]?.[ticketId];

  if (!ticket || !ticket.reporterId) {
    return interaction.reply({
      content: 'Data tiket tidak ditemukan atau pengirim tidak terdaftar.',
      flags: MessageFlags.Ephemeral
    });
  }

  const reporterUser = await client.users.fetch(ticket.reporterId).catch(() => null);
  if (!reporterUser) {
    return interaction.reply({
      content: 'Pengguna pengirim tiket tidak dapat dihubungi.',
      flags: MessageFlags.Ephemeral
    });
  }

  const replyEmbed = new EmbedBuilder()
    .setColor(DESK_COLORS.CONTENT)
    .setAuthor({
      name: `TANGGAPAN STAF — ${guild.name.toUpperCase()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`Tanggapan atas Tiket Pengaduan #${ticketId}`)
    .setDescription(
      `Halo <@${reporterUser.id}>,\n\n` +
      `Tim moderator/pengelola server telah meninjau pesan yang kamu kirimkan pada Community Desk:\n\n` +
      `**Pesan dari Staf:**\n` +
      `>>> ${replyText}\n\n` +
      `*Terima kasih atas kontribusi dan kepedulianmu terhadap komunitas ${guild.name}.*`
    )
    .setFooter({ text: `${guild.name} • Community Desk Service` })
    .setTimestamp();

  try {
    await reporterUser.send({ embeds: [replyEmbed] });

    return interaction.reply({
      content: `Pesan balasan berhasil dikirimkan ke DM <@${reporterUser.id}>.`,
      flags: MessageFlags.Ephemeral
    });
  } catch (err) {
    return interaction.reply({
      content: `Gagal mengirimkan DM ke member (Kemungkinan DM dinonaktifkan oleh pengguna): ${err.message}`,
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = {
  DESK_COLORS,
  buildDeskPanelEmbed,
  buildDeskPanelButtons,
  handleDeskButton,
  handleDeskModalSubmit,
  handleDeskAction,
  handleDeskModReplySubmit,
  getDeskReportChannelId
};
