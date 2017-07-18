var RtmClient = require('@slack/client').RtmClient;
var WebClient = require('@slack/client').WebClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var bot_token = process.env.SLACK_BOT_TOKEN || '';
var slack_token = process.env.SLACK_API_TOKEN || '';

var rtm = new RtmClient(bot_token);
var web = new WebClient(bot_token); //interactive msg

let channel;

// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
	for (const c of rtmStartData.channels) {
		if (c.is_member && c.name === 'general') { channel = c.id }
	}
	console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

// you need to wait for the client to fully connect before you can send messages
//channel === id
// rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
//   rtm.sendMessage("Wubba Lubba Dub Dub!", channel);
// });


var { User } = require('./models');

// curl: 'https://api.api.ai/api/query?v=20150910&query=remind%20me%20to%20do%20laundry&lang=en&sessionId=0cbcbfc3-2c12-440c-9ea3-bf7528243e7b&timezone=2017-07-18T09:33:45-0700' -H 'Authorization:Bearer SLACKBOTTOKEN''
var axios = require('axios');
rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
    //dm = Direct Message
    var dm = rtm.dataStore.getDMByUserId(message.user);
    // if message is not a dm, ignore it
    if (!dm || dm.id !== message.channel || message.type !== 'message') {
    	console.log("Message ignored")
    	return;
    }

    User.findOne({ slackId: message.user })
    .then(function(user){

    	if(!user){
    		return new User({
    			slackId: message.user,
    			slackDmId: message.channel
    		}).save()
    	
    	}
    	return user;
    })
    .then(function(user){
    	console.log('USER IS', user)
    	console.log('Message:', message);
    	if (!user.google){
    		console.log("steps here")
    		rtm.sendMessage(`Hello, 
    		This is Schedule Bot. In order to schedule reminders for you, I need access to your Google calendar. 

    		Please visit http://localhost:3000/connect?user=${user._id} to set up Google access. `, message.channel)
    		return 
    	}
    	axios.get('https://api.api.ai/api/query', {
    		params: {
    			v: '20150910',
    			lang: 'en',
    			sessionId: message.user,
    			timezone: '2017-07-17T14:16:47-0700',
    			query: message.text
    		},
    		headers: {
    			Authorization: `Bearer ${process.env.API_AI_TOKEN}`
    		}
    	})
    	.then(function({data}) {
    		if (data.result.actionIncomplete) {
    			rtm.sendMessage(data.result.fulfillment.speech, message.channel);
    		}
    		else {
    		//console.log('ACTION IS COMPLETE', data.result);
    		// this is probably where you store information on subject and date into mongoose/queries
    		let prompt = "Creating reminder for " + data.result.parameters.subject + ' on ' + data.result.parameters.date
    		web.chat.postMessage(message.channel, prompt, {
    			"as_user": "true",
                    "text": "Hihi", //text doesn't send
                    "attachments": [
                    {
                    	"text": "Click to create reminder or cancel",
                    	"fallback": "You are unable to choose an action",
                    	"callback_id": "action",
                    	"color": "#3AA3E3",
                    	"attachment_type": "default",
                    	"actions": [
                    	{
                    		"name": "action",
                    		"text": "Confirm",
                    		"type": "button",
                    		"value": "confirm"
                    	},
                    	{
                    		"name": "action",
                    		"text": "Cancel",
                    		"type": "button",
                    		"value": "cancel"
                    	}
                    	]
                    }
                    ]
                })
    	}
    })
    	.catch(function(err) {
    		console.log(err);
    	})
    })
    
});

rtm.start();

module.exports = {
	rtm
}
