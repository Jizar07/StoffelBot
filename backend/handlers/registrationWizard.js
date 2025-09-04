const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  EmbedBuilder,
  ButtonStyle
} = require('discord.js');
const RegistrationService = require('../services/RegistrationService');

// Store temporary registration data for multi-step process
const registrationSessions = new Map();

// Session timeout (5 minutes)
const SESSION_TIMEOUT = 5 * 60 * 1000;

// Clean up expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of registrationSessions.entries()) {
    if (now - session.timestamp > SESSION_TIMEOUT) {
      registrationSessions.delete(key);
    }
  }
}, 60000); // Check every minute

/**
 * Handle registration button click - Start the wizard
 */
async function handleRegistrationStart(interaction) {
  try {
    // Get configuration
    const config = await RegistrationService.getFormConfig();
    
    // Check if user is already registered
    const isRegistered = await RegistrationService.isUserRegistered(interaction.user.id);
    
    if (isRegistered) {
      return await interaction.reply({
        content: config.messages.alreadyRegistered,
        ephemeral: true
      });
    }
    
    // Create modal for Step 1: Name and Identifier input
    const modal = new ModalBuilder()
      .setCustomId(`register_info_${interaction.user.id}`)
      .setTitle(config.steps.step1.modalTitle);
    
    const nameInput = new TextInputBuilder()
      .setCustomId('user_name')
      .setLabel(config.steps.step1.nameLabel)
      .setPlaceholder(config.steps.step1.namePlaceholder)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(50);
    
    const identifierInput = new TextInputBuilder()
      .setCustomId('user_identifier')
      .setLabel(config.steps.step1.identifierLabel)
      .setPlaceholder(config.steps.step1.identifierPlaceholder)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(30);
    
    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(identifierInput)
    );
    
    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error starting registration:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again later.',
      ephemeral: true
    });
  }
}

/**
 * Handle Step 1 submission - Process name/identifier and show function selection
 */
async function handleInfoSubmit(interaction) {
  try {
    const config = await RegistrationService.getFormConfig();
    const userId = interaction.customId.split('_')[2];
    
    // Verify this is the correct user
    if (userId !== interaction.user.id) {
      return await interaction.reply({
        content: config.messages.permissionDenied,
        ephemeral: true
      });
    }
    
    // Get input values
    const name = interaction.fields.getTextInputValue('user_name');
    const identifier = interaction.fields.getTextInputValue('user_identifier');
    
    // Store session data
    registrationSessions.set(userId, {
      name,
      identifier,
      timestamp: Date.now()
    });
    
    // Check if functions are configured
    const activeFunctions = config.functions.filter(f => f.active);
    if (activeFunctions.length === 0) {
      return await interaction.reply({
        content: '❌ No roles are available for registration. Please contact an administrator.',
        ephemeral: true
      });
    }
    
    // Create Step 2: Function selection
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`register_function_${userId}`)
      .setPlaceholder(config.steps.step2.dropdownPlaceholder)
      .addOptions(
        activeFunctions
          .sort((a, b) => a.order - b.order)
          .map(func => ({
            label: func.displayName,
            description: func.description || `Join as ${func.displayName}`,
            value: func.id,
            emoji: func.channelEmojiPrefix || undefined
          }))
      );
    
    const embed = new EmbedBuilder()
      .setTitle(config.steps.step2.embedTitle)
      .setDescription(config.steps.step2.embedDescription)
      .addFields([
        { name: 'Name', value: name, inline: true },
        { name: config.steps.step1.identifierLabel, value: identifier, inline: true }
      ])
      .setColor(config.formDisplay.embedColor)
      .setFooter({ text: config.formDisplay.footerText })
      .setTimestamp();
    
    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(selectMenu)],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error handling info submission:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

/**
 * Handle Step 2 submission - Process function selection and show inviter selection
 */
async function handleFunctionSelection(interaction) {
  await interaction.deferUpdate();
  
  try {
    const config = await RegistrationService.getFormConfig();
    const userId = interaction.customId.split('_')[2];
    
    // Verify user
    if (userId !== interaction.user.id) {
      return await interaction.editReply({
        content: config.messages.permissionDenied,
        embeds: [],
        components: []
      });
    }
    
    // Get session data
    const session = registrationSessions.get(userId);
    if (!session) {
      return await interaction.editReply({
        content: config.messages.sessionExpired,
        embeds: [],
        components: []
      });
    }
    
    // Update session with function selection
    const selectedFunctionId = interaction.values[0];
    session.functionId = selectedFunctionId;
    session.timestamp = Date.now();
    
    const selectedFunction = config.functions.find(f => f.id === selectedFunctionId);
    
    // Create Step 3: Inviter selection with UserSelectMenu
    const userSelectMenu = new UserSelectMenuBuilder()
      .setCustomId(`register_inviter_${userId}`)
      .setPlaceholder(config.steps.step3.dropdownPlaceholder)
      .setMinValues(1)
      .setMaxValues(1);
    
    const embed = new EmbedBuilder()
      .setTitle(config.steps.step3.embedTitle)
      .setDescription(config.steps.step3.embedDescription)
      .addFields([
        { name: 'Name', value: session.name, inline: true },
        { name: config.steps.step1.identifierLabel, value: session.identifier, inline: true },
        { name: 'Role', value: selectedFunction?.displayName || 'Unknown', inline: true }
      ])
      .setColor(config.formDisplay.embedColor)
      .setFooter({ text: config.formDisplay.footerText })
      .setTimestamp();
    
    await interaction.editReply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(userSelectMenu)]
    });
  } catch (error) {
    console.error('Error handling function selection:', error);
    await interaction.editReply({
      content: config.messages.errorGeneric,
      embeds: [],
      components: []
    });
  }
}

/**
 * Handle Step 3 submission - Process inviter selection and complete registration
 */
async function handleInviterSelection(interaction) {
  await interaction.deferUpdate();
  
  try {
    const config = await RegistrationService.getFormConfig();
    const userId = interaction.customId.split('_')[2];
    
    // Verify user
    if (userId !== interaction.user.id) {
      return await interaction.editReply({
        content: config.messages.permissionDenied,
        embeds: [],
        components: []
      });
    }
    
    // Get session data
    const session = registrationSessions.get(userId);
    if (!session) {
      return await interaction.editReply({
        content: config.messages.sessionExpired,
        embeds: [],
        components: []
      });
    }
    
    // Get inviter information
    const inviterUser = interaction.users.first();
    const inviterMember = interaction.members?.first();
    
    if (!inviterUser) {
      return await interaction.editReply({
        content: '❌ Could not find the selected member.',
        embeds: [],
        components: []
      });
    }
    
    // Get inviter display name
    const inviterDisplayName = (inviterMember && 'displayName' in inviterMember)
      ? inviterMember.displayName
      : inviterUser.username;
    
    // Submit registration
    try {
      const registration = await RegistrationService.submitRegistration({
        userId: interaction.user.id,
        username: interaction.user.username,
        name: session.name,
        identifier: session.identifier,
        functionId: session.functionId,
        invitedBy: inviterDisplayName,
        invitedById: inviterUser.id,
        metadata: {
          discordAvatar: interaction.user.avatarURL(),
          discordDiscriminator: interaction.user.discriminator
        }
      });
      
      // Clear session
      registrationSessions.delete(userId);
      
      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setTitle('✅ ' + config.messages.registrationSuccess)
        .setDescription(`Welcome ${session.name}! Your registration has been completed successfully.`)
        .addFields([
          { name: 'Name', value: session.name, inline: true },
          { name: config.steps.step1.identifierLabel, value: session.identifier, inline: true },
          { name: 'Role', value: registration.functionName, inline: true },
          { name: 'Invited By', value: inviterDisplayName, inline: true }
        ])
        .setColor(0x00FF00)
        .setFooter({ text: config.formDisplay.footerText })
        .setTimestamp();
      
      await interaction.editReply({
        embeds: [successEmbed],
        components: []
      });
      
    } catch (error) {
      if (error.message === 'User already registered') {
        await interaction.editReply({
          content: config.messages.alreadyRegistered,
          embeds: [],
          components: []
        });
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('Error handling inviter selection:', error);
    await interaction.editReply({
      content: config.messages.errorGeneric,
      embeds: [],
      components: []
    });
  }
}

module.exports = {
  handleRegistrationStart,
  handleInfoSubmit,
  handleFunctionSelection,
  handleInviterSelection,
  registrationSessions
};