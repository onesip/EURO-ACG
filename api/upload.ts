import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({});
  
  try {
    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const buffer = fs.readFileSync(file.filepath);
    const fileName = file.originalFilename || 'upload.png';
    const mimeType = file.mimetype || 'image/png';

    // Try PngLog first
    try {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
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
        return res.json({ url: data.data.links.url });
      }
    } catch (e) {
      console.warn('PngLog failed in Vercel:', e);
    }

    // Fallback: Catbox
    try {
      const catboxFormData = new FormData();
      catboxFormData.append('reqtype', 'fileupload');
      const catboxBlob = new Blob([buffer], { type: mimeType });
      catboxFormData.append('fileToUpload', catboxBlob, fileName);

      const catboxRes = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: catboxFormData,
      });

      if (catboxRes.ok) {
        const url = await catboxRes.text();
        if (url && url.startsWith('http')) {
          return res.json({ url });
        }
      }
    } catch (e) {
      console.warn('Catbox failed in Vercel:', e);
    }

    throw new Error('All upload providers failed');
  } catch (error: any) {
    console.error('Vercel Upload Error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload' });
  }
}
