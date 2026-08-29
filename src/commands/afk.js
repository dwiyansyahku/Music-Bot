const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set status AFK — bot akan memberitahu orang yang mention kamu')
    .addStringOption(opt =>
      opt.setName('alasan')
        .setDescription('Alasan AFK (contoh: Makan dulu, Tidur dulu, Mandi)')
        .setRequired(false)
        .setMaxLength(150)
    ),

  async execute(interaction, client) {
    const reason = interaction.options.getString('alasan') || 'AFK';
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Inisialisasi Map AFK di client jika belum ada
    if (!client.afkUsers) client.afkUsers = new Map();

    const key = `${guildId}_${userId}`;

    // Jika sudah AFK, hapus AFK
    if (client.afkUsers.has(key)) {
      client.afkUsers.delete(key);
      return interaction.reply({
        content: '👋 **Status AFK-mu telah dihapus.** Selamat datang kembali!',
        flags: MessageFlags.Ephemeral
      });
    }

    // Set AFK
    client.afkUsers.set(key, {
      reason,
      timestamp: Date.now(),
      displayName: interaction.member.displayName,
      username: interaction.user.username
    });

    const embed = new EmbedBuilder()
      .setColor('#2B2D31')
      .setDescription(`💤 **${interaction.member.displayName}** sekarang sedang **AFK**\n> *${reason}*`)
      .setFooter({ text: 'Ketik pesan apapun untuk menghapus status AFK' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
