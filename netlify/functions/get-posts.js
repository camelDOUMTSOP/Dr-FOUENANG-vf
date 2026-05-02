const https = require('https');

exports.handler = async function(event, context) {
  const owner = 'camelDOUMTSOP';
  const repo = 'Dr-FOUENANG-vf';
  const branch = 'main';
 const folder = '_messages';

  try {
    const data = await fetchJSON(
      `https://api.github.com/repos/${owner}/${repo}/contents/${folder}?ref=${branch}`,
      { 'User-Agent': 'netlify-function', 'Accept': 'application/vnd.github.v3+json' }
    );

    const posts = await Promise.all(
      data
        .filter(f => f.name.endsWith('.md'))
        .map(async f => {
          const raw = await fetchText(f.download_url);
          return parsePost(raw, f.name);
        })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(posts.filter(Boolean))
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([])
    };
  }
};

function fetchJSON(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parsePost(raw, filename) {
  try {
    const lines = raw.split('\n');
    let title = '', tag = '', desc = '', img = '', date = '', body = '';
    let inFront = false, frontDone = false, frontCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '---') {
        frontCount++;
        inFront = frontCount === 1;
        if (frontCount === 2) { inFront = false; frontDone = true; }
        continue;
      }
      if (inFront) {
        if (line.startsWith('title:')) title = line.replace('title:', '').trim().replace(/^["']|["']$/g, '');
        if (line.startsWith('tag:')) tag = line.replace('tag:', '').trim().replace(/^["']|["']$/g, '');
        if (line.startsWith('desc:')) desc = line.replace('desc:', '').trim().replace(/^["']|["']$/g, '');
        if (line.startsWith('img:')) img = line.replace('img:', '').trim().replace(/^["']|["']$/g, '');
        if (line.startsWith('date:')) date = line.replace('date:', '').trim().replace(/^["']|["']$/g, '');
      } else if (frontDone) {
        body += line + '\n';
      }
    }

    return { title, tag, desc, img, date, body: body.trim() };
  } catch(e) {
    return null;
  }
}