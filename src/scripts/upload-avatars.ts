/**
 * Fetches AI-generated faces (thispersondoesnotexist.com - synthetic, no
 * real-person consent issues) and uploads each to imgbb, saving the hosted
 * URLs to src/seeds/avatar-urls.json for seed.ts to read.
 *
 *   npm run upload-avatars
 */
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config();

const IMGBB_KEY = process.env.IMGBB_API_KEY;
const COUNT = 25; // matches the total accounts that get a photo in seed.ts
const OUT_PATH = path.join(__dirname, '..', 'src', 'seeds', 'avatar-urls.json');

if (!IMGBB_KEY) {
  console.error('Missing IMGBB_API_KEY in .env');
  process.exit(1);
}

async function fetchRandomFace(): Promise<Buffer> {
  const res = await fetch('https://thispersondoesnotexist.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`Face fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToImgbb(buffer: Buffer): Promise<string> {
  const form = new URLSearchParams();
  form.append('key', IMGBB_KEY!);
  form.append('image', buffer.toString('base64'));

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: form,
  });
  const json = await res.json();
  if (!json.success) throw new Error(`imgbb upload failed: ${JSON.stringify(json)}`);
  return json.data.url;
}

async function main() {
  const urls: string[] = [];
  for (let i = 0; i < COUNT; i++) {
    process.stdout.write(`[${i + 1}/${COUNT}] fetching face... `);
    const face = await fetchRandomFace();
    process.stdout.write('uploading... ');
    const url = await uploadToImgbb(face);
    urls.push(url);
    console.log('done');
    await new Promise((r) => setTimeout(r, 1200)); // be polite to both services
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(urls, null, 2));
  console.log(`\nSaved ${urls.length} URLs to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});