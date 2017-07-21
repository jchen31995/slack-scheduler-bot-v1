var RtmClient = require('@slack/client').RtmClient;
var WebClient = require('@slack/client').WebClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var moment = require('moment')

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

function capitalizeString(string){
    return string.charAt(0).toUpperCase() + string.slice(1)
}

function convertFromMilitaryTime(input) {
    return moment(input, 'HH:mm:ss').format('h:mm:ss A');
}


var { User } = require('./models');
// curl: 'https://api.api.ai/api/query?v=20150910&query=remind%20me%20to%20do%20laundry&lang=en&sessionId=0cbcbfc3-2c12-440c-9ea3-bf7528243e7b&timezone=2017-07-18T09:33:45-0700' -H 'Authorization:Bearer SLACKBOTTOKEN''
var axios = require('axios');
rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
    //dm = Direct Message
    var dm = rtm.dataStore.getDMByUserId(message.user);
    // if message is not a dm, ignore it
    if (!dm || dm.id !== message.channel || message.type !== 'message') {
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
            rtm.sendMessage(`Hello. Rick Sanchez. I need access to your Google calendar. 

            Go to http://localhost:3000/connect?user=${user._id} to set up Google access. `, message.channel)
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
            else { // Action is complete
                console.log('ACTION IS COMPLETE', data.result);
             
                // add meeting
                if (data.result.metadata.intentName === 'meeting.add'){ 
                    // ASSUMPTION: IF THERE ARE SLACK USERS, THEY WILL ALL BE SLACK USERS
                    // if there are slack users
                    var onlySlackUsers = false;
                    var regex = /<@\w+>/g
                    var attendees = []
                    var attendeeNames = []
                    message.text.match(regex).forEach(function(person){
                        onlySlackUsers = true;
                        let userId = person.substring(2).slice(0,-1)
                        let userEmail = rtm.dataStore.getUserById(userId).profile.email
                        let attendeeName = rtm.dataStore.getUserById(userId).profile.real_name
                        if(!attendees.includes(userEmail)){
                            attendees.push(userEmail)
                            attendeeNames.push(attendeeName)
                        }
                    })
                    var allInvitees;
                    if (onlySlackUsers){
                        allInvitees= attendeeNames
                    } else{
                        allInvitees = data.result.parameters.invitees
                    }
                    var meetingWith = "";
                    allInvitees.forEach(function(person){
                        //if slack user and has @ at beginning of name

                        person = capitalizeString(person)
                        var lastPerson = capitalizeString(allInvitees[allInvitees.length-1]);
                        if (person!== lastPerson){
                            meetingWith=meetingWith + person + ', '
                        } else if (person === lastPerson && allInvitees.length!==1){
                            meetingWith=meetingWith + 'and ' + person
                        } else{
                            meetingWith= meetingWith + person
                        }
                    })
                    if (user.subject===''){
                        user.pending.eventTitle = `Meeting with ${meetingWith}`
                    } else{
                        user.pending.eventTitle = `${capitalizeString(data.result.parameters.subject)} with ${meetingWith}`
                    }
                    
                    //kind of a hacky way of getting the prompt to show up nicely, can think more later
                    let unit = ""
                    let eventDuration = ""
                    if(data.result.parameters.duration.unit === 'h'){
                        unit = 'hr'
                    } else{
                        unit = 'min'
                    }
                    
                    //converting default value of duration to an object
                    if (data.result.parameters.duration==="30 min"){
                        data.result.parameters.duration = {"amount": 30, "unit": "min"}
                    }
                    eventDuration = data.result.parameters.duration.amount.toString() + ' ' + unit

                    //this part of the code is a little messy, can clean up later
                    let dateString = data.result.parameters.date + 'T' + data.result.parameters.time + '-07:00'
                    let datePrompt = moment.utc(data.result.parameters.date + 'T' + data.result.parameters.time + 'Z')
                  
                    let startDateTime = moment.utc(dateString)
                    let endDateTime = moment.utc(dateString).add(data.result.parameters.duration.amount, data.result.parameters.duration.unit)
                    
                    user.pending.subject = capitalizeString(data.result.parameters.subject)
                    user.pending.date = data.result.parameters.date
                    user.pending.active = true
                    user.pending.duration = eventDuration
                    user.pending.invitees = data.result.parameters.invitees
                    user.pending.startDate = startDateTime
                    user.pending.endDate = endDateTime
                    user.pending.eventType = 'meeting'
                    user.pending.attendees = attendees
                    user.save()



                    let prompt = "Scheduling: " + user.pending.eventTitle + ' on ' + startDateTime.format('LL') + ' at ' + datePrompt.format('LT') + ' for ' + eventDuration
                    web.chat.postMessage(message.channel, prompt, {
                        "as_user": "true",
                            "attachments": [
                            {
                                "text": "Click to schedule the event or cancel",
                                "fallback": "You are unable to choose an action",
                                "callback_id": "meeting",
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
                // add reminder
                else if (data.result.metadata.intentName === 'reminder.add'){
                    console.log("DATE ", data.result.parameters.date)
                    user.pending.eventTitle = capitalizeString(data.result.parameters.subject)
                    user.pending.date = data.result.parameters.date
                    user.pending.active = true
                    user.pending.invitees = data.result.parameters.invitees
                    user.pending.eventType = 'reminder'
                    user.save()



                    //console.log("DATA ", data.result.parameters)
                    let prompt = "Scheduling: remind to " + data.result.parameters.subject + ' on ' + moment(user.pending.date).format('LL')
                    
                    web.chat.postMessage(message.channel, prompt, {
                        "as_user": "true",
                            "text": "Hihi", //text doesn't send
                            "attachments": [
                            {
                                "text": "Click to create reminder or cancel",
                                "fallback": "You are unable to choose an action",
                                "callback_id": "reminder",
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
            }
        })

    })
    
});

rtm.start();

module.exports = {
    rtm
}
