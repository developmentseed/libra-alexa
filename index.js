var socket = require('socket.io-client');
var elementClass = require('element-class');
var html = require('yo-yo');
var Alexa = require('./alexa');

var io = socket(`https://${window.location.host}`);

var mic = document.querySelector('.microphone__background');
var micListening = 'microphone__background microphone--listening';
var micReceiving = 'microphone__background microphone--receiving';
var micResponding = 'microphone__background microphone--responding';

var header = document.querySelector('.content__header');

updatePageContentView();

io.on('connect', function () {
  console.log('connected');
  updatePageContentView();
});

io.on('disconnect', function () {
  console.log('disconnected');
});

io.on('request-data', function (data) {
  console.log('request-data', data);
});

io.on('session-data', function (data) {
  mic.className = micResponding;
  var bg = 'url(' + data.image_url + ')';
  var container = document.querySelector('.content');
  container.style.backgroundImage = bg;
  elementClass(recordButton).add('hidden');
  elementClass(header).add('revealed');
  updateImageInfoView(data);
});

var loginButton = document.getElementById('login');
var recordButton = document.getElementById('record');

var alexa = Alexa({
  debug: true,
  deviceId: 'alexa_satellite',
  clientId: 'amzn1.application-oa2-client.f9b9e81dc82c445c995be4e25250f1db',
  redirectUri: `https://${window.location.host}/auth`
});

alexa.start();

if (loginButton) {
  loginButton.addEventListener('click', alexa.login);
}

recordButton.addEventListener('mousedown', startRecording);
recordButton.addEventListener('mouseup', stopRecording);

var listening;
document.addEventListener('keypress', function (e) {
  if (e.keyCode === 32 && !listening) {
    e.preventDefault();
    listening = true;
    startRecording();
  }
});

document.addEventListener('keyup', function (e) {
  if (e.keyCode === 32) {
    e.preventDefault();
    listening = false;
    stopRecording();
  }
});

function startRecording () {
  mic.className = micListening;
  alexa.startRecording();
}

function stopRecording () {
  mic.className = micReceiving;
  alexa.stopRecording();
}

function updatePageContentView () {
  html.update(document.querySelector('.page__content'), pageContentView());
}

function updateImageInfoView (data) {
  html.update(document.querySelector('.image__info'), imageInfoView(data));
}

function imageInfoView (data) {
  return html`<div class='image__info'>
    <h2 class='image__title'>${data.city.name}, ${data.city.country}</h2>
    <ul class='image__meta'>
      <li class='image__meta--item'>${data.image.date}</li>
      <li class='image__meta--item'>${data.image.satellite_name}</li>
    </ul>
  </div>`;
}

function pageContentView () {
  var token = localStorage.getItem('libra-alexa-token');

  if (token) {
    return html`<div class='page__content'>
      <div class="microphone__background--images hidden">
        <div class='microphone__icon'>
          <img src="/graphics/microphone.svg" alt="microphone" height="25" width="25">
        </div>
      </div>
    </div>`;
  } else {
    return html`<div class='page__content'>
      <button class='button button--login' id="login">Log in</button>
    </div>`;
  }
}
