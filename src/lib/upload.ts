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
  
  try {
    const res = await fetch('/api/img-upload', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    const data = await res.json();
    
    if (data.url) {
      return data.url;
    }
    
    throw new Error('Image upload failed: No URL returned');
  } catch (error: any) {
    console.error('Upload Error:', error);
    throw new Error(error.message || 'Image upload failed. Please try again later.');
  }
};
