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
      alert('请上传图片文件 (Please upload an image file)');
      return;
    }

    // Add size check - 5MB limit
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`图片太大啦 (Image too large): ${(file.size / (1024 * 1024)).toFixed(1)}MB\n\n💡 提示: 请确保图片小于 5MB。您可以使用手机自带的截图功能或压缩工具来减小体积。`);
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadToPngLog(file);
      onUpload(url);
    } catch (error: any) {
      console.error("Upload Component Error:", error);
      const errorMsg = error.message || '网络连接超时或服务响应异常';
      alert(`图片上传失败 (Upload Failed):\n${errorMsg}\n\n💡 建议与尝试:\n1. 您的图片已在本地压缩，请检查网络是否稳定。\n2. 若您在微信/QQ内访问，请点击右上角并选择「在浏览器中打开」。\n3. 尝试更换网络环境（如切换 4G/5G 或 Wi-Fi）。\n4. 如果依然不行，请联系管理员或稍后再试。`);
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
