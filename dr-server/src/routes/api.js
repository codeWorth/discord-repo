const express = require("express");
const admin = require("firebase-admin");
const db = require("../db_interface.js");
const { getInvite } = require("../discord_bot.js");
const { asyncHandler } = require("../utility.js");

const router = express.Router();

admin.initializeApp({
	credential: admin.credential.applicationDefault(),
	databaseURL: "https://discord-repos-292002.firebaseio.com"
});

router.get("/", function(req, res, next) {
	res.json( {"world": "hello" } );
});

router.get("/api/user", asyncHandler(
	async function (req, res) {
		let idToken = req.query.id;
		await admin.auth().verifyIdToken(idToken);
		await db.addUser(idToken);
		res.sendStatus(200);
	}, 
	error => res.status(401).json( {"error": error} )
));

router.post("/api/user/join", asyncHandler(
	async function (req, res) {
		let guildId = req.query.guildId;
		let idToken = req.query.id;
		let passed = await db.checkIdToken(idToken);
		if (passed) {
			let invLink = await getInvite(guildId);
			res.json( {"link": invLink} );
		} else {
			res.status(401).json( {"error": "Unrecognized user."} );
		}
	},
	error => res.status(401).json( {"error": error} )
));

router.get("/api/guilds", asyncHandler(
	async function (req, res) {
		let idToken = req.query.id;
		let passed = await db.checkIdToken(idToken);
		if (passed) {
			let guilds = await db.getGuilds();
			res.json( {"guilds": guilds} );
		} else {
			res.status(401).json( {"error": "Unrecognized user."} );
		}
	},
	error => res.status(401).json( {"error": error} )
));

router.get("/api/adminpage", function (req, res) {
	let code = req.query.code;
});

module.exports = router;