var { RtmClient, WebClient, CLIENT_EVENTS, RTM_EVENTS } = require('@slack/client');
var bot_token = process.env.BOT_OAUTH_TOKEN || ''; 
var express = require('express');
var axios = require('axios');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser());

var rtm = new RtmClient(bot_token);
var web = new WebClient(bot_token);

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

// curl 'https://api.api.ai/api/query?v=20150910&query=remind%20me%20to%20take%20the%20kids%20to%20get%20washed&lang=en&sessionId=5df54d47-3d0f-4951-9365-8eda5765203a&timezone=2017-07-17T17:44:14-0700' -H 'Authorization:Bearer 451d79d162e8407982aa7896b4a24faf'

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(msg) {
		var dm = rtm.dataStore.getDMByUserId(msg.user);
		if(!dm || dm.id !== msg.channel || msg.type !== 'message'){
			console.log('NOT DM, IGNORING');
			return; //message not sent to DM, ignoring
		}
	rtm.sendMessage(msg.text, msg.channel)
	axios.get('https://api.api.ai/api/query', {
		params: {
			v: '20150910',
			lang: 'en',
			timezone: '2017-07-17T17:44:14-0700',
			query: msg.text,
			sessionId: msg.user
		}, 
		headers: {
			Authorization: 'Bearer 451d79d162e8407982aa7896b4a24faf'
		}
	}).then(({ data }) => {
		if(data.result.actionIncomplete){ //need subject and date to be complete
			rtm.sendMesasge(data.result.fulfillment.speech, msg.channel)
		} else {
			console.log("ACTION IS COMPLETE", data.result.parameters) //when you enable interactive messages it requires a url from ngrok, make path that makes sense
			web.chat.postMessage(msg.channel, 'Creating reminder to '${data.result.parameters.description}' on '${data.result.parameters.date}, {
				"attachments": [
				{
					"actions": [
						"name": "confirm" //FINISH WRITING IN THE CONFIRM/CANCEL BUTTONS!!
					]
				}
				]
			})
		}
	}).catch((err) => {
		console.log('ERROR!:', err)
	})
});

rtm.start();

app.post('/slack/interact', function(req, res){
	//need to set up bodyparser
	var payload = JSON.parse(req.body.payload);
	if(payload.actions[0].value === 'true') {
		res.send('will do!! :jayisgr8:')
	} else {
		res.send('Cancelled')
	}
})

app.get('/', function(req, res){
	var oauth2Client = new OAuth2(
		process.env.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_SECRET,
		process.env.DOMAIN + '/connect/callback'
	);

	var url = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		prompt: 'consent',
		scope: [
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/calendar'
			],
			state: encodeURIComponent(JSON.stringify({
				auth_id: req.query.auth_id
			}))
	});
	res.redirect(url);})

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

