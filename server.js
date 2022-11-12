const express = require('express');
const server = express();
server.all('/', (req, res)=>{
    res.send(
      'Seikatsu was here <iframe src="https://discord.com/widget?id=342471443218432031&theme=dark" width="960" height="1640" allowtransparency="true" frameborder="0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>')
})

function keepAlive(){
    server.listen(3000, ()=>{console.log("Server is Ready!")});
}
////////////////////////////////////////////////////////////////////
const fs = require('fs');
const { Client, Collection, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({intents: [GatewayIntentBits.Guilds]});
const config = require("./config.json")
const request = require("request");
const cheerio = require("cheerio");

/* FUNCTION HELL */ // TODO: Import this shit from another file
String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, "g"), replacement);
};

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function hasNumber(myString) {
  return /\d/.test(myString);
}

/* COMMAND HANDLER */
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

/* STARTUP STUFF */
client.on('ready', ()  => {
  console.log(`Logged in as ${client.user.tag}!`);

  // GUILD MONITOR (see config)
  if(config.guildMonitor.enabled) {
    const monitor = config.guildMonitor;
    const channel = client.guilds.cache.find(g => g.id === config.guildId).channels.cache.find(c => c.id === monitor.channel);
    let guildArray = []
    // initial search on startup to keep the bot from logging every single member on startup
    request(`https://www.rucoyonline.com/guild/${toTitleCase(monitor.guild).replaceAll(" ", "%20")}`, (error, response, html) => {
        const $ = cheerio.load(html);
        $("tr").each(function() {
            $(this).find("td").each(function() {
              if(!hasNumber($(this).text().substring(0, $(this).text().indexOf("\n"))) && $(this).text().substring(0, $(this).text().indexOf("\n")) !== "") {
                guildArray.push($(this).text().substring(0, $(this).text().indexOf("\n")))
              }
            });
          });
      })
    // this runs every few minutes to look for changes and log them
    setInterval(async function () {
      let newArray = []
      await request(`https://www.rucoyonline.com/guild/${toTitleCase(monitor.guild).replaceAll(" ", "%20")}`, (error, response, html) => { 
        const $ = cheerio.load(html);
        $("tr").each(function() {
            $(this).find("td").each(function() {
              if(!hasNumber($(this).text().substring(0, $(this).text().indexOf("\n"))) && $(this).text().substring(0, $(this).text().indexOf("\n")) !== "") {
                newArray.push($(this).text().substring(0, $(this).text().indexOf("\n")))
              }
            });
          });
      })
      // wait 15 seconds to make sure data is present
      setTimeout(function () {
        guildArray.forEach(member => {
        // runs if a member has left
        if(!newArray.includes(member)) {
          let leftEmb = new EmbedBuilder()
          .setColor("#FF0000")
          .setDescription(`[${member}](https://www.rucoyonline.com/characters/${toTitleCase(member).replaceAll(" ", "%20")}) has left the guild.`)
          
          channel.send({embeds: [leftEmb]})
        }
      })
      newArray.forEach(member => {
        // runs if a member has joined
        if(!guildArray.includes(member)) {
          let joinEmb = new EmbedBuilder()
          .setColor("#00FF00")
          .setDescription(`[${member}](https://www.rucoyonline.com/characters/${toTitleCase(member).replaceAll(" ", "%20")}) has joined the guild.`)
          
          channel.send({embeds: [joinEmb]})
        }
      })
      guildArray = newArray
      console.log("Guild upoot")
      }, 15000);
    }, monitor.interval);
  }
});

/* COMMAND EXECUTION */
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!\n```\n' + error + "\n```", ephemeral: true });
	}
});

keepAlive();
client.login(process.env.TOKEN);
