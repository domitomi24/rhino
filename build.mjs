import { cp, readFile, rm, writeFile } from 'node:fs/promises';

const output = new URL('../.netlify-output/', import.meta.url);
await rm(output, { recursive: true, force: true });
await cp(new URL('../dist/', import.meta.url), output, { recursive: true });

for (const page of ['contact.html', 'contact-bedankt.html']) {
  await cp(new URL(page, import.meta.url), new URL(page, output));
}

const homepage = new URL('index.html', output);
const html = await readFile(homepage, 'utf8');
const footer = '<div class="footer-links">';
if (!html.includes(footer)) throw new Error('De footerlinks ontbreken op de homepage.');
await writeFile(homepage, html.replace(footer, footer + '<a href="/contact.html">Contact</a>'));
