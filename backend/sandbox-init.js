const { saveSubscriptions, saveUserServers } = require('./models/user-server');

// Mock subscription and server data for testing
async function initializeSandboxData() {
  console.log('🧪 Initializing sandbox mode...');
  
  // Mock subscription data - replace with your actual Discord user ID
  const mockSubscriptions = {
    // Add your Discord user ID here
    'YOUR_DISCORD_USER_ID': {
      status: 'active',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      subscriptionId: 'sandbox_sub_123',
      planId: 'monthly_plan',
      amount: 9.99,
      currency: 'USD',
      createdAt: new Date().toISOString()
    }
  };
  
  // Mock user-server relationships
  const mockUserServers = {
    // Add your Discord user ID here
    'YOUR_DISCORD_USER_ID': []
    // Server relationships will be auto-added when you claim servers
  };
  
  // Save mock data
  await saveSubscriptions(mockSubscriptions);
  await saveUserServers(mockUserServers);
  
  console.log('✅ Sandbox data initialized!');
  console.log('📝 To use sandbox mode:');
  console.log('   1. Replace YOUR_DISCORD_USER_ID with your actual Discord ID');
  console.log('   2. Restart the bot');
  console.log('   3. Your subscription will be active for testing');
  console.log('');
  console.log('💡 How to get your Discord User ID:');
  console.log('   1. Enable Developer Mode in Discord');
  console.log('   2. Right-click your username → Copy User ID');
}

// Run if called directly
if (require.main === module) {
  initializeSandboxData().catch(console.error);
}

module.exports = { initializeSandboxData };