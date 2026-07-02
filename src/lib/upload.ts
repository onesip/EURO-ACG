export const uploadToPngLog = async (file: File): Promise<string> => {
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
