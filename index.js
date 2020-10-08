require("dotenv").config();
const express = require("express");
const app = express();

const connection = require("mysql")
connection.createConnection({
	host: process.env.DB_HOST,
	username: process.env.DB_USER,
	password: process.env.DB_PASSWORD
});

connection.connect(err => {
	if (err) throw err;
	console.log(`Connected to mysql as ${process.env.DB_USER}`);
});

app.use(express.static("public"));

app.get("/api/test", (req, res) => res.send("test is working!"));

app.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}`));