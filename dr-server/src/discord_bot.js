// https://discord.com/api/oauth2/authorize?client_id=764381657544392705&permissions=2049&scope=bot
const discord = require("discord.js");
const { response } = require("express");
const db = require("./db_interface.js");
const { asyncHandler } = require("./utility.js");
const client = new discord.Client();
const adminDiscordUID = process.env.MY_DISCORD_UID;

let correctTo = "";

let updateMembers = new Set();
let updateMembersInterval = setInterval(updateAllMembers, 45000); // every 45 seconds

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}`);
});

client.on("guildCreate", asyncHandler(
	async guild => {
		console.log(`Joined a new guild: ${guild.name}`);
		await db.insertGuild(guild);
		await guild.owner.send(
`Your server, **${guild.name}**, has been added to the Repo. 
If you want it to be removed from the Repo, just remove me from your server.
To manage your server's tags, type \`.tags\`.`
		);
	},
	err => console.error(err)
));
client.on("guildDelete", guild => {
	console.log(`Left guild: ${guild.name}`);
	db.leaveGuild(guild).catch(err => console.error(err));
});
client.on("guildUpdate", (oldGuild, newGuild) => {
	if (oldGuild.id != newGuild.id) {
		console.log(`Id of ${oldGuild.name}/${newGuild.name} changed from ${oldGuild.id} to ${newGuild.id}!`);
		return;
	}
	if (oldGuild.name != newGuild.name || oldGuild.iconURL() != newGuild.iconURL() || oldGuild.ownerID != newGuild.ownerID) {
		console.log(`Updating info for guild: ${oldGuild.name}/${newGuild.name}`);
		db.updateGuild(newGuild).catch(err => console.error(err));
	}
});
client.on("message", asyncHandler(handleMessage, err => console.error(err)));
client.on("guildMemberAdd", member => updateMembers.add(member.guild.id));
client.on("guildMemberRemove", member => updateMembers.add(member.guild.id));

client.login(process.env.DISCORD_BOT_TOKEN);

async function handleMessage(message) {
	if (message.type != "DEFAULT" || message.channel.type != "dm" || message.author.bot) {
		return;
	}
	let msg = message.content.trim();
	let cmd = msg.split(" ")[0];

	if (cmd == ".tags") {

		let userGuilds = await db.getUserGuilds(message.author.id);
		if (userGuilds.length == 0) {
			await message.author.send("You don't have any servers in the Repo yet.");
		} else if (userGuilds.length == 1) {
			if (userGuilds[0].tags.length == 0) {
				await message.author.send(
					`**${userGuilds[0].name}** has no tags.\n` + 
					`Type \`.add <tag>\` to add a tag, and \`.remove <tag>\` to remove a tag.`
				);
			} else {
				let tags = userGuilds[0].tags.join(", ");
				await message.author.send(
					`**${userGuilds[0].name}** has tags: ${tags}.\n` +
					`Type \`.add <tag>\` to add a tag, and \`.remove <tag>\` to remove a tag.`
				);
			}
		} else {
			let msg = userGuilds
				.map((guild, index) => `\t\`${index}\`: **${guild.name}** - ${guild.tags.join(", ")}`)
				.join("\n");
			await message.author.send(
				`Your servers have the following tags:\n` + 
				`${msg}\n\n`+
				`Type \`.add <index> <tag>\` to add a tag, Type \`.remove <index> <tag>\` to remove a tag.`
			);
		}

	} else if (cmd == ".add" || cmd == ".remove") {

		let msgParts = msg.split(" ");
		let userGuilds = await db.getUserGuilds(message.author.id);
		if (userGuilds.length == 0) {
			await message.author.send("You don't have any servers in the Repo yet.");
			return;
		}

		let index = 0;
		let tagName;
		if (userGuilds.length > 1) {
			if (isNaN(parseInt(msgParts[1]))) {
				await message.author.send("Please specify guild index.");
				return;
			} else {
				index = parseInt(msgParts[1]);
				tagName = msgParts.slice(2).join(" ");
			}
		} else {
			tagName = msgParts.slice(1).join(" ");
		}
		if (index >= userGuilds.length || index < 0) {
			await message.author.send("Invalid guild index.");
			return;
		}
		if (tagName.length == 0) {
			await message.author.send("Tag cannot be empty.");
			return;
		}
		if (tagName.length > 32) {
			await message.author.send("Tag may not be more than 32 characters.");
			return;
		}

		tagName = tagName.toLowerCase();
		let correctedTagRows = await db.getCorrectionFrom(tagName);
		if (correctedTagRows.length == 0) {
			await db.addCorrection(tagName, tagName);
		} else {
			let correctTag = correctedTagRows[0].correct_tag;
			if (correctTag != tagName) {
				await message.author.send(`Autocorrected '${tagName}' to '${correctTag}'.`);
				tagName = correctTag;
			}
		}
		if (cmd == ".add") {

			if (userGuilds[index].tags.includes(tagName)) {
				await message.author.send(`**${userGuilds[index].name}** already has tag '${tagName}'.`);
			} else {
				await db.addGuildTag(userGuilds[index].id, tagName);
				await message.author.send(`Added tag '${tagName}' to **${userGuilds[index].name}**.`);
			}

		} else {

			if (userGuilds[index].tags.includes(tagName)) {
				await db.removeGuildTag(userGuilds[index].id, tagName);
				await message.author.send(`Removed tag '${tagName}' from **${userGuilds[index].name}**.`);
			} else {
				await message.author.send(`**${userGuilds[index].name}** does not have tag '${tagName}'.`);
			}

		}
	} else if (message.author.id == adminDiscordUID && cmd == ".correct") {

		let msgParts = msg.split(" ");
		if (msgParts[1] == "to") {
			correctTo = msgParts.slice(2).join(" ");
			correctTo = correctTo.toLowerCase();
			await message.author.send(`Set \`correctTo\` to '${correctTo}'`);
		} else if (msgParts[1] == "from") {
			let correctFrom = msgParts.slice(2).join(" ");
			correctFrom = correctFrom.toLowerCase();

			if (correctTo.length == 0) {
				await message.author.send("Cannot correct to empty tag.");
				return;
			}
			if (correctFrom.length == 0) {
				await message.author.send("Cannot correct from empty tag.");
				return;
			}
			if (correctTo.length > 32) {
				await message.author.send("Cannot correct to tag greater than 32 characters.");
				return;
			}
			if (correctFrom.length > 32) {
				await message.author.send("Cannot correct from tag greater than 32 characters.");
				return;
			}

			let hasCorrection = (await db.getCorrectionFrom(correctFrom)).length > 0;
			if (hasCorrection) {
				await db.updateCorrection(correctFrom, correctTo);
				await message.author.send(`Updated '${correctFrom}' to correct to '${correctTo}'.`);
			} else {
				await db.addCorrection(correctFrom, correctTo);
				await message.author.send(`Added correction from '${correctFrom}' to '${correctTo}'.`);
			}

		} else {
			await message.author.send("Sub command must be \`from\` or \`to\`.");
		}

	} else if (message.author.id == adminDiscordUID && cmd == ".uncorrect") {

		let msgParts = msg.split(" ");
		let correctFrom = msgParts.slice(1).join(" ");
		if (correctFrom.length == 0) {
			await message.author.send("Tag cannot be empty.");
			return;
		}
		if (correctFrom.length > 32) {
			await message.author.send("Tag length cannot be greater than 32 characters.");
			return
		}

		let hasCorrection = (await db.getCorrectionFrom(correctFrom)).length > 0;
		if (hasCorrection) {
			await db.updateCorrection(correctFrom, correctFrom);
			await message.author.send(`Updated '${correctFrom} to correct to '${correctFrom}'.`);
		} else {
			await message.author.send(`There is no correction from '${correctFrom}' to uncorrect.`);
		}

	} else if (message.author.id == adminDiscordUID && cmd == ".corrections") {

		let corrections = await db.getCorrections();
		console.log("Tag corrections:");
		console.log(corrections);
		await message.author.send("Logged corrections to console.");

	} else {
		await message.author.send("Invalid command.");
		return;
	}
}

async function getInvite(guildID) {
	let guild = await client.guilds.fetch(guildID);
	let channel = guild.channels.cache
		.filter(c => c.type === "text")
		.filter(c => c.permissionsFor(guild.me).has("CREATE_INSTANT_INVITE"))
		.reduce((acc, cur) => (cur.position < acc.position) ? cur : acc);
	if (channel) {
		let invite = await channel.createInvite( {maxAge: 45, maxUses: 1} );
		return invite.url;
	} else {
		return new Promise((resolve, reject) => reject("Bot has no channels with permission in this guild."));
	}
}

function updateAllMembers() {
	updateMembers.forEach(guildID =>
		client.guilds.fetch(guildID)
			.then(guild => db.updateGuildMembers(guildID, guild.memberCount))
			.cache(err => console.error(err))
	);
	updateMembers.clear();
}

module.exports = { getInvite };