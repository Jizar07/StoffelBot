const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const configPath = path.join(__dirname, '../data/registration-configs.json');

// Load registration configurations
async function loadConfigs() {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save registration data
async function saveRegistrationData(guildId, userId, configName, responses) {
  const dataPath = path.join(__dirname, '../data/registrations.json');
  let registrations = {};
  
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    registrations = JSON.parse(data);
  } catch {
    // File doesn't exist, start with empty object
  }
  
  if (!registrations[guildId]) {
    registrations[guildId] = {};
  }
  
  registrations[guildId][userId] = {
    configName,
    responses,
    timestamp: new Date().toISOString()
  };
  
  await fs.writeFile(dataPath, JSON.stringify(registrations, null, 2));
}

async function handleRegistrationButton(interaction) {
  const configName = interaction.customId.replace('registration_', '');
  const configs = await loadConfigs();
  const guildId = interaction.guild.id;
  
  if (!configs[guildId] || !configs[guildId][configName]) {
    await interaction.reply({
      content: '❌ Registration configuration not found.',
      ephemeral: true
    });
    return;
  }
  
  const config = configs[guildId][configName];
  
  // Create modal with questions
  const modal = new ModalBuilder()
    .setCustomId(`registration_modal_${configName}`)
    .setTitle(config.modalTitle || 'Server Registration');
  
  // Add questions as text inputs (Discord modals support up to 5 components)
  const maxQuestions = Math.min(config.questions?.length || 0, 5);
  
  for (let i = 0; i < maxQuestions; i++) {
    const question = config.questions[i];
    const textInput = new TextInputBuilder()
      .setCustomId(`question_${i}`)
      .setLabel(question.label || `Question ${i + 1}`)
      .setStyle(question.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(question.required !== false)
      .setMaxLength(question.maxLength || (question.style === 'paragraph' ? 1000 : 100));
    
    if (question.placeholder) {
      textInput.setPlaceholder(question.placeholder);
    }
    
    if (question.minLength) {
      textInput.setMinLength(question.minLength);
    }
    
    modal.addComponents(new ActionRowBuilder().addComponents(textInput));
  }
  
  await interaction.showModal(modal);
}

async function handleRegistrationModalSubmit(interaction) {
  const configName = interaction.customId.replace('registration_modal_', '');
  const configs = await loadConfigs();
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  
  if (!configs[guildId] || !configs[guildId][configName]) {
    await interaction.reply({
      content: '❌ Registration configuration not found.',
      ephemeral: true
    });
    return;
  }
  
  const config = configs[guildId][configName];
  
  // Collect responses
  const responses = {};
  for (let i = 0; i < (config.questions?.length || 0) && i < 5; i++) {
    const response = interaction.fields.getTextInputValue(`question_${i}`);
    responses[`question_${i}`] = {
      question: config.questions[i].label,
      answer: response
    };
  }
  
  // Save registration data
  await saveRegistrationData(guildId, userId, configName, responses);
  
  try {
    const member = interaction.member;
    
    // Apply roles
    if (config.roles && config.roles.length > 0) {
      for (const roleId of config.roles) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role && !member.roles.cache.has(roleId)) {
          await member.roles.add(role);
        }
      }
    }
    
    // Update nickname with prefix/postfix
    if (config.nicknamePrefix || config.nicknamePostfix) {
      let newNickname = member.displayName;
      if (config.nicknamePrefix) {
        newNickname = `${config.nicknamePrefix}${newNickname}`;
      }
      if (config.nicknamePostfix) {
        newNickname = `${newNickname}${config.nicknamePostfix}`;
      }
      
      // Discord nickname limit is 32 characters
      if (newNickname.length <= 32) {
        await member.setNickname(newNickname);
      }
    }
    
    // Create personal channel if configured
    if (config.createChannels && config.channelCategory) {
      const channelName = `${config.channelPrefix || ''}${member.displayName}${config.channelPostfix || ''}`.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      
      const category = interaction.guild.channels.cache.get(config.channelCategory);
      if (category && category.type === 4) { // Category channel
        const channel = await interaction.guild.channels.create({
          name: channelName,
          type: 0, // Text channel
          parent: category.id,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: ['ViewChannel'],
            },
            {
              id: userId,
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
            },
          ],
        });
        
        // Send welcome message to the new channel
        if (config.channelWelcomeMessage) {
          await channel.send(`Welcome ${member}! ${config.channelWelcomeMessage}`);
        }
      }
    }
    
    // Send confirmation
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Registration Complete!')
      .setDescription(config.successMessage || 'Thank you for registering! Your information has been recorded.')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    // Send notification to log channel if configured
    if (config.logChannel) {
      const logChannel = interaction.guild.channels.cache.get(config.logChannel);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('📝 New Registration')
          .setDescription(`${member} has completed registration: **${configName}**`)
          .addFields(
            Object.entries(responses).map(([key, value]) => ({
              name: value.question,
              value: value.answer,
              inline: false
            }))
          )
          .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
    
  } catch (error) {
    console.error('Error processing registration:', error);
    await interaction.reply({
      content: '❌ There was an error processing your registration. Please try again or contact an administrator.',
      ephemeral: true
    });
  }
}

module.exports = {
  handleRegistrationButton,
  handleRegistrationModalSubmit,
  loadConfigs
};