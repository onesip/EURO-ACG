import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { UserRole, Gender } from '../types';
import { Save, LogIn, Sparkles, MapPin, Palette } from 'lucide-react';
import { loginWithGoogle } from '../lib/firebase';
import ImageUpload from '../components/ImageUpload';
import { useLanguage } from '../components/LanguageProvider';
import { useTheme, ACG_THEMES } from '../components/ThemeProvider';
import { cn } from '../lib/utils';

const EUROPEAN_COUNTRIES = [
  { id: 'NL', name: '荷兰 (Netherlands)' },
  { id: 'DE', name: '德国 (Germany)' },
  { id: 'BE', name: '比利时 (Belgium)' },
  { id: 'FR', name: '法国 (France)' },
  { id: 'UK', name: '英国 (United Kingdom)' },
  { id: 'IT', name: '意大利 (Italy)' },
  { id: 'ES', name: '西班牙 (Spain)' },
  { id: 'CH', name: '瑞士 (Switzerland)' },
  { id: 'AT', name: '奥地利 (Austria)' },
  { id: 'OTHER', name: '其他地区 (Other)' },
];

export default function ProfilePage() {
  const { user, profile, refreshProfile, updateProfileOptimistically, setQuotaExceeded } = useAuth();
  const { t, lang } = useLanguage();
  const { activeTheme, setThemeById } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    photoURL: '',
    bio: '',
    role: 'other' as UserRole,
    gender: 'prefer-not-to-say' as Gender,
    favorites: { anime: '', characters: '', cp: '' },
    socials: { x: '', instagram: '', xiaohongshu: '', wechat: '', qq: '' },
    residentCountries: [] as string[],
    visitCountries: [] as string[],
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        photoURL: profile.photoURL || '',
        bio: profile.bio || '',
        role: profile.role || 'other',
        gender: profile.gender || 'prefer-not-to-say',
        favorites: {
          anime: profile.favorites?.anime || '',
          characters: profile.favorites?.characters || '',
          cp: profile.favorites?.cp || '',
        },
        socials: {
          x: profile.socials?.x || '',
          instagram: profile.socials?.instagram || '',
          xiaohongshu: profile.socials?.xiaohongshu || '',
          wechat: profile.socials?.wechat || '',
          qq: profile.socials?.qq || '',
        },
        residentCountries: profile.residentCountries || [],
        visitCountries: profile.visitCountries || [],
      });
    }
  }, [profile]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center animate-fadeIn max-w-md mx-auto space-y-6">
        <div className="w-full">
          <h2 className="text-2xl font-bold text-white mb-2">{lang === 'zh' ? '本命档案库' : 'Create Your Profile'}</h2>
          <p className="text-slate-400 mb-6 text-sm">{lang === 'zh' ? '加入 100% 纯粹的欧洲 ACG 圈子，寻找您的本命同好、金牌妆造与神仙摄影！' : 'Join the EUROACG community to connect with other fans, cosplayers, and photographers in Europe.'}</p>
          <div className="p-6 bg-[#141416] border border-red-500/10 rounded-3xl mb-6 text-left">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>⚠️</span>
              {lang === 'zh' ? '关于 Firebase 部署授权域名 (Vercel 用户必看)' : 'Firebase Authorized Domain Guide'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed space-y-2">
              {lang === 'zh' ? (
                <>
                   若是您将项目部署在 Vercel 或是其他自定义域名，在点击登录时会报错 <strong>auth/unauthorized-domain</strong>。这是由于 Firebase 为了安全只允许白名单域名访问。
                  <br />
                  <span className="text-white block mt-2 font-medium">💡 修复步骤：</span>
                  1. 登录并打开您的 <strong>Firebase Console</strong>。
                  <br />
                  2. 依次进入 <strong>Authentication</strong> &rarr; <strong>Settings</strong> 选项卡。
                  <br />
                  3. 找到 <strong>Authorized domains</strong>（授权网域）列表。
                  <br />
                  4. 点击 <strong>Add domain</strong> 按钮，并添加您刚才部署 de Vercel 域名（例如：<code className="text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded">euro-acg.vercel.app</code>）。
                  <br />
                  5. 保存后即可完美顺畅登录！
                </>
              ) : (
                <>
                  If you deploy on Vercel or a custom domain, you will encounter the <strong>auth/unauthorized-domain</strong> error when logging in.
                  <br />
                  <span className="text-white block mt-2 font-medium">💡 How to Fix:</span>
                  1. Log in to your <strong>Firebase Console</strong>.
                  <br />
                  2. Navigate to <strong>Authentication</strong> &rarr; <strong>Settings</strong> tab.
                  <br />
                  3. Find the <strong>Authorized domains</strong> list.
                  <br />
                  4. Click <strong>Add domain</strong> and add your Vercel URL (e.g., <code className="text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded">euro-acg.vercel.app</code>).
                </>
              )}
            </p>
          </div>
        </div>

        {/* ACG Skins Customization for Guests */}
        <div className="w-full bg-[#141416] p-6 rounded-3xl border border-white/5 space-y-4 text-left">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">{t('prof.skinChange')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ACG_THEMES.map((theme) => {
              const isActive = activeTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setThemeById(theme.id)}
                  type="button"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border text-xs cursor-pointer transition-all text-center",
                    isActive 
                      ? "bg-indigo-500/10 border-indigo-500 text-white font-bold scale-105 shadow-md" 
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  )}
                >
                  <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center p-0.5" style={{ backgroundColor: `rgb(${theme.colors.theme500})` }}>
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span>{theme.name.split(' (')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    
    // Optimistic update
    updateProfileOptimistically(formData);

    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { ...formData, updatedAt: Date.now() }, { merge: true });
      await refreshProfile();
      alert('本命档案更新成功！Profile updated successfully!');
    } catch (error: any) {
      console.error(error);
      if (error?.code === 'resource-exhausted') {
        setQuotaExceeded(true);
        alert(lang === 'zh' ? '本命档案已在本地保存更新！(由于云端额度超限，暂时保存在本地缓存)' : 'Profile updated and saved locally! (Cloud quota exceeded)');
      } else {
        alert('保存失败 Failed to update profile');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{t('prof.title')}</h1>
        <p className="text-slate-400 mt-1">{t('prof.subtitle')}</p>
      </div>

      <div className="bg-[#141416] p-6 rounded-3xl border border-white/5 space-y-6">
        
        {/* ACG Skins Customization */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">{t('prof.skinChange')}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ACG_THEMES.map((theme) => {
              const isActive = activeTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setThemeById(theme.id)}
                  type="button"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border text-xs cursor-pointer transition-all text-center",
                    isActive 
                      ? "bg-indigo-500/10 border-indigo-500 text-white font-bold scale-105 shadow-md" 
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  )}
                >
                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center p-1" style={{ backgroundColor: `rgb(${theme.colors.theme500})` }}>
                    <div className="w-3 h-3 rounded-full bg-white" />
                  </div>
                  <span>{theme.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Basic Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">{t('prof.basicInfo')}</h2>
          </div>
          
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
                  buttonText={lang === 'zh' ? '更换' : 'Change'}
                />
              </div>
            </div>
            <div>
              <h3 className="text-white font-medium">{lang === 'zh' ? '账号头像' : 'Profile Avatar'}</h3>
              <p className="text-xs text-slate-400 mt-1">{lang === 'zh' ? '支持 JPG, PNG 格式' : 'Supports JPG, PNG formats'}</p>
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
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                {lang === 'zh' ? '性别 (必填)' : 'Gender (Required)'} <span className="text-rose-500 font-bold">*</span>
              </label>
              <select 
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value as Gender})}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                <option value="male" className="bg-slate-900 text-white">{lang === 'zh' ? '男 (Male)' : 'Male'}</option>
                <option value="female" className="bg-slate-900 text-white">{lang === 'zh' ? '女 (Female)' : 'Female'}</option>
                <option value="non-binary" className="bg-slate-900 text-white">{lang === 'zh' ? '非二元 (Non-binary)' : 'Non-binary'}</option>
                <option value="other" className="bg-slate-900 text-white">{lang === 'zh' ? '其他 (Other)' : 'Other'}</option>
                <option value="prefer-not-to-say" className="bg-slate-900 text-white">{lang === 'zh' ? '保密 (Secret)' : 'Prefer not to say'}</option>
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

        {/* Multi-Region Selection */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">{lang === 'zh' ? '🌍 欧洲活动区域 (常驻与去向)' : '🌍 European Active Regions'}</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('prof.residentCountries')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EUROPEAN_COUNTRIES.map((country) => {
                  const isChecked = formData.residentCountries?.includes(country.id);
                  return (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => {
                        const newCountries = isChecked 
                          ? formData.residentCountries.filter(c => c !== country.id)
                          : [...formData.residentCountries, country.id];
                        setFormData({...formData, residentCountries: newCountries});
                      }}
                      className={cn(
                        "flex items-center justify-center p-3 rounded-xl border text-xs cursor-pointer transition-all",
                        isChecked 
                          ? "bg-indigo-500/10 border-indigo-500 text-white font-semibold" 
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      )}
                    >
                      <span>{country.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('prof.visitCountries')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EUROPEAN_COUNTRIES.map((country) => {
                  const isChecked = formData.visitCountries?.includes(country.id);
                  return (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => {
                        const newCountries = isChecked 
                          ? formData.visitCountries.filter(c => c !== country.id)
                          : [...formData.visitCountries, country.id];
                        setFormData({...formData, visitCountries: newCountries});
                      }}
                      className={cn(
                        "flex items-center justify-center p-3 rounded-xl border text-xs cursor-pointer transition-all",
                        isChecked 
                          ? "bg-indigo-500/10 border-indigo-500 text-white font-semibold" 
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      )}
                    >
                      <span>{country.name}</span>
                    </button>
                  );
                })}
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
