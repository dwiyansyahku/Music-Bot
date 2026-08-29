const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserAchievements } = require('../utils/achievementHelper');

function createBar(percent, length = 12) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '■'.repeat(filled) + '□'.repeat(empty);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('Lihat daftar gelar kehormatan (Titles & Badges) yang telah kamu raih')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Member yang ingin dilihat pencapaiannya').setRequired(false)
    ),

  async execute(interaction) {
    const targetMember = interaction.options.getMember('user') || interaction.member;
    const targetUser = targetMember.user;
    const guildId = interaction.guild.id;

    const data = getUserAchievements(guildId, targetUser.id, targetMember);
    const bar = createBar(data.percentage, 14);

    const unlockedList = data.unlocked.length > 0
      ? data.unlocked.map(a => `\`${a.tag} ${a.name}\` — *${a.desc}*`).join('\n')
      : '_Belum ada gelar yang terbuka_';

    const lockedList = data.locked.length > 0
      ? data.locked.map(a => `\`◇ ${a.name}\` — *${a.desc}*`).join('\n')
      : '✦ **Seluruh gelar kehormatan telah berhasil diraih!**';

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setAuthor({
        name: `ACCOMPLISHMENTS — ${targetMember.displayName.toUpperCase()}`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .setTitle(`Tingkat Penyelesaian: ${data.percentage}%`)
      .setDescription(
        `\`[${bar}]\` **${data.unlocked.length} of ${data.total} Unlocked**\n\n` +
        `**UNLOCKED TITLES (${data.unlocked.length})**\n${unlockedList}\n\n` +
        `**LOCKED TITLES (${data.locked.length})**\n${lockedList}`
      )
      .setFooter({ text: 'Titles & Badges disematkan otomatis pada kartu profil member' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
