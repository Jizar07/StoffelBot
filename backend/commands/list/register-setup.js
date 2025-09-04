const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const RegistrationService = require('../../services/RegistrationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register-setup')
    .setDescription('Deploy the registration form to a channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to deploy the registration form to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const channel = interaction.options.getChannel('channel');
      
      // Validate channel
      if (!channel || channel.type !== ChannelType.GuildText) {
        return await interaction.editReply({
          content: '❌ Please select a valid text channel.'
        });
      }
      
      // Get registration configuration
      const config = await RegistrationService.getFormConfig();
      
      // Check if functions are configured
      const activeFunctions = config.functions.filter(f => f.active);
      if (activeFunctions.length === 0) {
        return await interaction.editReply({
          content: '❌ No registration functions are configured. Please configure roles in the web dashboard first.\\n\\nAccess: ' + (process.env.FRONTEND_URL || 'http://localhost:3141') + '/registration'
        });
      }
      
      // Create registration embed
      const embed = new EmbedBuilder()
        .setTitle(config.formDisplay.title)
        .setDescription(config.formDisplay.description)
        .setColor(config.formDisplay.embedColor)
        .setFooter({ text: config.formDisplay.footerText })
        .setTimestamp();
      
      // Add fields showing available functions
      if (activeFunctions.length > 0) {
        const functionsList = activeFunctions
          .sort((a, b) => a.order - b.order)
          .map(func => `${func.channelEmojiPrefix || '•'} **${func.displayName}**${func.description ? ` - ${func.description}` : ''}`)
          .slice(0, 10) // Limit to prevent embed size issues
          .join('\\n');
        
        embed.addFields({
          name: '📋 Available Roles',
          value: functionsList,
          inline: false
        });
      }
      
      // Get button style from config
      let buttonStyle = ButtonStyle.Primary;
      switch (config.formDisplay.button.style) {
        case 'Secondary': buttonStyle = ButtonStyle.Secondary; break;
        case 'Success': buttonStyle = ButtonStyle.Success; break;
        case 'Danger': buttonStyle = ButtonStyle.Danger; break;
        default: buttonStyle = ButtonStyle.Primary;
      }
      
      // Create registration button
      const button = new ButtonBuilder()
        .setCustomId('register_start')
        .setLabel(config.formDisplay.button.text)
        .setStyle(buttonStyle)
        .setEmoji(config.formDisplay.button.emoji);
      
      const row = new ActionRowBuilder().addComponents(button);
      
      // Send to channel
      const message = await channel.send({
        embeds: [embed],
        components: [row]
      });
      
      // Update config with channel ID for logging
      await RegistrationService.updateFormConfig({
        settings: { ...config.settings, channelId: channel.id }
      });
      
      // Success response
      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Registration Form Deployed')
        .setDescription(`Registration form has been successfully deployed to ${channel}`)
        .addFields([
          { name: 'Message ID', value: message.id, inline: true },
          { name: 'Available Roles', value: activeFunctions.length.toString(), inline: true },
          { name: 'Configuration', value: '[Open Dashboard](' + (process.env.FRONTEND_URL || 'http://localhost:3141') + '/registration)', inline: true }
        ])
        .setColor(0x00FF00)
        .setFooter({ text: 'Users can now click the button to start registration' })
        .setTimestamp();
      
      await interaction.editReply({
        embeds: [successEmbed]
      });
      
    } catch (error) {
      console.error('Error deploying registration form:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Deployment Failed')
        .setDescription('An error occurred while deploying the registration form.')
        .addFields([
          { name: 'Error Details', value: error.message || 'Unknown error', inline: false }
        ])
        .setColor(0xFF0000)
        .setTimestamp();
      
      await interaction.editReply({
        embeds: [errorEmbed]
      });
    }
  },
};