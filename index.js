// =================================================================
// ==                      IMPORTS & SETUP                        ==
// =================================================================
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { 
  setToken, 
  getLinodes, 
  getLinode, 
  linodeBoot, 
  linodeShutdown, 
  linodeReboot 
} = require('@linode/api-v4');
require('dotenv').config();

// Authenticate with the Linode API using the token from your .env file
setToken(process.env.LINODE_TOKEN);

// =================================================================
// ==                  DISCORD BOT INITIALIZATION                 ==
// =================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// This code runs once when the bot successfully connects to Discord
client.once(Events.ClientReady, () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
});

// =================================================================
// ==                    SLASH COMMAND HANDLER                    ==
// =================================================================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;
  const linodeId = 86902974; // The ID of your dedicated server
  const allowedChannelId = process.env.ALLOWED_CHANNEL_ID; // The ID of your #server-management channel

  // --- CHANNEL & PERMISSION CHECK ---
  // If the command is NOT /help and it's used outside the allowed channel, block it.
  if (commandName !== 'help' && interaction.channelId !== allowedChannelId) {
    return interaction.reply({ 
      content: `You can only use this bot in the <#${allowedChannelId}> channel.`, 
      ephemeral: true // Makes the message visible only to the user
    });
  }

  // --- /help COMMAND ---
  if (commandName === 'help') {
    const helpMessage = `
**Here are the commands I understand:**

🔹 \`/help\`
   - Displays this help message.

🔹 \`/list\`
   - Lists all Linode servers in the account for reference.

🔹 \`/status-server\`
   - Checks the current status of the dedicated server.

🔹 \`/start-server\`
   - Starts the dedicated server and shows its IP address.

🔹 \`/stop-server\`
   - Stops the dedicated server.

🔹 \`/reboot-server\`
   - Reboots the dedicated server (must be running).
    `;
    return interaction.reply({ content: helpMessage, ephemeral: true });
  }

  // --- /list COMMAND ---
  if (commandName === 'list') {
    await interaction.deferReply();
    try {
      const { data: linodes } = await getLinodes();
      if (linodes.length === 0) return interaction.editReply('You have no Linodes in your account.');
      let response = '✅ Here are your Linodes:\n';
      linodes.forEach(linode => {
        response += `\n**${linode.label}**\n  - **ID:** \`${linode.id}\`\n  - **Status:** ${linode.status}\n`;
      });
      return interaction.editReply(response);
    } catch (error) {
      console.error("Error in /list command:", error);
      return interaction.editReply('❌ There was an error fetching your Linode list.');
    }
  }

  // --- /status-server COMMAND ---
  else if (commandName === 'status-server') {
    await interaction.deferReply();
    try {
      const linode = await getLinode(linodeId);
      return interaction.editReply(`ℹ️ The server **${linode.label}** is currently **${linode.status}**.`);
    } catch (error) {
      console.error(`Error in /status-server for ID ${linodeId}:`, error);
      return interaction.editReply(`❌ Could not retrieve status for the server. It may have been removed.`);
    }
  }

  // --- ACTION COMMANDS (START, STOP, REBOOT) ---
  else if (['start-server', 'stop-server', 'reboot-server'].includes(commandName)) {
    await interaction.deferReply();
    
    try {
      const linode = await getLinode(linodeId);
      let actionPromise;
      let actionVerb = '';

      // Pre-checks to validate the command
      if (commandName === 'start-server') {
        if (linode.status === 'running') return interaction.editReply(`✅ The server **${linode.label}** is already running.\n**IP Address:** \`${linode.ipv4[0]}\``);
        if (linode.status !== 'offline') return interaction.editReply(`🟡 The server is currently **${linode.status}**. Please wait for it to be offline before starting.`);
        actionPromise = linodeBoot(linode.id);
        actionVerb = 'Starting';
      } 
      else if (commandName === 'stop-server') {
        if (linode.status === 'offline') return interaction.editReply(`✅ The server **${linode.label}** is already offline.`);
        if (linode.status !== 'running') return interaction.editReply(`🟡 The server is currently **${linode.status}**. It cannot be stopped right now.`);
        actionPromise = linodeShutdown(linode.id);
        actionVerb = 'Stopping';
      } 
      else if (commandName === 'reboot-server') {
        if (linode.status !== 'running') return interaction.editReply(`❌ The server must be **running** to be rebooted. It is currently **${linode.status}**.`);
        actionPromise = linodeReboot(linode.id);
        actionVerb = 'Rebooting';
      }

      // Execute the command and send the initial reply
      await actionPromise;
      await interaction.editReply(`⌛ **${actionVerb}** the server **${linode.label}**. Checking status in 60 seconds...`);

      // Wait 60 seconds before sending a follow-up
      setTimeout(async () => {
        try {
          const finalLinode = await getLinode(linode.id);
          let followUpMessage = `✅ **Status Update for ${finalLinode.label}**: The server is now **${finalLinode.status}**.`;
          
          if (commandName === 'start-server' && finalLinode.status === 'running') {
            followUpMessage += `\n**IP Address:** \`${finalLinode.ipv4[0]}\``;
          }
          await interaction.followUp(followUpMessage);
        } catch (checkError) {
          console.error(`Error in setTimeout check for ${linode.label}:`, checkError);
          await interaction.followUp(`⚠️ Could not verify the final status for **${linode.label}**.`);
        }
      }, 60000); // 60,000 milliseconds = 60 seconds

    } catch (apiError) {
        console.error(`Error in action command for ${linodeId}:`, apiError);
        const errorMessage = apiError.response?.data?.errors?.[0]?.reason || 'An unknown API error occurred.';
        await interaction.editReply(`❌ A command failed for the server. \n**Reason:** ${errorMessage}`);
    }
  }
});

// =================================================================
// ==                        BOT LOGIN                            ==
// =================================================================
// Login to Discord using the token from your .env file
client.login(process.env.BOT_TOKEN);