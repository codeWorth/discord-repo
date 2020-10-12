const e = require("express");
const { response } = require("express");
const express = require("express");
const admin = require("firebase-admin");
const db = require("../db_interface.js");
const { getInvite } = require("../discord_bot.js");
const { asyncHandler, sha256 } = require("../utility.js");

const router = express.Router();

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
	(error, req, res) => res.status(401).json( {"error": error} )
));

router.post("/user/join", asyncHandler(
	async function (req, res) {
		let guildId = req.query.guildId;
		let idToken = (await admin.auth().verifyIdToken(req.query.id)).uid;
		let passed = await db.checkIdToken(idToken);
		if (passed) {
			let invLink = await getInvite(guildId);
			res.json( {"link": invLink} );
		} else {
			res.status(401).json( {"error": "Unrecognized user."} );
		}
	},
	(error, req, res) => res.status(401).json( {"error": error} )
));

router.get("/guilds", asyncHandler(
	async function (req, res) {
		let idToken = (await admin.auth().verifyIdToken(req.query.id)).uid;
		let passed = await db.checkIdToken(idToken);
		if (passed) {
			let guilds = await db.getGuilds();
			res.json(guilds);
		} else {
			res.status(401).json( {"error": "Unrecognized user."} );
		}
	},
	(error, req, res) => res.status(401).json( {"error": error} )
));

router.get("/adminpage", function (req, res) {
	let code = req.query.code;
});

module.exports = router;