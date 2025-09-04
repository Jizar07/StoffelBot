const fs = require('fs');
const path = require('path');

console.log('🧪 Setting up Stoffel Bot Sandbox Mode\n');

// Check if .env exists
const envPath = path.join(__dirname, 'backend', '.env');
const envExamplePath = path.join(__dirname, 'backend', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from example...');
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created!');
  } catch (error) {
    console.log('❌ Failed to create .env file:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists');
}

// Check .env content
const envContent = fs.readFileSync(envPath, 'utf8');

console.log('\n📋 Setup Checklist:');
console.log('='.repeat(40));

// Check Discord token
if (envContent.includes('your_discord_bot_token_here')) {
  console.log('❌ DISCORD_TOKEN not set');
  console.log('   → Go to Discord Developer Portal');
  console.log('   → Copy your bot token');
  console.log('   → Replace "your_discord_bot_token_here" in backend/.env');
} else {
  console.log('✅ DISCORD_TOKEN is set');
}

// Check sandbox user ID
if (envContent.includes('your_discord_user_id_here')) {
  console.log('❌ SANDBOX_USER_ID not set');
  console.log('   → Enable Developer Mode in Discord');
  console.log('   → Right-click your username → Copy User ID');
  console.log('   → Replace "your_discord_user_id_here" in backend/.env');
} else {
  console.log('✅ SANDBOX_USER_ID is set');
}

// Check sandbox mode
if (envContent.includes('SANDBOX_MODE=true')) {
  console.log('✅ SANDBOX_MODE is enabled');
} else {
  console.log('❌ SANDBOX_MODE not enabled');
  console.log('   → Set SANDBOX_MODE=true in backend/.env');
}

console.log('\n🚀 Next Steps:');
console.log('='.repeat(40));
console.log('1. Complete the setup checklist above');
console.log('2. Run: cd backend && npm install');
console.log('3. Run: pm2 restart stoffel-bot-backend-dev');
console.log('4. Visit the frontend and test server management');

console.log('\n💡 In sandbox mode:');
console.log('- Your user automatically has an active subscription');
console.log('- You can claim any servers you own');
console.log('- Bot commands will work in your claimed servers');
console.log('- No real payment required for testing');

console.log('\n📖 How to use:');
console.log('1. Invite the bot to your Discord server');
console.log('2. Go to the frontend Servers page');
console.log('3. Click "Claim Server" for your servers');
console.log('4. Bot commands will activate immediately');

console.log('\n✨ Setup complete! Edit backend/.env and restart the bot.\n');