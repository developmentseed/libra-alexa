const cities = require('all-the-cities');
const request = require('request');

const getDate = require('./get-date');

/*
*
* MAIN FUNCTION
*
*/

exports.handler = (event, context, callback) => {
  console.log('event', event)
  console.log('context', context)

  try {
    // only our alexa skill can use this lambda function
    if (event.session.application.applicationId !== 'amzn1.ask.skill.2db74e71-0785-46a9-9504-4d062ed4eb33') {
      callback(new Error('Invalid Application ID'));
    }

    sendDataToApp('request-data', { requestId: event.request.requestId, session: event.session })

    if (event.session.new) {
      onSessionStarted({ requestId: event.request.requestId }, event.session);
    }

    if (event.request.type === 'LaunchRequest') {
      onLaunch(event.request, event.session, (sessionAttributes, speechletResponse) => {
        callback(null, buildResponse(sessionAttributes, speechletResponse));
      });
    } else if (event.request.type === 'IntentRequest') {
      onIntent(event.request, event.session, (sessionAttributes, speechletResponse) => {
        callback(null, buildResponse(sessionAttributes, speechletResponse));
      });
    } else if (event.request.type === 'SessionEndedRequest') {
      onSessionEnded(event.request, event.session);
      callback();
    }
  } catch (err) {
    callback(err);
  }
};

/*
*
* RESPONSES
*
*/

function getWelcomeResponse (callback) {
  const sessionAttributes = {};

  const options = {
    title: 'Satellite Imagery',
    output: 'Ask me about a location to look at some satellite images!',
    repromptText: 'Ask me about a specific location',
    endSession: false
  };

  const response = buildSpeechletResponse(options);
  callback(sessionAttributes, response);
}

function getImageResponse (intentRequest, session, callback) {
  const intent = intentRequest.intent;
  const slots = intent.slots;
  const sessionAttributes = {};
  let options = {};
  let output = '';

  console.log('intent', intent);
  console.log('session', session);

  if (slots.City.value) {
    if (slots.City.value === 'Florence') {
      slots.City.value = 'Firenze';
    }

    sessionAttributes.city = slots.City.value;

    sessionAttributes.city = cities.filter(city => {
      return city.name === sessionAttributes.city;
    })[0];

    // return early if not found
    if (!sessionAttributes.city) {
      return sendErrorResponse(options, sessionAttributes, callback);
    }

    const lon = sessionAttributes.city.lon;
    const lat = sessionAttributes.city.lat;
    var apiUrl = `https://api.developmentseed.org/satellites/?contains=${lon},${lat}&limit=1`;

    output = 'Here\'s what I\'ve got for ' + sessionAttributes.city.name;

    if (slots.CloudPercentage.value) {
      const clouds = parseInt(slots.CloudPercentage.value);
      const cloudsMin = clouds - 5;
      const cloudsMax = clouds + 5;
      apiUrl += `&cloud_from=${cloudsMin}&cloud_to=${cloudsMax}`;
      output += ' with ' + clouds + ' percent clouds';
    } else if (slots.NoClouds.value) {
      apiUrl += '&cloud_from=0&cloud_to=10';
      output += ' with no clouds';
    } else {
      apiUrl += '&cloud_from=0&cloud_to=10';
    }

    if (slots.Date.value) {
      const date = getDate(slots.Date.value);
      console.log('date', slots.Date.value, date);
      // let dateFragment;
      // if (date.onlyYear) {
      //   dateFragment += `&date_from=${date.year}-01-01&date_to=${date.year}-12-31`;
      //   output += ` from ${date.text.month}`
      // } else if (date.hasMonth && !date.hasDay) {
      //   dateFragment += `&date_from=${date.year}-${date.month}-01&date_to=${date.year}-${date.month}-${date.lastDayOfMonth}`;
      //   output += ` from ${date.text.month} ${date.text.year}`
      // } else if (date.hasDay) {
      //   dateFragment += `&date_from=${date.year}-${date.month}-${date.day}&date_to=${date.year}-${date.month}-${date.day}`;
      //   output += ` from ${date.text.month} ${date.text.day} ${date.text.year}`
      // }
      // apiUrl += '&date_from=2016-10-01&date_to=2017-02-01';
    }

    apiUrl += '&date_from=2016-10-01&date_to=2017-02-01';
    console.log('slots', slots);
    console.log('sessionAttributes.city', sessionAttributes.city);
    console.log('apiUrl', apiUrl);

    // only use sentinal for the high-res imagery for now
    if (slots.HighResolutionImagery.value) {
      apiUrl += '&satellite_name=sentinel';
    } else {
      apiUrl += '&satellite_name=landsat';
    }

    var tilerUrl = 'http://ec2-54-87-182-19.compute-1.amazonaws.com/image/';

    requestImage(apiUrl, function (err, body) {
      options = {
        title: sessionAttributes.city + ' Satellite Images',
        output: output,
        endSession: false
      };

      if (err || !body.results || !body.results.length) {
        sendErrorResponse(options, sessionAttributes, callback);
      } else {
        const response = buildSpeechletResponse(options);
        const results = body.results[0];
        sessionAttributes.image = results;

        if (slots.HighResolutionImagery.value) {
          sessionAttributes.image_url = tilerUrl + results.scene_id + `?point=${lon},${lat}&resolution=2`;
        } else if (slots.LandWaterAnalysis.value) {
          sessionAttributes.image_url = tilerUrl + results.scene_id + `?point=${lon},${lat}&product=water&resolution=2`;
        } else if (slots.VegetationHealth.value) {
          sessionAttributes.image_url = tilerUrl + results.scene_id + `?point=${lon},${lat}&product=ndvi&resolution=2`;
        } else {
          sessionAttributes.image_url = tilerUrl + results.scene_id + `?point=${lon},${lat}&resolution=2`;
        }

        sessionAttributes.image = body.results[0];
        console.log('sessionAttributes', sessionAttributes);

        sessionAttributes.requestId = intentRequest.requestId;
        sendDataToApp('session-data', sessionAttributes, function (err, res, body) {
          if (err) console.log(err);
          callback(sessionAttributes, response);
        });
      }
    });
  }
}

function requestImage (apiUrl, callback) {
  request(apiUrl, function (err, res, body) {
    if (err) return callback(err);
    body = JSON.parse(body);
    callback(null, body);
  });
}

function sendDataToApp (type, data, callback) {
  var options = {
    method: 'POST',
    url: 'https://arcane-chamber-39897.herokuapp.com/progress?type=' + type,
    json: data
  };

  request(options, callback);
}

function sendErrorResponse (options, sessionAttributes, callback) {
  options.output = 'I\'m sorry, I didn\'t find any matching images';
  const response = buildSpeechletResponse(options);
  callback(sessionAttributes, response);
}

function endSessionResponse (sessionAttributes, callback) {
  if (typeof sessionAttributes === 'function') {
    callback = sessionAttributes;
    sessionAttributes = {};
  }

  const options = {
    cardTitle: 'Finished with satellites',
    speechOutput: 'Thanks for looking at earth',
    endSession: true
  };

  const response = buildSpeechletResponse(options);
  callback(sessionAttributes, response);
}

/*
*
* EVENT HANDLERS
*
*/

function onSessionStarted (sessionStartedRequest, session) {
  console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

function onLaunch (launchRequest, session, callback) {
  console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

  // Dispatch to your skill's launch.
  getWelcomeResponse(callback);
}

function onIntent (intentRequest, session, callback) {
  console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);
  console.log('intentRequest', intentRequest);

  const intent = intentRequest.intent;
  const intentName = intentRequest.intent.name;

  // Dispatch to your skill's intent handlers
  console.log('intentName', intentName);
  if (intentName === 'GetImageIntent') {
    getImageResponse(intentRequest, session, callback);
  } else if (intentName === 'AMAZON.HelpIntent') {
    getWelcomeResponse(callback);
  } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
    endSessionResponse(callback);
  } else {
    throw new Error('Invalid intent');
  }
}

function onSessionEnded (sessionEndedRequest, session) {
  console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
  // Add cleanup logic here
}

/*
*
* HELPERS
*
*/

function buildSpeechletResponse (options) {
  return {
    outputSpeech: {
      type: 'PlainText',
      text: options.output
    },
    card: {
      type: 'Simple',
      title: `SessionSpeechlet - ${options.title}`,
      content: `SessionSpeechlet - ${options.output}`
    },
    reprompt: {
      outputSpeech: {
        type: 'PlainText',
        text: options.repromptText
      }
    },
    endSession: options.endSession
  };
}

function buildResponse (sessionAttributes, speechletResponse) {
  return {
    version: '1.0',
    sessionAttributes,
    response: speechletResponse
  };
}
