const assert = require('assert');
const path = require('path');
const qs = require('qs');

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');

const uploadsDir = path.join(__dirname, 'uploads')
const upload = multer({ dest: uploadsDir });
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/', express.static(__dirname));

app.get('/auth', (req, res) => {
  const query = qs.stringify(req.query)
  console.log('req.query', req.query)

  res.redirect(301, `/?${query}`);
});

app.post('/audio-request', upload.single('recording'), (req, res) => {
  res.json(req.file);
});

app.get('/audio-response', (req, res) => {
  const url = req.query.url;
  if (!url) return res.json([]);

  getm3u(url, function (err, urls) {
    if (err) return res.status(500).json({ error: err.message });
    res.json(urls)
  })
});

function getm3u (url, callback) {
  const urls = [];

  request(url, function (err, res, body) {
    if (err) return callback(err);
    if (body) urls.push(body)
    callback(null, urls)
  })
}

app.listen(3131);
