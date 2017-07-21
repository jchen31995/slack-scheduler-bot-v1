"use strict";

var mongoose = require('mongoose');
mongoose.Promise = global.Promise; //best practice if you're using mongoose/promises
mongoose.connect(process.env.MONGODB_URI);

var User = mongoose.model('User', {
	slackId: {
		type: String,
		required: true
	},
	slackDmId: {
		type: String, 
		required: true
	},
	pending: { //all actions user trying to push
			eventTitle: String, 
			subject: String, // reminder/topic subject
			date: String,
			startDate: Date,
			endDate: Date, 
			time: String, 
			duration: String,
			invitees: Array, // with whom
			active: Boolean,
			eventType: String,
			attendees: Array

	},
	google: {
		
	} //going to put a bunch of stuff in it, don't want to specify it yet
})

var Reminder = mongoose.model('Reminder', {

});

var Meeting = mongoose.model('Model', {

})


module.exports = {
	User
}