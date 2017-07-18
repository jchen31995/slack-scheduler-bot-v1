var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
require('./bot');
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
    if (payload.actions[0].value === 'confirm') {
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

app.listen(3000);
