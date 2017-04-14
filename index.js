var Alexa = require('./alexa');

var loginButton = document.getElementById('login')

var alexa = Alexa({
  debug: true,
  deviceId: 'alexa-satellite-dev-2',
  deviceSerialNumber: 1,
  clientId: 'amzn1.application-oa2-client.93f8a2df954f4039866e7e06f5652f49',
  redirectUri: `https://${window.location.host}/auth`
})

alexa.start()

loginButton.addEventListener('click', alexa.login)
