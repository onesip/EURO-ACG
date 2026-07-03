import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadToPngLog } from '../lib/upload';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  className?: string;
  buttonText?: string;
}

export default function ImageUpload({ onUpload, className = '', buttonText = '上传图片' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadToPngLog(file);
      onUpload(url);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || '未知错误';
      alert(`图片上传失败 (Upload Failed):\n${errorMsg}\n\n💡 建议: 请确保图片小于 5MB，并尝试更换一个浏览器或检查网络连接。`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`inline-block ${className}`}>
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm text-slate-300 disabled:opacity-50"
      >
        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        <span>{isUploading ? '上传中...' : buttonText}</span>
      </button>
    </div>
  );
}
