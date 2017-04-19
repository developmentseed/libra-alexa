const Alexa = require('alexa-voice-service');
const request = require('xhr');

module.exports = function alexaVoiceService (options) {
  // arbitrary, made up device serial number
  options.deviceSerialNumber = options.deviceSerialNumber || 123;

  var alexa = new Alexa(options);

  /**
  * Get auth token from url and request user's microphone
  **/
  function start () {
    alexa.getTokenFromUrl()
      .then(() => alexa.getToken())
      .then(token => localStorage.setItem('libra-alexa-token', token))
      .then(() => alexa.requestMic())
      .catch(() => {
        const cachedToken = localStorage.getItem('libra-alexa-token');

        if (cachedToken) {
          alexa.setToken(cachedToken);
          return alexa.requestMic();
        }
      });
  }

  function login () {
    return alexa.login()
      .then(() => alexa.requestMic())
      .catch(() => {});
  }

  function startRecording () {
    alexa.startRecording();
  }

  function stopRecording () {
    alexa.stopRecording().then((dataView) => {
      alexa.player.emptyQueue()
        .then(() => alexa.audioToBlob(dataView))
        .catch(error => {
          console.error(error);
        });

      sendAudio(dataView);
    });
  }

  function sendAudio (dataView) {
    alexa.sendAudio(dataView)
      .then(({ xhr, response }) => {
        if (!response.multipart.length) return console.error('empty');
        let directives;
        const audioResponses = {};
        const promises = [];

        response.multipart.forEach(function (multipart) {
          const contentType = multipart.headers['Content-Type'];
          let body = multipart.body;

          if (contentType === 'application/json') {
            try {
              body = JSON.parse(body);
            } catch (err) {
              console.error(err);
            }

            if (body && body.messageBody && body.messageBody.directives) {
              directives = body.messageBody.directives;
            }
          } else if (contentType === 'audio/mpeg') {
            const start = multipart.meta.body.byteOffset.start;
            const end = multipart.meta.body.byteOffset.end;
            const contentId = multipart.headers['Content-ID'];

            var slicedBody = xhr.response.slice(start, end);
            audioResponses[contentId] = slicedBody;
          }
        });

        function findAudioFromContentId (contentId) {
          contentId = contentId.replace('cid:', '');

          for (var key in audioResponses) {
            if (key.indexOf(contentId) > -1) {
              return audioResponses[key];
            }
          }
        }

        directives.forEach((directive) => {
          if (directive.namespace === 'SpeechSynthesizer' && directive.name === 'speak') {
            const contentId = directive.payload.audioContent;
            const audio = findAudioFromContentId(contentId);

            if (audio) {
              alexa.audioToBlob(audio);
              promises.push(alexa.player.enqueue(audio));
            }
          } else if (directive.namespace === 'AudioPlayer' && directive.name === 'play') {
            const streams = directive.payload.audioItem.streams;

            streams.forEach(stream => {
              let streamUrl = stream.streamUrl;
              const audio = findAudioFromContentId(streamUrl);

              if (audio) {
                alexa.audioToBlob(audio);
                promises.push(alexa.player.enqueue(audio));
              } else if (streamUrl.indexOf('http') > -1) {
                streamUrl = streamUrl.replace(/!.*$/, '');

                request(`/audio-response?url=${streamUrl}`, function (err, res, body) {
                  if (err) return console.error(err);
                  const urls = event.currentTarget.response;

                  urls.forEach(url => {
                    alexa.player.enqueue(url);
                  });
                });
              }
            });
          }
        });

        if (promises.length) {
          Promise.all(promises).then(() => {
            alexa.player.playQueue();
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  return {
    start,
    login,
    startRecording,
    stopRecording
  };
};
