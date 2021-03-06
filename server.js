const path = require('path');
const qs = require('qs');

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const request = require('request');

const uploadsDir = path.join(__dirname, 'uploads');
const upload = multer({ dest: uploadsDir });
const app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server, { path: '/socket.io' });
var users = {}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/', express.static(__dirname));

io.on('connection', function (socket) {
  console.log('socket', socket.id)
  socket.on('join', function (requestData) {
    console.log('join', requestData)
    socket.join(requestData.id);
  });
});

app.get('/auth', (req, res) => {
  const query = qs.stringify(req.query);
  res.redirect(301, `/?${query}`);
});

// app.post('/session-data', (req, res) => {
//   io.emit('session-data', req.body);
//   res.status(200).send('');
// });

app.post('/progress', (req, res) => {
  console.log('req.body', req.body)
  io.emit(req.query.type, req.body);
  res.status(200).send('');
});

app.post('/audio-request', upload.single('recording'), (req, res) => {
  res.json(req.file);
});

app.get('/audio-response', (req, res) => {
  const url = req.query.url;
  if (!url) return res.json([]);

  getm3u(url, function (err, urls) {
    if (err) return res.status(500).json({ error: err.message });
    res.json(urls);
  });
});

function getm3u (url, callback) {
  const urls = [];

  request(url, function (err, res, body) {
    if (err) return callback(err);
    if (body) urls.push(body);
    callback(null, urls);
  });
}

server.listen(process.env.PORT || 3000);
