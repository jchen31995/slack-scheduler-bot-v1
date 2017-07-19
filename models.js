"use strict";

var mongoose = require('mongoose');
mongoose.Promise = global.Promise; //best practice if you're using mongoose/promises
mongoose.connect(process.env.MONGODB_URI);

var User = mongoose.model('User', {
	description: String,
	date: String,
	slackId: {
		type: String,
		required: true
	},
	slackDmId: {
		type: String, 
		required: true
	},
	google: {
		
	} //going to put a bunch of stuff in it, don't want to specify it yet
})


module.exports = {
	User
}