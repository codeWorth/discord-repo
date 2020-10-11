// https://discord.com/api/oauth2/authorize?client_id=764381657544392705&permissions=1&scope=bot
// https://discord.com/api/oauth2/authorize?client_id=764381657544392705&redirect_uri=http%3A%2F%2F3.21.237.38%2Fapi%2Fadminpage&response_type=code&scope=identify

const discord = require("discord.js");
const client = new discord.Client();

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}`);
});

client.on("guildCreate", guild => {
	console.log(`Joined a new guild: ${guild.name}`);
	db.insertGuild(guild).catch(err => console.log(err));
});
client.login(process.env.DISCORD_BOT_TOKEN);

export function getInvite(guildId) {
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