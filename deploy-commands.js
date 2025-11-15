const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  // --- ADDED NEW COMMAND ---
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays a list of all available commands.'),

  new SlashCommandBuilder()
    .setName('list')
    .setDescription('Lists all your Linodes (for reference).'),

  new SlashCommandBuilder()
    .setName('status-server')
    .setDescription('Checks the status of the dedicated server.'),

  new SlashCommandBuilder()
    .setName('start-server')
    .setDescription('Starts the dedicated server.'),

  new SlashCommandBuilder()
    .setName('stop-server')
    .setDescription('Stops the dedicated server.'),

  new SlashCommandBuilder()
    .setName('reboot-server')
    .setDescription('Reboots the dedicated server.')
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    if (!process.env.GUILD_ID) throw new Error('GUILD_ID is missing from .env file.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands for your server.');
  } catch (error) {
    console.error(error);
  }
})();