const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Start Discord bot
const { client } = require('./bot');
client.login(process.env.DISCORD_TOKEN);

const app = express();
const PORT = process.env.PORT || 3140;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Stoffel Bot Backend API' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Bot status and commands API
app.get('/api/bot/status', (req, res) => {
  if (!client.isReady()) {
    return res.json({
      online: false,
      guilds: 0,
      users: 0,
      uptime: '0s'
    });
  }

  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  
  res.json({
    online: true,
    guilds: client.guilds.cache.size,
    users: totalUsers,
    uptime: `${days}d ${hours}h ${minutes}m`,
    ping: Math.round(client.ws.ping)
  });
});

app.get('/api/bot/commands', (req, res) => {
  if (!client.isReady()) {
    return res.json({ commands: [] });
  }

  const commands = client.commandManager.getCommands();
  res.json({ commands });
});

app.post('/api/bot/execute-command', async (req, res) => {
  const { command, guildId, userId } = req.body;
  
  if (!client.isReady()) {
    return res.status(503).json({ error: 'Bot is not ready' });
  }

  try {
    // This would be for admin panel execution - implement based on your needs
    res.json({ 
      success: true, 
      message: `Command execution requested: ${command}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bot management endpoints
app.post('/api/bot/restart', (req, res) => {
  // This could trigger a PM2 restart or similar
  res.json({ message: 'Restart requested' });
});

app.get('/api/bot/logs', (req, res) => {
  // This could return recent bot logs
  res.json({ 
    logs: [
      { timestamp: new Date().toISOString(), level: 'info', message: 'Bot started successfully' },
      { timestamp: new Date(Date.now() - 60000).toISOString(), level: 'info', message: 'Commands registered' }
    ]
  });
});

// Registration configuration endpoints
const fs = require('fs').promises;
const path = require('path');

const registrationConfigPath = path.join(__dirname, 'data/registration-configs.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(registrationConfigPath);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load registration configurations
async function loadRegistrationConfigs() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(registrationConfigPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save registration configurations
async function saveRegistrationConfigs(configs) {
  await ensureDataDir();
  await fs.writeFile(registrationConfigPath, JSON.stringify(configs, null, 2));
}

// Get all registration configurations for a guild
app.get('/api/registration/configs/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const configs = await loadRegistrationConfigs();
    res.json({ configs: configs[guildId] || {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save/update registration configuration
app.post('/api/registration/configs/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { configName, config } = req.body;
    
    const configs = await loadRegistrationConfigs();
    if (!configs[guildId]) {
      configs[guildId] = {};
    }
    
    configs[guildId][configName] = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    
    await saveRegistrationConfigs(configs);
    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete registration configuration
app.delete('/api/registration/configs/:guildId/:configName', async (req, res) => {
  try {
    const { guildId, configName } = req.params;
    
    const configs = await loadRegistrationConfigs();
    if (configs[guildId] && configs[guildId][configName]) {
      delete configs[guildId][configName];
      await saveRegistrationConfigs(configs);
      res.json({ success: true, message: 'Configuration deleted successfully' });
    } else {
      res.status(404).json({ error: 'Configuration not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get registration data/responses
app.get('/api/registration/data/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const dataPath = path.join(__dirname, 'data/registrations.json');
    
    try {
      const data = await fs.readFile(dataPath, 'utf8');
      const registrations = JSON.parse(data);
      res.json({ registrations: registrations[guildId] || {} });
    } catch {
      res.json({ registrations: {} });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get guild channels and roles for dropdown options
app.get('/api/guild/:guildId/info', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot is not ready' });
    }
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    const channels = guild.channels.cache
      .filter(channel => channel.type === 0 || channel.type === 4) // Text channels and categories
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type === 4 ? 'category' : 'text'
      }));
    
    const roles = guild.roles.cache
      .filter(role => !role.managed && role.name !== '@everyone')
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor
      }));
    
    res.json({ 
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL()
      },
      channels,
      roles
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's subscribed servers only
app.get('/api/user/guilds/:userId', async (req, res) => {
  if (!client.isReady()) {
    return res.status(503).json({ error: 'Bot is not ready' });
  }

  try {
    const { userId } = req.params;
    const { getSubscribedServers, hasActiveSubscription } = require('./models/user-server');
    
    console.log(`🔍 Checking subscription for user: ${userId}`);
    console.log(`🧪 Sandbox mode: ${process.env.SANDBOX_MODE}`);
    
    // Check if user has active subscription
    const hasSubscription = await hasActiveSubscription(userId);
    console.log(`💳 User ${userId} has subscription: ${hasSubscription}`);
    
    if (!hasSubscription) {
      console.log(`❌ No subscription for user ${userId}`);
      return res.json({ 
        guilds: [],
        totalGuilds: 0,
        totalMembers: 0,
        hasSubscription: false,
        message: process.env.SANDBOX_MODE === 'true' 
          ? 'Sandbox mode: Use the "Simulate Subscription" button on the payment page to activate test subscription'
          : 'Active subscription required to manage servers'
      });
    }
    
    const subscribedServers = await getSubscribedServers(userId, client);
    
    const guilds = subscribedServers.map(server => {
      const guild = client.guilds.cache.get(server.guildId);
      if (!guild) return null;
      
      return {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ size: 128 }),
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        createdAt: guild.createdAt,
        joined: guild.joinedAt,
        features: guild.features,
        large: guild.large,
        verified: guild.verified,
        partnered: guild.partnered,
        boostLevel: guild.premiumTier,
        boostCount: guild.premiumSubscriptionCount,
        channels: {
          total: guild.channels.cache.size,
          text: guild.channels.cache.filter(c => c.type === 0).size,
          voice: guild.channels.cache.filter(c => c.type === 2).size,
          categories: guild.channels.cache.filter(c => c.type === 4).size
        },
        roles: guild.roles.cache.size,
        emojis: guild.emojis.cache.size,
        region: guild.preferredLocale,
        vanityURLCode: guild.vanityURLCode,
        botJoined: server.addedAt,
        verified: server.verified,
        verifiedAt: server.verifiedAt
      };
    }).filter(Boolean);

    res.json({ 
      guilds,
      totalGuilds: guilds.length,
      totalMembers: guilds.reduce((acc, guild) => acc + guild.memberCount, 0),
      hasSubscription: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add server to user's account (claim ownership)
app.post('/api/user/:userId/claim-server', async (req, res) => {
  try {
    const { userId } = req.params;
    const { guildId } = req.body;
    const { addUserServer, verifyServerOwnership } = require('./models/user-server');
    
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot is not ready' });
    }
    
    // Verify the user owns this server
    const isOwner = await verifyServerOwnership(userId, guildId, client);
    if (!isOwner) {
      return res.status(403).json({ error: 'You must be the server owner to claim this server' });
    }
    
    // Add to user's servers
    await addUserServer(userId, guildId, 'owner');
    
    // Register commands for this server if user has subscription
    const { hasActiveSubscription } = require('./models/user-server');
    const hasSubscription = await hasActiveSubscription(userId);
    
    if (hasSubscription) {
      try {
        await client.commandManager.registerGuildCommands(client, guildId);
        console.log(`✅ Registered commands for claimed server: ${guildId}`);
      } catch (error) {
        console.error(`❌ Failed to register commands for ${guildId}:`, error);
      }
    }
    
    res.json({ success: true, message: 'Server claimed successfully', commandsEnabled: hasSubscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all available servers that user can claim
app.get('/api/user/:userId/available-servers', async (req, res) => {
  if (!client.isReady()) {
    return res.status(503).json({ error: 'Bot is not ready' });
  }

  try {
    const { userId } = req.params;
    const { getUserServers } = require('./models/user-server');
    
    // Get servers user already claimed
    const userServers = await getUserServers(userId);
    const claimedServerIds = userServers.map(s => s.guildId);
    
    // Find servers where user is owner but hasn't claimed yet
    const availableServers = client.guilds.cache
      .filter(guild => guild.ownerId === userId && !claimedServerIds.includes(guild.id))
      .map(guild => ({
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ size: 128 }),
        memberCount: guild.memberCount,
        createdAt: guild.createdAt,
        joined: guild.joinedAt
      }));

    res.json({ availableServers: Array.from(availableServers.values()) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed information for a specific guild
app.get('/api/bot/guilds/:guildId/details', (req, res) => {
  const { guildId } = req.params;
  
  if (!client.isReady()) {
    return res.status(503).json({ error: 'Bot is not ready' });
  }

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const owner = guild.members.cache.get(guild.ownerId);
    const botMember = guild.members.cache.get(client.user.id);

    const guildDetails = {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ size: 256 }),
      banner: guild.bannerURL({ size: 512 }),
      splash: guild.splashURL({ size: 512 }),
      description: guild.description,
      memberCount: guild.memberCount,
      owner: {
        id: guild.ownerId,
        username: owner?.user.username || 'Unknown',
        avatar: owner?.user.displayAvatarURL({ size: 64 })
      },
      createdAt: guild.createdAt,
      joinedAt: guild.joinedAt,
      features: guild.features,
      large: guild.large,
      verified: guild.verified,
      partnered: guild.partnered,
      boostLevel: guild.premiumTier,
      boostCount: guild.premiumSubscriptionCount,
      maxMembers: guild.maximumMembers,
      vanityURL: guild.vanityURLCode,
      preferredLocale: guild.preferredLocale,
      explicitContentFilter: guild.explicitContentFilter,
      verificationLevel: guild.verificationLevel,
      afkTimeout: guild.afkTimeout,
      afkChannelId: guild.afkChannelId,
      systemChannelId: guild.systemChannelId,
      rulesChannelId: guild.rulesChannelId,
      publicUpdatesChannelId: guild.publicUpdatesChannelId,
      channels: {
        total: guild.channels.cache.size,
        text: guild.channels.cache.filter(c => c.type === 0).size,
        voice: guild.channels.cache.filter(c => c.type === 2).size,
        categories: guild.channels.cache.filter(c => c.type === 4).size,
        news: guild.channels.cache.filter(c => c.type === 5).size,
        stage: guild.channels.cache.filter(c => c.type === 13).size,
        forum: guild.channels.cache.filter(c => c.type === 15).size
      },
      roles: guild.roles.cache.size,
      emojis: guild.emojis.cache.size,
      stickers: guild.stickers.cache.size,
      bot: {
        nickname: botMember?.nickname,
        joinedAt: botMember?.joinedAt,
        roles: botMember?.roles.cache.map(role => ({
          id: role.id,
          name: role.name,
          color: role.hexColor
        })) || [],
        permissions: botMember?.permissions.toArray() || []
      }
    };

    res.json(guildDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registration System API Routes
const RegistrationService = require('./services/RegistrationService');

// Get registration configuration
app.get('/api/registration/config', async (req, res) => {
  try {
    const config = await RegistrationService.getFormConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update registration configuration
app.post('/api/registration/config', async (req, res) => {
  try {
    const config = await RegistrationService.updateFormConfig(req.body);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add or update function
app.post('/api/registration/functions', async (req, res) => {
  try {
    const config = await RegistrationService.upsertFunction(req.body);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete function
app.delete('/api/registration/functions/:functionId', async (req, res) => {
  try {
    const { functionId } = req.params;
    const config = await RegistrationService.removeFunction(functionId);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle function active state
app.patch('/api/registration/functions/:functionId/toggle', async (req, res) => {
  try {
    const { functionId } = req.params;
    const config = await RegistrationService.toggleFunction(functionId);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reorder functions
app.post('/api/registration/functions/reorder', async (req, res) => {
  try {
    const { functionIds } = req.body;
    const config = await RegistrationService.reorderFunctions(functionIds);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Discord server data (roles and categories)
app.get('/api/registration/discord/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const data = await RegistrationService.getDiscordServerData(guildId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit registration (internal API for bot)
app.post('/api/registration/submit', async (req, res) => {
  try {
    // Validate bot token (simple security)
    const botToken = req.headers['x-bot-token'];
    if (botToken !== process.env.DISCORD_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const registration = await RegistrationService.submitRegistration(req.body);
    res.json({ success: true, registration });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all registrations
app.get('/api/registration/registrations', async (req, res) => {
  try {
    const registrations = await RegistrationService.getAllRegistrations();
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user registration
app.get('/api/registration/registrations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const registration = await RegistrationService.getUserRegistration(userId);
    if (registration) {
      res.json(registration);
    } else {
      res.status(404).json({ error: 'User not registered' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete registration
app.delete('/api/registration/registrations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await RegistrationService.deleteRegistration(userId);
    res.json({ success: true, message: 'Registration deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get registrations by function
app.get('/api/registration/registrations/function/:functionId', async (req, res) => {
  try {
    const { functionId } = req.params;
    const registrations = await RegistrationService.getRegistrationsByFunction(functionId);
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AutoMod API endpoints
app.get('/api/automod/config/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/automod-configs.json');
    
    let config = null;
    try {
      const data = await fs.readFile(configPath, 'utf8');
      const configs = JSON.parse(data);
      config = configs[guildId];
    } catch {
      // No config file or guild not configured
    }
    
    res.json({ config: config || { enabled: false } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/automod/config/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const configData = req.body;
    
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/automod-configs.json');
    
    // Ensure data directory exists
    const dataDir = path.dirname(configPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    
    let configs = {};
    try {
      const data = await fs.readFile(configPath, 'utf8');
      configs = JSON.parse(data);
    } catch {
      // File doesn't exist, start with empty config
    }
    
    configs[guildId] = {
      ...configData,
      guildId,
      lastUpdated: new Date().toISOString()
    };
    
    if (configData.enabled && !configs[guildId].enabledAt) {
      configs[guildId].enabledAt = new Date().toISOString();
    }
    
    await fs.writeFile(configPath, JSON.stringify(configs, null, 2));
    
    res.json({ success: true, config: configs[guildId] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/automod/test', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Use the same spam detection logic from bot.js
    const result = detectSpamForAPI(message);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Spam detection functions (copied from bot.js)
function detectSpamForAPI(content) {
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
    const randomnessScore = calculateRandomnessForAPI(content);
    if (randomnessScore > 0.7) {
      spamScore += 0.8;
      reasons.push('Random character spam detected');
    }
  }
  
  // Very short nonsense messages
  if (content.length >= 2 && content.length <= 15) {
    const nonsenseScore = calculateNonsenseScoreForAPI(content);
    if (nonsenseScore > 0.6) {
      spamScore += 0.7;
      reasons.push('Nonsense text detected');
    }
  }
  
  // Profanity detection
  const profanityDetected = detectProfanityForAPI(content);
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

// Helper functions for API
function calculateRandomnessForAPI(text) {
  const cleanText = text.toLowerCase().replace(/[^a-z]/g, '');
  if (cleanText.length < 3) return 0;
  
  let randomScore = 0;
  
  // Check for consonant clusters
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
  
  // Check for lack of common letter combinations
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

function calculateNonsenseScoreForAPI(text) {
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

function detectProfanityForAPI(content) {
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

// Server Language API endpoints
app.get('/api/server/:guildId/language', async (req, res) => {
  try {
    const { guildId } = req.params;
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/server-languages.json');
    
    let language = 'en'; // Default
    let config = null;
    
    try {
      const data = await fs.readFile(configPath, 'utf8');
      const languages = JSON.parse(data);
      config = languages[guildId];
      if (config) {
        language = config.language;
      }
    } catch {
      // No config found, use default
    }
    
    res.json({ 
      language, 
      config,
      default: language === 'en' && !config 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/server/:guildId/language', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { language, userId, userName } = req.body;
    
    if (!['en', 'pt'].includes(language)) {
      return res.status(400).json({ error: 'Invalid language. Must be "en" or "pt".' });
    }
    
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/server-languages.json');
    
    // Ensure data directory exists
    const dataDir = path.dirname(configPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    
    let languages = {};
    try {
      const data = await fs.readFile(configPath, 'utf8');
      languages = JSON.parse(data);
    } catch {
      // File doesn't exist, start with empty config
    }
    
    // Get guild name from Discord client
    let serverName = 'Unknown Server';
    if (client && client.isReady()) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        serverName = guild.name;
      }
    }
    
    languages[guildId] = {
      language: language,
      setBy: userId,
      setByName: userName,
      setAt: new Date().toISOString(),
      serverName: serverName
    };
    
    await fs.writeFile(configPath, JSON.stringify(languages, null, 2));
    
    res.json({ 
      success: true, 
      language,
      config: languages[guildId],
      message: language === 'en' ? 'Language set to English' : 'Idioma definido para Português'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bot Customization API endpoints
app.get('/api/server/:guildId/customization', async (req, res) => {
  try {
    const { guildId } = req.params;
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/bot-customizations.json');
    
    let customization = {};
    
    try {
      const data = await fs.readFile(configPath, 'utf8');
      const customizations = JSON.parse(data);
      customization = customizations[guildId] || {};
    } catch {
      // No config found, use empty
    }
    
    // Get current bot nickname from Discord
    let currentNickname = null;
    if (client && client.isReady()) {
      const guild = client.guilds.cache.get(guildId);
      if (guild && guild.members.me) {
        currentNickname = guild.members.me.nickname;
      }
    }
    
    // Remove avatarUrl from response
    const { avatarUrl, ...cleanCustomization } = customization;
    
    res.json({ 
      customization: {
        ...cleanCustomization,
        currentNickname
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/server/:guildId/customization', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { nickname, userId, userName } = req.body;
    
    
    // Validate nickname length
    if (nickname && nickname.length > 32) {
      return res.status(400).json({ error: 'Nickname cannot be longer than 32 characters' });
    }
    
    // Update bot nickname in Discord
    if (client && client.isReady()) {
      const guild = client.guilds.cache.get(guildId);
      if (guild && guild.members.me) {
        try {
          await guild.members.me.setNickname(nickname || null);
        } catch (error) {
          return res.status(400).json({ error: 'Failed to update nickname. Check bot permissions.' });
        }
      }
    }
    
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/bot-customizations.json');
    
    // Ensure data directory exists
    const dataDir = path.dirname(configPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    
    let customizations = {};
    try {
      const data = await fs.readFile(configPath, 'utf8');
      customizations = JSON.parse(data);
    } catch {
      // File doesn't exist, start with empty config
    }
    
    customizations[guildId] = {
      nickname: nickname || null,
      setBy: userId,
      setByName: userName,
      setAt: new Date().toISOString()
    };
    
    await fs.writeFile(configPath, JSON.stringify(customizations, null, 2));
    
    res.json({ 
      success: true, 
      customization: customizations[guildId],
      message: 'Bot customization updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/server/:guildId/customization', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Reset bot nickname in Discord
    if (client && client.isReady()) {
      const guild = client.guilds.cache.get(guildId);
      if (guild && guild.members.me) {
        try {
          await guild.members.me.setNickname(null);
        } catch (error) {
          console.log('Could not reset nickname:', error.message);
        }
      }
    }
    
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/bot-customizations.json');
    
    let customizations = {};
    try {
      const data = await fs.readFile(configPath, 'utf8');
      customizations = JSON.parse(data);
    } catch {
      return res.json({ success: true, message: 'No customizations to reset' });
    }
    
    delete customizations[guildId];
    
    await fs.writeFile(configPath, JSON.stringify(customizations, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Bot customization reset to default'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sandbox: Activate subscription for testing
app.post('/api/sandbox/activate-subscription/:userId', async (req, res) => {
  if (process.env.SANDBOX_MODE !== 'true') {
    return res.status(403).json({ error: 'Sandbox mode not enabled' });
  }

  try {
    const { userId } = req.params;
    const { saveSubscriptions, loadSubscriptions } = require('./models/user-server');
    
    const subscriptions = await loadSubscriptions();
    subscriptions[userId] = {
      status: 'active',
      nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      subscriptionId: `sandbox_${userId}_${Date.now()}`,
      planId: 'sandbox_plan',
      amount: 0,
      currency: 'USD',
      createdAt: new Date().toISOString()
    };
    
    await saveSubscriptions(subscriptions);
    console.log(`✅ Activated sandbox subscription for user: ${userId}`);
    
    res.json({ success: true, message: 'Subscription activated for sandbox testing' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Panel API Endpoints

// Music System Configuration API
app.get('/api/admin/music/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/music-configs.json');
    
    let config = {
      enabled: true,
      defaultVolume: 50,
      maxQueueSize: 100,
      platforms: {
        youtube: true,
        spotify: true,
        soundcloud: true
      },
      autoLeave: {
        enabled: true,
        timeout: 300
      },
      djMode: false,
      voteSkip: true,
      filters: {
        bassBoost: false,
        nightcore: false,
        eightD: false
      },
      restrictions: {
        djRole: null,
        allowedChannels: []
      }
    };
    
    try {
      const data = await fs.readFile(configPath, 'utf8');
      const configs = JSON.parse(data);
      if (configs[guildId]) {
        config = { ...config, ...configs[guildId] };
      }
    } catch {
      // Use defaults
    }
    
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/music/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const configData = req.body;
    
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/music-configs.json');
    
    await ensureDataDir();
    
    let configs = {};
    try {
      const data = await fs.readFile(configPath, 'utf8');
      configs = JSON.parse(data);
    } catch {
      // File doesn't exist
    }
    
    configs[guildId] = {
      ...configData,
      guildId,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(configPath, JSON.stringify(configs, null, 2));
    
    res.json({ success: true, config: configs[guildId] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Moderation Configuration API (enhanced)
app.get('/api/admin/moderation/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/moderation-configs.json');
    
    let config = {
      enabled: false,
      automod: {
        spam: true,
        profanity: true,
        links: false,
        phishing: true,
        toxicity: false
      },
      warnings: {
        enabled: true,
        maxWarnings: 3,
        actions: {
          1: 'warn',
          2: 'timeout',
          3: 'kick'
        }
      },
      logging: {
        enabled: true,
        channel: null
      },
      whitelist: {
        roles: [],
        channels: [],
        users: []
      }
    };
    
    try {
      const data = await fs.readFile(configPath, 'utf8');
      const configs = JSON.parse(data);
      if (configs[guildId]) {
        config = { ...config, ...configs[guildId] };
      }
    } catch {
      // Use defaults
    }
    
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/moderation/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const configData = req.body;
    
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'data/moderation-configs.json');
    
    await ensureDataDir();
    
    let configs = {};
    try {
      const data = await fs.readFile(configPath, 'utf8');
      configs = JSON.parse(data);
    } catch {
      // File doesn't exist
    }
    
    configs[guildId] = {
      ...configData,
      guildId,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(configPath, JSON.stringify(configs, null, 2));
    
    res.json({ success: true, config: configs[guildId] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics API
app.get('/api/admin/analytics/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { timeRange = '7d' } = req.query;
    
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot is not ready' });
    }
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    // Generate mock analytics data for now
    const analytics = {
      overview: {
        totalMembers: guild.memberCount,
        activeMembers: Math.floor(guild.memberCount * 0.3),
        messagesLast24h: Math.floor(Math.random() * 1000) + 500,
        commandsLast24h: Math.floor(Math.random() * 100) + 50
      },
      commands: {
        mostUsed: [
          { name: '/play', usage: Math.floor(Math.random() * 50) + 20 },
          { name: '/skip', usage: Math.floor(Math.random() * 30) + 10 },
          { name: '/queue', usage: Math.floor(Math.random() * 25) + 5 },
          { name: '/warn', usage: Math.floor(Math.random() * 10) + 2 },
          { name: '/clear', usage: Math.floor(Math.random() * 15) + 3 }
        ],
        totalExecuted: Math.floor(Math.random() * 200) + 100
      },
      users: {
        topActive: guild.members.cache
          .filter(m => !m.user.bot)
          .random(5)
          .map(m => ({
            id: m.id,
            username: m.user.username,
            avatar: m.user.displayAvatarURL({ size: 64 }),
            messages: Math.floor(Math.random() * 100) + 20,
            voiceTime: Math.floor(Math.random() * 600) + 60
          }))
      },
      channels: {
        mostActive: guild.channels.cache
          .filter(c => c.type === 0)
          .random(5)
          .map(c => ({
            id: c.id,
            name: c.name,
            messages: Math.floor(Math.random() * 200) + 50
          }))
      },
      moderation: {
        actionsLast24h: Math.floor(Math.random() * 10),
        warnings: Math.floor(Math.random() * 15),
        kicks: Math.floor(Math.random() * 3),
        bans: Math.floor(Math.random() * 2),
        automodActions: Math.floor(Math.random() * 20)
      },
      performance: {
        uptime: Math.floor(process.uptime()),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        responseTime: Math.floor(Math.random() * 50) + 10,
        ping: Math.round(client.ws.ping)
      }
    };
    
    res.json({ analytics, timeRange });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Server Management API
app.get('/api/admin/servers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot is not ready' });
    }
    
    // Check subscription
    const { hasActiveSubscription } = require('./models/user-server');
    const hasSubscription = await hasActiveSubscription(userId);
    
    if (!hasSubscription) {
      return res.json({ 
        servers: [],
        hasSubscription: false,
        message: 'Active subscription required'
      });
    }
    
    // Get user's servers
    const { getSubscribedServers } = require('./models/user-server');
    const subscribedServers = await getSubscribedServers(userId, client);
    
    const servers = subscribedServers.map(server => {
      const guild = client.guilds.cache.get(server.guildId);
      if (!guild) return null;
      
      return {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ size: 128 }),
        memberCount: guild.memberCount,
        online: true,
        botPermissions: guild.members.me?.permissions.toArray() || [],
        isOwner: guild.ownerId === userId,
        joinedAt: guild.joinedAt
      };
    }).filter(Boolean);
    
    res.json({ servers, hasSubscription: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Role and User Management API
app.get('/api/admin/roles/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot is not ready' });
    }
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    const roles = guild.roles.cache
      .filter(role => role.name !== '@everyone')
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        permissions: role.permissions.toArray(),
        mentionable: role.mentionable,
        hoisted: role.hoist,
        managed: role.managed,
        memberCount: role.members.size,
        createdAt: role.createdAt
      }))
      .sort((a, b) => b.position - a.position);
    
    res.json({ roles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/channels/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot is not ready' });
    }
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    const channels = guild.channels.cache.map(channel => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      position: channel.position,
      parentId: channel.parentId,
      topic: channel.topic,
      nsfw: channel.nsfw,
      bitrate: channel.bitrate,
      userLimit: channel.userLimit,
      createdAt: channel.createdAt,
      permissionOverwrites: channel.permissionOverwrites.cache.size
    })).sort((a, b) => a.position - b.position);
    
    res.json({ channels });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log Management API
app.get('/api/admin/logs/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { type = 'all', limit = 50 } = req.query;
    
    // Mock log data for now - in production this would come from database
    const logs = Array.from({ length: parseInt(limit) }, (_, i) => ({
      id: `log_${Date.now() + i}`,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      type: ['moderation', 'music', 'command', 'error'][Math.floor(Math.random() * 4)],
      action: ['User warned', 'Song played', 'Command executed', 'Error occurred'][Math.floor(Math.random() * 4)],
      user: {
        id: '123456789',
        username: 'TestUser',
        avatar: null
      },
      details: 'Sample log entry for testing purposes'
    }));
    
    const filteredLogs = type === 'all' ? logs : logs.filter(log => log.type === type);
    
    res.json({ logs: filteredLogs, total: filteredLogs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System Health Monitoring API
app.get('/api/admin/health', async (req, res) => {
  try {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    const health = {
      bot: {
        status: client.isReady() ? 'online' : 'offline',
        uptime: {
          seconds: Math.floor(uptime),
          formatted: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
        },
        ping: client.ws.ping,
        guilds: client.guilds.cache.size,
        users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
      },
      system: {
        memory: {
          used: Math.round(memory.heapUsed / 1024 / 1024),
          total: Math.round(memory.heapTotal / 1024 / 1024),
          external: Math.round(memory.external / 1024 / 1024)
        },
        cpu: Math.floor(Math.random() * 50) + 10, // Mock CPU usage
        platform: process.platform,
        nodeVersion: process.version
      },
      database: {
        status: 'connected', // Mock status
        responseTime: Math.floor(Math.random() * 10) + 1
      }
    };
    
    res.json({ health });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});