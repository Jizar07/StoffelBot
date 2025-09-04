const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customize')
    .setDescription('Customize bot nickname for this server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('nickname')
        .setDescription('Change bot nickname in this server')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('New nickname (leave empty to reset)')
            .setRequired(false)
            .setMaxLength(32)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View current bot customization'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset bot nickname to default'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'nickname':
        await this.handleNickname(interaction);
        break;
      case 'status':
        await this.handleStatus(interaction);
        break;
      case 'reset':
        await this.handleReset(interaction);
        break;
    }
  },

  async handleNickname(interaction) {
    const nickname = interaction.options.getString('name');
    
    try {
      // Get server language for responses
      const serverLang = await this.getServerLanguage(interaction.guild.id);
      
      const messages = {
        en: {
          success: 'Bot nickname updated successfully!',
          reset: 'Bot nickname reset to default.',
          error: 'Failed to update bot nickname. Please check my permissions.',
          current: 'Current nickname',
          new: 'New nickname',
          default: 'Default (Stoffel Bot)'
        },
        pt: {
          success: 'Apelido do bot atualizado com sucesso!',
          reset: 'Apelido do bot redefinido para padrão.',
          error: 'Falha ao atualizar apelido do bot. Verifique minhas permissões.',
          current: 'Apelido atual',
          new: 'Novo apelido', 
          default: 'Padrão (Stoffel Bot)'
        }
      };
      
      const msg = messages[serverLang] || messages.en;
      
      // Get current bot member
      const botMember = interaction.guild.members.me;
      const currentNickname = botMember.nickname;
      
      // Update nickname
      await botMember.setNickname(nickname || null);
      
      // Save customization to database
      await this.saveCustomization(interaction.guild.id, {
        nickname: nickname || null,
        setBy: interaction.user.id,
        setByName: interaction.user.username,
        setAt: new Date().toISOString()
      });
      
      const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🎭 Bot Customization Updated')
        .addFields({
          name: msg.current,
          value: currentNickname || msg.default,
          inline: true
        })
        .addFields({
          name: msg.new,
          value: nickname || msg.default,
          inline: true
        })
        .setFooter({ text: nickname ? msg.success : msg.reset })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error setting nickname:', error);
      const serverLang = await this.getServerLanguage(interaction.guild.id);
      const msg = (serverLang === 'pt') 
        ? 'Falha ao atualizar apelido do bot. Verifique minhas permissões.'
        : 'Failed to update bot nickname. Please check my permissions.';
      
      await interaction.reply({ 
        content: `❌ ${msg}`,
        ephemeral: true 
      });
    }
  },


  async handleStatus(interaction) {
    try {
      const serverLang = await this.getServerLanguage(interaction.guild.id);
      const customization = await this.getCustomization(interaction.guild.id);
      const botMember = interaction.guild.members.me;
      
      const messages = {
        en: {
          title: '🎭 Current Bot Customization',
          nickname: 'Nickname',
          default: 'Default',
          setBy: 'Last changed by',
          setAt: 'Changed at',
          noCustomization: 'No customizations set'
        },
        pt: {
          title: '🎭 Personalização Atual do Bot',
          nickname: 'Apelido',
          default: 'Padrão',
          setBy: 'Última alteração por',
          setAt: 'Alterado em',
          noCustomization: 'Nenhuma personalização definida'
        }
      };
      
      const msg = messages[serverLang] || messages.en;
      
      const embed = new EmbedBuilder()
        .setColor('#2196F3')
        .setTitle(msg.title)
        .addFields({
          name: msg.nickname,
          value: botMember.nickname || msg.default,
          inline: false
        });
      
      if (customization?.setAt) {
        embed.addFields({
          name: msg.setBy,
          value: `<@${customization.setBy}>`,
          inline: true
        })
        .addFields({
          name: msg.setAt,
          value: new Date(customization.setAt).toLocaleString(),
          inline: true
        });
      }
      
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error getting status:', error);
      await interaction.reply({ 
        content: '❌ Failed to get customization status.',
        ephemeral: true 
      });
    }
  },

  async handleReset(interaction) {
    try {
      const serverLang = await this.getServerLanguage(interaction.guild.id);
      
      const messages = {
        en: {
          success: 'Bot nickname has been reset to default!',
          error: 'Failed to reset nickname.'
        },
        pt: {
          success: 'Apelido do bot foi redefinido para o padrão!',
          error: 'Falha ao redefinir apelido.'
        }
      };
      
      const msg = messages[serverLang] || messages.en;
      
      // Reset nickname
      const botMember = interaction.guild.members.me;
      await botMember.setNickname(null);
      
      // Clear customization data
      await this.clearCustomization(interaction.guild.id);
      
      const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🔄 Bot Nickname Reset')
        .setDescription(msg.success)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error resetting customizations:', error);
      const serverLang = await this.getServerLanguage(interaction.guild.id);
      const msg = (serverLang === 'pt') 
        ? 'Falha ao redefinir personalizações.'
        : 'Failed to reset customizations.';
      
      await interaction.reply({ 
        content: `❌ ${msg}`,
        ephemeral: true 
      });
    }
  },

  // Helper functions
  async getServerLanguage(guildId) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const configPath = path.join(__dirname, '../../data/server-languages.json');
      
      const data = await fs.readFile(configPath, 'utf8');
      const languages = JSON.parse(data);
      const config = languages[guildId];
      
      return config ? config.language : 'en';
    } catch {
      return 'en';
    }
  },

  async saveCustomization(guildId, data) {
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, '../../data/bot-customizations.json');
    
    // Ensure data directory exists
    const dataDir = path.dirname(configPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    
    let customizations = {};
    try {
      const existing = await fs.readFile(configPath, 'utf8');
      customizations = JSON.parse(existing);
    } catch {
      // File doesn't exist, start with empty config
    }
    
    if (!customizations[guildId]) {
      customizations[guildId] = {};
    }
    
    // Merge with existing data
    customizations[guildId] = {
      ...customizations[guildId],
      ...data
    };
    
    await fs.writeFile(configPath, JSON.stringify(customizations, null, 2));
  },

  async getCustomization(guildId) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const configPath = path.join(__dirname, '../../data/bot-customizations.json');
      
      const data = await fs.readFile(configPath, 'utf8');
      const customizations = JSON.parse(data);
      
      return customizations[guildId] || null;
    } catch {
      return null;
    }
  },

  async clearCustomization(guildId) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const configPath = path.join(__dirname, '../../data/bot-customizations.json');
      
      let customizations = {};
      try {
        const data = await fs.readFile(configPath, 'utf8');
        customizations = JSON.parse(data);
      } catch {
        return; // No file to clear
      }
      
      delete customizations[guildId];
      
      await fs.writeFile(configPath, JSON.stringify(customizations, null, 2));
    } catch (error) {
      console.error('Error clearing customization:', error);
    }
  }
};