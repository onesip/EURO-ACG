import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

// Helper to fetch with timeout to prevent server thread hangs
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Image Upload Proxy (Base64 JSON approach for better mobile/proxy compatibility)
  app.post("/api/upload-base64", async (req, res) => {
    try {
      const { image, filename, contentType } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Remove header if present (e.g. data:image/jpeg;base64,)
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const name = filename || 'upload.jpg';
      const type = contentType || 'image/jpeg';

      console.log(`[Upload] Received Base64 image: ${name} (${buffer.length} bytes)`);

      // 1. Try PngLog first (Chinese-friendly and specifically requested by user)
      try {
        console.log("[Upload] Attempting PngLog upload...");
        const formData = new FormData();
        const blob = new Blob([buffer], { type });
        formData.append("file", blob, name);

        const response = await fetchWithTimeout("https://pnglog.com/api/v1/upload", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          body: formData,
        }, 4000);

        if (response.ok) {
          const data = await response.json();
          if (data.status && data.data?.links?.url) {
            console.log("[Upload] PngLog Success:", data.data.links.url);
            return res.json({ url: data.data.links.url });
          } else {
            console.warn("[Upload] PngLog responded with error structure:", data);
          }
        } else {
          console.warn(`[Upload] PngLog non-ok response status: ${response.status}`);
        }
      } catch (e: any) {
        console.warn("[Upload] PngLog exception/timeout:", e.message || e);
      }

      // 2. Try Telegra.ph (Ultra-fast, global, extremely stable)
      try {
        console.log("[Upload] Attempting Telegra.ph upload...");
        const teleFormData = new FormData();
        const teleBlob = new Blob([buffer], { type });
        teleFormData.append("file", teleBlob, name);

        const teleRes = await fetchWithTimeout("https://telegra.ph/upload", {
          method: "POST",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          body: teleFormData,
        }, 3500);

        if (teleRes.ok) {
          const data = await teleRes.json();
          if (Array.isArray(data) && data[0] && data[0].src) {
            const url = `https://telegra.ph${data[0].src}`;
            console.log("[Upload] Telegra.ph Success:", url);
            return res.json({ url });
          } else {
            console.warn("[Upload] Telegra.ph unexpected response structure:", data);
          }
        } else {
          console.warn(`[Upload] Telegra.ph non-ok response status: ${teleRes.status}`);
        }
      } catch (e: any) {
        console.warn("[Upload] Telegra.ph exception/timeout:", e.message || e);
      }

      // 3. Try Catbox (High reliability fallback)
      try {
        console.log("[Upload] Attempting Catbox upload...");
        const catboxFormData = new FormData();
        catboxFormData.append("reqtype", "fileupload");
        const catboxBlob = new Blob([buffer], { type });
        catboxFormData.append("fileToUpload", catboxBlob, name);

        const catboxRes = await fetchWithTimeout("https://catbox.moe/user/api.php", {
          method: "POST",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          body: catboxFormData,
        }, 3500);

        if (catboxRes.ok) {
          const url = await catboxRes.text();
          if (url && url.startsWith("http")) {
            console.log("[Upload] Catbox Success:", url);
            return res.json({ url });
          } else {
            console.warn("[Upload] Catbox unexpected text response:", url);
          }
        } else {
          console.warn(`[Upload] Catbox non-ok response status: ${catboxRes.status}`);
        }
      } catch (e: any) {
        console.warn("[Upload] Catbox exception/timeout:", e.message || e);
      }

      throw new Error("所有上传服务暂时不可用，请稍后再试 (All upload services failed)");
    } catch (error: any) {
      console.error("[Upload] Final Error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  });

  app.get("/api/metadata", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      // Add a realistic User-Agent to avoid being blocked by anti-scraping
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = await response.text();

      // Simple regex to extract og:image and og:title
      const imageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["'](.*?)["']/i);
      const titleMatch = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["'](.*?)["']/i) || html.match(/<title>(.*?)<\/title>/i);

      let image = imageMatch ? imageMatch[1] : null;
      let title = titleMatch ? titleMatch[1] : null;

      // Ensure protocol is present if it's missing (e.g. //picasso-static...)
      if (image && image.startsWith('//')) {
        image = 'https:' + image;
      }

      res.json({ image, title });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metadata" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
