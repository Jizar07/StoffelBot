const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// In-memory spam tracking (in production, use Redis or database)
const userMessageTracker = new Map(); // userId -> { messages: [], duplicates: Map }
const serverSettings = new Map(); // serverId -> settings

// Default anti-spam settings
const DEFAULT_SETTINGS = {
    enabled: true,
    maxMessagesPerMinute: 10,
    maxDuplicateMessages: 3,
    duplicateTimeWindow: 60000, // 60 seconds
    muteTime: 300000, // 5 minutes
    deleteMessages: true,
    ignoreChannels: [],
    ignoreRoles: [],
    logChannel: null
};

function getServerSettings(serverId) {
    if (!serverSettings.has(serverId)) {
        serverSettings.set(serverId, { ...DEFAULT_SETTINGS });
    }
    return serverSettings.get(serverId);
}

function isSpam(userId, message, settings) {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    
    if (!userMessageTracker.has(userId)) {
        userMessageTracker.set(userId, {
            messages: [],
            duplicates: new Map()
        });
    }
    
    const userData = userMessageTracker.get(userId);
    
    // Clean old messages
    userData.messages = userData.messages.filter(msg => now - msg.timestamp < timeWindow);
    
    // Check message rate
    if (userData.messages.length >= settings.maxMessagesPerMinute) {
        return { isSpam: true, type: 'rate', messages: userData.messages.length };
    }
    
    // Check duplicate messages
    const content = message.content.toLowerCase().trim();
    if (content.length > 0) {
        if (!userData.duplicates.has(content)) {
            userData.duplicates.set(content, []);
        }
        
        const duplicateMessages = userData.duplicates.get(content);
        duplicateMessages.push({ timestamp: now, messageId: message.id });
        
        // Clean old duplicates
        userData.duplicates.set(content, 
            duplicateMessages.filter(msg => now - msg.timestamp < settings.duplicateTimeWindow)
        );
        
        if (userData.duplicates.get(content).length > settings.maxDuplicateMessages) {
            return { isSpam: true, type: 'duplicate', count: duplicateMessages.length, content };
        }
    }
    
    // Add message to tracker
    userData.messages.push({ timestamp: now, messageId: message.id });
    
    return { isSpam: false };
}

async function handleSpam(message, spamResult, settings) {
    const member = message.member;
    if (!member) return;
    
    try {
        // Delete spam messages if enabled
        if (settings.deleteMessages) {
            await message.delete().catch(() => {});
            
            // Delete recent messages if it's rate spam
            if (spamResult.type === 'rate') {
                const userData = userMessageTracker.get(message.author.id);
                if (userData) {
                    for (const msg of userData.messages.slice(-5)) {
                        try {
                            const msgToDelete = await message.channel.messages.fetch(msg.messageId);
                            await msgToDelete.delete();
                        } catch (e) {}
                    }
                }
            }
        }
        
        // Find or create mute role
        let muteRole = message.guild.roles.cache.find(role => role.name === 'Muted');
        if (!muteRole) {
            muteRole = await message.guild.roles.create({
                name: 'Muted',
                color: '#818386',
                permissions: []
            });
            
            // Set permissions for all channels
            message.guild.channels.cache.forEach(async (channel) => {
                await channel.permissionOverwrites.edit(muteRole, {
                    SendMessages: false,
                    AddReactions: false,
                    Speak: false
                }).catch(() => {});
            });
        }
        
        // Mute the user
        await member.roles.add(muteRole);
        
        // Set timeout to unmute
        setTimeout(async () => {
            try {
                await member.roles.remove(muteRole);
            } catch (e) {}
        }, settings.muteTime);
        
        // Send log message
        if (settings.logChannel) {
            const logChannel = message.guild.channels.cache.get(settings.logChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Anti-Spam Action')
                    .setColor('#FF6B6B')
                    .addFields(
                        { name: 'User', value: `${message.author} (${message.author.id})`, inline: true },
                        { name: 'Channel', value: `${message.channel}`, inline: true },
                        { name: 'Spam Type', value: spamResult.type === 'rate' ? 'Message Rate' : 'Duplicate Messages', inline: true },
                        { name: 'Details', value: spamResult.type === 'rate' 
                            ? `${spamResult.messages} messages/minute` 
                            : `${spamResult.count} duplicate messages`, inline: false },
                        { name: 'Action', value: `Muted for ${settings.muteTime / 1000} seconds`, inline: true }
                    )
                    .setTimestamp();
                
                await logChannel.send({ embeds: [embed] });
            }
        }
        
        // Send warning to user
        try {
            const warningEmbed = new EmbedBuilder()
                .setTitle('⚠️ Spam Detected')
                .setDescription(`You have been temporarily muted for spam in **${message.guild.name}**.`)
                .addFields(
                    { name: 'Reason', value: spamResult.type === 'rate' ? 'Sending messages too quickly' : 'Sending duplicate messages' },
                    { name: 'Mute Duration', value: `${settings.muteTime / 1000} seconds` },
                    { name: 'Appeal', value: 'Contact server moderators if you believe this was an error.' }
                )
                .setColor('#FF6B6B')
                .setTimestamp();
            
            await message.author.send({ embeds: [warningEmbed] });
        } catch (e) {
            // User has DMs disabled
        }
        
    } catch (error) {
        console.error('Anti-spam error:', error);
    }
}

// Message handler for anti-spam (to be called from bot.js)
async function checkMessage(message) {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    const settings = getServerSettings(message.guild.id);
    if (!settings.enabled) return;
    
    // Check if user should be ignored
    if (message.member) {
        // Check ignored roles
        const hasIgnoredRole = message.member.roles.cache.some(role => 
            settings.ignoreRoles.includes(role.id)
        );
        if (hasIgnoredRole) return;
        
        // Check admin permissions
        if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
    }
    
    // Check ignored channels
    if (settings.ignoreChannels.includes(message.channel.id)) return;
    
    // Check for spam
    const spamResult = isSpam(message.author.id, message, settings);
    if (spamResult.isSpam) {
        await handleSpam(message, spamResult, settings);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antispam')
        .setDescription('Configure anti-spam settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable anti-spam system'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable anti-spam system'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('View current anti-spam settings'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('configure')
                .setDescription('Configure anti-spam settings')
                .addIntegerOption(option =>
                    option
                        .setName('max_messages')
                        .setDescription('Max messages per minute (1-100)')
                        .setMinValue(1)
                        .setMaxValue(100))
                .addIntegerOption(option =>
                    option
                        .setName('max_duplicates')
                        .setDescription('Max duplicate messages (1-20)')
                        .setMinValue(1)
                        .setMaxValue(20))
                .addIntegerOption(option =>
                    option
                        .setName('mute_time')
                        .setDescription('Mute time in seconds (60-86400)')
                        .setMinValue(60)
                        .setMaxValue(86400))
                .addChannelOption(option =>
                    option
                        .setName('log_channel')
                        .setDescription('Channel for anti-spam logs'))
                .addBooleanOption(option =>
                    option
                        .setName('delete_messages')
                        .setDescription('Automatically delete spam messages')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ignore')
                .setDescription('Manage ignored channels and roles')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to ignore/unignore'))
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Role to ignore/unignore')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View anti-spam statistics')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const serverId = interaction.guild.id;
        const settings = getServerSettings(serverId);

        switch (subcommand) {
            case 'enable':
                settings.enabled = true;
                serverSettings.set(serverId, settings);
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🛡️ Anti-Spam System Enabled')
                        .setDescription('Anti-spam protection is now active for this server.')
                        .setColor('#22C55E')
                        .addFields(
                            { name: 'Max Messages/Minute', value: settings.maxMessagesPerMinute.toString(), inline: true },
                            { name: 'Max Duplicates', value: settings.maxDuplicateMessages.toString(), inline: true },
                            { name: 'Mute Duration', value: `${settings.muteTime / 1000}s`, inline: true }
                        )]
                });
                break;

            case 'disable':
                settings.enabled = false;
                serverSettings.set(serverId, settings);
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🛡️ Anti-Spam System Disabled')
                        .setDescription('Anti-spam protection has been disabled for this server.')
                        .setColor('#EF4444')]
                });
                break;

            case 'settings':
                const statusEmoji = settings.enabled ? '✅' : '❌';
                const statusText = settings.enabled ? 'Enabled' : 'Disabled';
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🛡️ Anti-Spam Settings')
                        .setColor(settings.enabled ? '#22C55E' : '#6B7280')
                        .addFields(
                            { name: 'Status', value: `${statusEmoji} ${statusText}`, inline: true },
                            { name: 'Max Messages/Minute', value: settings.maxMessagesPerMinute.toString(), inline: true },
                            { name: 'Max Duplicates', value: settings.maxDuplicateMessages.toString(), inline: true },
                            { name: 'Duplicate Time Window', value: `${settings.duplicateTimeWindow / 1000}s`, inline: true },
                            { name: 'Mute Duration', value: `${settings.muteTime / 1000}s`, inline: true },
                            { name: 'Delete Messages', value: settings.deleteMessages ? '✅' : '❌', inline: true },
                            { name: 'Log Channel', value: settings.logChannel ? `<#${settings.logChannel}>` : 'Not set', inline: true },
                            { name: 'Ignored Channels', value: settings.ignoreChannels.length > 0 ? 
                                settings.ignoreChannels.map(id => `<#${id}>`).join(', ') : 'None', inline: false },
                            { name: 'Ignored Roles', value: settings.ignoreRoles.length > 0 ? 
                                settings.ignoreRoles.map(id => `<@&${id}>`).join(', ') : 'None', inline: false }
                        )]
                });
                break;

            case 'configure':
                const maxMessages = interaction.options.getInteger('max_messages');
                const maxDuplicates = interaction.options.getInteger('max_duplicates');
                const muteTime = interaction.options.getInteger('mute_time');
                const logChannel = interaction.options.getChannel('log_channel');
                const deleteMessages = interaction.options.getBoolean('delete_messages');

                if (maxMessages !== null) settings.maxMessagesPerMinute = maxMessages;
                if (maxDuplicates !== null) settings.maxDuplicateMessages = maxDuplicates;
                if (muteTime !== null) settings.muteTime = muteTime * 1000;
                if (logChannel !== null) settings.logChannel = logChannel.id;
                if (deleteMessages !== null) settings.deleteMessages = deleteMessages;

                serverSettings.set(serverId, settings);

                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🛡️ Anti-Spam Settings Updated')
                        .setDescription('Your anti-spam configuration has been updated.')
                        .setColor('#3B82F6')
                        .addFields(
                            { name: 'Max Messages/Minute', value: settings.maxMessagesPerMinute.toString(), inline: true },
                            { name: 'Max Duplicates', value: settings.maxDuplicateMessages.toString(), inline: true },
                            { name: 'Mute Duration', value: `${settings.muteTime / 1000}s`, inline: true },
                            { name: 'Delete Messages', value: settings.deleteMessages ? '✅' : '❌', inline: true },
                            { name: 'Log Channel', value: settings.logChannel ? `<#${settings.logChannel}>` : 'Not set', inline: true }
                        )]
                });
                break;

            case 'ignore':
                const channel = interaction.options.getChannel('channel');
                const role = interaction.options.getRole('role');

                if (channel) {
                    const index = settings.ignoreChannels.indexOf(channel.id);
                    if (index > -1) {
                        settings.ignoreChannels.splice(index, 1);
                        await interaction.reply({
                            embeds: [new EmbedBuilder()
                                .setDescription(`✅ Removed ${channel} from ignored channels.`)
                                .setColor('#22C55E')]
                        });
                    } else {
                        settings.ignoreChannels.push(channel.id);
                        await interaction.reply({
                            embeds: [new EmbedBuilder()
                                .setDescription(`✅ Added ${channel} to ignored channels.`)
                                .setColor('#22C55E')]
                        });
                    }
                } else if (role) {
                    const index = settings.ignoreRoles.indexOf(role.id);
                    if (index > -1) {
                        settings.ignoreRoles.splice(index, 1);
                        await interaction.reply({
                            embeds: [new EmbedBuilder()
                                .setDescription(`✅ Removed ${role} from ignored roles.`)
                                .setColor('#22C55E')]
                        });
                    } else {
                        settings.ignoreRoles.push(role.id);
                        await interaction.reply({
                            embeds: [new EmbedBuilder()
                                .setDescription(`✅ Added ${role} to ignored roles.`)
                                .setColor('#22C55E')]
                        });
                    }
                } else {
                    await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription('❌ Please specify a channel or role to ignore/unignore.')
                            .setColor('#EF4444')]
                    });
                }

                serverSettings.set(serverId, settings);
                break;

            case 'status':
                const trackedUsers = userMessageTracker.size;
                const totalMessages = Array.from(userMessageTracker.values())
                    .reduce((sum, userData) => sum + userData.messages.length, 0);

                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🛡️ Anti-Spam Statistics')
                        .setColor('#3B82F6')
                        .addFields(
                            { name: 'Status', value: settings.enabled ? '✅ Active' : '❌ Disabled', inline: true },
                            { name: 'Tracked Users', value: trackedUsers.toString(), inline: true },
                            { name: 'Recent Messages', value: totalMessages.toString(), inline: true }
                        )
                        .setTimestamp()]
                });
                break;
        }
    },

    // Export the message checker for use in bot.js
    checkMessage,
    getServerSettings
};