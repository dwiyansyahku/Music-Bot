const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserAchievements } = require('../utils/achievementHelper');

function createBar(percent, length = 10) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('Lihat daftar pencapaian (Achievements) & Badge yang telah kamu raih')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Member yang ingin dilihat pencapaiannya').setRequired(false)
    ),

  async execute(interaction) {
    const targetMember = interaction.options.getMember('user') || interaction.member;
    const targetUser = targetMember.user;
    const guildId = interaction.guild.id;

    const data = getUserAchievements(guildId, targetUser.id, targetMember);
    const bar = createBar(data.percentage, 12);

    const unlockedList = data.unlocked.length > 0
      ? data.unlocked.map(a => `${a.emoji} **${a.name}**\n   *${a.desc}*`).join('\n')
      : '_Belum ada achievement yang terbuka_';

    const lockedList = data.locked.length > 0
      ? data.locked.map(a => `🔒 **${a.name}** — *${a.desc}*`).join('\n')
      : '🎉 **Semua achievement telah berhasil diraih!**';

    const embed = new EmbedBuilder()
      .setColor(data.percentage === 100 ? '#FEE75C' : '#5865F2')
      .setAuthor({
        name: `🎖️ ACHIEVEMENTS — ${targetMember.displayName.toUpperCase()}`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .setTitle(`Tingkat Penyelesaian: ${data.percentage}%`)
      .setDescription(
        `\`[${bar}]\` **${data.unlocked.length} / ${data.total} Terbuka**\n\n` +
        `### 🏆 Terbuka (${data.unlocked.length})\n${unlockedList}\n\n` +
        `### 🔒 Terkunci (${data.locked.length})\n${lockedList}`
      )
      .setFooter({ text: 'Badge otomatis tampil di Kartu Profil Member!' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
