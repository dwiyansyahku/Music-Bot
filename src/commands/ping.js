const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Cek latency & status bot'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const sent = await interaction.fetchReply();
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    const uptimeSeconds = Math.floor(client.uptime / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeStr = `${hours}j ${minutes}m ${seconds}d`;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Pong!')
      .setDescription('Bot aktif dan berjalan normal.')
      .addFields(
        {
          name: 'Latency',
          value: [
            `Round-trip: **${roundTrip}ms**`,
            `API Discord: **${apiLatency}ms**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Uptime',
          value: `**${uptimeStr}**`,
          inline: true,
        }
      )
      .setFooter({ text: `Discord Music Bot • ${client.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
