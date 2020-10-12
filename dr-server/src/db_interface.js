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

const methods = {
	checkIdToken: idToken => 
		new Promise((resolve, reject) =>
			connection.query(
				"SELECT * FROM users WHERE id == ?", [idToken],
				(err, rows) => {
					if (err) {
						reject(err);
					} else {
						resolve(rows.length > 0);
					}
				}
			)
		),
	
	insertGuild: unfetchedGuild => 
		new Promise((resolve, reject) =>
			unfetchedGuild.fetch()
				.then(guild => 
					connection.query(
						"INSERT INTO guilds VALUES (?, ?, ?, ?)", [guild.id, guild.name, guild.memberCount, guild.iconURL()],
						(err, rows) => {
							if (err) {
								reject(err);
							} else {
								resolve();
							}
						}
					)
				)
				.catch(err => reject(err))
		),

	addUser: idToken =>
		new Promise((resolve, reject) =>
			connection.query(
				"INSERT INTO users VALUES ?", [idToken], 
				(err, rows) => {
					if (err) {
						reject(err);
					} else {
						resolve(true);
					}
				}
			)
		),

	getGuilds: () =>
		new Promise((resolve, reject) =>
			connection.query(
				"SELECT * FROM guilds",
				(err, rows) => {
					if (err) {
						reject(err);
					} else {
						resolve(rows);
					}
				}
			)
		)
};

module.exports = methods;