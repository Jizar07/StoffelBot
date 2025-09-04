const fs = require('fs').promises;
const path = require('path');

const userServersPath = path.join(__dirname, '../data/user-servers.json');
const subscriptionsPath = path.join(__dirname, '../data/subscriptions.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(userServersPath);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load user-server relationships
async function loadUserServers() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(userServersPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save user-server relationships
async function saveUserServers(data) {
  await ensureDataDir();
  await fs.writeFile(userServersPath, JSON.stringify(data, null, 2));
}

// Load subscriptions
async function loadSubscriptions() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(subscriptionsPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save subscriptions
async function saveSubscriptions(data) {
  await ensureDataDir();
  await fs.writeFile(subscriptionsPath, JSON.stringify(data, null, 2));
}

// Add user-server relationship
async function addUserServer(userId, guildId, role = 'owner') {
  const userServers = await loadUserServers();
  
  if (!userServers[userId]) {
    userServers[userId] = [];
  }
  
  // Check if relationship already exists
  const existing = userServers[userId].find(s => s.guildId === guildId);
  if (!existing) {
    userServers[userId].push({
      guildId,
      role,
      addedAt: new Date().toISOString(),
      verified: false
    });
    await saveUserServers(userServers);
  }
  
  return userServers[userId];
}

// Verify server ownership
async function verifyServerOwnership(userId, guildId, client) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return false;
    
    // Check if user is the server owner
    const isOwner = guild.ownerId === userId;
    
    if (isOwner) {
      const userServers = await loadUserServers();
      if (userServers[userId]) {
        const server = userServers[userId].find(s => s.guildId === guildId);
        if (server) {
          server.verified = true;
          server.verifiedAt = new Date().toISOString();
          await saveUserServers(userServers);
        }
      }
    }
    
    return isOwner;
  } catch (error) {
    console.error('Error verifying server ownership:', error);
    return false;
  }
}

// Get user's servers
async function getUserServers(userId) {
  const userServers = await loadUserServers();
  return userServers[userId] || [];
}

// Check if user has subscription
async function hasActiveSubscription(userId) {
  const subscriptions = await loadSubscriptions();
  const subscription = subscriptions[userId];
  
  // Sandbox mode - more flexible subscription checking
  if (process.env.SANDBOX_MODE === 'true') {
    // In sandbox mode, if user has any subscription record (even test ones), it's valid
    if (subscription) {
      return subscription.status === 'active';
    }
    // If no subscription record exists, return false (they need to activate it via the test button)
    return false;
  }
  
  // Production mode - strict validation
  if (!subscription) return false;
  
  return subscription.status === 'active' && 
         new Date(subscription.nextBillingDate) > new Date();
}

// Get subscribed servers only
async function getSubscribedServers(userId, client) {
  const hasSubscription = await hasActiveSubscription(userId);
  if (!hasSubscription) return [];
  
  const userServers = await getUserServers(userId);
  const result = [];
  
  for (const serverData of userServers) {
    if (serverData.verified) {
      const guild = client.guilds.cache.get(serverData.guildId);
      if (guild) {
        result.push({
          ...serverData,
          guildInfo: {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 128 }),
            memberCount: guild.memberCount,
            ownerId: guild.ownerId
          }
        });
      }
    }
  }
  
  return result;
}

// Auto-register commands for subscribed servers
async function registerCommandsForSubscribedServers(client, commandManager) {
  // In sandbox mode, register commands globally to make testing easier
  if (process.env.SANDBOX_MODE === 'true') {
    console.log('🧪 Sandbox mode: Registering GLOBAL commands for faster testing');
    try {
      await commandManager.registerGlobalCommands(client);
      console.log('✅ [SANDBOX] Successfully registered GLOBAL commands');
      console.log('   Commands will appear in ALL servers within ~5 minutes');
    } catch (error) {
      console.error('❌ Failed to register global commands:');
      console.error('   Error message:', error.message);
      console.error('   Full error:', error);
    }
    return;
  }
  
  const userServers = await loadUserServers();
  const subscriptions = await loadSubscriptions();
  
  // Get all subscribed users
  const activeSubscribers = Object.entries(subscriptions)
    .filter(([_, sub]) => sub.status === 'active' && new Date(sub.nextBillingDate) > new Date())
    .map(([userId]) => userId);
  
  // Register commands for their verified servers
  for (const userId of activeSubscribers) {
    const servers = userServers[userId] || [];
    
    for (const server of servers) {
      if (server.verified) {
        try {
          await commandManager.registerGuildCommands(client, server.guildId);
          console.log(`✅ Registered commands for subscribed server: ${server.guildId}`);
        } catch (error) {
          console.error(`❌ Failed to register commands for ${server.guildId}:`, error);
        }
      }
    }
  }
}

module.exports = {
  addUserServer,
  verifyServerOwnership,
  getUserServers,
  hasActiveSubscription,
  getSubscribedServers,
  registerCommandsForSubscribedServers,
  loadUserServers,
  saveUserServers,
  loadSubscriptions,
  saveSubscriptions
};