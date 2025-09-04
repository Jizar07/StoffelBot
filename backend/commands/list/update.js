const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Updates documentation files and pushes changes to GitHub (Admin only)'),
  
  async execute(interaction) {
    // Check if user has admin permissions
    if (!interaction.member.permissions.has('Administrator')) {
      await interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        ephemeral: true
      });
      return;
    }

    await interaction.reply('🔄 Starting update process...');

    const updateBatPath = path.join(__dirname, '../../../update.bat');
    
    exec(`"${updateBatPath}"`, { cwd: path.dirname(updateBatPath) }, async (error, stdout, stderr) => {
      const embed = new EmbedBuilder()
        .setTimestamp()
        .setFooter({ 
          text: `Requested by ${interaction.user.tag}`, 
          iconURL: interaction.user.displayAvatarURL() 
        });

      if (error) {
        embed
          .setColor(0xFF0000)
          .setTitle('❌ Update Failed')
          .setDescription('An error occurred during the update process.')
          .addFields({ 
            name: 'Error Details', 
            value: `\`\`\`${error.message.slice(0, 1000)}\`\`\`` 
          });
      } else {
        embed
          .setColor(0x00FF00)
          .setTitle('✅ Update Successful')
          .setDescription('Documentation has been updated and pushed to GitHub.')
          .addFields({ 
            name: 'Output', 
            value: `\`\`\`${stdout.slice(0, 1000) || 'Update completed successfully'}\`\`\`` 
          });
      }

      await interaction.editReply({ embeds: [embed] });
    });
  },
};