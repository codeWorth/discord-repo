import React, { useState } from "react";
import "./App.css";
import * as firebase from "firebase/app";
import "firebase/auth";

const apiUri = "http://54.183.28.145/api/"
const firebaseConfig = {
	apiKey: "AIzaSyAq4jExyQvsBjrfXnBA1nWkz6xYiR0tdnk",
	authDomain: "discord-repos-292002.firebaseapp.com",
	databaseURL: "https://discord-repos-292002.firebaseio.com",
	projectId: "discord-repos-292002",
	storageBucket: "discord-repos-292002.appspot.com",
	messagingSenderId: "159442402012",
	appId: "1:159442402012:web:950fe62f961bbcee8e5219"
};
firebase.initializeApp(firebaseConfig);
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({
	"login_hint": "user@ucla.edu"
});

function App() {

	const [userID, setUserID] = useState("");
	const [guilds, setGuilds] = useState([]);

	async function signIn() {
		firebase.auth().signInWithPopup(provider).then(async function(user) {
			let userIdToken = await firebase.auth().currentUser.getIdToken(true);
			let response = await fetch(apiUri + "user?" + new URLSearchParams( {id: userIdToken} ));
			if (response.ok) {
				setUserID(userIdToken);
				getGuilds(userIdToken);
			} else {
				let json = await response.json();
				console.log(json);
			}
		}).catch(function(error) {
			console.log(error);
		});
	}
	async function getGuilds(userIdToken) {
		let response = await fetch(apiUri + "guilds?" + new URLSearchParams( {id: userIdToken} ));
		let guilds = await response.json();
		setGuilds(guilds);
	}

	if (userID.length === 0) {
		return (
			<button id="signin" onClick={signIn}>Sign In</button>
		);
	} else {
		return (
			<div class="guildsContainer">
				{guilds.map(guild => 
					<div className="guild">
						<table className="topInfo" cellpadding="0" cellspacing="0">
							<colgroup>
								<col id="icon_col"></col>
								<col id="title_col"></col>
							</colgroup>
							<tbody>
								<tr key={guild.id} className="guildInfo">
									<td><img src={guild.iconURL} alt={guild.name} width="75"/></td>
									<td>
										<div className="title">imma test stuff out ok hey he</div>
										<div className="members">{guild.members} Members</div>
									</td>									
								</tr>
							</tbody>
						</table>
						<div className="tags">
							tags will go here
						</div>
						<a href="#" className="joinButton">Join</a>
					</div>
				)}
			</div>
		);
	}
}

export default App;

