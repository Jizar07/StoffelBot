const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper function to create control buttons
function createControlButtons(isPlaying = false, isPaused = false, hasQueue = false) {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_previous')
                .setLabel('⏮️ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasQueue),
            new ButtonBuilder()
                .setCustomId(isPaused ? 'music_resume' : 'music_pause')
                .setLabel(isPaused ? '▶️ Resume' : '⏸️ Pause')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!isPlaying),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setLabel('⏹️ Stop')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!isPlaying),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setLabel('⏭️ Skip')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!isPlaying),
            new ButtonBuilder()
                .setCustomId('music_shuffle')
                .setLabel('🔀 Shuffle')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasQueue)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_volume_down')
                .setLabel('🔉 Vol-')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!isPlaying),
            new ButtonBuilder()
                .setCustomId('music_volume_up')
                .setLabel('🔊 Vol+')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!isPlaying),
            new ButtonBuilder()
                .setCustomId('music_queue')
                .setLabel('📋 Queue')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setLabel('🔁 Loop')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!isPlaying),
            new ButtonBuilder()
                .setCustomId('music_nowplaying')
                .setLabel('🎵 Now Playing')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!isPlaying)
        );

    return [row1, row2];
}

// Helper function to create progress bar
function createProgressBar(current, total, length = 20) {
    const progress = Math.round((current / total) * length);
    const emptyProgress = length - progress;
    
    const progressText = '▰'.repeat(progress);
    const emptyProgressText = '▱'.repeat(emptyProgress);
    
    return progressText + emptyProgressText;
}

// Helper function to format duration
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    } else {
        return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    }
}

// Helper function to create rich now playing embed
function createNowPlayingEmbed(queue, track) {
    const progress = queue.node.streamTime;
    const total = track.durationMS;
    const progressBar = createProgressBar(progress, total);
    
    const embed = new EmbedBuilder()
        .setColor('#FF6B9D')
        .setTitle('🎵 Now Playing')
        .setURL(track.url)
        .setDescription(`**[${track.title}](${track.url})**\n*by ${track.author}*`)
        .addFields(
            {
                name: '⏱️ Duration',
                value: `\`${formatDuration(progress)} / ${track.duration}\`\n${progressBar}`,
                inline: false
            },
            {
                name: '🎚️ Volume',
                value: `\`${queue.node.volume}%\``,
                inline: true
            },
            {
                name: '🔄 Loop Mode',
                value: `\`${queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Track' : 'Queue'}\``,
                inline: true
            },
            {
                name: '👤 Requested by',
                value: `${track.requestedBy}`,
                inline: true
            }
        )
        .setThumbnail(track.thumbnail)
        .setImage(track.thumbnail) // Large banner image
        .setFooter({ 
            text: `Queue: ${queue.tracks.toArray().length} songs • Playing from ${track.source}`,
            iconURL: track.requestedBy.displayAvatarURL()
        })
        .setTimestamp();

    return embed;
}

// Helper function to create queue embed
function createQueueEmbed(queue) {
    const tracks = queue.tracks.toArray().slice(0, 10);
    const currentTrack = queue.currentTrack;
    
    let description = `**🎵 Now Playing:**\n[${currentTrack.title}](${currentTrack.url}) - \`${currentTrack.duration}\`\n*Requested by ${currentTrack.requestedBy}*\n\n`;
    
    if (tracks.length > 0) {
        description += '**📋 Up Next:**\n';
        tracks.forEach((track, index) => {
            description += `\`${index + 1}.\` [${track.title}](${track.url}) - \`${track.duration}\`\n*Requested by ${track.requestedBy}*\n`;
        });
        
        if (queue.tracks.toArray().length > 10) {
            description += `\n*...and ${queue.tracks.toArray().length - 10} more songs*`;
        }
    } else {
        description += '**📋 Queue is empty**\nUse `/music play` to add more songs!';
    }

    const totalDuration = queue.tracks.toArray().reduce((acc, track) => acc + track.durationMS, 0) + currentTrack.durationMS;
    
    const embed = new EmbedBuilder()
        .setColor('#4ECDC4')
        .setTitle('🎵 Music Queue')
        .setDescription(description)
        .addFields(
            {
                name: '📊 Queue Stats',
                value: `**Total Songs:** ${queue.tracks.toArray().length + 1}\n**Total Duration:** ${formatDuration(totalDuration)}\n**Loop Mode:** ${queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Track' : 'Queue'}`,
                inline: true
            },
            {
                name: '🎚️ Settings',
                value: `**Volume:** ${queue.node.volume}%\n**Bitrate:** ${queue.connection?.joinConfig?.group || 'N/A'}\n**Filters:** None`,
                inline: true
            }
        )
        .setThumbnail(currentTrack.thumbnail)
        .setFooter({ 
            text: `Page 1/1 • Use buttons to control playback`,
            iconURL: queue.metadata.client.user.displayAvatarURL()
        })
        .setTimestamp();

    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Music player controls')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play a song or playlist from YouTube/Spotify')
                .addStringOption(option =>
                    option
                        .setName('query')
                        .setDescription('Song name, YouTube URL, or Spotify URL')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('pause')
                .setDescription('Pause the current song')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('resume')
                .setDescription('Resume the paused song')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop playing and clear the queue')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('skip')
                .setDescription('Skip the current song')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('queue')
                .setDescription('Show the current music queue')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('nowplaying')
                .setDescription('Show the currently playing song')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('volume')
                .setDescription('Set the music volume')
                .addIntegerOption(option =>
                    option
                        .setName('level')
                        .setDescription('Volume level (1-100)')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const { Player } = require('discord-player');
        const player = Player.singleton();
        
        const subcommand = interaction.options.getSubcommand();
        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('❌ You need to be in a voice channel to use music commands!')
                ],
                ephemeral: true
            });
        }

        const queue = player.nodes.get(interaction.guildId);

        switch (subcommand) {
            case 'play':
                const query = interaction.options.getString('query');
                
                try {
                    await interaction.deferReply();
                    
                    const searchResult = await player.search(query, {
                        requestedBy: interaction.user,
                        searchEngine: 'auto'
                    });
                    
                    if (!searchResult || !searchResult.tracks.length) {
                        return interaction.editReply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setDescription('❌ No results found!')
                            ]
                        });
                    }
                    
                    const res = await player.play(voiceChannel, searchResult, {
                        requestedBy: interaction.user,
                        nodeOptions: {
                            metadata: {
                                channel: interaction.channel,
                                client: interaction.guild?.members.me,
                                requestedBy: interaction.user
                            },
                            selfDeaf: true,
                            volume: 50,
                            leaveOnEmpty: true,
                            leaveOnEmptyCooldown: 30000,
                            leaveOnEnd: true,
                            leaveOnEndCooldown: 30000,
                        }
                    });
                    
                    // Get updated queue after playing
                    const updatedQueue = player.nodes.get(interaction.guildId);
                    const track = searchResult.tracks[0];
                    
                    if (res.track) {
                        // Song was added to queue
                        const embed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Added to Queue')
                            .setDescription(`**[${track.title}](${track.url})**\n*by ${track.author}*`)
                            .addFields(
                                { name: '⏱️ Duration', value: `\`${track.duration}\``, inline: true },
                                { name: '📍 Position in Queue', value: `\`${updatedQueue.tracks.toArray().length}\``, inline: true },
                                { name: '👤 Requested by', value: `${interaction.user}`, inline: true }
                            )
                            .setThumbnail(track.thumbnail)
                            .setFooter({ text: `Queue: ${updatedQueue.tracks.toArray().length + 1} songs` });
                        
                        const addedButtons = createControlButtons(true, false, updatedQueue.tracks.toArray().length > 0);
                        return interaction.editReply({ embeds: [embed], components: addedButtons });
                    } else {
                        // Song started playing immediately
                        const nowPlayingEmbed = createNowPlayingEmbed(updatedQueue, updatedQueue.currentTrack);
                        const playingButtons = createControlButtons(true, false, updatedQueue.tracks.toArray().length > 0);
                        return interaction.editReply({ embeds: [nowPlayingEmbed], components: playingButtons });
                    }
                    
                } catch (error) {
                    console.error('Play command error:', error);
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription('❌ An error occurred while trying to play the song!')
                        ]
                    });
                }
                break;

            case 'pause':
                if (!queue || !queue.isPlaying()) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription('❌ No music is currently playing!')
                        ],
                        ephemeral: true
                    });
                }
                
                queue.node.pause();
                const pauseEmbed = new EmbedBuilder()
                    .setColor('#FFFF00')
                    .setTitle('⏸️ Music Paused')
                    .setDescription(`**[${queue.currentTrack.title}](${queue.currentTrack.url})**\n*Paused by ${interaction.user}*`)
                    .setThumbnail(queue.currentTrack.thumbnail)
                    .setFooter({ text: 'Use the Resume button or /music resume to continue' });
                
                const pauseButtons = createControlButtons(true, true, queue.tracks.toArray().length > 0);
                return interaction.reply({ embeds: [pauseEmbed], components: pauseButtons });

            case 'resume':
                if (!queue || queue.node.isPlaying()) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription('❌ Music is not paused!')
                        ],
                        ephemeral: true
                    });
                }
                
                queue.node.resume();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setDescription('▶️ Music resumed!')
                    ]
                });

            case 'stop':
                if (!queue) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription('❌ No music is currently playing!')
                        ],
                        ephemeral: true
                    });
                }
                
                queue.delete();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setDescription('⏹️ Music stopped and queue cleared!')
                    ]
                });

            case 'skip':
                if (!queue || !queue.isPlaying()) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription('❌ No music is currently playing!')
                        ],
                        ephemeral: true
                    });
                }
                
                const currentTrack = queue.currentTrack;
                queue.node.skip();
                
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setDescription(`⏭️ Skipped: **${currentTrack.title}**`)
                    ]
                });

            case 'queue':
                if (!queue || queue.isEmpty()) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription('❌ The queue is empty!')
                        ],
                        ephemeral: true
                    });
                }
                
                const queueEmbed = createQueueEmbed(queue);
                const queueButtons = createControlButtons(queue.isPlaying(), queue.node.isPaused(), queue.tracks.toArray().length > 0);
                return interaction.reply({ embeds: [queueEmbed], components: queueButtons });

            case 'nowplaying':
                if (!queue || !queue.isPlaying()) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription('❌ No music is currently playing!')
                        ],
                        ephemeral: true
                    });
                }
                
                const nowPlayingEmbed = createNowPlayingEmbed(queue, queue.currentTrack);
                const nowPlayingButtons = createControlButtons(queue.isPlaying(), queue.node.isPaused(), queue.tracks.toArray().length > 0);
                return interaction.reply({ embeds: [nowPlayingEmbed], components: nowPlayingButtons });

            case 'volume':
                if (!queue) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription('❌ No music is currently playing!')
                        ],
                        ephemeral: true
                    });
                }
                
                const volume = interaction.options.getInteger('level');
                queue.node.setVolume(volume);
                
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setDescription(`🔊 Volume set to **${volume}%**`)
                    ]
                });
        }
    }
};

// Export helper functions for use in bot.js
module.exports.createControlButtons = createControlButtons;
module.exports.createNowPlayingEmbed = createNowPlayingEmbed;  
module.exports.createQueueEmbed = createQueueEmbed;