const healthcheck = require('./healthcheck');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('system')
    .setDescription('Cek status dan kesehatan seluruh sistem bot secara menyeluruh (Alias /healthcheck)'),

  async execute(interaction, client) {
    return healthcheck.execute(interaction, client);
  }
};
