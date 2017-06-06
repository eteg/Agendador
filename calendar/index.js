import fs from 'fs';
import readline from 'readline';
import google from 'googleapis';
import googleAuth from 'google-auth-library';
import moment from 'moment';


// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_DIR = `${(process.env.HOME || process.env.HOMEPATH ||
  process.env.USERPROFILE)}/.credentials/`;
const TOKEN_PATH = `${TOKEN_DIR}calendar-nodejs-quickstart.json`;

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log(`Token stored to ${TOKEN_PATH}`);
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token; // eslint-disable-line no-param-reassign
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const auth = new googleAuth(); // eslint-disable-line new-cap
  const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

function convertDecimalToTime(decimalTime){
  //var decimalTimeString = "1.6578";
  
  //var decimalTime = parseFloat(decimalTimeString);
  decimalTime = decimalTime * 60 * 60;
  
  var hours = Math.floor((decimalTime / (60 * 60)));
  decimalTime = decimalTime - (hours * 60 * 60);
  
  var minutes = Math.floor((decimalTime / 60));
  decimalTime = decimalTime - (minutes * 60);
  
  var seconds = Math.round(decimalTime);
  
  if(hours < 10){
	  hours = "0" + hours;
  }
  if(minutes < 10){
	  minutes = "0" + minutes;
  }
  if(seconds < 10){
	  seconds = "0" + seconds;
  }
  var time = "" + hours + ":" + minutes;

  return time;
}

const functions = {};

// Futuramente adicionar o parâmetro visibility para filtrar quem pode ver os eventos.
functions.listEvents = callback => (auth) => {
  const calendar = google.calendar('v3');
  calendar.events.list({
    auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, response) => {
    if (err) {
      console.log(`The API returned an error: ${err}`);
      return;
    }
    const events = response.items;
   // const arrayEvents = response.items;
    console.log(events[0].id);
    
    if (events.length === 0) {
      console.log('No upcoming events found.');
    } else {
      console.log('Upcoming 10 events:');
      const formatedEvents = [];
      for (let i = 0; i < events.length; i += 1) {
        const event = events[i];
        const start = event.start.dateTime;
        const end = event.end.dateTime;
        const startDateTime = new Date(event.start.dateTime);
        const endDateTime = new Date(event.end.dateTime);
        console.log('%s - %s', start, event.summary);
    // site para consultar os possíveis locais suportados e idiomas : https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
        formatedEvents.push(`${startDateTime.toLocaleDateString('pt-BR')}, ${event.summary} de ${startDateTime.toLocaleTimeString('pt-BR')} às ${endDateTime.toLocaleTimeString('pt-BR')}`);
      }

      callback(formatedEvents);
    }
  });
};

//console.log('teste array: ' + arrayEvents[0].id);

functions.listAvailableTime = callback => (auth) => {


  // Eventos começam ás 7h e terminam ás 18h
  const eventSize = 60; // Minutos
  var availableTime = [7,8,9,10,11,12,13,14,15,16,17,18];
  const calendar = google.calendar('v3');
  const currentDate = new Date();
  const limitDate = moment(currentDate.toISOString()).add(1, 'days').format();
  calendar.events.list({
    auth,
    calendarId: 'primary',
    timeMin: currentDate.toISOString(),
    //maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, response) => {
    if (err) {
      console.log(`The API returned an error: ${err}`);
      return;
    }

  // Remove os horários que já passaram
    for(var i = 0; i < 12; i++){
      if(availableTime[i] == currentDate.getHours()){
        availableTime.splice(0, i + 1);
      }
    }

    const events = response.items;
    if (events.length === 0) {
      console.log('Todos os horários estão vagos.');
    } else {
    // Remove os horários dos eventos já marcados
      for (let i = 0, len = events.length; i < len; i += 1) {
        const event = events[i];
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);

        if(events[i + 1] == true){
          const nxtEvent = events[i + 1];        
          const nextEventStart = new Date(nxtEvent.start.datetime);
        }
        
        for(var j = 0, leng = availableTime.length; j < leng; j++){
          const startInMinutes = start.getHours()*60 + start.getMinutes();
          const endInMinutes = end.getHours()*60 + end.getMinutes();
          const availableInMinutes = availableTime[j]*60;

/*
          console.log(start.getHours() + ':' + start.getMinutes() + ' ' + availableTime[j]);
          console.log('available time in minutes: ' + availableInMinutes);
          console.log('start in minutes: ' + startInMinutes);
          console.log('end in minutes: ' + endInMinutes);
*/  
        // console.log(event.id);

          if(availableInMinutes < endInMinutes){
            if(availableInMinutes > startInMinutes && availableInMinutes < endInMinutes){
              availableTime.splice(j, 1);
            }else{
              if(startInMinutes - availableInMinutes < eventSize){
                availableTime.splice(j, 1);
                if(events[i + 1] == true){
                  const nextEventStartInMinutes = nextEventStart.getHours()*60 + nextEventStart.getMinutes();
                  if(nextEventStartInMinutes - endInMinutes > eventSize){
                    availableTime.splice(j, 1, endInMinutes/60);
                  }
                }else{
                    availableTime.splice(j, 1, endInMinutes/60);                  
                }
              }
            }
          }
        }
        //console.log('%s - %s', start, event.summary);
      }

      for(var i = 0, len = availableTime.length; i < len; i++){
        availableTime[i] = convertDecimalToTime(availableTime[i]);
      }

      callback(availableTime);
    }
  });
};

functions.createEvent = event => (auth) => {
  const calendar = google.calendar('v3');
  calendar.events.insert({
    auth,
    calendarId: 'primary',
    resource: event,
  }, (err, createdEvent) => {
    if (err) {
      console.log(`There was an error contacting the Calendar service: ${err}`);
      return;
    }
    console.log('Event created: %s', createdEvent.htmlLink);
  });
};

functions.deleteEvent = callback => (auth) => {
  const calendar = google.calendar('v3');
  calendar.events.delete({
    auth,
    calendarId: 'primary',
    eventId: '1496668344708',
  }, (err) => {
    if (err) {
      console.log(`There was an error contacting the Calendar service: ${err}`);
      return;
    }
//     callback(events);
  });
 
}

export default {
  exec(func, params) {
    // Load client secrets from a local file.
    fs.readFile('./calendar/client_secret.json', (err, content) => {
      if (err) {
        console.log(`Error loading client secret file: ${err}`);
        return;
      }
      // Authorize a client with the loaded credentials, then call the
      // Google Calendar API.
      authorize(JSON.parse(content), functions[func](params));
    });
  },
};
