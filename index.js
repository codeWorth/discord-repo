const express = require('express');
const app = express();

app.use(express.static("public"));

app.get("/api/test", (req, res) => res.send("test is working!"));

app.listen(3000, () => console.log('Listening on port 3000'));