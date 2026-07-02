const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<File> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.FileReader || !window.HTMLCanvasElement) {
      return resolve(file);
    }

    if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export const uploadToPngLog = async (rawFile: File): Promise<string> => {
  // Compress image on client side first to save bandwidth and avoid size-limit issues
  const file = await compressImage(rawFile);

  const formData = new FormData();
  formData.append('file', file);
  
  // You can set VITE_PNGLOG_TOKEN in .env if an API token is required
  // @ts-ignore
  const token = import.meta.env.VITE_PNGLOG_TOKEN;
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch('https://pnglog.com/api/v1/upload', {
      method: 'POST',
      headers,
      body: formData
    });
    
    const json = await res.json();
    
    if (json.status && json.data && json.data.links && json.data.links.url) {
      return json.data.links.url;
    }
    
    throw new Error(json.message || 'Image upload failed');
  } catch (error) {
    console.error('PngLog Upload Error:', error);
    // If it fails (e.g. CORS or no driver), we fallback to base64 for the prototype
    // In production, we'd want to fix the PngLog API issue
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
