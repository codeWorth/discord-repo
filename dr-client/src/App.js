import React, { Component, useState } from "react";
import "./App.css";
import * as firebase from "firebase/app";
import "firebase/auth";
import { getGuilds } from "../../dr-server/src/db_interface";

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
			<div className={this.props.option.selected ? "searchOption selected" : "searchOption"} key={this.props.option.tag}>
				<div>{this.props.option.tag}</div>
				<div className="memberCount" onClick={this.handleClick}>{this.props.option.count} uses</div>
			</div>
		);
	}
}

class SearchTag extends Component {
	handleClick = () => this.props.clickHandler(this.props.tag);

	render() {
		return (
			<div className="searchTag" key={this.props.tag.tag}>
				<span>{this.props.tag.tag}</span>
				<span clasName="deleteTag">x</span>
			</div>
		);
	}
}

class TagButton extends Component {
	handleClick = () => this.props.clickHandler(this.props.tag);

	render() {
		return (
			<button className="tag" key={this.props.tag} onClick={this.handleClick}>{this.props.tag}</button>
		);
	}
}

class JoinButton extends Component {
	handleClick = async () => {
		if (this.props.userID.length === 0) {
			alert("You must sign in to join a server.");
		} else {
			let response = await fetch(apiUri + "join?" + new URLSearchParams( {id: this.props.userID, guildID: this.props.guildID} ));
			let json = await response.json();
			window.open(json.link);
		}
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
	const [searchTags, setSearchTags] = useState([]);
	const [searchOptions, setSearchOptions] = useState([]);
	const [searchText, setSearchText] = useState("");
	
	getGuilds();
	setInterval(getGuilds, 60000);

	async function doAuth() {
		if (userID.length === 0) {
			firebase.auth().signInWithPopup(provider).then(async function(user) {
				let userIdToken = await firebase.auth().currentUser.getIdToken(true);
				let response = await fetch(apiUri + "user?" + new URLSearchParams( {id: userIdToken} ));
				if (response.ok) {
					setUserID(userIdToken);
				} else {
					let json = await response.json();
					console.log(json);
				}
			}).catch(err => console.error(err));
		} else {
			firebase.auth().signOut()
				.then(() => setUserID(""))
				.catch(err => console.error(err));
		}
	}
	async function getGuilds() {
		let response = await fetch(apiUri + "guilds");
		let guilds = await response.json();
		setGuilds(guilds);
	}
	function removeSearchTag(removeTag) {
		setSearchTags(searchTags.filter(tag => tag.tag != removeTag.tag));
	}
	function selectSearchOption(selectOption) {
		setSearchOptions(searchOptions.map(option => { 
			return {...option, "selected": option.tag == selectOption.tag}; 
		}));
	}
	function searchKeypress(e) {
		if (e.key == "ArrowDown" || e.key == "ArrowRight") {
			nextSearchOption();
		} else if (e.key == "ArrowUp" || e.key == "ArrowLeft") {
			prevSearchOption();
		} else if (e.key == "Enter") {
			addSearchOption(searchText);
			setSearchText("");
			setSearchOptions([]);
		} else {
			getSearchOptions(e.target.value);
		}
	}
	function nextSearchOption() {
		let curIndex = searchOptions.findIndex(option => option.selected);
		if (curIndex > -1) {
			curIndex = Math.min(searchOptions.length - 1, curIndex + 1);
			setSearchOptions(searchOptions.map((option, index) => {
				return {...option, "selected": index == curIndex};
			}));
			setSearchText(searchOptions[curIndex].tag);
		} else {
			setSearchOptions(searchOptions.map((option, index) => {
				return {...option, "selected": index == 0};
			}));
			setSearchText(searchOptions[0].tag);
		}
	}
	function prevSearchOption() {
		let curIndex = searchOptions.findIndex(option => option.selected);
		if (curIndex > -1) {
			curIndex = Math.max(0, curIndex - 1);
			setSearchOptions(searchOptions.map((option, index) => {
				return {...option, "selected": index == curIndex};
			}));
			setSearchText(searchOptions[curIndex].tag);
		} else {
			setSearchOptions(searchOptions.map((option, index) => {
				return {...option, "selected": index == searchOptions.length - 1};
			}));
			setSearchText(searchOptions[searchOptions.length - 1].tag);
		}
	}
	function addSearchOption(addTag) {
		let optionExists = searchTags.find(tag => tag.tag == addTag);
		if (!optionExists) {
			setSearchTags(searchTags.concat([{"tag": addTag}]));
		}
	}
	async function getSearchOptions(text) {
		let response = await fetch(apiUri + "tags?" + new URLSearchParams( {
			"search": text, 
			"bad_tags": searchTags.map(tag => tag.tag).join("S")
		}));
		let options = await response.json();
		setSearchOptions(options);
	}

	return (
		<div className="container">
			<div className="header">
				<span id="searchText">Search: </span>
				<div id="searchContainer">
					<input id="tagInput" type="text" value={searchText} onKeyPress={searchKeypress} />
					{searchOptions.length > 0 ? (
						<div id="searchOptions">
							{searchOptions.map(option =>
								<SearchOption option={option} clickHandler={selectSearchOption} />
							)}
						</div>
					) : <br/>}
				</div>
				<button onClick={doAuth} id="auth">{userID.length === 0 ? "Sign In" : "Sign Out"}</button>
				<div id="tags">
					{searchTags.map(tag =>
						<SearchTag tag={tag} clickHandler={removeSearchTag} />
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
								<TagButton tag={tag.tag} />
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

