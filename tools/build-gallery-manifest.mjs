import { readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const servicesRoot = path.join(root, 'assets', 'images', 'services');
const outputFile = path.join(root, 'assets', 'data', 'galleries.json');
const imagePattern = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function displayName(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

const files = (await readdir(servicesRoot, { withFileTypes: true }))
  .filter(entry => entry.isFile() && imagePattern.test(entry.name))
  .map(entry => entry.name)
  .sort(naturalSort);

const images = files.map(file => ({
  name: displayName(file),
  url: `/assets/images/services/${file.split('/').map(encodeURIComponent).join('/')}`
}));

const galleries = [{
  slug: 'services',
  title: 'Our Service Work',
  icon: '★',
  count: images.length,
  cover: images[0]?.url || null,
  images
}];

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify({ generated: true, galleries }, null, 2)}\n`);
console.log(`Wrote ${outputFile} with ${images.length} service photos`);
