# Overview: About this Bot
This Scheduler Bot is a Slack bot that easily organizes meetings and reminders for Slack teams. Using simple conversational language, this bot can insert meetings and reminders into your personal Google Calendar upon confirmation. This bot is seamlessly integrated into Slack to easily coordinate events. 

# APIs and Technologies Used
- API.AI trained the bot to recognize Slack members, dates, times, and locations. Furthermore, it was used to parse the user messages to it to create a natural conversation flow between the user and the bot.
- Google Calendar API was used to link user accounts to their Google accounts and access personal calendars
- MongoDB was used to store user information and pending calendar events
- Node.js and Express.js was used to handle the OAuth flow and coordinate between asynchronous APIs
- Ngrok was used to create a secure URL for Slack to post requests to

# Demo
**Scheduling a meeting**
![alt text](https://raw.githubusercontent.com/jchen53/SlackSchedulerBot/master/demo/Meetings.gif)

**Scheduling a reminder**
![alt text](https://raw.githubusercontent.com/jchen53/SlackSchedulerBot/master/demo/Reminders.gif)

# Tokens Needed to Run Program
- Slack bot token
- Slack API token
- Google client id
- Google client secret 
- Google redirect url
- MongoDB URL