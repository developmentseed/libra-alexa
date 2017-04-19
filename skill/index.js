const cities = require('all-the-cities')
const request = require('request')

/*
*
* MAIN FUNCTION
*
*/

exports.handler = (event, context, callback) => {
  try {
    console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

    // only our alexa skill can use this lambda function
    if (event.session.application.applicationId !== 'amzn1.ask.skill.2db74e71-0785-46a9-9504-4d062ed4eb33') {
      callback('Invalid Application ID');
    }

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
  }

  const response = buildSpeechletResponse(options);
  callback(sessionAttributes, response);
}

function getImageResponse (intent, session, callback) {
  const slots = intent.slots
  const sessionAttributes = {};
  let options = {}

  console.log('intent', intent)
  console.log('session', session)

  if (slots.EuropeCity.value) {
    sessionAttributes.city = slots.EuropeCity.value

    sessionAttributes.city = cities.filter(city => {
      return city.name === sessionAttributes.city;
    })[0]

    const lon = sessionAttributes.city.lon
    const lat = sessionAttributes.city.lat
    var apiUrl = `https://api.developmentseed.org/satellites/?contains=${lon},${lat}&limit=1`

    if (slots.CloudPercentage.value) {
      const clouds = parseInt(slots.CloudPercentage.value);
      const cloudsMin = clouds - 5;
      const cloudsMax = clouds + 5;
      apiUrl += `&cloud_from=${cloudsMin}&cloud_to=${cloudsMax}`;
    }

    console.log('sessionAttributes.city', sessionAttributes.city)

    console.log('apiUrl', apiUrl)
    request(apiUrl, function (err, res, body) {
      body = JSON.parse(body)
      console.log('satutils response', body)

      options = {
        title: sessionAttributes.city + ' Satellite Images',
        output: 'Here\'s what I\'ve got for ' + sessionAttributes.city.name,
        endSession: false
      }

      const response = buildSpeechletResponse(options);
      console.log('response', response)
      sessionAttributes.image = body.results[0]
      console.log('sessionAttributes', sessionAttributes)
      sendDataToApp(sessionAttributes, function (err, res, body) {
        if (err) console.log(err)
        callback(sessionAttributes, response);
      });
    });
  }
}

function sendDataToApp (data, callback) {
  var options = {
    method: 'POST',
    url: 'https://arcane-chamber-39897.herokuapp.com',
    json: data
  }
  request(options, callback)
}

function endSessionResponse (callback) {
  const options = {
    cardTitle: 'Finished with satellites',
    speechOutput: 'Thanks for looking at earth',
    endSession: true
  }

  const response = buildSpeechletResponse(options);
  callback({}, response);
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

  console.log('intentRequest', intentRequest)
  const intent = intentRequest.intent;
  const intentName = intentRequest.intent.name;

  // Dispatch to your skill's intent handlers
  console.log('intentName', intentName)
  if (intentName === 'GetImageIntent') {
    getImageResponse(intent, session, callback);
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
      text: options.output,
    },
    card: {
      type: 'Simple',
      title: `SessionSpeechlet - ${options.title}`,
      content: `SessionSpeechlet - ${options.output}`,
    },
    reprompt: {
      outputSpeech: {
        type: 'PlainText',
        text: options.repromptText,
      },
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
