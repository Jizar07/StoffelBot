const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('language')
    .setDescription('Configure bot language for this server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set bot language for this server')
        .addStringOption(option =>
          option.setName('lang')
            .setDescription('Language to use')
            .setRequired(true)
            .addChoices(
              { name: 'English', value: 'en' },
              { name: 'Português (Brasil)', value: 'pt' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('get')
        .setDescription('Show current bot language for this server'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'set':
        await this.handleSet(interaction);
        break;
      case 'get':
        await this.handleGet(interaction);
        break;
    }
  },

  async handleSet(interaction) {
    const language = interaction.options.getString('lang');
    
    try {
      // Save language configuration
      const fs = require('fs').promises;
      const path = require('path');
      const configPath = path.join(__dirname, '../../data/server-languages.json');
      
      // Ensure data directory exists
      const dataDir = path.dirname(configPath);
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }
      
      let languages = {};
      try {
        const data = await fs.readFile(configPath, 'utf8');
        languages = JSON.parse(data);
      } catch {
        // File doesn't exist, start with empty config
      }
      
      languages[interaction.guild.id] = {
        language: language,
        setBy: interaction.user.id,
        setAt: new Date().toISOString(),
        serverName: interaction.guild.name
      };
      
      await fs.writeFile(configPath, JSON.stringify(languages, null, 2));
      
      const messages = {
        en: {
          title: '🌐 Language Updated',
          description: 'Bot language has been set to **English** for this server.',
          footer: 'All bot responses will now be in English'
        },
        pt: {
          title: '🌐 Idioma Atualizado',
          description: 'O idioma do bot foi definido para **Português (Brasil)** neste servidor.',
          footer: 'Todas as respostas do bot agora serão em português'
        }
      };
      
      const msg = messages[language];
      
      const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle(msg.title)
        .setDescription(msg.description)
        .addFields({
          name: language === 'en' ? 'Changed by' : 'Alterado por',
          value: `${interaction.user}`,
          inline: true
        })
        .setFooter({ text: msg.footer })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error setting language:', error);
      await interaction.reply({ 
        content: '❌ Failed to set language. Please try again.',
        ephemeral: true 
      });
    }
  },

  async handleGet(interaction) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const configPath = path.join(__dirname, '../../data/server-languages.json');
      
      let language = 'en'; // Default to English
      let config = null;
      
      try {
        const data = await fs.readFile(configPath, 'utf8');
        const languages = JSON.parse(data);
        config = languages[interaction.guild.id];
        if (config) {
          language = config.language;
        }
      } catch {
        // No config found, use default
      }
      
      const messages = {
        en: {
          title: '🌐 Current Language Settings',
          current: 'Current Language',
          default: 'Default (English)',
          setBy: 'Set by',
          setAt: 'Set at',
          howToChange: 'How to Change',
          changeInstructions: 'Use `/language set` to change the bot language for this server.'
        },
        pt: {
          title: '🌐 Configurações de Idioma Atuais',
          current: 'Idioma Atual',
          default: 'Padrão (Inglês)',
          setBy: 'Definido por',
          setAt: 'Definido em',
          howToChange: 'Como Alterar',
          changeInstructions: 'Use `/language set` para alterar o idioma do bot neste servidor.'
        }
      };
      
      const msg = messages[language];
      
      const languageNames = {
        en: 'English',
        pt: 'Português (Brasil)'
      };
      
      const embed = new EmbedBuilder()
        .setColor('#2196F3')
        .setTitle(msg.title)
        .addFields({
          name: msg.current,
          value: `🇺🇸 ${languageNames[language]}${!config ? ` (${msg.default})` : ''}`,
          inline: true
        });
      
      if (config) {
        embed.addFields(
          {
            name: msg.setBy,
            value: `<@${config.setBy}>`,
            inline: true
          },
          {
            name: msg.setAt,
            value: new Date(config.setAt).toLocaleString(),
            inline: true
          }
        );
      }
      
      embed.addFields({
        name: msg.howToChange,
        value: msg.changeInstructions,
        inline: false
      });
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error getting language:', error);
      await interaction.reply({ 
        content: '❌ Failed to get language settings. Please try again.',
        ephemeral: true 
      });
    }
  },

  // Helper function to get server language
  async getServerLanguage(guildId) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const configPath = path.join(__dirname, '../../data/server-languages.json');
      
      const data = await fs.readFile(configPath, 'utf8');
      const languages = JSON.parse(data);
      const config = languages[guildId];
      
      return config ? config.language : 'en'; // Default to English
    } catch {
      return 'en'; // Default to English if no config
    }
  }
};