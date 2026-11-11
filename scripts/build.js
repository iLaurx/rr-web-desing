import { mkdir, copyFile, rm } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(new URL('src/', output), { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'src/roundRobin.js']) {
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(file, output));
}
console.log('Sitio estático preparado en dist/.');
