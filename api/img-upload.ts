import type { VercelRequest, VercelResponse } from '@vercel/node';
import Busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow both POST and OPTIONS (for CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  return new Promise((resolve) => {
    const busboy = Busboy({ headers: req.headers });
    let fileBuffer: Buffer | null = null;
    let fileName = 'upload.png';
    let mimeType = 'image/png';

    busboy.on('file', (name, file, info) => {
      const { filename, mimeType: mt } = info;
      fileName = filename;
      mimeType = mt;
      const chunks: any[] = [];
      file.on('data', (data) => {
        chunks.push(data);
      });
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('finish', async () => {
      if (!fileBuffer) {
        res.status(400).json({ error: 'No file uploaded' });
        return resolve(null);
      }

      console.log(`[Vercel] Processing upload: ${fileName} (${fileBuffer.length} bytes)`);

      // Attempt 1: Catbox (Very reliable for serverless)
      try {
        const catboxFormData = new FormData();
        catboxFormData.append('reqtype', 'fileupload');
        const catboxBlob = new Blob([fileBuffer], { type: mimeType });
        catboxFormData.append('fileToUpload', catboxBlob, fileName);

        const catboxRes = await fetch('https://catbox.moe/user/api.php', {
          method: 'POST',
          body: catboxFormData,
        });

        if (catboxRes.ok) {
          const url = await catboxRes.text();
          if (url && url.startsWith('http')) {
            res.json({ url });
            return resolve(null);
          }
        }
      } catch (e: any) {
        console.warn('[Vercel] Catbox fallback error:', e.message);
      }

      // Attempt 2: PngLog
      try {
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: mimeType });
        formData.append('file', blob, fileName);

        const response = await fetch('https://pnglog.com/api/v1/upload', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          body: formData,
        });

        const data = await response.json() as any;
        if (data.status && data.data?.links?.url) {
          res.json({ url: data.data.links.url });
          return resolve(null);
        }
      } catch (e: any) {
        console.warn('[Vercel] PngLog error:', e.message);
      }

      res.status(500).json({ error: 'All upload providers failed' });
      resolve(null);
    });

    req.pipe(busboy);
  });
}
