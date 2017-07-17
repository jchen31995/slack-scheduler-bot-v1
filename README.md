Slack Scheduler Bot

Overview

What are we building?
A slackbot that can schedule meetings for you and your team. 

Who is our immediate customer? 
Teams who use Slack and actively schedule meetings on Google Calendar. 

Examples: 
Engineering Teams
Sales Teams
Marketing Teams
Agencies 
Consulting Firms 
Middle Management across the board. 

Why are we building this now? 
Productivity is hard to come by in fast-paced work environments. Dozens of browsers tabs, desktop apps,  and mobile notifications drown your ability to focus and concentrate. As companies like Google, Facebook, Amazon and IBM continue to build powerful AI-based platforms and tools, the barrier to applying machine learning to real user problems is becoming dramatically reduced. 

Scheduler Bot solves a real customer problem by streamlining workflow for a very large, immediately addressable market (teams who schedules meetings and use Slack) at the exact right time (advent of new powerful, easy-to-use AI technologies + proliferation of software tools used on job)

Terminologies

Process
Milestones: A complete, relatively shippable set of features that we can use to mark team progress
Components: A chunky, self-contained set of engineering tasks that are used to breakdown milestones

Policies (these only makes sense when you read everything, but are for references later):
Availability Policy: Used to find suggestions of available times on calendar between invitees 
Incomplete Access Policy: Used when bot cannot obtain Google Calendar access from all invitees within 2 hours (time subject to change)
Pending Access Policy: Used when requesting Google Calendar access from many meeting invitees (implemented via Cron Job in v1). 

Data
Requester: The person who asks the bot something. 
Query: The thing you ask a bot. “API.AI” refers to these as “User Expressions” 
Invitees: People you invite to meetings. 
Meetings: Will be represented as Google Calendar Events.
Task: To do list items at the top of Google Calendar. They do not have Invitees in the way we are using Tasks (though Google permits them). To do list items are “All Day” Events in Google’s data model. 

Requester, Query, and Invitee: 




Task (Note that this is an all-day event):


Meeting:



Milestone 1: Simple Reminder System

Our first major milestone as a team is to build a Simple Reminder System. This will allow users to create Tasks in the top of their Google calendar and have the slackbot remind the user about the Task on slack. 

Below are example Queries that I can ask my slackbot. 

Remind me to do chores tomorrow
Remind me to do laundry on Friday
Remind me to check in with Abhi this Saturday

Note, that each of the Queries above has a Subject and a Day. The word “remind” let’s the bot know that our intent is to create a Task rather than a meeting (which would also require a Time and Invitees). 

However, we will not handle the following queries in this milestone as they contain date ranges (i.e. this weekend, next week) as opposed to a single day (i.e. today, tomorrow, Friday):

Remind me to do chores this weekend
Remind me to go to the gym next week

For reference, we will communicate with our Slackbot by direct message in the bot’s designated channel. Below is a sample onboarding flow when you first open the bot’s channel.



Milestone 2: Basic Meeting Scheduling


Our second major milestone as a team is to enable users to schedule basic meetings. This will allow users to create Meetings in Google Calendar. “Basic Scheduling” means that our bot has all the information needed to schedule a meeting. 

Below are example Queries that I can ask my slackbot after this milestone is completed. 

Schedule a meeting with Will next Thursday at 5pm to discuss the Hackathon.
Schedule a meeting between me, Will and Sunny tomorrow at 2pm for lunch.

Note, that each of the Queries above has a Subject, Day, Invitees and a Time. The phrase “Schedule a meeting” lets the bot know that our intent is to create a Meeting rather than a task. 

Note, that Subject is not required for Meetings. 

Schedule a meeting with Will next Thursday at 5pm
Schedule a meeting between me, Will and Sunny tomorrow at 2pm.

We will derive a Subject in the calendar invite to be the names of Invitees.

The picture below is the invite created as a result of the Query: “Schedule a meeting with Will next Thursday at 5pm to discuss the Hackathon.”



Note: Meetings have a default meeting length of 30 minutes unless otherwise stated. 
Milestone 3: Time Conflicts

Until now, we have made 2 assumptions when scheduling meetings. 1) All Invitees have given our bot access to their Google Calendars and 2) There are no time conflicts for Meetings. In this milestone, we will address scenarios when there is a time conflict in scheduling a meeting (ie another Invitee already has a meeting at the requested time). 

For this Milestone, we will use a more naive Availability Policy (v1). In later Milestones, we will make a more intelligent Availability Policy (v2). 

If there is a time conflict, we will suggest up to 10 new timeslots, at a maximum of 3 per day (selecting the first 3 available), over the next 7 days. 

If there is time conflict, provide the Requester with up to 10 new available timeslots between all attendees. Also follow the following constraints: 3 meetings max per day, look forward a maximum of 7 business days. 
Only schedule the meeting if the requester replies. The requester can reply whenever she wants, but the bot should check that if the selected time is still valid. If the time is invalid, send a new set of proposed times as per the Availability Policy v1. 



Milestone 4: Time Conflicts & New Invitees

To complete Milestone 3, we will enable the bot to schedule meetings even if all Invitees have not provided access to Google Calendar. 

The chart below shows the cases that we must solve for to complete this milestone. 



✓ Invitees Accepted, Time Conflicts (solved in Milestone 3, Part 1) 
✓ Invitees Accepted, No Time Conflicts (solved in Milestone 2)
Invitees not Accepted, Time Conflicts
Invitees not Accepted, No Time Conflicts


The easiest way to understand the flow going forward is through the diagrams below:
Handling Invitees who don’t provide Access 
Pending Access Policy (used for Cron Job)








Milestone 5 (Bonus #1): Ask invitees for confirmation before scheduling

Not all meetings are the same. For this milestone, we will allow Requesters to ask the schedulerbot to solicit confirmation via slack from all invitees before scheduling the meeting. 

Scenarios to consider: 
Meeting time that was available becomes taken 
Invitee does not respond 

Milestone 6 (Bonus #2): Bot Settings
Customization of meeting length, default timezone and options to add more Google Calendars.
Milestone 7 (Bonus #3): Algorithm to efficiently suggest available times
Milestone 8 (Bonus #4): Extra Intent: When are people free? 











Technical Overview 
Models
Task Model:
Required
Subject
Day 
Google Calendar Event Id
Requester Id

Meeting Model:
Required
Day
Time
Invitees
Not Required
Subject
Location
Meeting Length 
Google Calendar Fields 
Status (pending, scheduled) 
Created At
Requester Id

User Model: 
Google Calendar Account: Access Token, Refresh Token, Google+ Profile ID, etc.
Default / Preset Setting 
Default Meeting Length: 30 minutes
Slack Id
Slack Username
Slack Email
Slack DM Id

Invite Request Model:
Event Id
Invitee Id 
Requester Id
Status
Technology 
API.AI


API.AI is a Google-owned “conversational user-experience platform” that allows us to power our bot with very powerful machine learning. 

We train API.AI to understand the intent (Schedule Meeting) of different user expressions (Queries). We provide API Queries and receive Parameters (categorizations of words in an expression) and Prompts (messages used to “fulfill” or request missing information). 


















In the animation below, we train API.AI to classify parameters in different user expressions.




In the animation below, we program “Prompts”. Prompts are messages that correspond to specific parameters and are used to ask the user for the information for a specific parameter. 




In the animation below, we test our training data against new user expressions and are able to view sample JSON responses from API.AI. 



Slack API: Real Time Messaging (RTM) and Web APIs

Slack has many APIs. The Slack RTM API is a websocket based API. 
Google Calendar API

We use the Google Calendar API to schedule Meetings and Tasks. 



Data Flow 

Our Express server serves as a middleman between API.AI and the Requester. We pass User Expressions (Queries) and receive json responses. We care the most about the following attributes: 

actionIncomplete: Whether the user expression (query) was able to classify all entities required for a given intent
parameters: Entities (Day, Invitees, Subject etc…)
messages: Prompts that we can use to “fulfill” or complete a given intent. Prompts are messages/questions that are used to ask the requester for information required to request the missing information to satisfy a given intent. 

Below is an example of the data flow for a Query that has all the information required for the given intent (ie a Meeting intent requires invitees, a day and a time)











Below is an example of the data flow for a Query that has incomplete information for the given intent (ie a Meeting intent requires invitees, a day and a time)



