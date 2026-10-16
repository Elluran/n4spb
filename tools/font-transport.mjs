// Fetch the exact requested Google font bytes through Node's HTTP transport.
// Keeps browser benchmarks independent of intermittent Chromium HTTP/2 stalls.
// Local scene assets still use the normal browser loader and error checks.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
export async function installFontTransport(page, interceptAll = false) {
  const dir = path.join(os.tmpdir(), 'piter-benchmark-fonts');
  await fs.mkdir(dir, { recursive: true });
  // drive-bench retains the same interception route used for its baseline.
  // Baking uses narrow CDP patterns, so large binary uploads never cross CDP.
  const session = interceptAll ? null : await page.createCDPSession();
  const handle = async (url, headers, fulfill, fail) => {
    try {
      const ua = headers['User-Agent'] || headers['user-agent'] || '';
      const file = path.join(dir, createHash('sha256').update(url + ua).digest('hex') + '.json');
      let value;
      try { value = JSON.parse(await fs.readFile(file, 'utf8')); } catch {
        const response = await fetch(url, { headers: { 'user-agent': ua }, signal: AbortSignal.timeout(60000) });
        if (!response.ok) throw Error('Font HTTP ' + response.status + ': ' + url);
        value = { contentType: response.headers.get('content-type'), body: Buffer.from(await response.arrayBuffer()).toString('base64') };
        await fs.writeFile(file, JSON.stringify(value));
      }
      await fulfill(value);
    } catch (error) { console.error(error); await fail(); }
  };
  if (interceptAll) {
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(request.url())) return request.continue();
      return handle(request.url(), request.headers(), value => request.respond({ status: 200, contentType: value.contentType, headers: { 'Access-Control-Allow-Origin': '*' }, body: Buffer.from(value.body, 'base64') }), () => request.abort('failed'));
    });
  } else {
    await session.send('Fetch.enable', { patterns: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'].map(urlPattern => ({ urlPattern })) });
    session.on('Fetch.requestPaused', ({ requestId, request }) => handle(request.url, request.headers,
      value => session.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: value.contentType }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: value.body }),
      () => session.send('Fetch.failRequest', { requestId, errorReason: 'Failed' })));
  }
}
