const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Laporkan pelanggaran member secara rahasia kepada tim moderator')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('Member yang ingin dilaporkan')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');

    const modal = new ModalBuilder()
      .setCustomId('cdesk_modal_report')
      .setTitle('Formulir Laporan Pelanggaran');

    const targetInput = new TextInputBuilder()
      .setCustomId('cdesk_input_target')
      .setLabel('Member Terlapor (Username / ID / Mention)')
      .setStyle(TextInputStyle.Short)
      .setValue(targetUser ? `${targetUser.username} (${targetUser.id})` : '')
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
};
