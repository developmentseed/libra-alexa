var Alexa = require('./alexa');

var loginButton = document.getElementById('login');
var recordButton = document.getElementById('record');

var alexa = Alexa({
  debug: true,
  deviceId: 'alexa_satellite_dev_2',
  clientId: 'amzn1.application-oa2-client.93f8a2df954f4039866e7e06f5652f49',
  redirectUri: `https://${window.location.host}/auth`
});

alexa.start();

loginButton.addEventListener('click', alexa.login);
recordButton.addEventListener('mousedown', alexa.startRecording);
recordButton.addEventListener('mouseup', alexa.stopRecording);
