const { handleInviteCreate } = require('../utils/inviteTracker');

module.exports = {
  name: 'inviteCreate',
  async execute(invite, client) {
    try {
      handleInviteCreate(invite, client);
    } catch (err) {
      console.warn('[inviteCreate Error]:', err.message);
    }
  }
};
