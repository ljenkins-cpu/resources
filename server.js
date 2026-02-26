const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['POST', 'GET', 'OPTIONS'],
}));

// Health check — visit your Render URL to confirm it's running
app.get('/', (req, res) => {
  res.json({ status: 'Cherry proxy running OK' });
});

// Proxy route
app.post('/api/generate', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it in Render > Environment.' });
  }

  try {
    console.log('Forwarding request to Anthropic...');

    const https = require('https');
    const bodyStr = JSON.stringify(req.body);

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(data) });
          } catch (e) {
            reject(new Error('Failed to parse Anthropic response: ' + data));
          }
        });
      });

      request.on('error', reject);
      request.write(bodyStr);
      request.end();
    });

    console.log('Anthropic responded with status:', result.status);
    res.status(result.status).json(result.body);

  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('Cherry proxy listening on port ' + PORT);
});
