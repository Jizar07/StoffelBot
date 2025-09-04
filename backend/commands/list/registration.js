const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const configPath = path.join(__dirname, '../../data/registration-configs.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(configPath);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load registration configurations
async function loadConfigs() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save registration configurations
async function saveConfigs(configs) {
  await ensureDataDir();
  await fs.writeFile(configPath, JSON.stringify(configs, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('registration')
    .setDescription('Manage registration modals for your server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a registration modal in this channel')
        .addStringOption(option =>
          option.setName('config_name')
            .setDescription('Name of the registration configuration to use')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all available registration configurations')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'create') {
      await handleCreateModal(interaction);
    } else if (subcommand === 'list') {
      await handleListConfigs(interaction);
    }
  },
};

async function handleCreateModal(interaction) {
  const configName = interaction.options.getString('config_name');
  const configs = await loadConfigs();
  const guildId = interaction.guild.id;
  
  if (!configs[guildId] || !configs[guildId][configName]) {
    await interaction.reply({
      content: `❌ Registration configuration "${configName}" not found. Please create it in the web dashboard first.`,
      ephemeral: true
    });
    return;
  }
  
  const config = configs[guildId][configName];
  
  // Create the registration embed
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(config.modalTitle || '📝 Server Registration')
    .setDescription(config.modalDescription || 'Click the button below to register for this server.')
    .setTimestamp();
  
  if (config.embedColor) {
    embed.setColor(parseInt(config.embedColor.replace('#', ''), 16));
  }
  
  // Create the button
  const button = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`registration_${configName}`)
        .setLabel(config.buttonText || '📝 Register')
        .setStyle(ButtonStyle.Primary)
    );
  
  await interaction.reply({
    content: `✅ Registration modal "${configName}" created in this channel!`,
    ephemeral: true
  });
  
  // Send the actual registration message
  await interaction.followUp({
    embeds: [embed],
    components: [button]
  });
}

async function handleListConfigs(interaction) {
  const configs = await loadConfigs();
  const guildId = interaction.guild.id;
  
  if (!configs[guildId] || Object.keys(configs[guildId]).length === 0) {
    await interaction.reply({
      content: '📝 No registration configurations found. Create them in the web dashboard first.',
      ephemeral: true
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('📝 Registration Configurations')
    .setDescription('Available registration configurations for this server:');
  
  Object.entries(configs[guildId]).forEach(([name, config]) => {
    embed.addFields({
      name: name,
      value: `Questions: ${config.questions?.length || 0}\nRoles: ${config.roles?.length || 0}\nChannel Creation: ${config.createChannels ? 'Yes' : 'No'}`,
      inline: true
    });
  });
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}