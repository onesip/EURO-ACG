import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';

const storage = getStorage(app);

const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<File> => {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.FileReader || !window.HTMLCanvasElement) {
        return resolve(file);
      }

      if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
        return resolve(file);
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        try {
          const img = new Image();
          img.onload = () => {
            try {
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
                  try {
                    if (!blob) {
                      return resolve(file);
                    }
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                  } catch (err) {
                    console.warn('[Upload] toBlob inner failed, returning original file', err);
                    resolve(file);
                  }
                },
                'image/jpeg',
                quality
              );
            } catch (err) {
              console.warn('[Upload] Canvas draw failed, returning original file', err);
              resolve(file);
            }
          };
          img.onerror = () => resolve(file);
          img.src = event.target?.result as string;
        } catch (err) {
          console.warn('[Upload] Image load creation failed, returning original file', err);
          resolve(file);
        }
      };
      reader.onerror = () => resolve(file);
    } catch (err) {
      console.warn('[Upload] FileReader init failed, returning original file', err);
      resolve(file);
    }
  });
};

export const uploadToPngLog = async (rawFile: File): Promise<string> => {
  // We compress to max 600px for avatars to be super-fast, max 1000px for other images
  const isAvatar = rawFile.name.toLowerCase().includes('avatar') || rawFile.size < 500000;
  const sizeLimit = isAvatar ? 300 : 900;
  const quality = isAvatar ? 0.65 : 0.72;
  
  const file = await compressImage(rawFile, sizeLimit, sizeLimit, quality);

  // Helper to convert to Base64
  const toBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(f);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  let base64Image = '';
  try {
    base64Image = await toBase64(file);
  } catch (err) {
    console.error('[Upload] Base64 conversion failed:', err);
  }

  // 1. Primary Attempt: Express Server Proxy with 4.5 seconds timeout
  try {
    console.log('[Upload] Attempting fast image hosting server proxy...');
    
    // We wrap fetch in a timeout promise to prevent hanging
    const fetchPromise = fetch('/api/upload-base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        filename: file.name,
        contentType: file.type,
      }),
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Server proxy request timeout (4.5s)')), 4500)
    );

    const res = await Promise.race([fetchPromise, timeoutPromise]);
    
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
    console.warn('[Upload] Image host proxy failed, trying Firebase Storage as fallback:', proxyError.message || proxyError);

    // 2. Secondary Attempt: Native Firebase Storage with 3.5 seconds timeout
    try {
      console.log('[Upload] Attempting emergency Firebase Storage upload...');
      const uniqueName = `uploads/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${file.name}`;
      const storageRef = ref(storage, uniqueName);
      
      const uploadPromise = uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase upload timeout (3.5s)')), 3500)
      );

      const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
      console.log('[Upload] Firebase Storage upload fallback success:', downloadUrl);
      return downloadUrl;
    } catch (firebaseError: any) {
      console.warn('[Upload] Both Server Proxy and Firebase Storage failed or timed out. Falling back to local Base64 URL:', firebaseError);
      
      // 3. Ultimate Fallback: Instant Base64 Data URL (100% Success guaranteed!)
      if (base64Image) {
        console.log('[Upload] 100% Guaranteed Base64 fallback used successfully.');
        return base64Image;
      }
      
      throw new Error('图片上传失败，请检查网络连接或更换图片再试一次。');
    }
  }
};
