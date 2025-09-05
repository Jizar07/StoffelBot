const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Player } = require('discord-player');
const { CommandManager } = require('./commands');
const ModerationService = require('./services/moderation-service');
const StatisticsService = require('./services/statistics-service');
const { handleRegistrationButton, handleRegistrationModalSubmit } = require('./handlers/registration-handler');
const { 
  handleRegistrationStart,
  handleInfoSubmit,
  handleFunctionSelection,
  handleInviterSelection
} = require('./handlers/registrationWizard');
const { registerCommandsForSubscribedServers } = require('./models/user-server');
const { initializeSandboxData } = require('./sandbox-init');
const RegistrationService = require('./services/RegistrationService');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

// Initialize command manager
client.commandManager = new CommandManager();

// Initialize moderation service
client.moderationService = new ModerationService();

// Initialize statistics service
client.statisticsService = new StatisticsService();

// Initialize Discord Player
const player = Player.singleton(client);

// Load default extractors (YouTube, Spotify, etc.)
player.extractors.loadDefault((ext) => ext !== 'YoutubeiExtractor');

// Music button handler
async function handleMusicButton(interaction) {
    const { createControlButtons, createNowPlayingEmbed, createQueueEmbed } = require('./commands/list/music');
    
    if (!interaction.member.voice.channel) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription('❌ You need to be in a voice channel to use music controls!')
            ],
            ephemeral: true
        });
    }

    const queue = player.nodes.get(interaction.guildId);
    
    if (!queue && !['music_queue'].includes(interaction.customId)) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription('❌ No music is currently playing!')
            ],
            ephemeral: true
        });
    }

    try {
        switch (interaction.customId) {
            case 'music_pause':
                if (!queue.isPlaying()) {
                    return interaction.reply({ content: '❌ Music is not playing!', ephemeral: true });
                }
                queue.node.pause();
                const pauseEmbed = new EmbedBuilder()
                    .setColor('#FFFF00')
                    .setTitle('⏸️ Music Paused')
                    .setDescription(`**[${queue.currentTrack.title}](${queue.currentTrack.url})**\n*Paused by ${interaction.user}*`)
                    .setThumbnail(queue.currentTrack.thumbnail);
                const pauseButtons = createControlButtons(true, true, queue.tracks.toArray().length > 0);
                return interaction.update({ embeds: [pauseEmbed], components: pauseButtons });

            case 'music_resume':
                if (queue.node.isPlaying()) {
                    return interaction.reply({ content: '❌ Music is not paused!', ephemeral: true });
                }
                queue.node.resume();
                const resumeEmbed = createNowPlayingEmbed(queue, queue.currentTrack);
                const resumeButtons = createControlButtons(true, false, queue.tracks.toArray().length > 0);
                return interaction.update({ embeds: [resumeEmbed], components: resumeButtons });

            case 'music_skip':
                if (!queue.isPlaying()) {
                    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
                }
                const skippedTrack = queue.currentTrack;
                queue.node.skip();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setDescription(`⏭️ Skipped: **${skippedTrack.title}**`)
                    ]
                });

            case 'music_stop':
                if (!queue) {
                    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
                }
                queue.delete();
                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('⏹️ Music Stopped')
                            .setDescription('Queue cleared and disconnected from voice channel.')
                    ],
                    components: []
                });

            case 'music_volume_up':
                const currentVolumeUp = queue.node.volume;
                const newVolumeUp = Math.min(currentVolumeUp + 10, 100);
                queue.node.setVolume(newVolumeUp);
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setDescription(`🔊 Volume: ${currentVolumeUp}% → ${newVolumeUp}%`)
                    ],
                    ephemeral: true
                });

            case 'music_volume_down':
                const currentVolumeDown = queue.node.volume;
                const newVolumeDown = Math.max(currentVolumeDown - 10, 0);
                queue.node.setVolume(newVolumeDown);
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setDescription(`🔉 Volume: ${currentVolumeDown}% → ${newVolumeDown}%`)
                    ],
                    ephemeral: true
                });

            case 'music_shuffle':
                if (!queue || queue.tracks.toArray().length === 0) {
                    return interaction.reply({ content: '❌ No songs in queue to shuffle!', ephemeral: true });
                }
                queue.tracks.shuffle();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setDescription(`🔀 Queue shuffled! (${queue.tracks.toArray().length} songs)`)
                    ],
                    ephemeral: true
                });

            case 'music_loop':
                const modes = ['Off', 'Track', 'Queue'];
                const currentMode = queue.repeatMode;
                const nextMode = (currentMode + 1) % 3;
                queue.setRepeatMode(nextMode);
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setDescription(`🔁 Loop mode: ${modes[currentMode]} → ${modes[nextMode]}`)
                    ],
                    ephemeral: true
                });

            case 'music_queue':
                if (!queue || !queue.currentTrack) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription('❌ No music is currently playing!')
                        ],
                        ephemeral: true
                    });
                }
                const queueEmbed = createQueueEmbed(queue);
                const queueButtons = createControlButtons(queue.isPlaying(), queue.node.isPaused(), queue.tracks.toArray().length > 0);
                return interaction.update({ embeds: [queueEmbed], components: queueButtons });

            case 'music_nowplaying':
                if (!queue || !queue.isPlaying()) {
                    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
                }
                const nowPlayingEmbed = createNowPlayingEmbed(queue, queue.currentTrack);
                const nowPlayingButtons = createControlButtons(queue.isPlaying(), queue.node.isPaused(), queue.tracks.toArray().length > 0);
                return interaction.update({ embeds: [nowPlayingEmbed], components: nowPlayingButtons });

            default:
                return interaction.reply({ content: '❌ Unknown button!', ephemeral: true });
        }
    } catch (error) {
        console.error('Music button error:', error);
        return interaction.reply({ content: '❌ An error occurred!', ephemeral: true });
    }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`🏠 Bot is in ${client.guilds.cache.size} servers`);
  
  // Initialize sandbox data if in sandbox mode
  if (process.env.SANDBOX_MODE === 'true') {
    console.log('🧪 Running in SANDBOX mode');
    console.log('✅ Any authenticated user can activate test subscriptions');
    console.log('💡 Use the "Simulate Subscription" button on the payment page to test');
    
    // Clear ALL commands (global and guild) to avoid duplicates in sandbox mode
    await client.commandManager.clearGlobalCommands(client);
    
    // Clear guild commands for all guilds
    for (const guild of client.guilds.cache.values()) {
      await client.commandManager.clearAllGuildCommands(client, guild.id);
    }
    
    // Wait a moment for Discord to process the clearing
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Initialize registration service with Discord client
  RegistrationService.setClient(client);
  
  // Register slash commands (global in sandbox mode, per-server otherwise)
  await registerCommandsForSubscribedServers(client, client.commandManager);
  
  console.log('✅ Bot ready and commands registered!');
});

// Handle interactions (slash commands, buttons, modals)
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    await client.commandManager.executeCommand(interaction);
  } 
  // Handle new registration wizard interactions
  else if (interaction.isButton()) {
    if (interaction.customId === 'register_start') {
      await handleRegistrationStart(interaction);
    } else if (interaction.customId.startsWith('registration_')) {
      await handleRegistrationButton(interaction);
    } else if (interaction.customId.startsWith('music_')) {
      await handleMusicButton(interaction);
    }
  } 
  else if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('register_info_')) {
      await handleInfoSubmit(interaction);
    } else if (interaction.customId.startsWith('registration_modal_')) {
      await handleRegistrationModalSubmit(interaction);
    }
  }
  else if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('register_function_')) {
      await handleFunctionSelection(interaction);
    }
  }
  else if (interaction.isUserSelectMenu()) {
    if (interaction.customId.startsWith('register_inviter_')) {
      await handleInviterSelection(interaction);
    }
  }
});

// Handle bot joining a server
client.on('guildCreate', async (guild) => {
  console.log(`🎉 Bot joined new server: ${guild.name} (${guild.id})`);
  console.log(`   Owner: ${guild.ownerId}, Members: ${guild.memberCount}`);
  
  // Send welcome message to server owner explaining subscription requirement
  try {
    const owner = await guild.fetchOwner();
    const welcomeMessage = `
🎉 **Welcome to Stoffel Bot!**

Your server **${guild.name}** has been added to our system.

**Next Steps:**
1. Visit our dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3141'}
2. Sign in with Discord
3. Subscribe to activate bot features
4. Verify ownership of your server

The bot's slash commands will become available once you have an active subscription.

Need help? Contact support or visit our documentation.
    `.trim();
    
    await owner.send(welcomeMessage);
    console.log(`📧 Sent welcome message to server owner`);
  } catch (error) {
    console.error('Could not send welcome message to server owner:', error);
  }
});

// Handle bot leaving a server
client.on('guildDelete', async (guild) => {
  console.log(`👋 Bot left server: ${guild.name} (${guild.id})`);
  // Note: We don't remove the user-server relationship in case they re-invite
});

// Import anti-spam and logging functionality
const { checkMessage: checkAntiSpam } = require('./commands/list/antispam');
const { 
  handleMessageCreate: logMessageCreate,
  handleMessageDelete: logMessageDelete, 
  handleMessageUpdate: logMessageUpdate,
  handleMessageBulkDelete: logMessageBulkDelete 
} = require('./commands/list/logging');

// Comprehensive auto-moderation system
client.on('messageCreate', async message => {
  // Message logging (for all messages, including bots)
  try {
    await logMessageCreate(message);
  } catch (error) {
    console.error('Message logging error:', error);
  }
  
  if (message.author.bot) return;
  if (!message.guild) return;
  
  // Anti-spam check (runs after logging)
  try {
    await checkAntiSpam(message);
  } catch (error) {
    console.error('Anti-spam check error:', error);
  }
  
  // Check if automod is enabled for this guild
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/automod-configs.json');
    
    let config = null;
    try {
      const data = await fs.readFile(configPath, 'utf8');
      const configs = JSON.parse(data);
      config = configs[message.guild.id];
      console.log(`[AUTOMOD DEBUG] Config for ${message.guild.name}: `, config);
    } catch (error) {
      console.log(`[AUTOMOD DEBUG] No config file found:`, error.message);
    }
    
    if (!config || !config.enabled) {
      console.log(`[AUTOMOD DEBUG] AutoMod disabled for ${message.guild.name}. Config enabled: ${config?.enabled}`);
      // Legacy ping command
      if (message.content === '!ping') {
        message.reply('Pong! (Try using `/ping` for the new slash command version)');
      }
      return;
    }
    
    console.log(`[AUTOMOD DEBUG] Processing message: "${message.content}" from ${message.author.tag}`);
    
    // Use comprehensive moderation service
    const attachments = message.attachments.map(att => ({
      name: att.name,
      url: att.url,
      size: att.size
    }));
    
    const analysis = await client.moderationService.analyzeMessage(message.content, attachments, config);
    console.log(`[AUTOMOD DEBUG] Analysis result:`, analysis);
    
    if (analysis.isViolation) {
      console.log(`[AUTOMOD] Violations detected in ${message.guild.name}: ${analysis.violations.join(', ')}`);
      
      try {
        // Delete the message
        await message.delete();
        
        // Record moderation statistics
        try {
          await client.statisticsService.recordMessageAction(
            message.guild.id,
            message.author.id,
            message.channel.id,
            analysis.violations,
            analysis.actions.map(a => a.type),
            analysis.confidence
          );
        } catch (statsError) {
          console.error('Failed to record moderation statistics:', statsError);
        }
        
        // Get server language
        const serverLang = await getServerLanguage(message.guild.id);
        
        const warningMessages = {
          en: `⚠️ **${message.author}**, your message was automatically deleted for violating server policies. You have been timed out for 5 minutes.`,
          pt: `⚠️ **${message.author}**, sua mensagem foi automaticamente removida por violar as políticas do servidor. Você foi silenciado por 5 minutos.`
        };
        
        // Send warning message to channel (will auto-delete after 10 seconds)
        const warningMessage = await message.channel.send({
          content: warningMessages[serverLang] || warningMessages.en
        });
        
        // Auto-delete the warning after 10 seconds
        setTimeout(async () => {
          try {
            await warningMessage.delete();
          } catch (error) {
            // Warning message might already be deleted, ignore error
          }
        }, 10000);
        
        // Execute moderation actions
        for (const action of analysis.actions) {
          try {
            switch (action.type) {
              case 'timeout':
                if (message.member && message.guild.members.me.permissions.has('ModerateMembers')) {
                  await message.member.timeout(action.duration, `Automatic moderation: ${analysis.violations.join(', ')}`);
                }
                break;
              case 'warn':
                // Add to warning system if implemented
                break;
              case 'kick':
                if (message.member && message.guild.members.me.permissions.has('KickMembers')) {
                  await message.member.kick(`Automatic moderation: ${analysis.violations.join(', ')}`);
                }
                break;
              case 'ban':
                if (message.member && message.guild.members.me.permissions.has('BanMembers')) {
                  await message.member.ban({ 
                    reason: `Automatic moderation: ${analysis.violations.join(', ')}`,
                    deleteMessageDays: 1 
                  });
                }
                break;
            }
          } catch (error) {
            console.error(`Failed to execute action ${action.type}:`, error);
          }
        }
        
        // Log to moderation channel if configured
        if (config.logChannelId) {
          const logChannel = message.guild.channels.cache.get(config.logChannelId);
          if (logChannel) {
            const { EmbedBuilder } = require('discord.js');
            
            // Create color based on severity
            const severityColors = {
              low: '#FFA500',    // Orange
              medium: '#F44336', // Red  
              high: '#9C27B0',   // Purple
              critical: '#000000' // Black
            };
            
            const severity = analysis.confidence >= 0.8 ? 'critical' : 
                           analysis.confidence >= 0.6 ? 'high' :
                           analysis.confidence >= 0.4 ? 'medium' : 'low';
            
            const logEmbed = new EmbedBuilder()
              .setColor(severityColors[severity])
              .setTitle('🛡️ Advanced AutoMod Action')
              .setDescription(`**${analysis.violations.join(', ')} detected and handled**`)
              .addFields(
                {
                  name: '👤 User',
                  value: `${message.author} (${message.author.tag})`,
                  inline: true
                },
                {
                  name: '📍 Channel',
                  value: `${message.channel}`,
                  inline: true
                },
                {
                  name: '📊 Confidence',
                  value: `${Math.round(analysis.confidence * 100)}% (${severity.toUpperCase()})`,
                  inline: true
                },
                {
                  name: '📝 Message Content',
                  value: `\`\`\`${message.content.substring(0, 500)}\`\`\``,
                  inline: false
                },
                {
                  name: '⚠️ Violations Detected',
                  value: analysis.violations.map(v => `• ${v}`).join('\n'),
                  inline: false
                },
                {
                  name: '⚡ Actions Taken',
                  value: analysis.actions.map(a => `• ${a.type}${a.duration ? ` (${a.duration/1000/60} min)` : ''}`).join('\n') || '• Message deleted',
                  inline: false
                }
              )
              .setTimestamp()
              .setFooter({ text: `User ID: ${message.author.id} | Severity: ${severity.toUpperCase()}` });
            
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
        
        // Send detailed warning to user via DM
        try {
          const { EmbedBuilder } = require('discord.js');
          
          const dmMessages = {
            en: {
              title: '⚠️ Advanced Moderation Warning',
              description: `Your message in **${message.guild.name}** was automatically removed for violating server policies.`,
              detectedIssues: '📋 Policy Violations',
              actions: '⚡ Actions Taken',
              appeal: '💡 Appeal Process',
              appealValue: 'If you believe this was a mistake, please contact the server moderators with your User ID.',
              footer: 'Please follow server rules and Discord Terms of Service'
            },
            pt: {
              title: '⚠️ Aviso de Moderação Avançada',
              description: `Sua mensagem em **${message.guild.name}** foi automaticamente removida por violar as políticas do servidor.`,
              detectedIssues: '📋 Violações de Política',
              actions: '⚡ Ações Tomadas',
              appeal: '💡 Processo de Recurso',
              appealValue: 'Se você acredita que foi um erro, entre em contato com os moderadores do servidor com seu ID de usuário.',
              footer: 'Por favor, siga as regras do servidor e os Termos de Serviço do Discord'
            }
          };
          
          const msg = dmMessages[serverLang] || dmMessages.en;
          
          const warningEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(msg.title)
            .setDescription(msg.description)
            .addFields(
              {
                name: msg.detectedIssues,
                value: analysis.violations.map(v => `• ${v}`).join('\n'),
                inline: false
              },
              {
                name: msg.actions,
                value: analysis.actions.map(a => `• ${a.type}${a.duration ? ` (${a.duration/1000/60} minutes)` : ''}`).join('\n') || '• Message deleted',
                inline: false
              },
              {
                name: msg.appeal,
                value: msg.appealValue,
                inline: false
              }
            )
            .setFooter({ text: `${msg.footer} | User ID: ${message.author.id}` });
          
          await message.author.send({ embeds: [warningEmbed] });
        } catch {
          // User has DMs disabled, skip warning
        }
        
      } catch (error) {
        console.error('Error handling moderation violation:', error);
      }
    }
    
  } catch (error) {
    console.error('Error in comprehensive automod:', error);
  }
  
  // Legacy ping command
  if (message.content === '!ping') {
    message.reply('Pong! (Try using `/ping` for the new slash command version)');
  }
});

// Raid protection system for guild member joins
client.on('guildMemberAdd', async member => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/automod-configs.json');
    
    let config = null;
    try {
      const data = await fs.readFile(configPath, 'utf8');
      const configs = JSON.parse(data);
      config = configs[member.guild.id];
    } catch (error) {
      console.log(`[RAID PROTECTION] No config found for ${member.guild.name}`);
      return;
    }
    
    if (!config || !config.enabled) {
      return;
    }
    
    console.log(`[RAID PROTECTION] New member joined ${member.guild.name}: ${member.user.tag}`);
    
    // Analyze for potential raid activity
    const raidAnalysis = await client.moderationService.analyzeRaidPattern(member.guild.id, member.user);
    
    if (raidAnalysis.isRaid) {
      console.log(`[RAID PROTECTION] Raid detected in ${member.guild.name}! Confidence: ${Math.round(raidAnalysis.confidence * 100)}%`);
      
      // Record raid protection statistics
      try {
        await client.statisticsService.recordRaidAction(
          member.guild.id,
          member.user.id,
          raidAnalysis.reasons,
          raidAnalysis.actions.map(a => a.type)
        );
      } catch (statsError) {
        console.error('Failed to record raid protection statistics:', statsError);
      }
      
      try {
        // Execute raid protection actions
        for (const action of raidAnalysis.actions) {
          switch (action.type) {
            case 'ban':
              if (member.guild.members.me.permissions.has('BanMembers')) {
                await member.ban({ 
                  reason: `Automatic raid protection: ${raidAnalysis.reasons.join(', ')}`,
                  deleteMessageDays: 1 
                });
                console.log(`[RAID PROTECTION] Banned ${member.user.tag} for raid activity`);
              }
              break;
            case 'kick':
              if (member.guild.members.me.permissions.has('KickMembers')) {
                await member.kick(`Automatic raid protection: ${raidAnalysis.reasons.join(', ')}`);
                console.log(`[RAID PROTECTION] Kicked ${member.user.tag} for raid activity`);
              }
              break;
            case 'lockdown':
              // Implement server lockdown if needed
              console.log(`[RAID PROTECTION] Server lockdown recommended for ${member.guild.name}`);
              break;
          }
        }
        
        // Log to moderation channel if configured
        if (config.logChannelId) {
          const logChannel = member.guild.channels.cache.get(config.logChannelId);
          if (logChannel) {
            const { EmbedBuilder } = require('discord.js');
            
            const logEmbed = new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('🚨 Raid Protection Activated')
              .setDescription('**Potential raid activity detected and handled**')
              .addFields(
                {
                  name: '👤 User',
                  value: `${member.user} (${member.user.tag})`,
                  inline: true
                },
                {
                  name: '📊 Confidence',
                  value: `${Math.round(raidAnalysis.confidence * 100)}%`,
                  inline: true
                },
                {
                  name: '⏰ Account Age',
                  value: `${Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24))} days`,
                  inline: true
                },
                {
                  name: '⚠️ Raid Indicators',
                  value: raidAnalysis.reasons.map(r => `• ${r}`).join('\n'),
                  inline: false
                },
                {
                  name: '⚡ Actions Taken',
                  value: raidAnalysis.actions.map(a => `• ${a.type}`).join('\n') || '• User monitored',
                  inline: false
                }
              )
              .setTimestamp()
              .setFooter({ text: `User ID: ${member.user.id}` });
            
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
        
        // Send alert to server admins if high confidence raid
        if (raidAnalysis.confidence >= 0.8) {
          const adminRole = member.guild.roles.cache.find(role => 
            role.name.toLowerCase().includes('admin') || 
            role.name.toLowerCase().includes('moderator') ||
            role.permissions.has('Administrator')
          );
          
          if (adminRole && config.logChannelId) {
            const alertChannel = member.guild.channels.cache.get(config.logChannelId);
            if (alertChannel) {
              await alertChannel.send({
                content: `${adminRole} 🚨 **HIGH CONFIDENCE RAID DETECTED** - Immediate attention required!`,
                allowedMentions: { roles: [adminRole.id] }
              });
            }
          }
        }
        
      } catch (error) {
        console.error('Error executing raid protection actions:', error);
      }
    } else {
      // Normal join, just log for monitoring
      console.log(`[RAID PROTECTION] Normal join detected for ${member.user.tag} in ${member.guild.name}`);
    }
    
  } catch (error) {
    console.error('Error in raid protection system:', error);
  }
});

// Profanity word lists
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

// Spam detection function
function detectSpam(content) {
  const text = content.toLowerCase();
  let spamScore = 0;
  const reasons = [];
  
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
  
  // Repeated messages (simple spam detection)
  if (content.length > 5 && /^(.+?)\1{3,}$/.test(content.trim())) {
    spamScore += 0.6;
    reasons.push('Repeated message pattern detected');
  }
  
  // Simple spam detection - short repeated messages
  if (content.length < 10 && content.length > 0) {
    const repeatedChars = content.match(/(.)\1+/g);
    if (repeatedChars && repeatedChars.join('').length > content.length * 0.5) {
      spamScore += 0.7;
      reasons.push('Simple spam pattern detected');
    }
  }
  
  // Random character spam detection
  if (content.length > 3) {
    const randomnessScore = calculateRandomness(content);
    if (randomnessScore > 0.7) {
      spamScore += 0.8;
      reasons.push('Random character spam detected');
    }
  }
  
  // Single character spam (very aggressive)
  if (content.trim().length === 1) {
    spamScore += 0.9;
    reasons.push('Single character spam detected');
  }
  
  // Very short messages with only 1-3 characters (aggressive)
  if (content.trim().length >= 2 && content.trim().length <= 3) {
    // If it's mostly consonants or looks random
    const cleanText = content.toLowerCase().replace(/[^a-z]/g, '');
    const vowels = (cleanText.match(/[aeiou]/g) || []).length;
    if (vowels === 0 && cleanText.length > 0) {
      spamScore += 0.8;
      reasons.push('Very short spam detected');
    }
  }
  
  // Very short nonsense messages
  if (content.length >= 2 && content.length <= 15) {
    const nonsenseScore = calculateNonsenseScore(content);
    if (nonsenseScore > 0.6) {
      spamScore += 0.7;
      reasons.push('Nonsense text detected');
    }
  }
  
  // Profanity detection
  const profanityDetected = detectProfanity(content);
  if (profanityDetected.found) {
    spamScore += 0.8;
    reasons.push(`Profanity detected: ${profanityDetected.language} (${profanityDetected.count} word${profanityDetected.count > 1 ? 's' : ''})`);
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
}

// Profanity detection function
function detectProfanity(content) {
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
  
  // Check for character substitutions (l33t speak)
  const leetText = text
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\*/g, '');
    
  // Re-check with leet transformations
  for (const word of [...englishProfanity, ...portugueseProfanity]) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(leetText) && !foundWords.includes(word)) {
      foundWords.push(word + ' (l33t)');
    }
  }
  
  return {
    found: foundWords.length > 0,
    count: foundWords.length,
    words: foundWords,
    language: languages.join(' & ')
  };
}

// Calculate randomness score for spam detection
function calculateRandomness(text) {
  const cleanText = text.toLowerCase().replace(/[^a-z]/g, '');
  if (cleanText.length < 3) return 0;
  
  let randomScore = 0;
  
  // Check for consonant clusters (more than 3 consonants in a row)
  const consonantClusters = cleanText.match(/[bcdfghjklmnpqrstvwxyz]{4,}/g);
  if (consonantClusters) {
    randomScore += Math.min(consonantClusters.length * 0.3, 0.5);
  }
  
  // Check for vowel-consonant pattern irregularity
  const vowels = cleanText.match(/[aeiou]/g) || [];
  const vowelRatio = vowels.length / cleanText.length;
  if (vowelRatio < 0.15 || vowelRatio > 0.8) {
    randomScore += 0.4;
  }
  
  // Check for lack of common English/Portuguese letter combinations
  const commonCombos = ['th', 'er', 'on', 'an', 'in', 'ed', 'nd', 'to', 'en', 'ou', 'ar', 'es', 'te', 'de', 'da', 'que', 'do', 'em', 'um', 'os'];
  let comboCount = 0;
  for (const combo of commonCombos) {
    if (cleanText.includes(combo)) comboCount++;
  }
  if (comboCount === 0 && cleanText.length > 4) {
    randomScore += 0.5;
  }
  
  return Math.min(randomScore, 1.0);
}

// Calculate nonsense score for very short messages
function calculateNonsenseScore(text) {
  const cleanText = text.toLowerCase().replace(/[^a-z]/g, '');
  if (cleanText.length < 2) return 0;
  
  let nonsenseScore = 0;
  
  // Check if it's mostly single characters separated by spaces
  const words = text.trim().split(/\s+/);
  const singleCharWords = words.filter(word => word.length === 1).length;
  if (singleCharWords > words.length * 0.6 && words.length > 2) {
    nonsenseScore += 0.8;
  }
  
  // Check for very short "words" that don't look like real words
  let weirdWords = 0;
  for (const word of words) {
    if (word.length >= 2 && word.length <= 6) {
      const vowels = (word.match(/[aeiou]/g) || []).length;
      const consonants = (word.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
      
      // If no vowels or too many consonants for the length
      if (vowels === 0 || consonants > word.length * 0.8) {
        weirdWords++;
      }
    }
  }
  
  if (weirdWords > 0 && words.length > 1) {
    nonsenseScore += (weirdWords / words.length) * 0.7;
  }
  
  return Math.min(nonsenseScore, 1.0);
}

// Get server language configuration
async function getServerLanguage(guildId) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/server-languages.json');
    
    const data = await fs.readFile(configPath, 'utf8');
    const languages = JSON.parse(data);
    const config = languages[guildId];
    
    return config ? config.language : 'en'; // Default to English
  } catch {
    return 'en'; // Default to English if no config
  }
}

// Message logging event handlers
client.on('messageDelete', async (message) => {
  try {
    await logMessageDelete(message);
  } catch (error) {
    console.error('Message delete logging error:', error);
  }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  try {
    await logMessageUpdate(oldMessage, newMessage);
  } catch (error) {
    console.error('Message update logging error:', error);
  }
});

client.on('messageDeleteBulk', async (messages, channel) => {
  try {
    await logMessageBulkDelete(messages, channel);
  } catch (error) {
    console.error('Bulk message delete logging error:', error);
  }
});

// Export client for use in API
module.exports = { client };

// Start bot if this file is run directly
if (require.main === module) {
  client.login(process.env.DISCORD_TOKEN);
}