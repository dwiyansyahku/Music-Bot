const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

// Emoji reaksi untuk opsi poll
const EMOJI_OPTIONS = ['🇦', '🇧', '🇨', '🇩'];
const LABELS = ['A', 'B', 'C', 'D'];

const poll = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Buat polling / vote di channel ini')
    .addStringOption(opt =>
      opt.setName('pertanyaan').setDescription('Pertanyaan untuk polling').setRequired(true).setMaxLength(256)
    )
    .addStringOption(opt =>
      opt.setName('opsi1').setDescription('Pilihan pertama').setRequired(true).setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('opsi2').setDescription('Pilihan kedua').setRequired(true).setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('opsi3').setDescription('Pilihan ketiga (opsional)').setRequired(false).setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('opsi4').setDescription('Pilihan keempat (opsional)').setRequired(false).setMaxLength(100)
    ),

  async execute(interaction, client) {
    const pertanyaan = interaction.options.getString('pertanyaan');

    const opsiRaw = [
      interaction.options.getString('opsi1'),
      interaction.options.getString('opsi2'),
      interaction.options.getString('opsi3'),
      interaction.options.getString('opsi4'),
    ].filter(Boolean); // Hapus null/undefined

    const optionLines = opsiRaw.map((opt, i) => `${EMOJI_OPTIONS[i]} **${LABELS[i]}.** ${opt}`);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 POLL')
      .setDescription(`**${pertanyaan}**\n\n${optionLines.join('\n\n')}`)
      .addFields({
        name: '📋 Cara Vote',
        value: 'Klik reaksi di bawah pesan ini untuk memilih!',
      })
      .setFooter({
        text: `Poll dibuat oleh ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Ambil pesan yang baru dikirim, lalu tambahkan reaksi
    const sent = await interaction.fetchReply();
    for (let i = 0; i < opsiRaw.length; i++) {
      try {
        await sent.react(EMOJI_OPTIONS[i]);
      } catch (e) {
        console.error(`[Poll] Gagal react ${EMOJI_OPTIONS[i]}:`, e.message);
      }
    }
  },
};

module.exports = poll;
