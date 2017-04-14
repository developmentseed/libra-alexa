const Alexa = require('alexa-voice-service');
const request = require('xhr');

module.exports = function alexaVoiceService (options) {
  var alexa = new Alexa(options);

  /**
  * Get auth token from url and request user's microphone
  **/
  function start () {
    alexa.getTokenFromUrl()
      .then(() => alexa.getToken())
      .then(token => localStorage.setItem('alexa-satellite-token', token))
      .then(() => alexa.requestMic())
      .catch(() => {
        const cachedToken = localStorage.getItem('alexa-satellite-token');

        if (cachedToken) {
          alexa.setToken(cachedToken);
          return alexa.requestMic();
        }
      });
  }

  function login () {
    return alexa.login()
      .then(() => avs.requestMic())
      .catch(() => {});
  }

  return {
    start,
    login
  }
}
