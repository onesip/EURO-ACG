import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserRole } from '../types';
import { Save, LogIn } from 'lucide-react';
import { loginWithGoogle } from '../lib/firebase';
import ImageUpload from '../components/ImageUpload';
import { useLanguage } from '../components/LanguageProvider';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    role: 'other' as UserRole,
    favorites: { anime: '', characters: '', cp: '' },
    socials: { x: '', instagram: '', xiaohongshu: '', wechat: '', qq: '' },
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        role: profile.role || 'other',
        favorites: { ...profile.favorites },
        socials: { ...profile.socials },
      });
    }
  }, [profile]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <h2 className="text-2xl font-bold text-white mb-2">Create Your Profile</h2>
        <p className="text-slate-400 mb-6 max-w-md">Join the EuroACG community to connect with other fans, cosplayers, and photographers.</p>
        <button 
          onClick={loginWithGoogle}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    );
  }

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { ...formData, updatedAt: Date.now() });
      await refreshProfile();
      alert('Profile updated!');
    } catch (error) {
      console.error(error);
      alert('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{t('prof.title')}</h1>
        <p className="text-slate-400 mt-1">{t('prof.subtitle')}</p>
      </div>

      <div className="bg-[#141416] p-6 rounded-3xl border border-white/5 space-y-6">
        {/* Basic Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-white/5 pb-2">{t('prof.basicInfo')}</h2>
          
          <div className="flex items-center gap-6 pb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 border-2 border-indigo-500/30">
                <img 
                  src={formData.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageUpload 
                  onUpload={(url) => setFormData({...formData, photoURL: url})} 
                  className="scale-90"
                  buttonText="更换"
                />
              </div>
            </div>
            <div>
              <h3 className="text-white font-medium">账号头像</h3>
              <p className="text-xs text-slate-400 mt-1">支持 JPG, PNG 格式</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{t('prof.name')}</label>
              <input 
                type="text" 
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{t('prof.role')}</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                <option value="fan" className="bg-slate-900 text-white">{t('role.fan')}</option>
                <option value="coser" className="bg-slate-900 text-white">{t('role.coser')}</option>
                <option value="photographer" className="bg-slate-900 text-white">{t('role.photographer')}</option>
                <option value="makeup" className="bg-slate-900 text-white">{t('role.makeup')}</option>
                <option value="other" className="bg-slate-900 text-white">{t('role.other')}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-1">{t('prof.bio')}</label>
              <textarea 
                rows={3}
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none placeholder-slate-500 mb-2"
              />
              <div className="flex justify-start">
                <ImageUpload onUpload={(url) => setFormData(prev => ({...prev, bio: prev.bio + `\n![图片](${url})\n`}))} />
              </div>
            </div>
          </div>
        </section>

        {/* ACG Preferences */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-white/5 pb-2">{t('prof.acgFavs')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{t('prof.favAnime')}</label>
              <input 
                type="text" 
                value={formData.favorites.anime}
                onChange={e => setFormData({...formData, favorites: {...formData.favorites, anime: e.target.value}})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{t('prof.favChar')}</label>
              <input 
                type="text" 
                value={formData.favorites.characters}
                onChange={e => setFormData({...formData, favorites: {...formData.favorites, characters: e.target.value}})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{t('prof.favCp')}</label>
              <input 
                type="text" 
                value={formData.favorites.cp}
                onChange={e => setFormData({...formData, favorites: {...formData.favorites, cp: e.target.value}})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Social Links */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-white/5 pb-2">{t('prof.socials')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">X (Twitter)</label>
              <input 
                type="text" 
                value={formData.socials.x}
                onChange={e => setFormData({...formData, socials: {...formData.socials, x: e.target.value}})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder-slate-500"
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Instagram</label>
              <input 
                type="text" 
                value={formData.socials.instagram}
                onChange={e => setFormData({...formData, socials: {...formData.socials, instagram: e.target.value}})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder-slate-500"
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">小红书 / Xiaohongshu</label>
              <input 
                type="text" 
                value={formData.socials.xiaohongshu}
                onChange={e => setFormData({...formData, socials: {...formData.socials, xiaohongshu: e.target.value}})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">微信 / QQ (Optional)</label>
              <input 
                type="text" 
                value={formData.socials.wechat}
                onChange={e => setFormData({...formData, socials: {...formData.socials, wechat: e.target.value}})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>
          </div>
        </section>

        <div className="pt-4 border-t border-white/5">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? t('prof.saving') : t('prof.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
