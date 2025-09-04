const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear messages from the channel')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .addBooleanOption(option =>
      option.setName('keep_pinned')
        .setDescription('Keep pinned messages (default: true)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const keepPinned = interaction.options.getBoolean('keep_pinned') ?? true;

    // Check if bot has permission to manage messages
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: '❌ I don\'t have permission to manage messages in this channel!',
        ephemeral: true
      });
    }

    // Check if user has permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: '❌ You don\'t have permission to manage messages!',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Fetch messages
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      
      let messagesToDelete = messages;
      
      // Filter out pinned messages if keepPinned is true
      if (keepPinned) {
        messagesToDelete = messages.filter(msg => !msg.pinned);
      }

      // Filter out messages older than 14 days (Discord limitation)
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      messagesToDelete = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);

      if (messagesToDelete.size === 0) {
        return interaction.editReply({
          content: '⚠️ No messages found that can be deleted (messages might be pinned or older than 14 days).'
        });
      }

      // Delete messages
      const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

      // Count pinned messages that were skipped
      const pinnedSkipped = keepPinned ? messages.filter(msg => msg.pinned).size : 0;
      const oldSkipped = messages.size - messagesToDelete.size - pinnedSkipped;

      let response = `✅ Successfully deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}.`;
      
      if (pinnedSkipped > 0) {
        response += `\n📌 Skipped **${pinnedSkipped}** pinned message${pinnedSkipped !== 1 ? 's' : ''}.`;
      }
      
      if (oldSkipped > 0) {
        response += `\n⏰ Skipped **${oldSkipped}** message${oldSkipped !== 1 ? 's' : ''} older than 14 days.`;
      }

      await interaction.editReply({ content: response });

      // Log the action
      console.log(`[CLEAR] ${interaction.user.tag} deleted ${deleted.size} messages in #${interaction.channel.name} (${interaction.guild.name})`);

    } catch (error) {
      console.error('Error clearing messages:', error);
      await interaction.editReply({
        content: '❌ An error occurred while trying to clear messages. Please try again.'
      });
    }
  }
};