import React, { Component, useEffect, useState } from "react";
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

class SearchOption extends Component {
	handleClick = () => this.props.clickHandler(this.props.option);

	render() {
		return (
			<div className={this.props.option.selected ? "searchOption selected" : "searchOption"} onClick={this.handleClick}>
				<div>{this.props.option.tag}</div>
				<div className="memberCount">{this.props.option.count} {this.props.option.count === 1 ? "use" : "uses"}</div>
			</div>
		);
	}
}

class SearchTag extends Component {
	handleClick = () => this.props.clickHandler(this.props.tag);

	render() {
		return (
			<div className="searchTag">
				<span>{this.props.tag.tag}</span>
				<span className="deleteTag" onClick={this.handleClick}>x</span>
			</div>
		);
	}
}

class TagButton extends Component {
	handleClick = () => this.props.clickHandler(this.props.tag);

	render() {
		return (
			<button className="tag" onClick={this.handleClick}>{this.props.tag}</button>
		);
	}
}

class JoinButton extends Component {
	handleClick = async () => {
		if (this.props.userID.length === 0) {
			alert("You must sign in to join a server.");
		} else {
			let response = await fetch(apiUri + "join?" + new URLSearchParams( {id: this.props.userID, guildID: this.props.guildID} ));
			if (response.ok) {
				let json = await response.json();
				window.open(json.link);
			}
		}
	};

	render() {
		return (
			<button onClick={this.handleClick} className="joinButton">Join</button>
		);
	}
}

let tagsForTimer = [];
function App() {

	const [userID, setUserID] = useState(localStorage.getItem("userIDToken") || "");
	const [guilds, setGuilds] = useState([]);
	const [searchTags, setSearchTags] = useState([]);
	const [searchOptions, setSearchOptions] = useState([]);
	const [searchText, setSearchText] = useState("");
	
	useEffect(() => {
		getGuilds();
		setInterval(getGuilds, 60000);
	}, []);

	useEffect(() => {
		tagsForTimer = searchTags;
		getGuilds();
	}, [searchTags]);

	useEffect(() => {
		getSearchOptions();
	}, [searchText]);

	async function doAuth() {
		if (userID.length === 0) {
			firebase.auth().signInWithPopup(provider).then(async function(user) {
				let userIdToken = await firebase.auth().currentUser.getIdToken(true);
				let response = await fetch(apiUri + "user?" + new URLSearchParams( {id: userIdToken} ));
				if (response.ok) {
					setUserID(userIdToken);
				} else {
					let json = await response.json();
					console.error(json);
				}
			}).catch(err => console.error(err));
		} else {
			firebase.auth().signOut()
				.then(() => setUserID(""))
				.catch(err => console.error(err));
		}
	}

	function postGuild() {
		window.open("https://discord.com/api/oauth2/authorize?client_id=764381657544392705&permissions=2049&scope=bot");
	}

	async function getGuilds() {
		let response = await fetch(apiUri + "guilds?" + new URLSearchParams({
			tags: tagsForTimer.map(tag => tag.tag).join("S")
		}));
		if (response.ok) {
			let guilds = await response.json();
			setGuilds(guilds);
		}
	}

	function addSearchTag(addTag) {
		let optionExists = searchTags.find(tag => tag.tag === addTag);
		if (!optionExists) {
			setSearchTags(searchTags.concat([{"tag": addTag}]));
		}
	}

	function removeSearchTag(removeTag) {
		setSearchTags(searchTags.filter(tag => tag.tag !== removeTag.tag));
	}

	function selectSearchOption(selectOption) {
		addSearchTag(selectOption.tag);
		setSearchText("");
	}

	function searchKeypress(e) {
		if (e.key === "ArrowDown") {
			nextSearchOption();
		} else if (e.key === "ArrowUp") {
			prevSearchOption();
		} else if (e.key === "Enter") {
			let selected = searchOptions.find(option => option.selected);
			if (selected) {
				addSearchTag(selected.tag);
			} else {
				addSearchTag(searchText);
			}
			setSearchText("");
		}
	}

	function nextSearchOption() {
		let curIndex = searchOptions.findIndex(option => option.selected);
		if (curIndex > -1) {
			setSearchOptions(searchOptions.map((option, index) => {
				return {...option, "selected": index === curIndex + 1};
			}));
		} else {
			setSearchOptions(searchOptions.map((option, index) => {
				return {...option, "selected": index === 0};
			}));
		}
	}

	function prevSearchOption() {
		let curIndex = searchOptions.findIndex(option => option.selected);
		if (curIndex > -1) {
			setSearchOptions(searchOptions.map((option, index) => {
				return {...option, "selected": index === curIndex - 1};
			}));
		} else {
			setSearchOptions(searchOptions.map((option, index) => {
				return {...option, "selected": index === searchOptions.length - 1};
			}));
		}
	}

	function updateSearchText(e) {
		setSearchText(e.target.value);
	}

	async function getSearchOptions() {
		if (searchText.length > 0) {
			let response = await fetch(apiUri + "tags?" + new URLSearchParams( {
				"search": searchText, 
				"bad_tags": searchTags.map(tag => tag.tag).join("S")
			}));
			if (response.ok) {
				let options = await response.json();
				setSearchOptions(options);
			}
		} else {
			setSearchOptions([]);
		}
	}

	return (
		<div className="container">
			<div className="header">
				<button onClick={doAuth} id="auth">{userID.length === 0 ? "Sign In" : "Sign Out"}</button>
				<button onClick={postGuild} id="postGuild">Add Server</button>
				<div id="searchContainer">
					<span id="searchText">Tags: </span>
					<input id="tagInput" type="text" value={searchText} onKeyDown={searchKeypress} onChange={updateSearchText} />
					{searchOptions.length > 0 ? (
						<div id="searchOptions">
							{searchOptions.map(option =>
								<SearchOption key={option.tag} option={option} clickHandler={selectSearchOption} />
							)}
						</div>
					) : <br/>}
				</div>
				<div id="tags">
					{searchTags.map(tag =>
						<SearchTag key={tag.tag} tag={tag} clickHandler={removeSearchTag} />
					)}
				</div>
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
								<TagButton key={tag} tag={tag} clickHandler={addSearchTag} />
							)}
						</div>
						<JoinButton userID={userID} guildID={guild.id} />
					</div>
				)}
			</div>
		</div>
	);
}

export default App;

