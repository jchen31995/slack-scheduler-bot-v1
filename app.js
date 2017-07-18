var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var { rtm } = require('./bot');
var app = express();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
	console.log('hello');
})

app.post('/slack/interactive', function(req, res) {
	var payload = JSON.parse(req.body.payload);
	console.log('BODY', payload);
    if (payload.actions[0].value === 'confirm') { //if confirm button is hit
        var attachment = payload.original_message.attachments[0]; // make a copy of attachments (the interactive part)
        delete attachment.actions; // delete buttons
        attachment.text = 'Reminder set'; // change the text after confirm button clicked
        attachment.color = '#53B987' // changes color to green
        res.json({
            replace_original: true, // replaces  original interactive message box with new messagee
            text: 'Created reminder :fire:',
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

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var { User } = require('./models')

function getGoogleAuth(){
	return new OAuth2(
		process.env.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_SECRET,
		'http://localhost:3000/connect/callback'
		);
}

const GOOGLE_SCOPES = [
'https://www.googleapis.com/auth/userinfo.profile',
'https://www.googleapis.com/auth/calendar'
]

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
			res.redirect(url)
		}
	});
	}
})

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
    			res.status(500).json({error: err});
    		} else {
    			User.findById(req.query.state)
    			.then(function(mongoUser) {
    				mongoUser.google = tokens;
    				mongoUser.google.profile_id = googleUser.id;
    				mongoUser.google.profile_name = googleUser.displayName;
    				return mongoUser.save();
    			})
    			.then(function(mongoUser) {
    				res.send('You are connected to Google Calendar');
    				rtm.sendMessage("You're are now connected to Google Calendar", mongoUser.slackDmId)
    			});
    		}
    	});
    }
});
})


app.listen(3000);
