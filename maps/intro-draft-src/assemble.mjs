import fs from 'node:fs';
const data = fs.readFileSync('intro-data.json', 'utf8').replace(/<\//g, '<\/');
const tpl = fs.readFileSync('template.html', 'utf8');

fs.writeFileSync(new URL('../intro-draft.html', import.meta.url), tpl.replace('__DATA__', () => data));
console.log('written', (Buffer.byteLength(tpl) + Buffer.byteLength(data)) / 1024 | 0, 'KB');
