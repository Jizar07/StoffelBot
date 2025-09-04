const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure automatic moderation for spam and fake links')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable automatic moderation')
        .addChannelOption(option =>
          option.setName('log_channel')
            .setDescription('Channel to log moderation actions')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable automatic moderation'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('View current moderation configuration'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('test')
        .setDescription('Test spam detection on a message')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Message to test')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'enable':
        await this.handleEnable(interaction);
        break;
      case 'disable':
        await this.handleDisable(interaction);
        break;
      case 'config':
        await this.handleConfig(interaction);
        break;
      case 'test':
        await this.handleTest(interaction);
        break;
    }
  },

  async handleEnable(interaction) {
    const logChannel = interaction.options.getChannel('log_channel');
    
    // Store configuration (in a real implementation, use a database)
    const config = {
      enabled: true,
      guildId: interaction.guild.id,
      logChannelId: logChannel?.id || null,
      enabledAt: new Date().toISOString(),
      enabledBy: interaction.user.id
    };

    // Save to file system for now
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, '../../data/automod-configs.json');
    
    try {
      let configs = {};
      try {
        const data = await fs.readFile(configPath, 'utf8');
        configs = JSON.parse(data);
      } catch {
        // File doesn't exist, start with empty config
      }
      
      configs[interaction.guild.id] = config;
      await fs.writeFile(configPath, JSON.stringify(configs, null, 2));
      
      const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('✅ AutoMod Enabled')
        .setDescription('Automatic moderation has been enabled for this server.')
        .addFields(
          {
            name: '🛡️ Protection Against',
            value: '• Spam messages\n• Fake Discord boost links\n• Phishing attempts\n• Repeated content\n• Suspicious URLs',
            inline: true
          },
          {
            name: '⚡ Actions Taken',
            value: '• Delete spam messages\n• Timeout offenders\n• Log to mod channel\n• Warn repeat offenders',
            inline: true
          }
        );
      
      if (logChannel) {
        embed.addFields({
          name: '📋 Log Channel',
          value: `<#${logChannel.id}>`,
          inline: false
        });
      }
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error enabling automod:', error);
      await interaction.reply({ content: '❌ Failed to enable automod. Please try again.', ephemeral: true });
    }
  },

  async handleDisable(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, '../../data/automod-configs.json');
    
    try {
      let configs = {};
      try {
        const data = await fs.readFile(configPath, 'utf8');
        configs = JSON.parse(data);
      } catch {
        return interaction.reply({ content: '❌ AutoMod is not currently enabled.', ephemeral: true });
      }
      
      if (!configs[interaction.guild.id]) {
        return interaction.reply({ content: '❌ AutoMod is not currently enabled.', ephemeral: true });
      }
      
      delete configs[interaction.guild.id];
      await fs.writeFile(configPath, JSON.stringify(configs, null, 2));
      
      const embed = new EmbedBuilder()
        .setColor('#F44336')
        .setTitle('🚫 AutoMod Disabled')
        .setDescription('Automatic moderation has been disabled for this server.')
        .setFooter({ text: 'Use /automod enable to re-enable protection' });
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error disabling automod:', error);
      await interaction.reply({ content: '❌ Failed to disable automod. Please try again.', ephemeral: true });
    }
  },

  async handleConfig(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, '../../data/automod-configs.json');
    
    try {
      const data = await fs.readFile(configPath, 'utf8');
      const configs = JSON.parse(data);
      const config = configs[interaction.guild.id];
      
      if (!config || !config.enabled) {
        return interaction.reply({ content: '❌ AutoMod is not currently enabled. Use `/automod enable` to set it up.', ephemeral: true });
      }
      
      const embed = new EmbedBuilder()
        .setColor('#2196F3')
        .setTitle('⚙️ AutoMod Configuration')
        .addFields(
          {
            name: '📊 Status',
            value: config.enabled ? '✅ Enabled' : '❌ Disabled',
            inline: true
          },
          {
            name: '📋 Log Channel',
            value: config.logChannelId ? `<#${config.logChannelId}>` : 'Not set',
            inline: true
          },
          {
            name: '👤 Enabled By',
            value: `<@${config.enabledBy}>`,
            inline: true
          },
          {
            name: '⏰ Enabled At',
            value: new Date(config.enabledAt).toLocaleString(),
            inline: false
          },
          {
            name: '🛡️ Detection Patterns',
            value: '• Free Discord Nitro/Boost scams\n• Fake gift links\n• Phishing URLs\n• Spam patterns\n• Mass mentions',
            inline: false
          }
        );
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } catch (error) {
      await interaction.reply({ content: '❌ AutoMod is not currently enabled. Use `/automod enable` to set it up.', ephemeral: true });
    }
  },

  async handleTest(interaction) {
    const message = interaction.options.getString('message');
    const result = this.detectSpam(message);
    
    const embed = new EmbedBuilder()
      .setColor(result.isSpam ? '#F44336' : '#4CAF50')
      .setTitle('🧪 Spam Detection Test')
      .addFields(
        {
          name: '📝 Test Message',
          value: `\`\`\`${message}\`\`\``,
          inline: false
        },
        {
          name: '🔍 Detection Result',
          value: result.isSpam ? '❌ **SPAM DETECTED**' : '✅ **CLEAN MESSAGE**',
          inline: true
        },
        {
          name: '📊 Confidence',
          value: `${Math.round(result.confidence * 100)}%`,
          inline: true
        }
      );
    
    if (result.isSpam && result.reasons.length > 0) {
      embed.addFields({
        name: '⚠️ Detected Issues',
        value: result.reasons.map(reason => `• ${reason}`).join('\n'),
        inline: false
      });
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  // Spam detection logic (matches bot.js implementation)
  detectSpam(content) {
    const text = content.toLowerCase();
    let spamScore = 0;
    const reasons = [];
    
    // Profanity detection
    const profanityDetected = this.detectProfanity(content);
    if (profanityDetected.found) {
      spamScore += 0.8;
      reasons.push(`Profanity detected: ${profanityDetected.language} (${profanityDetected.count} word${profanityDetected.count > 1 ? 's' : ''})`);
    }
    
    // Fake Discord boost/nitro patterns
    const boostPatterns = [
      /free\s*discord\s*nitro/i,
      /free\s*discord\s*boost/i,
      /discord\s*gift/i,
      /nitro\s*gift/i,
      /free\s*nitro/i,
      /claim\s*your\s*nitro/i,
      /discord\s*nitro\s*generator/i,
      /get\s*free\s*discord/i
    ];
    
    for (const pattern of boostPatterns) {
      if (pattern.test(text)) {
        spamScore += 0.8;
        reasons.push('Fake Discord Nitro/Boost offer detected');
        break;
      }
    }
    
    // Suspicious URLs
    const suspiciousUrls = [
      /discord\.gift/i,
      /discord-nitro/i,
      /discrod/i,
      /discordapp\-gift/i,
      /steam-nitro/i,
      /disocrd/i
    ];
    
    for (const pattern of suspiciousUrls) {
      if (pattern.test(text)) {
        spamScore += 0.7;
        reasons.push('Suspicious URL detected');
        break;
      }
    }
    
    // Mass mentions
    const mentions = (content.match(/<@[!&]?\d+>/g) || []).length;
    if (mentions > 5) {
      spamScore += 0.5;
      reasons.push(`Mass mentions detected (${mentions})`);
    }
    
    // Excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7 && content.length > 10) {
      spamScore += 0.3;
      reasons.push('Excessive capital letters');
    }
    
    // Repeated characters
    if (/(.)\1{10,}/.test(content)) {
      spamScore += 0.4;
      reasons.push('Excessive repeated characters');
    }
    
    // Common spam phrases
    const spamPhrases = [
      /click\s*here\s*now/i,
      /limited\s*time\s*offer/i,
      /act\s*fast/i,
      /100%\s*free/i,
      /no\s*survey/i,
      /download\s*now/i,
      /congratulations.*winner/i
    ];
    
    for (const phrase of spamPhrases) {
      if (phrase.test(text)) {
        spamScore += 0.3;
        reasons.push('Common spam phrase detected');
        break;
      }
    }
    
    return {
      isSpam: spamScore >= 0.6,
      confidence: Math.min(spamScore, 1.0),
      reasons: reasons
    };
  },

  // Profanity detection function
  detectProfanity(content) {
    const englishProfanity = [
      'damn', 'hell', 'shit', 'fuck', 'bitch', 'ass', 'asshole', 'bastard', 
      'crap', 'piss', 'whore', 'slut', 'retard', 'idiot', 'moron', 'stupid',
      'dumb', 'loser', 'gay', 'fag', 'nigga', 'negro', 'chink', 'spic'
    ];

    const portugueseProfanity = [
      'merda', 'porra', 'caralho', 'foda', 'puta', 'vadia', 'vagabunda',
      'cacete', 'droga', 'inferno', 'diabo', 'burro', 'idiota', 'imbecil',
      'otário', 'babaca', 'cuzão', 'fdp', 'filho da puta', 'vai se foder',
      'cu', 'buceta', 'piroca', 'rola', 'pau', 'viado', 'bicha', 'sapatão',
      'preto', 'nego', 'crioulo'
    ];

    const text = content.toLowerCase();
    let foundWords = [];
    let languages = [];
    
    // Check English profanity
    for (const word of englishProfanity) {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(text)) {
        foundWords.push(word);
        if (!languages.includes('English')) languages.push('English');
      }
    }
    
    // Check Portuguese profanity
    for (const word of portugueseProfanity) {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(text)) {
        foundWords.push(word);
        if (!languages.includes('Portuguese')) languages.push('Portuguese');
      }
    }
    
    return {
      found: foundWords.length > 0,
      count: foundWords.length,
      words: foundWords,
      language: languages.join(' & ')
    };
  }
};