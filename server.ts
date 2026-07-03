import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Image Upload Proxy
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`[Server] Uploading: ${req.file.originalname} (${req.file.size} bytes)`);

      // 1. PngLog
      try {
        const formData = new FormData();
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append("file", blob, req.file.originalname);

        const response = await fetch("https://pnglog.com/api/v1/upload", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          body: formData,
        });

        const data = await response.json();
        if (data.status && data.data?.links?.url) {
          console.log("[Server] PngLog Success:", data.data.links.url);
          return res.json({ url: data.data.links.url });
        }
      } catch (e: any) {
        console.warn("[Server] PngLog Error:", e.message);
      }

      // 2. Catbox
      try {
        const catboxFormData = new FormData();
        catboxFormData.append("reqtype", "fileupload");
        const catboxBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
        catboxFormData.append("fileToUpload", catboxBlob, req.file.originalname);

        const catboxRes = await fetch("https://catbox.moe/user/api.php", {
          method: "POST",
          body: catboxFormData,
        });

        if (catboxRes.ok) {
          const url = await catboxRes.text();
          if (url && url.startsWith("http")) {
            console.log("[Server] Catbox Success:", url);
            return res.json({ url });
          }
        }
      } catch (e: any) {
        console.warn("[Server] Catbox Error:", e.message);
      }

      throw new Error("所有上传服务均不可用 (All upload services failed).");
    } catch (error: any) {
      console.error("[Server] Final Upload Error:", error);
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
