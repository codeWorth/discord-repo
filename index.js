require("dotenv").config();
const express = require("express");
const app = express();

const connection = require("mysql")
connection.createConnection({
	host: process.env.DB_HOST,
	username: process.env.DB_USER,
	password: process.env.DB_PASSWORD
});

app.use(express.static("public"));

app.get("/api/test", (req, res) => res.send("test is working!"));

app.listen(3000, () => console.log("Listening on port 3000"));