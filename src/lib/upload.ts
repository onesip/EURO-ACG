import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';

const storage = getStorage(app);

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
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
  });
};

export const uploadToPngLog = async (rawFile: File): Promise<string> => {
  // Compress image on client side first to save bandwidth and avoid size-limit issues
  // We compress to max 800px width/height and 0.72 quality for rapid upload speeds and minimal bandwidth
  const file = await compressImage(rawFile, 800, 800, 0.72);

  // Convert to Base64
  const toBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(f);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  // 1. Primary Attempt: Express Server Proxy (Uses PngLog, Telegra.ph, and Catbox)
  try {
    console.log('[Upload] Attempting fast image hosting server proxy...');
    const base64Image = await toBase64(file);
    
    const res = await fetch('/api/upload-base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: base64Image,
        filename: file.name,
        contentType: file.type
      })
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    const data = await res.json();
    
    if (data.url) {
      console.log('[Upload] Server proxy upload success:', data.url);
      return data.url;
    }
    
    throw new Error('Image upload failed: No URL returned from server proxy');
  } catch (proxyError: any) {
    console.warn('[Upload] Image host proxy failed, trying Firebase Storage as final fallback:', proxyError.message || proxyError);

    // 2. Final Fallback: Native Firebase Storage
    try {
      console.log('[Upload] Attempting emergency Firebase Storage upload...');
      const uniqueName = `uploads/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${file.name}`;
      const storageRef = ref(storage, uniqueName);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      console.log('[Upload] Firebase Storage upload fallback success:', downloadUrl);
      return downloadUrl;
    } catch (firebaseError: any) {
      console.error('[Upload] Both Server Proxy and Firebase Storage failed:', firebaseError);
      throw new Error(proxyError.message || '图片上传失败，请检查您的网络连接或稍后再试。');
    }
  }
};
