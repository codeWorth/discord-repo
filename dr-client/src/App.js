import React, { Component, useState } from "react";
import "./App.css";
import * as firebase from "firebase/app";
import "firebase/auth";

const apiUri = "http://54.67.103.216/api/"
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

firebase.auth().onAuthStateChanged(async user => {
	if (user) {
		let token = await firebase.auth().currentUser.getIdToken(true);
		localStorage.setItem("userIDToken", token);
	} else {
		localStorage.removeItem("userIDToken");
	}
});

class JoinButton extends Component {
	handleClick = async () => {
		let resp = await fetch(apiUri + "join?" + new URLSearchParams( {id: this.props.userID, guildID: this.props.guildID} ));
		let json = await resp.json();
		window.open(json.link);
	};

	render() {
		return (
			<button onClick={this.handleClick} className="joinButton">Join</button>
		);
	}
}

function App() {

	const [userID, setUserID] = useState(localStorage.getItem("userIDToken") || "");
	const [guilds, setGuilds] = useState([]);
	if (userID.length > 0) {
		getGuilds(userID);
	}

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
		setInterval(() => getGuilds(userIdToken), 60000);
	}

	if (userID.length === 0) {
		return (
			<button id="signin" onClick={signIn}>Sign In</button>
		);
	} else {
		return (
			<div className="container">
				<div className="header">
					<span id="searchText">Search: <div id="tagContainer"><input id="tagInput" type="text"/></div></span>
					<button id="signout">Sign Out</button>
				</div>
				<div className="guildsContainer">
					{guilds.map(guild => 
						<div className="guild" key={guild.id}>
							<table className="topInfo" cellPadding="0" cellSpacing="0">
								<colgroup>
									<col id="icon_col"></col>
									<col id="title_col"></col>
								</colgroup>
								<tbody>
									<tr className="guildInfo">
										<td><img src={guild.iconURL} alt="Guild Icon" width="75"/></td>
										<td>
											<div className="title">{guild.name}</div>
											<div className="members">{guild.members} Members</div>
										</td>									
									</tr>
								</tbody>
							</table>
							<div className="tags">
								{guild.tags.map(tag =>
									<button className="tag" key={tag}>{tag}</button>
								)}
							</div>
							<JoinButton userID={userID} guildID={guild.id} />
						</div>
					)}
				</div>
			</div>
		);
	}
}

export default App;

