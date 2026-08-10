const text = "___REPLY:5f031182-bdd9-4d88-b923-cad002477999___This is my reply";
const match = text.match(/^___REPLY:([a-zA-Z0-9-]+)___(.*)/s);
console.log(match);
