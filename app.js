var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var { rtm } = require('./bot');
var app = express();


const GOOGLE_SCOPES = [
'https://www.googleapis.com/auth/userinfo.profile',
'https://www.googleapis.com/auth/calendar'
]

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// no function other than to check everything hosted correctly
app.get('/', function(req, res) {
	console.log('Local host up and running on ngrok');
})


var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var { User } = require('./models')


// configures the Google API 
function getGoogleAuth(){
	return new OAuth2(
		process.env.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_SECRET,
		'http://localhost:3000/connect/callback'
		);
}

// inserts meeting into Google Calendar at specified time
function insertMeeting(auth, user){
	var calendar = google.calendar('v3');
	var resource = {
			summary: user.pending.eventTitle, // event title
			//location: 'horizons', //location 
			start: {
				dateTime: user.pending.startDate, // events starts time
				'timeZone': 'America/Los_Angeles'
			},
			end: {
				dateTime: user.pending.endDate, // events ends time
				'timeZone': 'America/Los_Angeles'
			},
			attendees: user.pending.attendees
		};

		calendar.events.insert({
			auth: auth,
			calendarId: 'primary',
			sendNotifications: true,
			resource: resource
		},function(err,resp) {
			if (err) {
				console.log('There was an error : ' + err);
				return;
			}
			console.log(resp,'Event created:', resp.htmlLink);
		});
	}


// insert reminder into Google Calendar as all-day event
function insertReminder(auth, user){
	var calendar = google.calendar('v3');

	var resource = {
		summary: user.pending.eventTitle, // event title
		//location: 'horizons',
		start: {
			date: user.pending.date // reminder date
		},
		end: {
			date: user.pending.date // reminder date
		}
	};

	calendar.events.insert({
		auth: auth,
		calendarId: 'primary',
		sendNotifications: true,
		resource: resource
	},function(err,resp) {
		if (err) {
			console.log('There was an error : ' + err);
			return;
		}
		console.log(resp,'Event created:', resp.htmlLink);
	});

}

// this is where we handle the actual events
// receiving the webhook request with ExpressJS
app.post('/slack/interactive', function(req, res) {
	var payload = JSON.parse(req.body.payload);

	console.log('BODY', payload);
    if (payload.actions[0].value === 'confirm') { //if confirm button is hit    
    	//here you're supposed to get token and access google api
		var attachment = payload.original_message.attachments[0]; // make a copy of attachments (the interactive part)
		User.findOne({slackId: payload.user.id})
		.then(function(user){
			var googleAuth = getGoogleAuth();
			var credentials = Object.assign({}, user.google);
			delete credentials.profile_id;
			delete credentials.profile_name;
			googleAuth.setCredentials(credentials);
			if (payload.callback_id==='meeting'){
				insertMeeting(googleAuth, user)
			} else{
				insertReminder(googleAuth, user)
			}
		})

		delete attachment.actions; // delete buttons
		if (payload.callback_id==='meeting'){
			attachment.text = 'Meeting created'; // change the text after confirm button clicked
 	    	attachment.color = '#53B987' // changes color to green
 	    } else{
			attachment.text = 'Reminder created'; // change the text after confirm button clicked
 	    	attachment.color = '#800080' // changes color to purple
 	    }
 	    
 	    res.json({
            replace_original: true, // replaces  original interactive message box with new messagee
            text: "It's on your calendar. Ping me to schedule another event!",
            attachments: [attachment]
        });
 	}
 	else {
 		var attachment = payload.original_message.attachments[0];
 		delete attachment.actions;
 		console.log(attachment);
 		attachment.text = 'Cancelled reminder';
 		attachment.color = '#DD4814'
 		res.json({
 			replace_original: true,
 			text: 'Cancelled reminder :disappointed:',
 			attachments: [attachment]
 		});
 	}
 });


app.get('/connect', function(req,res){
	var userId = req.query.user
	if(! userId){
		res.status(400).send('Missing user id');
	} else{
		User.findById(userId)
		.then(function(user){
			if(!user){
				res.status(404).send('Cannot find user');
			} else{
			//connect to google
			var googleAuth = getGoogleAuth();
			var url = googleAuth.generateAuthUrl({
				access_type: 'offline',
				prompt: 'consent', 
				scope: GOOGLE_SCOPES,
				state: userId
			})
			//https://accounts.google.com/o/oauth2/auth?access_type=offline&prompt=consent&scope=...
			res.redirect(url)
		}
	});
	}
})

// where we connect and get the callback to authorize Google Calendar, saving our user to mongoDB
app.get('/connect/callback', function(req,res){
	var googleAuth = getGoogleAuth();
	googleAuth.getToken(req.query.code, function (err, tokens) {
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    if (err) {
    	res.status(500).json({error: err});
    } else {	
    	googleAuth.setCredentials(tokens);

    	var plus = google.plus('v1');
    	plus.people.get({ auth: googleAuth, userId: 'me'}, function(err, googleUser) {
    		if (err) {
    			console.log("it gets here")
    			res.status(500).json({error: err});
    		} else {
    			User.findById(req.query.state)
    			//this mongoUser: {_id,slackId,slackDmId}
    			.then(function(mongoUser) {

    				console.log("Saving user", mongoUser)
    				mongoUser.google = tokens;
    				mongoUser.google.profile_id = googleUser.id;
    				mongoUser.google.profile_name = googleUser.displayName;
    				return mongoUser.save();
    			})
    			// this mongoUser: {google and meta data}
    			.then(function(mongoUser) { 
    				console.log("after saving user", mongoUser)
    				res.send("You are now connected to Google Calendar")
    				rtm.sendMessage("You are now connected to Google Calendar", mongoUser.slackDmId)
    				
    			});
    		}
    	});
    }
});
})

// lists events on Google calendar
// was used to check if Google Calendar API is working
// coule be used to handle time conflicts
function listEvents(auth) {
	var calendar = google.calendar('v3');
	calendar.events.list({
		auth: auth,
		calendarId: 'primary',
		timeMin: (new Date()).toISOString(),
		maxResults: 10,
		singleEvents: true,
		orderBy: 'startTime'
	}, function(err, response) {
		if (err) {
			console.log('The API returned an error: ' + err);
			return;
		}
		var events = response.items;
		if (events.length == 0) {
			console.log('No upcoming events found.');
		} else {
			console.log('Upcoming 10 events:');
			for (var i = 0; i < events.length; i++) {
				var event = events[i];
				var start = event.start.dateTime || event.start.date;
				console.log('%s - %s', start, event.summary);
			}
		}
	});
}


app.listen(3000);
