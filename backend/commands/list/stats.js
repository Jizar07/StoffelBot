const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Shows bot statistics including servers, users, and uptime'),
  
  async execute(interaction) {
    const client = interaction.client;
    
    // Calculate uptime
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    
    // Get total users (approximate)
    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📊 Stoffel Bot Statistics')
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { 
          name: '🏠 Servers', 
          value: client.guilds.cache.size.toString(), 
          inline: true 
        },
        { 
          name: '👥 Users', 
          value: totalUsers.toLocaleString(), 
          inline: true 
        },
        { 
          name: '📡 Ping', 
          value: `${Math.round(client.ws.ping)}ms`, 
          inline: true 
        },
        { 
          name: '⏱️ Uptime', 
          value: uptimeString, 
          inline: false 
        },
        { 
          name: '🔧 Node.js Version', 
          value: process.version, 
          inline: true 
        },
        { 
          name: '💾 Memory Usage', 
          value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`, 
          inline: true 
        }
      )
      .setTimestamp()
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL() 
      });

    await interaction.reply({ embeds: [embed] });
  },
};