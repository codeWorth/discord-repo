const e = require("express");
const { response } = require("express");
const express = require("express");
const admin = require("firebase-admin");
const db = require("../db_interface.js");
const { getInvite } = require("../discord_bot.js");
const { asyncHandler } = require("../utility.js");

const router = express.Router();

const guildsMaxCount = 50;
const tagsMaxCount = 10;

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
			res.sendStatus(200);
		} else {
			let domain = userToken.email.split("@")[1];
			if (domain == "ucla.edu" || domain == "g.ucla.edu") {
				await db.addUser(idToken);
				res.sendStatus(200);
			} else {
				res.status(401).json( {"error": "Unallowed domain."} );
			}
		} 
		
	}, 
	(error, req, res) => res.status(401).json( {"error": JSON.stringify(error)} )
));

router.get("/join", asyncHandler(
	async function (req, res) {
		let guildId = req.query.guildID;
		let idToken = (await admin.auth().verifyIdToken(req.query.id)).uid;
		let passed = await db.checkIdToken(idToken);
		if (passed) {
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

		if ('id_last' in req.query && req.query.id_last !== "") {
			let idLast = req.query.id_last;
			let membersLast = await db.getGuild(idLast);

			if ('tags' in req.query && req.query.tags !== "") {
				let tags = req.query.tags.split("S");
				guilds = await db.getGuildsByTags(tags, guildsMaxCount, membersLast, idLast);
			} else {
				guilds = await db.getGuilds(guildsMaxCount, membersLast, idLast);
			}
		} else {
			if ('tags' in req.query && req.query.tags !== "") {
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
	(error, req, res) => res.status(500).json( {"error": JSON.stringify(error)} )
));

module.exports = router;