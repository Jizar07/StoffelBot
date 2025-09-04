const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Data storage paths
const SETTINGS_FILE = path.join(__dirname, '../../data/logging-settings.json');
const LOGS_DIR = path.join(__dirname, '../../data/message-logs');

// Default logging settings
const DEFAULT_SETTINGS = {
    enabled: true,
    logDeletedMessages: true,
    logEditedMessages: true,
    logBulkDeletes: true,
    messageLogChannel: null,
    ignoreChannels: [],
    ignoreBots: true,
    logAttachments: true,
    maxLogRetention: 90 // days
};

// Initialize data files and directories
async function initializeData() {
    try {
        await fs.access(SETTINGS_FILE);
    } catch {
        await fs.writeFile(SETTINGS_FILE, JSON.stringify({}));
    }
    
    try {
        await fs.access(LOGS_DIR);
    } catch {
        await fs.mkdir(LOGS_DIR, { recursive: true });
    }
}

// Get server settings
async function getServerSettings(serverId) {
    await initializeData();
    
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(data);
        
        if (!settings[serverId]) {
            settings[serverId] = { ...DEFAULT_SETTINGS };
            await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        }
        
        return settings[serverId];
    } catch (error) {
        console.error('Error reading logging settings:', error);
        return { ...DEFAULT_SETTINGS };
    }
}

// Save server settings
async function saveServerSettings(serverId, newSettings) {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(data);
        settings[serverId] = newSettings;
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Error saving logging settings:', error);
    }
}

// Log message action
async function logMessageAction(guild, action, data, settings) {
    if (!settings.enabled || !settings.messageLogChannel) return;
    
    const logChannel = guild.channels.cache.get(settings.messageLogChannel);
    if (!logChannel) return;
    
    let embed;
    
    switch (action) {
        case 'delete': {
            embed = new EmbedBuilder()
                .setTitle('🗑️ Message Deleted')
                .setColor('#EF4444')
                .addFields(
                    { name: 'Author', value: `${data.author} (${data.authorId})`, inline: true },
                    { name: 'Channel', value: `${data.channel}`, inline: true },
                    { name: 'Message ID', value: data.messageId, inline: true }
                );
            
            if (data.content && data.content.trim()) {
                embed.addFields({ name: 'Content', value: data.content.length > 1024 ? data.content.substring(0, 1020) + '...' : data.content });
            }
            
            if (data.attachments && data.attachments.length > 0) {
                embed.addFields({ 
                    name: 'Attachments', 
                    value: data.attachments.map(att => `[${att.name}](${att.url})`).join('\n') 
                });
            }
            
            break;
        }
        
        case 'edit': {
            embed = new EmbedBuilder()
                .setTitle('✏️ Message Edited')
                .setColor('#F59E0B')
                .addFields(
                    { name: 'Author', value: `${data.author} (${data.authorId})`, inline: true },
                    { name: 'Channel', value: `${data.channel}`, inline: true },
                    { name: 'Message ID', value: data.messageId, inline: true }
                );
            
            if (data.oldContent) {
                embed.addFields({ 
                    name: 'Before', 
                    value: data.oldContent.length > 512 ? data.oldContent.substring(0, 508) + '...' : data.oldContent 
                });
            }
            
            if (data.newContent) {
                embed.addFields({ 
                    name: 'After', 
                    value: data.newContent.length > 512 ? data.newContent.substring(0, 508) + '...' : data.newContent 
                });
            }
            
            embed.addFields({ name: 'Jump to Message', value: `[Click here](https://discord.com/channels/${guild.id}/${data.channelId}/${data.messageId})` });
            break;
        }
        
        case 'bulkDelete': {
            embed = new EmbedBuilder()
                .setTitle('🗑️ Bulk Delete')
                .setColor('#DC2626')
                .addFields(
                    { name: 'Channel', value: `${data.channel}`, inline: true },
                    { name: 'Messages Deleted', value: data.count.toString(), inline: true },
                    { name: 'Moderator', value: data.moderator || 'Unknown', inline: true }
                );
            
            if (data.oldestMessage) {
                embed.addFields({ name: 'Oldest Message', value: `<t:${Math.floor(data.oldestMessage / 1000)}:F>` });
            }
            
            break;
        }
    }
    
    if (embed) {
        embed.setTimestamp();
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending message log:', error);
        }
    }
}

// Save detailed log to file
async function saveDetailedLog(serverId, action, data) {
    try {
        const serverLogsDir = path.join(LOGS_DIR, serverId);
        await fs.mkdir(serverLogsDir, { recursive: true });
        
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(serverLogsDir, `${date}.json`);
        
        const logEntry = {
            timestamp: Date.now(),
            action,
            ...data
        };
        
        let logs = [];
        try {
            const existingData = await fs.readFile(logFile, 'utf8');
            logs = JSON.parse(existingData);
        } catch (e) {
            // File doesn't exist, start fresh
        }
        
        logs.push(logEntry);
        await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error saving detailed log:', error);
    }
}

// Clean old logs
async function cleanOldLogs(serverId, maxRetentionDays) {
    try {
        const serverLogsDir = path.join(LOGS_DIR, serverId);
        const files = await fs.readdir(serverLogsDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxRetentionDays);
        
        let cleaned = 0;
        for (const file of files) {
            if (file.endsWith('.json')) {
                const fileDate = new Date(file.replace('.json', ''));
                if (fileDate < cutoffDate) {
                    await fs.unlink(path.join(serverLogsDir, file));
                    cleaned++;
                }
            }
        }
        
        return cleaned;
    } catch (error) {
        console.error('Error cleaning old logs:', error);
        return 0;
    }
}

// Event handlers for message logging (to be called from bot.js)
const messageCache = new Map(); // Store messages for delete logging

async function handleMessageCreate(message) {
    if (message.author.bot && await getServerSettings(message.guild?.id).then(s => s.ignoreBots)) return;
    if (!message.guild) return;
    
    // Cache message for potential delete logging
    messageCache.set(message.id, {
        id: message.id,
        content: message.content,
        author: message.author,
        channel: message.channel,
        attachments: message.attachments.map(att => ({
            name: att.name,
            url: att.url,
            size: att.size
        })),
        timestamp: message.createdTimestamp,
        embeds: message.embeds.length,
        guild: message.guild
    });
    
    // Clean cache periodically (keep last 1000 messages per guild)
    const guildMessages = Array.from(messageCache.values()).filter(msg => msg.guild?.id === message.guild.id);
    if (guildMessages.length > 1000) {
        const oldestMessages = guildMessages
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(0, guildMessages.length - 1000);
        
        oldestMessages.forEach(msg => messageCache.delete(msg.id));
    }
}

async function handleMessageDelete(message) {
    if (!message.guild) return;
    
    const settings = await getServerSettings(message.guild.id);
    if (!settings.enabled || !settings.logDeletedMessages) return;
    
    // Skip if channel is ignored
    if (settings.ignoreChannels.includes(message.channel.id)) return;
    
    // Skip if bot message and bots are ignored
    if (message.author?.bot && settings.ignoreBots) return;
    
    // Get cached message data (for partial messages)
    const cachedMessage = messageCache.get(message.id);
    const messageData = cachedMessage || message;
    
    const logData = {
        messageId: message.id,
        authorId: messageData.author?.id || 'Unknown',
        author: messageData.author?.tag || 'Unknown User',
        channelId: message.channel.id,
        channel: message.channel.toString(),
        content: messageData.content || '[No content]',
        attachments: messageData.attachments || [],
        deletedAt: Date.now()
    };
    
    // Log to channel
    await logMessageAction(message.guild, 'delete', logData, settings);
    
    // Save detailed log
    await saveDetailedLog(message.guild.id, 'delete', logData);
    
    // Remove from cache
    messageCache.delete(message.id);
}

async function handleMessageUpdate(oldMessage, newMessage) {
    if (!newMessage.guild) return;
    if (!oldMessage.content || !newMessage.content) return; // Skip embed updates
    if (oldMessage.content === newMessage.content) return; // No actual change
    
    const settings = await getServerSettings(newMessage.guild.id);
    if (!settings.enabled || !settings.logEditedMessages) return;
    
    // Skip if channel is ignored
    if (settings.ignoreChannels.includes(newMessage.channel.id)) return;
    
    // Skip if bot message and bots are ignored
    if (newMessage.author.bot && settings.ignoreBots) return;
    
    const logData = {
        messageId: newMessage.id,
        authorId: newMessage.author.id,
        author: newMessage.author.tag,
        channelId: newMessage.channel.id,
        channel: newMessage.channel.toString(),
        oldContent: oldMessage.content,
        newContent: newMessage.content,
        editedAt: Date.now()
    };
    
    // Log to channel
    await logMessageAction(newMessage.guild, 'edit', logData, settings);
    
    // Save detailed log
    await saveDetailedLog(newMessage.guild.id, 'edit', logData);
    
    // Update cache
    if (messageCache.has(newMessage.id)) {
        const cached = messageCache.get(newMessage.id);
        cached.content = newMessage.content;
        messageCache.set(newMessage.id, cached);
    }
}

async function handleMessageBulkDelete(messages, channel) {
    if (!channel.guild) return;
    
    const settings = await getServerSettings(channel.guild.id);
    if (!settings.enabled || !settings.logBulkDeletes) return;
    
    // Skip if channel is ignored
    if (settings.ignoreChannels.includes(channel.id)) return;
    
    const messageArray = Array.from(messages.values());
    const oldestTimestamp = Math.min(...messageArray.map(m => m.createdTimestamp));
    
    const logData = {
        channelId: channel.id,
        channel: channel.toString(),
        count: messages.size,
        oldestMessage: oldestTimestamp,
        deletedAt: Date.now(),
        messageIds: messageArray.map(m => m.id)
    };
    
    // Try to determine moderator from audit logs
    try {
        const auditLogs = await channel.guild.fetchAuditLogs({
            type: 72, // MESSAGE_BULK_DELETE
            limit: 1
        });
        
        const bulkDeleteEntry = auditLogs.entries.first();
        if (bulkDeleteEntry && Date.now() - bulkDeleteEntry.createdTimestamp < 5000) {
            logData.moderator = bulkDeleteEntry.executor.tag;
            logData.moderatorId = bulkDeleteEntry.executor.id;
        }
    } catch (e) {
        // No audit log access
    }
    
    // Log to channel
    await logMessageAction(channel.guild, 'bulkDelete', logData, settings);
    
    // Save detailed log with message content
    const detailedData = {
        ...logData,
        messages: messageArray.map(msg => ({
            id: msg.id,
            content: msg.content,
            author: msg.author?.tag || 'Unknown',
            authorId: msg.author?.id || 'Unknown',
            timestamp: msg.createdTimestamp,
            attachments: msg.attachments?.map(att => ({ name: att.name, url: att.url })) || []
        }))
    };
    
    await saveDetailedLog(channel.guild.id, 'bulkDelete', detailedData);
    
    // Remove from cache
    messageArray.forEach(msg => messageCache.delete(msg.id));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logging')
        .setDescription('Configure message logging system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable message logging'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable message logging'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('View current logging settings'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('configure')
                .setDescription('Configure logging settings')
                .addChannelOption(option =>
                    option
                        .setName('log_channel')
                        .setDescription('Channel for message logs'))
                .addBooleanOption(option =>
                    option
                        .setName('log_deleted')
                        .setDescription('Log deleted messages'))
                .addBooleanOption(option =>
                    option
                        .setName('log_edited')
                        .setDescription('Log edited messages'))
                .addBooleanOption(option =>
                    option
                        .setName('log_bulk_deletes')
                        .setDescription('Log bulk message deletions'))
                .addBooleanOption(option =>
                    option
                        .setName('ignore_bots')
                        .setDescription('Ignore bot messages'))
                .addBooleanOption(option =>
                    option
                        .setName('log_attachments')
                        .setDescription('Log message attachments'))
                .addIntegerOption(option =>
                    option
                        .setName('retention_days')
                        .setDescription('Days to keep detailed logs (1-365)')
                        .setMinValue(1)
                        .setMaxValue(365)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ignore')
                .setDescription('Manage ignored channels')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to ignore/unignore')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('Export logs for a specific date')
                .addStringOption(option =>
                    option
                        .setName('date')
                        .setDescription('Date to export (YYYY-MM-DD)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup')
                .setDescription('Clean old log files'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View logging statistics')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const serverId = interaction.guild.id;
        const settings = await getServerSettings(serverId);

        switch (subcommand) {
            case 'enable':
                settings.enabled = true;
                await saveServerSettings(serverId, settings);
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('📋 Message Logging Enabled')
                        .setDescription('Message logging is now active for this server.')
                        .setColor('#22C55E')
                        .addFields(
                            { name: 'Log Channel', value: settings.messageLogChannel ? `<#${settings.messageLogChannel}>` : 'Not set - use `/logging configure`', inline: true },
                            { name: 'Deleted Messages', value: settings.logDeletedMessages ? '✅' : '❌', inline: true },
                            { name: 'Edited Messages', value: settings.logEditedMessages ? '✅' : '❌', inline: true }
                        )]
                });
                break;

            case 'disable':
                settings.enabled = false;
                await saveServerSettings(serverId, settings);
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('📋 Message Logging Disabled')
                        .setDescription('Message logging has been disabled for this server.')
                        .setColor('#EF4444')]
                });
                break;

            case 'settings':
                const embed = new EmbedBuilder()
                    .setTitle('📋 Message Logging Settings')
                    .setColor(settings.enabled ? '#22C55E' : '#6B7280')
                    .addFields(
                        { name: 'Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Log Channel', value: settings.messageLogChannel ? `<#${settings.messageLogChannel}>` : 'Not set', inline: true },
                        { name: 'Retention', value: `${settings.maxLogRetention} days`, inline: true },
                        { name: 'Log Deleted', value: settings.logDeletedMessages ? '✅' : '❌', inline: true },
                        { name: 'Log Edited', value: settings.logEditedMessages ? '✅' : '❌', inline: true },
                        { name: 'Log Bulk Deletes', value: settings.logBulkDeletes ? '✅' : '❌', inline: true },
                        { name: 'Ignore Bots', value: settings.ignoreBots ? '✅' : '❌', inline: true },
                        { name: 'Log Attachments', value: settings.logAttachments ? '✅' : '❌', inline: true },
                        { name: 'Ignored Channels', value: settings.ignoreChannels.length > 0 ? 
                            settings.ignoreChannels.map(id => `<#${id}>`).join(', ') : 'None', inline: false }
                    );

                await interaction.reply({ embeds: [embed] });
                break;

            case 'configure':
                const logChannel = interaction.options.getChannel('log_channel');
                const logDeleted = interaction.options.getBoolean('log_deleted');
                const logEdited = interaction.options.getBoolean('log_edited');
                const logBulkDeletes = interaction.options.getBoolean('log_bulk_deletes');
                const ignoreBots = interaction.options.getBoolean('ignore_bots');
                const logAttachments = interaction.options.getBoolean('log_attachments');
                const retentionDays = interaction.options.getInteger('retention_days');

                if (logChannel !== null) settings.messageLogChannel = logChannel.id;
                if (logDeleted !== null) settings.logDeletedMessages = logDeleted;
                if (logEdited !== null) settings.logEditedMessages = logEdited;
                if (logBulkDeletes !== null) settings.logBulkDeletes = logBulkDeletes;
                if (ignoreBots !== null) settings.ignoreBots = ignoreBots;
                if (logAttachments !== null) settings.logAttachments = logAttachments;
                if (retentionDays !== null) settings.maxLogRetention = retentionDays;

                await saveServerSettings(serverId, settings);

                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('📋 Logging Settings Updated')
                        .setDescription('Message logging configuration has been updated.')
                        .setColor('#22C55E')]
                });
                break;

            case 'ignore':
                const channel = interaction.options.getChannel('channel');
                const index = settings.ignoreChannels.indexOf(channel.id);
                
                if (index > -1) {
                    settings.ignoreChannels.splice(index, 1);
                    await saveServerSettings(serverId, settings);
                    await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription(`✅ Removed ${channel} from ignored channels.`)
                            .setColor('#22C55E')]
                    });
                } else {
                    settings.ignoreChannels.push(channel.id);
                    await saveServerSettings(serverId, settings);
                    await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription(`✅ Added ${channel} to ignored channels.`)
                            .setColor('#22C55E')]
                    });
                }
                break;

            case 'export':
                const date = interaction.options.getString('date');
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                
                if (!dateRegex.test(date)) {
                    return await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription('❌ Invalid date format. Use YYYY-MM-DD.')
                            .setColor('#EF4444')],
                        ephemeral: true
                    });
                }

                try {
                    const logFile = path.join(LOGS_DIR, serverId, `${date}.json`);
                    const logData = await fs.readFile(logFile, 'utf8');
                    
                    const attachment = new AttachmentBuilder(Buffer.from(logData), {
                        name: `message-logs-${date}.json`
                    });

                    await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('📄 Log Export')
                            .setDescription(`Message logs for ${date}`)
                            .setColor('#3B82F6')],
                        files: [attachment]
                    });
                } catch (error) {
                    await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription(`❌ No logs found for ${date}.`)
                            .setColor('#EF4444')],
                        ephemeral: true
                    });
                }
                break;

            case 'cleanup':
                const cleaned = await cleanOldLogs(serverId, settings.maxLogRetention);
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🧹 Log Cleanup Complete')
                        .setDescription(`Removed ${cleaned} old log file(s).`)
                        .setColor('#22C55E')]
                });
                break;

            case 'stats':
                try {
                    const serverLogsDir = path.join(LOGS_DIR, serverId);
                    const files = await fs.readdir(serverLogsDir);
                    const jsonFiles = files.filter(f => f.endsWith('.json'));
                    
                    let totalMessages = 0;
                    let totalDeletes = 0;
                    let totalEdits = 0;
                    let totalBulkDeletes = 0;
                    
                    // Count recent activity (last 7 days)
                    const recent = new Date();
                    recent.setDate(recent.getDate() - 7);
                    
                    for (const file of jsonFiles) {
                        const fileDate = new Date(file.replace('.json', ''));
                        if (fileDate >= recent) {
                            const logData = await fs.readFile(path.join(serverLogsDir, file), 'utf8');
                            const logs = JSON.parse(logData);
                            
                            totalMessages += logs.length;
                            totalDeletes += logs.filter(log => log.action === 'delete').length;
                            totalEdits += logs.filter(log => log.action === 'edit').length;
                            totalBulkDeletes += logs.filter(log => log.action === 'bulkDelete').length;
                        }
                    }

                    const statsEmbed = new EmbedBuilder()
                        .setTitle('📊 Logging Statistics (Last 7 Days)')
                        .setColor('#3B82F6')
                        .addFields(
                            { name: 'Total Log Files', value: jsonFiles.length.toString(), inline: true },
                            { name: 'Total Logged Events', value: totalMessages.toString(), inline: true },
                            { name: 'Cache Size', value: messageCache.size.toString(), inline: true },
                            { name: 'Deleted Messages', value: totalDeletes.toString(), inline: true },
                            { name: 'Edited Messages', value: totalEdits.toString(), inline: true },
                            { name: 'Bulk Deletes', value: totalBulkDeletes.toString(), inline: true }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [statsEmbed] });
                } catch (error) {
                    await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription('❌ Error retrieving statistics.')
                            .setColor('#EF4444')],
                        ephemeral: true
                    });
                }
                break;
        }
    },

    // Export event handlers for bot.js
    handleMessageCreate,
    handleMessageDelete,
    handleMessageUpdate,
    handleMessageBulkDelete
};