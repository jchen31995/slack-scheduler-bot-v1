var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var bot_token = process.env.BOT_OAUTH_TOKEN || ''; 
var express = require('express')

var app = express();

var rtm = new RtmClient(bot_token);

let channel;


// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  for (const c of rtmStartData.channels) {
    if (c.is_member && c.name ==='scheduler') { channel = c.id } //if the bot is a member of the general channel
  }
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

// you need to wait for the client to fully connect before you can send messages
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
  rtm.sendMessage("Hello! I'm going to rip your guts out and smear it across your face!", channel);
});


rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  console.log('Message:', message); //this is no doubt the lamest possible message handler, but you get the idea
});

rtm.start();

app.get('/', function(req, res){
	console.log('hello!!')
	res.send("HI")
})

/*
Create a POST route in the Express server and configure Slack 
to send the response of Interactive Messages to this route. 
Verify that this route is called when a user click on an 
interactive message.
*/

app.post('/', function(req,res){
	
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})

