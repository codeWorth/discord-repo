const express = require("express");
const admin = require("firebase-admin");
const db = require("../db_interface.js");
const fetch = require("node-fetch");
const btoa = require("btoa");
const { getInvite, addGuild } = require("../discord_bot.js");
const { asyncHandler } = require("../utility.js");

const router = express.Router();

const guildsMaxCount = 50;
const tagsMaxCount = 10;
const redirect = "http://discordrepo.com:3001/api/add";
const addURL = "https://discord.com/api/oauth2/authorize?" + new URLSearchParams({
	client_id: process.env.DISCORD_CLIENT_ID,
	permissions: 2049,
	redirect_uri: redirect,
	response_type: "code",
	scope: "identify bot"
});

admin.initializeApp({
	credential: admin.credential.applicationDefault(),
	databaseURL: "https://discord-repos-292002.firebaseio.com"
});

router.get("/user", asyncHandler(
	async function (req, res) {
		let userToken = await admin.auth().verifyIdToken(req.query.id);
		let idToken = userToken.uid;
		let passed = await db.checkIdToken(idToken);
		if (passed) {
			console.log("user login", userToken.email);
			res.sendStatus(200);
		} else {
			let domain = userToken.email.split("@")[1];
			if (domain == "ucla.edu" || domain == "g.ucla.edu") {
				console.log("user add", userToken.email);
				await db.addUser(idToken);
				res.sendStatus(200);
			} else {
				console.log("non-ucla login", userToken.email);
				res.status(401).json( {"error": "Unallowed domain."} );
			}
		} 
		
	}, 
	(error, req, res) => res.status(401).json( {"error": JSON.stringify(error)} )
));

router.get("/user/add", (req, res) => {
	res.json( {"url": addURL + `&state=${req.query.id}`} );
});

router.get("/add", asyncHandler(
	async function (req, res) {
		let userToken = await admin.auth().verifyIdToken(req.query.state);
		let passed = await db.checkIdToken(userToken.uid);
		if (!passed) {
			console.log("non-ucla add server", userToken.email);
			res.status(401).json( {"error": "Unallowed domain."} );
			return;
		}

		let code = req.query.code;
		let response = await fetch("https://discordapp.com/api/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				client_id: process.env.DISCORD_CLIENT_ID,
				client_secret: process.env.DISCORD_CLIENT_SECRET,
				grant_type: "authorization_code",
				redirect_uri: redirect,
				code: code,
				scope: "identity",
			})
		});
		let json = await response.json();

		response = await fetch("https://discord.com/api/users/@me", {
			headers: {
				Authorization: `${json.token_type} ${json.access_token}`
			}
		});
		json = await response.json();

		let uid = json.id;
		let guildID = req.query.guild_id;
		addGuild(guildID, uid);
		res.sendStatus(200);
	},
	(error, req, res) => res.sendStatus(401) )
));

router.get("/join", asyncHandler(
	async function (req, res) {
		let guildId = req.query.guildID;
		let idToken = (await admin.auth().verifyIdToken(req.query.id)).uid;
		let passed = await db.checkIdToken(idToken);
		if (passed) {
			console.log("user", idToken, "wants", guildId);
			let invLink = await getInvite(guildId);
			res.json( {"link": invLink} );
		} else {
			res.status(401).json( {"error": "Unrecognized user."} );
		}
	},
	(error, req, res) => res.status(401).json( {"error": JSON.stringify(error)} )
));

router.get("/guilds", asyncHandler(
	async function (req, res) {
		let guilds;

		if ("id_last" in req.query && req.query.id_last !== "") {
			let idLast = req.query.id_last;
			let membersLast = await db.getGuild(idLast);

			if ("tags" in req.query && req.query.tags !== "") {
				let tags = req.query.tags.split("S");
				guilds = await db.getGuildsByTags(tags, guildsMaxCount, membersLast, idLast);
			} else {
				guilds = await db.getGuilds(guildsMaxCount, membersLast, idLast);
			}
		} else {
			if ("tags" in req.query && req.query.tags !== "") {
				let tags = req.query.tags.split("S");
				guilds = await db.getGuildsByTagsStart(tags, guildsMaxCount);
			} else {
				guilds = await db.getGuildsStart(guildsMaxCount);
			}
		}

		res.json(guilds);
	},
	(error, req, res) => res.status(500).json( {"error": JSON.stringify(error)} )
));

router.get("/tags", asyncHandler(
	async function (req, res) {
		let tagSearch = req.query.search;
		let badTags = req.query.bad_tags;
		let tags = await db.getTagsStartingWith(tagSearch, tagsMaxCount, badTags);
		res.json(tags);
	},
	(error, req, res) => console.log(error)
));

module.exports = router;