import { readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const servicesRoot = path.join(root, 'assets', 'images', 'services');
const outputFile = path.join(root, 'assets', 'data', 'gallery-manifest.json');
const imagePattern = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

const titles = {
  'home-cleanouts': 'Home Cleanouts',
  'furniture-removal': 'Furniture Removal',
  'construction-debris': 'Construction Debris',
  'yard-and-outdoor-debris': 'Yard & Outdoor Debris',
  'appliances-and-heavy-items': 'Appliances & Heavy Items',
  'business-and-office': 'Business & Office',
  'estate-cleanouts': 'Estate Cleanouts',
  'sheds-and-small-structures': 'Sheds & Small Structures'
};

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

const folders = (await readdir(servicesRoot, { withFileTypes: true }))
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort(naturalSort);

const galleries = {};
for (const slug of folders) {
  const folder = path.join(servicesRoot, slug);
  const files = (await readdir(folder, { withFileTypes: true }))
    .filter(entry => entry.isFile() && imagePattern.test(entry.name))
    .map(entry => entry.name)
    .sort(naturalSort);

  galleries[slug] = {
    title: titles[slug] || displayName(slug),
    images: files.map(file => ({
      name: displayName(file),
      url: `/assets/images/services/${encodeURIComponent(slug)}/${file.split('/').map(encodeURIComponent).join('/')}`
    }))
  };
}

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), galleries }, null, 2)}\n`);
console.log(`Wrote ${outputFile}`);
