const apiUri = "http://3.21.237.38";
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

const auth = firebase.auth();
const db = firebase.firestore();

const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({
	"login_hint": "user@ucla.edu"
});

let userIdToken;
firebase.auth().signInWithPopup(provider).then(async function(user) {
	userIdToken = await firebase.auth().currentUser.getIdToken(true);
	let response = await fetch(apiUri + "/api/user?" + new URLSearchParams( {id: userIdToken} ));
	if (response.ok) {
		loadData();
	} else {
		let json = await response.json();
		console.log(json);
	}
}).catch(function(error) {
	console.log(error);
});

async function loadData() {
	let data = await fetch(apiUri + "/api/guild?" + new URLSearchParams( {id: userIdToken} ));
	let guilds = data.guilds;
	console.log(guilds);
}
