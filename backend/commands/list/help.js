const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all available commands and their descriptions'),
  
  async execute(interaction) {
    const commands = interaction.client.commandManager.getCommands();
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📚 Stoffel Bot Commands')
      .setDescription('Here are all available commands:')
      .setTimestamp();

    commands.forEach(cmd => {
      embed.addFields({
        name: `/${cmd.name}`,
        value: cmd.description,
        inline: false
      });
    });

    embed.setFooter({ 
      text: 'Use /command to execute any of these commands' 
    });

    await interaction.reply({ embeds: [embed] });
  },
};