const fs = require('fs').promises;
const path = require('path');
const { RegistrationConfig, RegistrationFunction, UserRegistration } = require('../models/Registration');

// File paths for persistent storage
const CONFIG_FILE = path.join(__dirname, '../data/registration-config.json');
const REGISTRATIONS_FILE = path.join(__dirname, '../data/user-registrations.json');
const DATA_DIR = path.dirname(CONFIG_FILE);

class RegistrationService {
  constructor() {
    this.client = null;
    this.ensureDataDirectory();
  }

  // Ensure data directory exists
  async ensureDataDirectory() {
    try {
      await fs.access(DATA_DIR);
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
  }

  // Set Discord client for bot operations
  setClient(client) {
    this.client = client;
  }

  // Template substitution helper
  substituteTemplateVariables(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value || '');
    }
    return result;
  }


  // Load configuration from file
  async loadConfig() {
    try {
      await this.ensureDataDirectory();
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Return default config if file doesn't exist
      const defaultConfig = new RegistrationConfig();
      await this.saveConfig(defaultConfig);
      return defaultConfig;
    }
  }

  // Save configuration to file
  async saveConfig(config) {
    await this.ensureDataDirectory();
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  // Get form configuration
  async getFormConfig() {
    return await this.loadConfig();
  }

  // Update form configuration
  async updateFormConfig(updates) {
    const config = await this.loadConfig();
    
    // Deep merge updates into config
    if (updates.functions !== undefined) config.functions = updates.functions;
    if (updates.settings) Object.assign(config.settings, updates.settings);
    if (updates.command) Object.assign(config.command, updates.command);
    if (updates.formDisplay) Object.assign(config.formDisplay, updates.formDisplay);
    if (updates.steps) {
      if (updates.steps.step1) Object.assign(config.steps.step1, updates.steps.step1);
      if (updates.steps.step2) Object.assign(config.steps.step2, updates.steps.step2);
      if (updates.steps.step3) Object.assign(config.steps.step3, updates.steps.step3);
    }
    if (updates.postRegistration) Object.assign(config.postRegistration, updates.postRegistration);
    if (updates.messages) Object.assign(config.messages, updates.messages);
    
    await this.saveConfig(config);
    return config;
  }

  // Add or update function
  async upsertFunction(functionData) {
    const config = await this.loadConfig();
    const existingIndex = config.functions.findIndex(f => f.id === functionData.id);
    
    if (existingIndex >= 0) {
      config.functions[existingIndex] = new RegistrationFunction(functionData);
    } else {
      config.functions.push(new RegistrationFunction(functionData));
    }
    
    // Sort functions by order
    config.functions.sort((a, b) => a.order - b.order);
    
    await this.saveConfig(config);
    return config;
  }

  // Remove function
  async removeFunction(functionId) {
    const config = await this.loadConfig();
    config.functions = config.functions.filter(f => f.id !== functionId);
    await this.saveConfig(config);
    return config;
  }

  // Toggle function active state
  async toggleFunction(functionId) {
    const config = await this.loadConfig();
    const func = config.functions.find(f => f.id === functionId);
    if (func) {
      func.active = !func.active;
      await this.saveConfig(config);
    }
    return config;
  }

  // Reorder functions
  async reorderFunctions(functionIds) {
    const config = await this.loadConfig();
    const reorderedFunctions = [];
    
    functionIds.forEach((id, index) => {
      const func = config.functions.find(f => f.id === id);
      if (func) {
        func.order = index;
        reorderedFunctions.push(func);
      }
    });
    
    config.functions = reorderedFunctions;
    await this.saveConfig(config);
    return config;
  }

  // Load user registrations
  async loadRegistrations() {
    try {
      await this.ensureDataDirectory();
      const data = await fs.readFile(REGISTRATIONS_FILE, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  // Save user registrations
  async saveRegistrations(registrations) {
    await this.ensureDataDirectory();
    await fs.writeFile(REGISTRATIONS_FILE, JSON.stringify(registrations, null, 2));
  }

  // Check if user is already registered
  async isUserRegistered(userId) {
    const registrations = await this.loadRegistrations();
    return !!registrations[userId];
  }

  // Get user registration
  async getUserRegistration(userId) {
    const registrations = await this.loadRegistrations();
    return registrations[userId] || null;
  }

  // Submit new registration
  async submitRegistration(data) {
    const registrations = await this.loadRegistrations();
    
    // Check if already registered
    if (registrations[data.userId]) {
      throw new Error('User already registered');
    }
    
    // Get function details
    const config = await this.loadConfig();
    const selectedFunction = config.functions.find(f => f.id === data.functionId);
    
    if (!selectedFunction) {
      throw new Error('Invalid function selected');
    }
    
    // Create registration record
    const registration = new UserRegistration({
      ...data,
      functionName: selectedFunction.displayName,
      registeredAt: new Date().toISOString()
    });
    
    // Save registration
    registrations[data.userId] = registration;
    await this.saveRegistrations(registrations);
    
    // Process post-registration actions if client is available
    if (this.client && this.client.isReady()) {
      await this.processPostRegistration(registration, selectedFunction, config);
    }
    
    return registration;
  }

  // Process post-registration actions
  async processPostRegistration(registration, selectedFunction, config) {
    try {
      const guild = this.client.guilds.cache.first(); // Get the first guild (you may want to make this configurable)
      if (!guild) return;
      
      const member = await guild.members.fetch(registration.userId);
      if (!member) return;
      
      // Assign role if configured
      if (config.postRegistration.assignRoles && selectedFunction.discordRoleId) {
        const role = guild.roles.cache.get(selectedFunction.discordRoleId);
        if (role && !member.roles.cache.has(role.id)) {
          await member.roles.add(role);
          
          // Update registration metadata
          const registrations = await this.loadRegistrations();
          if (!registrations[registration.userId].metadata.assignedRoles) {
            registrations[registration.userId].metadata.assignedRoles = [];
          }
          registrations[registration.userId].metadata.assignedRoles.push(role.id);
          await this.saveRegistrations(registrations);
        }
      }
      
      // Update nickname if configured
      if (config.postRegistration.nicknameFormat) {
        const nickname = this.substituteTemplateVariables(config.postRegistration.nicknameFormat, {
          name: registration.name,
          identifier: registration.identifier,
          functionName: selectedFunction.displayName
        });
        
        // Discord nickname limit is 32 characters
        if (nickname.length <= 32) {
          try {
            await member.setNickname(nickname);
          } catch (error) {
            console.error('Error setting nickname:', error);
          }
        }
      }
      
      // Send DM if configured
      if (config.postRegistration.sendDM) {
        try {
          const dmMessage = this.substituteTemplateVariables(config.postRegistration.dmMessage, {
            name: registration.name,
            identifier: registration.identifier,
            functionName: selectedFunction.displayName,
            serverIP: config.settings.serverIP || 'Not configured',
            serverPort: config.settings.serverPort || ''
          });
          
          await member.send({
            embeds: [{
              title: config.postRegistration.dmTitle,
              description: dmMessage,
              color: parseInt(config.settings.embedColor.replace('#', ''), 16),
              timestamp: new Date()
            }]
          });
        } catch (error) {
          console.error('Error sending DM:', error);
        }
      }
      
      // Create personal channel if configured
      if (config.postRegistration.createChannel) {
        console.log(`🏗️ Channel creation enabled for user ${registration.userId}`);
        
        // Prioritize global category selection over function-specific category
        const categoryId = config.postRegistration.channelCategoryId || selectedFunction.categoryId;
        console.log(`🏗️ Category ID to use: ${categoryId} (global: ${config.postRegistration.channelCategoryId}, function: ${selectedFunction.categoryId})`);
        
        if (!categoryId) {
          console.error('❌ No category ID available for channel creation');
          return;
        }
        
        const category = guild.channels.cache.get(categoryId);
        console.log(`🏗️ Category found: ${category ? category.name : 'null'} (type: ${category?.type})`);
      
        if (category && category.type === 4) { // Category channel
          console.log(`✅ Valid category found, proceeding with channel creation`);
          
          // Build channel name with prefix and postfix
          const baseName = this.substituteTemplateVariables(
            config.postRegistration.channelNameFormat,
            { 
              name: registration.name, 
              identifier: registration.identifier,
              functionName: selectedFunction.displayName
            }
          );
          
          console.log(`🏗️ Base channel name: ${baseName}`);
          
          // Apply prefix and postfix from configuration
          const prefix = this.substituteTemplateVariables(
            config.postRegistration.channelPrefix || '',
            { 
              name: registration.name, 
              identifier: registration.identifier,
              functionName: selectedFunction.displayName
            }
          );
          
          const postfix = this.substituteTemplateVariables(
            config.postRegistration.channelPostfix || '',
            { 
              name: registration.name, 
              identifier: registration.identifier,
              functionName: selectedFunction.displayName
            }
          );
          
          // Combine prefix + emoji + base name + postfix
          const fullChannelName = (
            prefix + 
            (selectedFunction.channelEmojiPrefix || '') + 
            baseName + 
            postfix
          ).toLowerCase().replace(/[^a-z0-9-_]/g, '-');
          
          console.log(`🏗️ Final channel name: ${fullChannelName}`);
          console.log(`🏗️ Creating channel in category: ${category.name} (${category.id})`);
          
          try {
            const channel = await guild.channels.create({
            name: fullChannelName,
            type: 0, // Text channel
            parent: category.id,
            topic: selectedFunction.channelPermissions?.channelTopic || `Personal channel for ${registration.name}`,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: ['ViewChannel'],
              },
              {
                id: registration.userId,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
              },
              // Add allowed roles
              ...(selectedFunction.channelPermissions?.allowedRoles || []).map(roleId => ({
                id: roleId,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
              }))
            ],
          });
          
          console.log(`✅ Channel created successfully: ${channel.name} (${channel.id})`);
          
          // Send welcome message to the channel
          if (config.postRegistration.welcomeChannelMessage) {
            const welcomeMessage = this.substituteTemplateVariables(
              config.postRegistration.channelWelcomeMessage || 'Welcome to your personal channel!',
              { 
                name: registration.name, 
                identifier: registration.identifier,
                functionName: selectedFunction.displayName
              }
            );
            await channel.send(`${member} ${welcomeMessage}`);
          }
          
          // Update registration metadata
          const registrations = await this.loadRegistrations();
          registrations[registration.userId].metadata.createdChannel = channel.id;
          await this.saveRegistrations(registrations);
          
          } catch (channelError) {
            console.error('❌ Error creating personal channel:', channelError);
          }
        } else {
          console.error(`❌ Category not found or invalid type: ${categoryId} (found: ${category ? 'category exists but wrong type' : 'category not found'})`);
        }
      }
      
      // Log to channel if configured
      if (config.settings.channelId) {
        const logChannel = guild.channels.cache.get(config.settings.channelId);
        if (logChannel && logChannel.type === 0) {
          await logChannel.send({
            embeds: [{
              title: '📝 New Registration',
              description: `${member} has completed registration`,
              fields: [
                { name: 'Name', value: registration.name, inline: true },
                { name: 'ID', value: registration.identifier, inline: true },
                { name: 'Role', value: selectedFunction.displayName, inline: true },
                { name: 'Invited By', value: registration.invitedBy || 'Not specified', inline: true }
              ],
              color: parseInt(config.settings.embedColor.replace('#', ''), 16),
              timestamp: new Date()
            }]
          });
        }
      }
      
    } catch (error) {
      console.error('Error in post-registration processing:', error);
    }
  }

  // Get all registrations
  async getAllRegistrations() {
    const registrations = await this.loadRegistrations();
    return Object.values(registrations);
  }

  // Get registrations by function
  async getRegistrationsByFunction(functionId) {
    const registrations = await this.loadRegistrations();
    return Object.values(registrations).filter(r => r.functionId === functionId);
  }

  // Delete registration
  async deleteRegistration(userId) {
    const registrations = await this.loadRegistrations();
    delete registrations[userId];
    await this.saveRegistrations(registrations);
  }

  // Get Discord server data (roles and categories)
  async getDiscordServerData(guildId) {
    if (!this.client || !this.client.isReady()) {
      return { roles: [], categories: [] };
    }
    
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      return { roles: [], categories: [] };
    }
    
    try {
      // Fetch fresh guild data to ensure we have all roles and channels
      await guild.fetch();
      await guild.roles.fetch();
      await guild.channels.fetch();
      
      const roles = guild.roles.cache
        .filter(role => !role.managed && role.name !== '@everyone')
        .map(role => ({
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position,
          memberCount: role.members.size
        }))
        .sort((a, b) => b.position - a.position);
      
      const categories = guild.channels.cache
        .filter(channel => channel.type === 4) // Category type
        .map(channel => ({
          id: channel.id,
          name: channel.name,
          position: channel.position
        }))
        .sort((a, b) => a.position - b.position);
      
      return { roles, categories };
    } catch (error) {
      console.error('Error fetching Discord server data:', error);
      return { roles: [], categories: [] };
    }
  }
}

// Export singleton instance
module.exports = new RegistrationService();