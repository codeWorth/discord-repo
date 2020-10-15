const mysql = require("mysql");
const connection = mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME
});
connection.connect(err => {
	if (err) throw err;
	console.log(`Connected to mysql as ${process.env.DB_USER}`);
});

function tagsToArray(rows) {
	rows.forEach(guild => 
		guild.tags = guild.tags ? guild.tags.split("S") : []
	);
	return rows;
}

function updateTags(real_tag, correct_tag) {
	return new Promise((resolve, reject) =>
		connection.query( // remove tags which will become duplicates
			"DELETE t2 FROM tags t1 INNER JOIN tags t2 ON t1.guildID=t2.guildID AND t1.tag=? AND t2.tag=?", [correct_tag, real_tag],
			(err, rows) => {
				if (err){
					reject(err);
				} else {
					connection.query( // update remaining tags
						"UPDATE tags SET tags.tag=? WHERE tags.tag=?", [correct_tag, real_tag],
						(err, rows) => {
							if (err) reject(err);
							else resolve();
						}
					)
				}
			}
		)
	);
}	

const methods = {
	insertGuild: unfetchedGuild => 
		new Promise((resolve, reject) =>
			unfetchedGuild.fetch()
				.then(guild => 
					connection.query(
						"INSERT INTO guilds VALUES (?, ?, ?, ?, ?)", [guild.id, guild.name, guild.memberCount, guild.iconURL(), guild.ownerID],
						(err, rows) => {
							if (err) reject(err);
							else resolve();
						}
					)
				)
				.catch(err => reject(err))
		),

	updateGuild: guild =>
		new Promise((resolve, reject) =>
			connection.query(
				"UPDATE guilds SET name=?, iconURL=?, ownerID=? WHERE id=?", [guild.name, guild.iconURL(), guild.ownerID, guild.id],
				(err, rows) => {
					if (err) reject(err);
					else resolve();
				}
			)
		),
	
	updateGuildMembers: (guildID, members) =>
		new Promise((resolve, reject) =>
			connection.query(
				"UPDATE guilds SET members=? WHERE id=?", [members, guildID],
				(err, rows) => {
					if (err) reject(err);
					else resolve();
				}
			)
		),

	leaveGuild: guild =>
		new Promise((resolve, reject) =>
			connection.query(
				"DELETE FROM guilds WHERE id=?", [guild.id],
				(err, rows) => {
					if (err) reject(err);
					else resolve();
				}
			)
		),

	getGuild: guildID =>
		new Promise((resolve, reject) => 
			connection.query(
				"SELECT * FROM guilds WHERE id=?", [guildID],
				(err, rows) => {
					if (err) reject(err);
					else resolve(rows);
				}
			)
		),

	getGuildsStart: count =>
		new Promise((resolve, reject) =>
			connection.query(
				"SELECT * FROM taggedGuilds ORDER BY members DESC, id LIMIT ?", [count],
				(err, rows) => {
					if (err) reject(err);
					else {
						rows = tagsToArray(rows);
						resolve(rows);
					}
				}
			)
		),


	getGuilds: (count, membersLast, idLast) =>
		new Promise((resolve, reject) =>
			connection.query(
				"SELECT * FROM taggedGuilds ORDER BY members DESC, id WHERE (members=? AND id>?) OR members<? LIMIT ?", [membersLast, idLast, membersLast, count],
				(err, rows) => {
					if (err) reject(err);
					else {
						rows = tagsToArray(rows);
						resolve(rows);
					}
				}
			)
		),

	getGuildsByTagsStart: (tags, count) =>
		new Promise((resolve, reject) => 
			connection.query(
				`SELECT taggedGuilds.* FROM taggedGuilds 
					INNER JOIN tags ON taggedGuilds.id=tags.guildID 
					WHERE tags.tag IN (${tags.map(t => "?").join(",")}) 
					ORDER BY members DESC, id LIMIT ?`,
				[...tags, count],
				(err, rows) => {
					if (err) reject(err);
					else {
						rows = tagsToArray(rows);
						resolve(rows);
					}
				}
			)
		),

	getGuildsByTags: (tags, count, membersLast, idLast) =>
		new Promise((resolve, reject) => 
			connection.query(
				`SELECT taggedGuilds.* FROM taggedGuilds 
					INNER JOIN tags ON taggedGuilds.id=tags.guildID 
					WHERE 
						tags.tag IN (${tags.map(t => "?").join(",")}) 
						AND
						((members=? AND id>?) OR members<?)
					ORDER BY members DESC, id LIMIT ?`,
				[...tags, membersLast, idLast, membersLast, count],
				(err, rows) => {
					if (err) reject(err);
					else {
						rows = tagsToArray(rows);
						resolve(rows);
					}
				}
			)
		),

	getUserGuilds: userID =>
		new Promise((resolve, reject) =>
			connection.query(
				"SELECT id, name, tags FROM taggedGuilds WHERE ownerID=? ORDER BY id", [userID],
				(err, rows) => {
					if (err) reject(err);
					else {
						rows = tagsToArray(rows);
						resolve(rows);
					}
				}
			)
		),

	addGuildTag: (guildID, tag) =>
		new Promise((resolve, reject) =>
			connection.query(
				"INSERT INTO tags (guildID, tag) VALUES (?, ?)", [guildID, tag],
				(err, rows) => {
					if (err) reject(err);
					else resolve();
				}
			)
		),

	removeGuildTag: (guildID, tag) =>
		new Promise((resolve, reject) => 
			connection.query(
				"DELETE FROM tags WHERE guildID=? AND tag=?", [guildID, tag],
				(err, rows) => {
					if (err) reject(err);
					else resolve();
				}
			)
		),

	getTagsStartingWith: (substring, limit, badTags) =>
		new Promise((resolve, reject) => {
			let badTagsArr = tagsToArray(badTags);
			connection.query(
				`SELECT ac.correct_tag as tag, COUNT(*) as count FROM autoCorrectTags AS ac
					LEFT JOIN tags AS t ON ac.correct_tag=t.tag
					WHERE 
						ac.real_tag LIKE ?
						AND
						ac.correct_tag IN (${badTagsArr.map(t => "?").join(",")})
					ORDER BY count GROUP BY ac.correct_tag
					LIMIT ?
				`, [substring + "%", ...badTagsArr, limit],
				(err, rows) => {
					if (err) reject(err);
					else resolve(rows);
				}
			)
		}),

	checkIdToken: idToken => 
		new Promise((resolve, reject) =>
			connection.query(
				"SELECT * FROM users WHERE id=?", [idToken],
				(err, rows) => {
					if (err) reject(err);
					else resolve(rows.length > 0);
				}
			)
		),

	addUser: idToken =>
		new Promise((resolve, reject) =>
			connection.query(
				"INSERT INTO users VALUES (?)", [idToken], 
				(err, rows) => {
					if (err) reject(err);
					else resolve();
				}
			)
		),

	getCorrectionFrom: real_tag =>
		new Promise((resolve, reject) =>
			connection.query(
				"SELECT correct_tag FROM autoCorrectTags WHERE real_tag=?", [real_tag],
				(err, rows) => {
					if (err) reject(err);
					else resolve(rows);
				}
			)
		),

	updateCorrection: (real_tag, correct_tag) =>
		new Promise((resolve, reject) =>
			connection.query(
				"UPDATE autoCorrectTags SET real_tag=?, correct_tag=? WHERE real_tag=?", [real_tag, correct_tag, real_tag],
				(err, rows) => {
					if (err) {
						reject(err);
					} else {
						cachedCorrections = null;
						updateTags(real_tag, correct_tag).then(resolve).catch(reject);
					}
				}
			)
		),

	addCorrection: (real_tag, correct_tag) =>
		new Promise((resolve, reject) =>
			connection.query(
				"INSERT INTO autoCorrectTags VALUES (?, ?)", [real_tag, correct_tag],
				(err, rows) => {
					if (err) {
						reject(err);
					} else {
						cachedCorrections = null;
						updateTags(real_tag, correct_tag).then(resolve).catch(reject);
					}
				}
			)
		),

	getCorrections: () =>
		new Promise((resolve, reject) => 
			connection.query(
				"SELECT * FROM autoCorrectTags", [],
				(err, rows) => {
					if (err) reject(err);
					else resolve(rows);
				}
			)
		)
};

module.exports = methods;