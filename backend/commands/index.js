const fs = require('fs');
const path = require('path');

class CommandManager {
  constructor() {
    this.commands = new Map();
    this.loadCommands();
  }

  loadCommands() {
    const commandsPath = path.join(__dirname, 'list');
    
    if (!fs.existsSync(commandsPath)) {
      fs.mkdirSync(commandsPath, { recursive: true });
      return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if (command.data && command.execute) {
        this.commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
      }
    }
  }

  async executeCommand(interaction) {
    const command = this.commands.get(interaction.commandName);
    
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Error executing command:', error);
      
      const errorMessage = 'There was an error while executing this command!';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }

  getCommands() {
    return Array.from(this.commands.values()).map(cmd => ({
      name: cmd.data.name,
      description: cmd.data.description,
      options: cmd.data.options || []
    }));
  }

  async registerGuildCommands(client, guildId) {
    try {
      const commands = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
      
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        // Clear existing commands first to avoid duplicates
        await guild.commands.set(commands);
        console.log(`Successfully registered ${commands.length} guild commands for ${guild.name}.`);
      }
    } catch (error) {
      console.error('Error registering guild commands:', error);
    }
  }

  async registerGlobalCommands(client) {
    try {
      const commands = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
      
      await client.application?.commands.set(commands);
      console.log(`Successfully registered ${commands.length} global commands.`);
    } catch (error) {
      console.error('Error registering global commands:', error);
    }
  }

  async clearGlobalCommands(client) {
    try {
      await client.application?.commands.set([]);
      console.log('Successfully cleared all global commands.');
    } catch (error) {
      console.error('Error clearing global commands:', error);
    }
  }

  async clearAllGuildCommands(client, guildId) {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        await guild.commands.set([]);
        console.log(`Successfully cleared all guild commands for ${guild.name}.`);
      }
    } catch (error) {
      console.error('Error clearing guild commands:', error);
    }
  }
}

module.exports = { CommandManager };