import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { doc, setDoc, collection, query, where, getDocs, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { UserRole, Gender } from '../types';
import { Save, LogIn, Sparkles, MapPin, Palette, RefreshCw, Users, UserCheck, Check, X, MessageSquare, Trash2 } from 'lucide-react';
import { loginWithGoogle } from '../lib/firebase';
import ImageUpload from '../components/ImageUpload';
import { useLanguage } from '../components/LanguageProvider';
import { useTheme, ACG_THEMES } from '../components/ThemeProvider';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

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
  { id: 'FI', name: '芬兰 (Finland)' },
  { id: 'RU', name: '俄罗斯 (Russia)' },
  { id: 'OTHER', name: '其他地区 (Other)' },
];

export default function ProfilePage() {
  const { user, profile, refreshProfile, updateProfileOptimistically, setQuotaExceeded } = useAuth();
  const { t, lang } = useLanguage();
  const { activeTheme, setThemeById } = useTheme();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Friends & Requests State
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const fetchFriendsAndRequests = async () => {
    if (!user) return;
    setLoadingFriends(true);
    try {
      // 1. Fetch pending incoming requests
      const qRequests = query(
        collection(db, 'friendRequests'),
        where('toId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const snapRequests = await getDocs(qRequests);
      const reqs = snapRequests.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setIncomingRequests(reqs);

      // 1b. Fetch pending outgoing requests (requests sent by current user)
      const qSent = query(
        collection(db, 'friendRequests'),
        where('fromId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const snapSent = await getDocs(qSent);
      const sentList = [];
      for (const d of snapSent.docs) {
        const data = d.data();
        try {
          const uSnap = await getDoc(doc(db, 'users', data.toId));
          if (uSnap.exists()) {
            const uData = uSnap.data();
            sentList.push({
              id: d.id,
              toId: data.toId,
              toName: uData.displayName || (lang === 'zh' ? '次元同好' : 'Moyu Pal'),
              toPhoto: uData.photoURL || '',
              role: uData.role || 'other'
            });
          }
        } catch (e) {
          console.error("Error fetching target profile for sent request:", e);
        }
      }
      setOutgoingRequests(sentList);

      // 2. Fetch friends list from subcollection
      const friendsRef = collection(db, 'users', user.uid, 'friends');
      const snapFriends = await getDocs(friendsRef);
      const friendIds = snapFriends.docs.map(d => d.id);

      if (friendIds.length === 0) {
        setFriendsList([]);
        setLoadingFriends(false);
        return;
      }

      // Fetch user profiles for friends
      const list = [];
      for (const fid of friendIds) {
        try {
          const uSnap = await getDoc(doc(db, 'users', fid));
          if (uSnap.exists()) {
            const uData = uSnap.data();
            list.push({
              uid: fid,
              displayName: uData.displayName || (lang === 'zh' ? '二次元萌友' : 'Moyu Friend'),
              photoURL: uData.photoURL || '',
              role: uData.role || 'other'
            });
          }
        } catch (e) {
          console.error("Error fetching friend profile:", e);
        }
      }
      setFriendsList(list);
    } catch (err) {
      console.error("Error fetching friends/requests:", err);
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriendsAndRequests();
    }
  }, [user]);

  const handleAcceptRequest = async (reqId: string, senderId: string) => {
    try {
      await updateDoc(doc(db, 'friendRequests', reqId), { status: 'accepted' });
      await setDoc(doc(db, 'users', user.uid, 'friends', senderId), { uid: senderId, createdAt: serverTimestamp() });
      await setDoc(doc(db, 'users', senderId, 'friends', user.uid), { uid: user.uid, createdAt: serverTimestamp() });
      alert(lang === 'zh' ? '🎉 已通过好友请求！你们现在可以开始私聊啦！' : 'Friend request accepted! You can now chat privately!');
      fetchFriendsAndRequests();
    } catch (err) {
      console.error(err);
      alert(lang === 'zh' ? '处理请求失败，请稍后重试' : 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (reqId: string) => {
    try {
      await updateDoc(doc(db, 'friendRequests', reqId), { status: 'rejected' });
      alert(lang === 'zh' ? '已拒绝好友请求' : 'Friend request declined');
      fetchFriendsAndRequests();
    } catch (err) {
      console.error(err);
      alert(lang === 'zh' ? '操作失败，请稍后重试' : 'Action failed');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!window.confirm(lang === 'zh' ? '⚠️ 确定要删除该死党好友吗？' : 'Are you sure you want to remove this friend?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'friends', friendId));
      await deleteDoc(doc(db, 'users', friendId, 'friends', user.uid));
      alert(lang === 'zh' ? '已解除好友关系' : 'Friend removed');
      fetchFriendsAndRequests();
    } catch (err) {
      console.error(err);
      alert(lang === 'zh' ? '删除失败，请稍后重试' : 'Failed to remove friend');
    }
  };
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

      {/* 二次元死党与请求 (Friends & Requests) */}
      <div className="bg-[#141416] p-6 rounded-3xl border border-white/5 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              {lang === 'zh' ? '🤝 次元绊 · 同好契约' : '🤝 ACG Bonds & Contracts'}
            </h2>
          </div>
          <button
            onClick={fetchFriendsAndRequests}
            disabled={loadingFriends}
            className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
            title={lang === 'zh' ? '刷新契约列表' : 'Sync contracts'}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loadingFriends && "animate-spin")} />
            <span>{lang === 'zh' ? '同步契约' : 'Sync'}</span>
          </button>
        </div>

        {/* 1. Pending Incoming Requests */}
        {incomingRequests.length > 0 && (
          <div className="space-y-3 bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/20">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              {lang === 'zh' ? `💌 收到申请 (${incomingRequests.length})` : `Incoming Requests (${incomingRequests.length})`}
            </h3>
            <div className="grid gap-2">
              {incomingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between bg-[#1b1c23] p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <img
                      src={req.fromPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.fromId}`}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-white/10"
                    />
                    <div>
                      <p className="text-xs font-medium text-white">{req.fromName || (lang === 'zh' ? '神秘同好' : 'Moyu Pal')}</p>
                      <p className="text-[10px] text-slate-400">
                        {lang === 'zh' ? '想要与你缔结死党契约' : 'Wants to form a pal contract'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAcceptRequest(req.id, req.fromId)}
                      className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center gap-1 text-[10px] px-2.5"
                    >
                      <Check className="w-3 h-3" />
                      <span>{lang === 'zh' ? '同意' : 'Accept'}</span>
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
                      className="p-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-md transition-colors flex items-center gap-1 text-[10px] px-2.5"
                    >
                      <X className="w-3 h-3" />
                      <span>{lang === 'zh' ? '拒绝' : 'Decline'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 1b. Pending Outgoing Requests */}
        {outgoingRequests.length > 0 && (
          <div className="space-y-3 bg-white/[0.01] p-4 rounded-2xl border border-white/5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🕊️</span>
              {lang === 'zh' ? `已发出申请 (${outgoingRequests.length})` : `Sent Requests (${outgoingRequests.length})`}
            </h3>
            <div className="grid gap-2">
              {outgoingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between bg-[#17181e]/60 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <img
                      src={req.toPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.toId}`}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-white/10"
                    />
                    <div>
                      <p className="text-xs font-medium text-white">{req.toName}</p>
                      <p className="text-[10px] text-slate-500 italic">
                        {lang === 'zh' ? '契约传送中，等候同好回应...' : 'Awaiting confirmation...'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {lang === 'zh' ? '等待中' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. My Friends List */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
            <span>👥</span>
            {lang === 'zh' ? '已缔结死党' : 'My Friends'}
            <span className="text-[11px] text-indigo-400 font-normal ml-1">({friendsList.length})</span>
          </h3>

          {loadingFriends ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
            </div>
          ) : friendsList.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {friendsList.map((friend) => (
                <div key={friend.uid} className="flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <img
                      src={friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.uid}`}
                      alt="Avatar"
                      className="w-9 h-9 rounded-full object-cover border border-white/10"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">{friend.displayName}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 capitalize mt-1 inline-block">
                        {friend.role === 'coser' ? (lang === 'zh' ? 'Coser' : 'Coser') :
                         friend.role === 'photographer' ? (lang === 'zh' ? '摄影' : 'Photographer') :
                         friend.role === 'makeup' ? (lang === 'zh' ? '妆造' : 'Makeup Artist') :
                         friend.role === 'fan' ? (lang === 'zh' ? '同好' : 'ACG Fan') : (lang === 'zh' ? '同好' : 'Moyu Pal')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/community?friend=${friend.uid}`)}
                      className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1 text-[10px] px-2.5 font-medium"
                      title={lang === 'zh' ? '去私聊' : 'Chat'}
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{lang === 'zh' ? '私聊' : 'Chat'}</span>
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(friend.uid)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
                      title={lang === 'zh' ? '解约' : 'Remove pal'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs bg-white/[0.01] rounded-2xl border border-dashed border-white/5 px-4">
              <p className="mb-2">👻 {lang === 'zh' ? '身边还没有缔结契约的死党哦~' : 'No friend contracts made yet'}</p>
              <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                {lang === 'zh' ? '可以前往「社区交流」或活动、集市中点击其他同好的头像，在个人卡片里发送死党契约请求吧！' : 'Head over to Community or Marketplace to meet new pals and send request!'}
              </p>
            </div>
          )}
        </div>
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
                  onUpload={async (url) => {
                    setFormData(prev => ({...prev, photoURL: url}));
                    // Auto-save avatar for better UX
                    if (user) {
                      try {
                        const docRef = doc(db, 'users', user.uid);
                        await setDoc(docRef, { photoURL: url, updatedAt: Date.now() }, { merge: true });
                        await refreshProfile();
                        alert(lang === 'zh' ? '头像更新成功！' : 'Avatar updated!');
                      } catch (e) {
                        console.error("Avatar auto-save failed:", e);
                      }
                    }
                  }} 
                  className="scale-90"
                  buttonText={lang === 'zh' ? '更换' : 'Change'}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium">{lang === 'zh' ? '账号头像' : 'Profile Avatar'}</h3>
                <button 
                  onClick={() => refreshProfile()}
                  className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                  title={lang === 'zh' ? '同步云端数据' : 'Sync from cloud'}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
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
