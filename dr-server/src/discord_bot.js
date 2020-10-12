// https://discord.com/api/oauth2/authorize?client_id=764381657544392705&permissions=1&scope=bot
// https://discord.com/api/oauth2/authorize?client_id=764381657544392705&redirect_uri=http%3A%2F%2F54.183.28.145%2Fapi%2Fadminpage&response_type=code&scope=identify
const discord = require("discord.js");
const db = require("./db_interface.js");
const client = new discord.Client();

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}`);
});

client.on("guildCreate", guild => {
	console.log(`Joined a new guild: ${guild.name}`);
	db.insertGuild(guild).catch(err => console.log(err));
});
client.on("guildDelete", guild => {
	console.log(`Left guild: ${guild.name}`);
	db.leaveGuild(guild).catch(err => console.log(err));
});
client.on("guildUpdate", (oldGuild, newGuild) => {
	if (oldGuild.id != newGuild.id) {
		console.log(`Id of ${oldGuild.name}/${newGuild.name} changed from ${oldGuild.id} to ${newGuild.id}!`);
		return;
	}
	if (oldGuild.name != newGuild.name || oldGuild.iconUrl() != newGuild.iconUrl()) {
		console.log(`Updating info for guild: ${oldGuild.name}/${newGuild.name}`);
		db.updateGuild(newGuild).catch(err => console.log(err));
	}
});
client.login(process.env.DISCORD_BOT_TOKEN);

function getInvite(guildId) {
	let guild = client.guilds.get(guildId);
	let channel = guild.channels
		.filter(c => c.type === "text")
		.filter(c => c.permissionsFor(guild.me).has("CREATE_INSTANT_INVITE"))
		.reduce((acc, cur) => (cur.position < acc.position) ? cur : acc);
	if (channel) {
		return channel.createInvite({
			maxAge: 45,
			maxUses: 1
		});
	} else {
		return new Promise((resolve, reject) => reject("Bot has no channels with permission in this guild."));
	}
}

module.exports = { getInvite };