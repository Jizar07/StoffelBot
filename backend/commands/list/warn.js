const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Data storage paths
const WARNINGS_FILE = path.join(__dirname, '../../data/warnings.json');
const SETTINGS_FILE = path.join(__dirname, '../../data/warning-settings.json');

// Default warning settings
const DEFAULT_SETTINGS = {
    enabled: true,
    maxWarnings: 5,
    warningDecayDays: 30,
    autoMuteAfterWarnings: 3,
    autoKickAfterWarnings: 4,
    autoBanAfterWarnings: 5,
    muteRoleId: null,
    warningLogChannel: null,
    punishmentLogChannel: null,
    appealChannel: null,
    muteDuration: 3600000 // 1 hour in milliseconds
};

// Initialize data files
async function initializeData() {
    try {
        await fs.access(WARNINGS_FILE);
    } catch {
        await fs.writeFile(WARNINGS_FILE, JSON.stringify({}));
    }
    
    try {
        await fs.access(SETTINGS_FILE);
    } catch {
        await fs.writeFile(SETTINGS_FILE, JSON.stringify({}));
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
        console.error('Error reading warning settings:', error);
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
        console.error('Error saving warning settings:', error);
    }
}

// Get user warnings
async function getUserWarnings(serverId, userId) {
    await initializeData();
    
    try {
        const data = await fs.readFile(WARNINGS_FILE, 'utf8');
        const warnings = JSON.parse(data);
        
        if (!warnings[serverId]) warnings[serverId] = {};
        if (!warnings[serverId][userId]) warnings[serverId][userId] = [];
        
        return warnings[serverId][userId];
    } catch (error) {
        console.error('Error reading warnings:', error);
        return [];
    }
}

// Add warning
async function addWarning(serverId, userId, reason, moderatorId) {
    await initializeData();
    
    try {
        const data = await fs.readFile(WARNINGS_FILE, 'utf8');
        const warnings = JSON.parse(data);
        
        if (!warnings[serverId]) warnings[serverId] = {};
        if (!warnings[serverId][userId]) warnings[serverId][userId] = [];
        
        const warning = {
            id: Date.now().toString(),
            reason,
            moderatorId,
            timestamp: Date.now(),
            active: true
        };
        
        warnings[serverId][userId].push(warning);
        await fs.writeFile(WARNINGS_FILE, JSON.stringify(warnings, null, 2));
        
        return warning;
    } catch (error) {
        console.error('Error adding warning:', error);
        return null;
    }
}

// Remove warning
async function removeWarning(serverId, userId, warningId) {
    await initializeData();
    
    try {
        const data = await fs.readFile(WARNINGS_FILE, 'utf8');
        const warnings = JSON.parse(data);
        
        if (warnings[serverId] && warnings[serverId][userId]) {
            const warningIndex = warnings[serverId][userId].findIndex(w => w.id === warningId);
            if (warningIndex > -1) {
                warnings[serverId][userId].splice(warningIndex, 1);
                await fs.writeFile(WARNINGS_FILE, JSON.stringify(warnings, null, 2));
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error removing warning:', error);
        return false;
    }
}

// Clear all warnings for a user
async function clearWarnings(serverId, userId) {
    await initializeData();
    
    try {
        const data = await fs.readFile(WARNINGS_FILE, 'utf8');
        const warnings = JSON.parse(data);
        
        if (warnings[serverId] && warnings[serverId][userId]) {
            const count = warnings[serverId][userId].length;
            warnings[serverId][userId] = [];
            await fs.writeFile(WARNINGS_FILE, JSON.stringify(warnings, null, 2));
            return count;
        }
        return 0;
    } catch (error) {
        console.error('Error clearing warnings:', error);
        return 0;
    }
}

// Clean expired warnings
async function cleanExpiredWarnings(serverId, decayDays) {
    await initializeData();
    
    try {
        const data = await fs.readFile(WARNINGS_FILE, 'utf8');
        const warnings = JSON.parse(data);
        
        if (!warnings[serverId]) return 0;
        
        let cleaned = 0;
        const cutoffTime = Date.now() - (decayDays * 24 * 60 * 60 * 1000);
        
        for (const userId in warnings[serverId]) {
            const userWarnings = warnings[serverId][userId];
            const oldCount = userWarnings.length;
            warnings[serverId][userId] = userWarnings.filter(w => w.timestamp > cutoffTime);
            cleaned += oldCount - warnings[serverId][userId].length;
        }
        
        if (cleaned > 0) {
            await fs.writeFile(WARNINGS_FILE, JSON.stringify(warnings, null, 2));
        }
        
        return cleaned;
    } catch (error) {
        console.error('Error cleaning expired warnings:', error);
        return 0;
    }
}

// Apply automatic punishment
async function applyAutoPunishment(guild, member, warningCount, settings) {
    try {
        let action = null;
        let duration = null;
        
        // Determine action based on warning count
        if (warningCount >= settings.autoBanAfterWarnings) {
            action = 'ban';
            await member.ban({ reason: `Automatic ban after ${warningCount} warnings` });
        } else if (warningCount >= settings.autoKickAfterWarnings) {
            action = 'kick';
            await member.kick(`Automatic kick after ${warningCount} warnings`);
        } else if (warningCount >= settings.autoMuteAfterWarnings) {
            action = 'mute';
            duration = settings.muteDuration;
            
            // Find or create mute role
            let muteRole = null;
            if (settings.muteRoleId) {
                muteRole = guild.roles.cache.get(settings.muteRoleId);
            }
            
            if (!muteRole) {
                muteRole = guild.roles.cache.find(role => role.name.toLowerCase() === 'muted');
            }
            
            if (!muteRole) {
                muteRole = await guild.roles.create({
                    name: 'Muted',
                    color: '#818386',
                    permissions: []
                });
                
                // Set permissions for all channels
                guild.channels.cache.forEach(async (channel) => {
                    await channel.permissionOverwrites.edit(muteRole, {
                        SendMessages: false,
                        AddReactions: false,
                        Speak: false
                    }).catch(() => {});
                });
                
                // Save mute role ID
                settings.muteRoleId = muteRole.id;
                await saveServerSettings(guild.id, settings);
            }
            
            await member.roles.add(muteRole);
            
            // Set timeout to unmute
            setTimeout(async () => {
                try {
                    await member.roles.remove(muteRole);
                } catch (e) {}
            }, duration);
        }
        
        return { action, duration };
    } catch (error) {
        console.error('Error applying auto punishment:', error);
        return null;
    }
}

// Log punishment action
async function logPunishment(guild, user, moderator, action, reason, settings, warningCount = null) {
    if (!settings.punishmentLogChannel) return;
    
    const logChannel = guild.channels.cache.get(settings.punishmentLogChannel);
    if (!logChannel) return;
    
    const embed = new EmbedBuilder()
        .setTitle(`⚖️ ${action.toUpperCase()} Applied`)
        .setColor(action === 'ban' ? '#EF4444' : action === 'kick' ? '#F59E0B' : '#8B5CF6')
        .addFields(
            { name: 'User', value: `${user} (${user.id})`, inline: true },
            { name: 'Moderator', value: moderator ? `${moderator}` : 'Automatic', inline: true },
            { name: 'Reason', value: reason || 'No reason provided', inline: false }
        )
        .setTimestamp();
    
    if (warningCount !== null) {
        embed.addFields({ name: 'Warning Count', value: warningCount.toString(), inline: true });
    }
    
    try {
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending punishment log:', error);
    }
}

// Log warning action
async function logWarning(guild, user, moderator, reason, warningCount, settings) {
    if (!settings.warningLogChannel) return;
    
    const logChannel = guild.channels.cache.get(settings.warningLogChannel);
    if (!logChannel) return;
    
    const embed = new EmbedBuilder()
        .setTitle('⚠️ Warning Issued')
        .setColor('#F59E0B')
        .addFields(
            { name: 'User', value: `${user} (${user.id})`, inline: true },
            { name: 'Moderator', value: `${moderator}`, inline: true },
            { name: 'Warning Count', value: `${warningCount}/${settings.maxWarnings}`, inline: true },
            { name: 'Reason', value: reason || 'No reason provided', inline: false }
        )
        .setTimestamp();
    
    try {
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending warning log:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warning and punishment system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a warning to a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to warn')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the warning')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a specific warning')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to remove warning from')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('warning_id')
                        .setDescription('ID of the warning to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all warnings for a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to clear warnings for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List warnings for a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to view warnings for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('View warning system settings'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('configure')
                .setDescription('Configure warning system')
                .addIntegerOption(option =>
                    option
                        .setName('max_warnings')
                        .setDescription('Max warnings before ban (1-20)')
                        .setMinValue(1)
                        .setMaxValue(20))
                .addIntegerOption(option =>
                    option
                        .setName('decay_days')
                        .setDescription('Days before warnings expire (1-365)')
                        .setMinValue(1)
                        .setMaxValue(365))
                .addIntegerOption(option =>
                    option
                        .setName('auto_mute')
                        .setDescription('Auto mute after X warnings')
                        .setMinValue(1)
                        .setMaxValue(20))
                .addIntegerOption(option =>
                    option
                        .setName('auto_kick')
                        .setDescription('Auto kick after X warnings')
                        .setMinValue(1)
                        .setMaxValue(20))
                .addIntegerOption(option =>
                    option
                        .setName('auto_ban')
                        .setDescription('Auto ban after X warnings')
                        .setMinValue(1)
                        .setMaxValue(20))
                .addChannelOption(option =>
                    option
                        .setName('warning_log')
                        .setDescription('Channel for warning logs'))
                .addChannelOption(option =>
                    option
                        .setName('punishment_log')
                        .setDescription('Channel for punishment logs'))
                .addRoleOption(option =>
                    option
                        .setName('mute_role')
                        .setDescription('Role to use for muting')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup')
                .setDescription('Clean expired warnings'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View warning statistics')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const serverId = interaction.guild.id;
        const settings = await getServerSettings(serverId);

        switch (subcommand) {
            case 'add': {
                const user = interaction.options.getUser('user');
                const reason = interaction.options.getString('reason');
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);

                if (!member) {
                    return await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription('❌ User not found in this server.')
                            .setColor('#EF4444')],
                        ephemeral: true
                    });
                }

                // Check if user is moderator or higher
                if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription('❌ You cannot warn a moderator.')
                            .setColor('#EF4444')],
                        ephemeral: true
                    });
                }

                const warning = await addWarning(serverId, user.id, reason, interaction.user.id);
                if (!warning) {
                    return await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription('❌ Failed to add warning.')
                            .setColor('#EF4444')],
                        ephemeral: true
                    });
                }

                const userWarnings = await getUserWarnings(serverId, user.id);
                const warningCount = userWarnings.length;

                // Send warning message to user
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('⚠️ Warning Received')
                        .setDescription(`You have received a warning in **${interaction.guild.name}**.`)
                        .addFields(
                            { name: 'Reason', value: reason },
                            { name: 'Warning Count', value: `${warningCount}/${settings.maxWarnings}` },
                            { name: 'Moderator', value: interaction.user.tag }
                        )
                        .setColor('#F59E0B')
                        .setTimestamp();

                    if (settings.appealChannel) {
                        dmEmbed.addFields({ name: 'Appeal', value: `You can appeal this warning in <#${settings.appealChannel}>` });
                    }

                    await user.send({ embeds: [dmEmbed] });
                } catch (e) {
                    // User has DMs disabled
                }

                // Check for automatic punishment
                let punishment = null;
                if (warningCount >= settings.autoMuteAfterWarnings) {
                    punishment = await applyAutoPunishment(interaction.guild, member, warningCount, settings);
                    if (punishment) {
                        await logPunishment(interaction.guild, user, null, punishment.action, `Automatic ${punishment.action} after ${warningCount} warnings`, settings, warningCount);
                    }
                }

                // Log the warning
                await logWarning(interaction.guild, user, interaction.user, reason, warningCount, settings);

                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Warning Added')
                    .setDescription(`Successfully warned ${user}`)
                    .addFields(
                        { name: 'Reason', value: reason },
                        { name: 'Warning Count', value: `${warningCount}/${settings.maxWarnings}`, inline: true },
                        { name: 'Warning ID', value: warning.id, inline: true }
                    )
                    .setColor('#F59E0B')
                    .setTimestamp();

                if (punishment) {
                    embed.addFields({ name: 'Auto Punishment', value: `Applied ${punishment.action}${punishment.duration ? ` for ${Math.round(punishment.duration / 60000)} minutes` : ''}` });
                }

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'remove': {
                const user = interaction.options.getUser('user');
                const warningId = interaction.options.getString('warning_id');

                const success = await removeWarning(serverId, user.id, warningId);
                if (!success) {
                    return await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription('❌ Warning not found.')
                            .setColor('#EF4444')],
                        ephemeral: true
                    });
                }

                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ Warning Removed')
                        .setDescription(`Successfully removed warning ${warningId} from ${user}`)
                        .setColor('#22C55E')]
                });
                break;
            }

            case 'clear': {
                const user = interaction.options.getUser('user');
                const cleared = await clearWarnings(serverId, user.id);

                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ Warnings Cleared')
                        .setDescription(`Cleared ${cleared} warning(s) for ${user}`)
                        .setColor('#22C55E')]
                });
                break;
            }

            case 'list': {
                const user = interaction.options.getUser('user');
                const userWarnings = await getUserWarnings(serverId, user.id);

                if (userWarnings.length === 0) {
                    return await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription(`${user} has no warnings.`)
                            .setColor('#22C55E')]
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`⚠️ Warnings for ${user.tag}`)
                    .setColor('#F59E0B')
                    .setDescription(`Total: ${userWarnings.length}/${settings.maxWarnings}`)
                    .setThumbnail(user.displayAvatarURL());

                const warnings = userWarnings.slice(-10); // Show last 10 warnings
                for (let i = 0; i < warnings.length; i++) {
                    const warning = warnings[i];
                    const moderator = await interaction.client.users.fetch(warning.moderatorId).catch(() => null);
                    const date = new Date(warning.timestamp).toLocaleDateString();
                    
                    embed.addFields({
                        name: `Warning ${i + 1} (ID: ${warning.id})`,
                        value: `**Reason:** ${warning.reason}\n**Moderator:** ${moderator ? moderator.tag : 'Unknown'}\n**Date:** ${date}`,
                        inline: false
                    });
                }

                if (userWarnings.length > 10) {
                    embed.setFooter({ text: `Showing latest 10 of ${userWarnings.length} warnings` });
                }

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'settings': {
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Warning System Settings')
                    .setColor('#3B82F6')
                    .addFields(
                        { name: 'Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Max Warnings', value: settings.maxWarnings.toString(), inline: true },
                        { name: 'Warning Decay', value: `${settings.warningDecayDays} days`, inline: true },
                        { name: 'Auto Mute After', value: `${settings.autoMuteAfterWarnings} warnings`, inline: true },
                        { name: 'Auto Kick After', value: `${settings.autoKickAfterWarnings} warnings`, inline: true },
                        { name: 'Auto Ban After', value: `${settings.autoBanAfterWarnings} warnings`, inline: true },
                        { name: 'Mute Role', value: settings.muteRoleId ? `<@&${settings.muteRoleId}>` : 'Auto-create', inline: true },
                        { name: 'Warning Log', value: settings.warningLogChannel ? `<#${settings.warningLogChannel}>` : 'Not set', inline: true },
                        { name: 'Punishment Log', value: settings.punishmentLogChannel ? `<#${settings.punishmentLogChannel}>` : 'Not set', inline: true }
                    );

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'configure': {
                const maxWarnings = interaction.options.getInteger('max_warnings');
                const decayDays = interaction.options.getInteger('decay_days');
                const autoMute = interaction.options.getInteger('auto_mute');
                const autoKick = interaction.options.getInteger('auto_kick');
                const autoBan = interaction.options.getInteger('auto_ban');
                const warningLog = interaction.options.getChannel('warning_log');
                const punishmentLog = interaction.options.getChannel('punishment_log');
                const muteRole = interaction.options.getRole('mute_role');

                if (maxWarnings !== null) settings.maxWarnings = maxWarnings;
                if (decayDays !== null) settings.warningDecayDays = decayDays;
                if (autoMute !== null) settings.autoMuteAfterWarnings = autoMute;
                if (autoKick !== null) settings.autoKickAfterWarnings = autoKick;
                if (autoBan !== null) settings.autoBanAfterWarnings = autoBan;
                if (warningLog !== null) settings.warningLogChannel = warningLog.id;
                if (punishmentLog !== null) settings.punishmentLogChannel = punishmentLog.id;
                if (muteRole !== null) settings.muteRoleId = muteRole.id;

                await saveServerSettings(serverId, settings);

                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('⚠️ Settings Updated')
                        .setDescription('Warning system configuration has been updated.')
                        .setColor('#22C55E')]
                });
                break;
            }

            case 'cleanup': {
                const cleaned = await cleanExpiredWarnings(serverId, settings.warningDecayDays);
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🧹 Warnings Cleaned')
                        .setDescription(`Removed ${cleaned} expired warning(s).`)
                        .setColor('#22C55E')]
                });
                break;
            }

            case 'stats': {
                const data = await fs.readFile(WARNINGS_FILE, 'utf8');
                const warnings = JSON.parse(data);
                const serverWarnings = warnings[serverId] || {};

                let totalWarnings = 0;
                let activeUsers = 0;
                let topWarned = [];

                for (const userId in serverWarnings) {
                    const userWarnings = serverWarnings[userId];
                    if (userWarnings.length > 0) {
                        totalWarnings += userWarnings.length;
                        activeUsers++;
                        
                        const user = await interaction.client.users.fetch(userId).catch(() => null);
                        if (user) {
                            topWarned.push({ user: user.tag, count: userWarnings.length });
                        }
                    }
                }

                topWarned.sort((a, b) => b.count - a.count);
                topWarned = topWarned.slice(0, 5);

                const embed = new EmbedBuilder()
                    .setTitle('📊 Warning Statistics')
                    .setColor('#3B82F6')
                    .addFields(
                        { name: 'Total Warnings', value: totalWarnings.toString(), inline: true },
                        { name: 'Users with Warnings', value: activeUsers.toString(), inline: true },
                        { name: 'Average per User', value: activeUsers > 0 ? (totalWarnings / activeUsers).toFixed(1) : '0', inline: true }
                    );

                if (topWarned.length > 0) {
                    const topList = topWarned.map((item, index) => 
                        `${index + 1}. ${item.user} - ${item.count} warnings`
                    ).join('\n');
                    embed.addFields({ name: 'Top Warned Users', value: topList, inline: false });
                }

                await interaction.reply({ embeds: [embed] });
                break;
            }
        }
    }
};