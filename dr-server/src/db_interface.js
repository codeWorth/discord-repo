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

function splitTags(tags) {
	return tags ? tags.split("S") : [];
}

function tagsToArray(rows) {
	rows.forEach(guild => 
		guild.tags = splitTags(guild.tags)
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
				.then(guild => {
					let url = guild.iconURL();
					if (!url) {
						url = "http://54.67.103.216/no_icon.png"
					} else {
						let parts = url.split(".");
						parts[parts.length - 1] = "png";
						url = parts.join(".");
					}
					connection.query(
						"INSERT INTO guilds VALUES (?, ?, ?, ?, ?, ?)", 
						[guild.id, guild.name, guild.memberCount, url, guild.ownerID, false],
						(err, rows) => {
							if (err) reject(err);
							else resolve();
						}
					);
				})
				.catch(err => reject(err))
		),

	confirmGuild: guildID =>
		new Promise((resolve, reject) =>
			connection.query(
				"UPDATE guilds SET confirmed=TRUE WHERE id=?", [guildID],
				(err, rows) => {
					if (err) reject(err);
					else resolve();
				}
			)
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
				"SELECT * FROM guilds WHERE id=? AND confirmed=TRUE", [guildID],
				(err, rows) => {
					if (err) reject(err);
					else resolve(rows);
				}
			)
		),

	getGuildsStart: count =>
		new Promise((resolve, reject) =>
			connection.query(
				"SELECT * FROM taggedGuilds WHERE confirmed=TRUE ORDER BY members DESC, id LIMIT ?", [count],
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
				"SELECT * FROM taggedGuilds ORDER BY members DESC, id WHERE confirmed=TRUE AND ((members=? AND id>?) OR members<?) LIMIT ?", [membersLast, idLast, membersLast, count],
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
					WHERE tags.tag IN (${tags.map(t => "?").join(",")}) AND confirmed=TRUE
					GROUP BY taggedGuilds.id
					ORDER BY taggedGuilds.members DESC, taggedGuilds.id LIMIT ?`,
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
						AND
						confirmed=TRUE
					GROUP BY taggedGuilds.id
					ORDER BY taggedGuilds.members DESC, taggedGuilds.id LIMIT ?`,
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
				"SELECT id, name, tags FROM taggedGuilds WHERE ownerID=? AND confirmed=TRUE ORDER BY id", [userID],
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
			let badTagsArr = splitTags(badTags);
			let tagCondition = badTagsArr.length > 0 ? `AND NOT(correct_tag IN (${badTagsArr.map(t => "?").join(",")}))` : ``;
			connection.query(
				`SELECT ac.tag, COUNT(tags.tag) as count FROM (
					SELECT DISTINCT correct_tag AS tag FROM autoCorrectTags 
						WHERE 
							real_tag LIKE ?
							${tagCondition}
				) AS ac 
					LEFT JOIN tags ON tags.tag=ac.tag 
					GROUP BY ac.tag ORDER BY count DESC
					LIMIT ?`,
				[substring + "%", ...badTagsArr, limit],
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