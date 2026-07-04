import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, limit, addDoc, serverTimestamp, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { loadFromCache, saveToCache } from '../lib/cache';
import { MessageSquare, Send, Sparkles, Users, Coffee, RefreshCw, Heart, Lock, Globe, Smile, Music } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';
import { useSearchParams } from 'react-router-dom';
import { sendNotification } from '../lib/notifications';

interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  senderRole: string;
  content: string;
  createdAt: any;
  timestamp: number; // local fallback timestamp
  type?: 'text' | 'action'; // text message vs interactive action
  actionType?: string; // nuzzle, pat, etc.
}

interface ChatChannel {
  id: string;
  name: string;
  enName: string;
  flag: string;
  desc: string;
  enDesc: string;
}

const CHANNELS: ChatChannel[] = [
  { id: 'global', name: '欧罗巴世界主干道', enName: 'Europa Main Hall', flag: '🌐', desc: '全区二次元跨界连通，欢迎畅聊！', enDesc: 'Connected globally, welcome to chat!' },
  { id: 'NL', name: '荷兰郁金香风车萌', enName: 'Netherlands Tulip Garden', flag: '🇳🇱', desc: '在风车下看最新季番的风车萌友~', enDesc: 'Windmills, Tulips and Anime fans!' },
  { id: 'DE', name: '德国意志重工电音社', enName: 'Germany Techno Base', flag: '🇩🇪', desc: '硬核工业风下的重金属二次元基地！', enDesc: 'Industrial beats and hardcore ACG!' },
  { id: 'FI', name: '芬兰极寒北极光桑拿房', enName: 'Finland Aurora Sauna', flag: '🇫🇮', desc: '边蒸桑拿边讨论本命老婆的冬日小屋', enDesc: 'Discussing waifus inside cozy Finnish saunas.' },
  { id: 'RU', name: '俄罗斯熊国伏特加冰林', enName: 'Russia Vodka Magic Woods', flag: '🇷🇺', desc: '冰雪奇缘里的硬核冬泳红魔馆', enDesc: 'Hardcore ice swims and magic forests.' },
  { id: 'BE', name: '比利时皇家巧克力工坊', enName: 'Belgium Choco Workshop', flag: '🇧🇪', desc: '咬一口甜甜的巧克力，聊甜甜的番~', enDesc: 'Bite sweet chocolate and chat sweet shows.' },
  { id: 'FR', name: '凡尔赛红酒庄高雅茶会', enName: 'France Versailles Salon', flag: '🇫🇷', desc: '优雅，永不过时的红茶与红叶集会', enDesc: 'Elegant salon, tea time and autumn cosplays.' },
  { id: 'UK', name: '伦敦雾都古典红茶会馆', enName: 'UK classical Afternoon Tea', flag: '🇬🇧', desc: '福尔摩斯在喝红茶时也在摸鱼吗？', enDesc: 'Does Holmes also browse forum while sipping tea?' },
  { id: 'IT', name: '意式浓缩意面战术中心', enName: 'Italy Tactical Pasta Center', flag: '🇮🇹', desc: '手势飞舞！大声安利你最爱的动漫！', enDesc: 'Passionate hand gestures for top tier anime!' },
  { id: 'ES', name: '马德里狂欢佛朗明哥秀', enName: 'Spain Flamenco Plaza', flag: '🇪🇸', desc: '热烈的阳光，极度狂热的二次元派对', enDesc: 'Sunshine, passion, and blazing otaku parties!' },
  { id: 'CH', name: '阿尔卑斯牧场少女哨笛', enName: 'Switzerland Alp Horn Haven', flag: '🇨🇭', desc: '海蒂和克拉拉正在联机玩原神？', enDesc: 'Are Heidi and Clara co-oping in Genshin?' },
  { id: 'AT', name: '维也纳金色乐章合奏大厅', enName: 'Austria Golden Melody Hall', flag: '🇦🇹', desc: '古典交响乐配二次元动漫神曲！', enDesc: 'Symphony meets anime masterpieces!' },
  { id: 'OTHER', name: '异世界裂隙酒馆', enName: 'Otherworld Rift Tavern', flag: '🇪🇺', desc: '不属于任何国家的流浪冒险者聚点', enDesc: 'Wandering travelers and portal discoverers.' },
];

const ANIME_QUOTES = [
  "「不放弃的话，梦想就一定会实现！」",
  "「即使是在无尽的黑暗中，星光依然在闪烁哦~」",
  "「此生无悔入动漫，来世愿生幻想乡！」",
  "「正因为生命有限，所以才显得无比珍贵。」",
  "「既然已经做出了选择，就不要再回头了哦~」",
  "「今天也是充满七彩光芒的摸鱼日！」",
  "「真相，永远只有一个！」",
];

export default function MoyuChatroom() {
  const { user, profile, isQuotaExceeded, setQuotaExceeded } = useAuth();
  const { lang } = useLanguage();
  const [activeChannelId, setActiveChannelId] = useState<string>('global');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatType, setChatType] = useState<'public' | 'private'>('public');
  
  // Friends State
  const [friendsList, setFriendsList] = useState<{ uid: string; displayName: string; photoURL: string; role: string }[]>([]);
  const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const friendUid = searchParams.get('friend');
    if (friendUid) {
      setChatType('private');
      setSelectedFriendUid(friendUid);
      // Clean up search param from the URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('friend');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isChinese = lang === 'zh';

  // Rotation of quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % ANIME_QUOTES.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Friends List
  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      try {
        const cacheKey = `user_friends_list_${user.uid}`;
        const cached = loadFromCache<any[]>(cacheKey);
        if (cached) {
          setFriendsList(cached);
          return; // Skip network fetch
        }

        const friendsRef = collection(db, 'users', user.uid, 'friends');
        const snap = await getDocs(friendsRef);
        const friendIds = snap.docs.map(d => d.id);

        if (friendIds.length === 0) {
          setFriendsList([]);
          saveToCache(cacheKey, [], 180000); // Cache empty array
          return;
        }

        // Fetch user profiles for each friend in chunks of 10 to avoid N+1 queries
        const chunks = [];
        for (let i = 0; i < friendIds.length; i += 10) {
          chunks.push(friendIds.slice(i, i + 10));
        }

        const fetchedFriendsMap = new Map();
        
        for (const chunk of chunks) {
          const uncachedIds = [];
          for (const fid of chunk) {
            const cachedProfile = loadFromCache<UserProfile>(`cached_user_profile_${fid}`);
            if (cachedProfile) {
              fetchedFriendsMap.set(fid, {
                uid: fid,
                displayName: cachedProfile.displayName || 'Moyu Friend',
                photoURL: cachedProfile.photoURL || '',
                role: cachedProfile.role || 'other'
              });
            } else {
              uncachedIds.push(fid);
            }
          }

          if (uncachedIds.length > 0) {
            try {
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('uid', 'in', uncachedIds));
              const snap = await getDocs(q);
              snap.forEach(docSnap => {
                const uData = docSnap.data() as UserProfile;
                saveToCache(`cached_user_profile_${uData.uid}`, uData, 300000);
                fetchedFriendsMap.set(uData.uid, {
                  uid: uData.uid,
                  displayName: uData.displayName || 'Moyu Friend',
                  photoURL: uData.photoURL || '',
                  role: uData.role || 'other'
                });
              });
            } catch (err) {
              console.error(`Error loading profiles for chunk:`, err);
            }
          }
        }

        const fetchedFriends = friendIds.map(fid => fetchedFriendsMap.get(fid) || {
          uid: fid,
          displayName: 'Moyu Member',
          photoURL: '',
          role: 'other'
        });

        setFriendsList(fetchedFriends);
        saveToCache(cacheKey, fetchedFriends, 180000);
      } catch (err: any) {
        console.error("Error fetching friends list:", err);
      }
    };

    fetchFriends();
  }, [user]);

  // Handle switching private / public
  const handleSelectFriend = (friendUid: string) => {
    setSelectedFriendUid(friendUid);
    setChatType('private');
    // For private channels, make channelId a deterministic ID based on uids
    if (user) {
      const minId = user.uid < friendUid ? user.uid : friendUid;
      const maxId = user.uid > friendUid ? user.uid : friendUid;
      setActiveChannelId(`pv_${minId}_${maxId}`);
    }
  };

  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setSelectedFriendUid(null);
    setChatType('public');
  };

  // Listen for Chat Messages of CURRENT activeChannelId
  useEffect(() => {
    if (!activeChannelId) return;

    setIsLoading(true);
    const cacheKey = `cached_chats_v1_${activeChannelId}`;
    const cached = loadFromCache<ChatMessage[]>(cacheKey);
    if (cached) {
      setMessages(cached);
      setIsLoading(false);
    }

    const fetchChats = async () => {
      try {
        const q = query(
          collection(db, 'chats'),
          where('channelId', '==', activeChannelId),
          limit(30)
        );

        const snap = await getDocs(q);
        setQuotaExceeded(false);
        const fetched = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            channelId: data.channelId,
            senderId: data.senderId,
            senderName: data.senderName,
            senderPhoto: data.senderPhoto,
            senderRole: data.senderRole,
            content: data.content,
            createdAt: data.createdAt,
            timestamp: data.timestamp || Date.now(),
            type: data.type || 'text',
            actionType: data.actionType
          } as ChatMessage;
        });

        // Sort in-memory oldest to newest for bottom-up chat display
        fetched.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.timestamp || 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.timestamp || 0);
          return timeA - timeB;
        });

        setMessages(fetched);
        saveToCache(cacheKey, fetched);
        setIsLoading(false);
      } catch (err: any) {
        console.error("Chats fetch error:", err);
        if (err?.code === 'resource-exhausted') {
          setQuotaExceeded(true);
        }
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [activeChannelId]);

  // Scroll to bottom when message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Message function
  const handleSendMessage = async (customContent?: string, isAction: boolean = false, actType?: string) => {
    if (!user) {
      alert(isChinese ? '请先登录，加入星海大家庭！' : 'Please login to join the chat!');
      return;
    }

    const textToSend = customContent || inputText;
    if (!textToSend.trim()) return;

    if (!isAction) {
      setInputText('');
    }

    // Optimistic UI update to make the app feel incredibly fast and responsive
    const tempId = `temp_${Date.now()}`;
    const optimMessage: ChatMessage = {
      id: tempId,
      channelId: activeChannelId,
      senderId: user.uid,
      senderName: profile?.displayName || user.displayName || '二次元居民',
      senderPhoto: profile?.photoURL || user.photoURL || '',
      senderRole: profile?.role || 'fan',
      content: textToSend,
      createdAt: null, // Firestore serverTimestamp placeholder
      timestamp: Date.now(),
      type: isAction ? 'action' : 'text',
      actionType: actType
    };

    setMessages(prev => [...prev, optimMessage]);

    try {
      await addDoc(collection(db, 'chats'), {
        channelId: activeChannelId,
        senderId: user.uid,
        senderName: profile?.displayName || user.displayName || '二次元居民',
        senderPhoto: profile?.photoURL || user.photoURL || '',
        senderRole: profile?.role || 'fan',
        content: textToSend,
        createdAt: serverTimestamp(),
        timestamp: Date.now(),
        type: isAction ? 'action' : 'text',
        actionType: actType
      });

      // Dispatch real-time notification for private messages
      if (chatType === 'private' && selectedFriendUid) {
        const snippet = textToSend.substring(0, 25);
        const titleZh = "✉️ 收到同好私信电波！";
        const titleEn = "✉️ New Private Chat Alert!";
        const contentZh = `💬 【${profile?.displayName || '神秘萌友'}】给你发来了悄悄话：“${snippet}...” (≧▽≦)/ 戳我去回复~`;
        const contentEn = `💬 【${profile?.displayName || 'ACG Pal'}】sent you a message: "${snippet}..." (≧▽≦)/ Click to chat back!`;
        
        await sendNotification(
          selectedFriendUid,
          user.uid,
          profile?.displayName || 'Moyu Pal',
          profile?.photoURL || '',
          'message',
          lang === 'zh' ? titleZh : titleEn,
          lang === 'zh' ? contentZh : contentEn,
          `/community?friend=${user.uid}`
        );
      }
    } catch (err: any) {
      console.error("Failed to send chat message:", err);
      if (err?.code === 'resource-exhausted') {
        setQuotaExceeded(true);
      }
    }
  };

  // Pat-Pat and interactive actions (摸鱼互动)
  const handleInteraction = (type: string) => {
    if (!user) return;
    const currentName = profile?.displayName || user.displayName || '萌新';
    
    let targetName = isChinese ? '大家' : 'Everyone';
    if (chatType === 'private' && selectedFriendUid) {
      const friendObj = friendsList.find(f => f.uid === selectedFriendUid);
      if (friendObj) {
        targetName = friendObj.displayName;
      }
    }

    let actContent = '';
    switch (type) {
      case 'nuzzle':
        actContent = isChinese 
          ? `* ${currentName} 软萌地蹭了蹭 ${targetName} 的小脸蛋，感觉极其温暖~(*/ω＼*)` 
          : `* ${currentName} nuzzled ${targetName} warmly~(*/ω＼*)`;
        break;
      case 'pat':
        actContent = isChinese 
          ? `* ${currentName} 伸出双手，温柔地摸了摸 ${targetName} 的头：「乖哦，不哭不哭~」(✿◡稳◡)` 
          : `* ${currentName} patted ${targetName} on the head gently: "There, there..." (✿◡◡)`;
        break;
      case 'tea':
        actContent = isChinese 
          ? `* ${currentName} 双手递上一杯热乎乎的【二次元珍珠奶茶】，对 ${targetName} 说：「摸鱼累了，喝杯甜甜的吧！」🥤` 
          : `* ${currentName} offered ${targetName} a hot cup of Boba Tea: "Take a break, drink this!" 🥤`;
        break;
      case 'cling':
        actContent = isChinese 
          ? `* ${currentName} 像章鱼一样，猛地飞扑上去，和 ${targetName} 牢牢地【贴贴】在一起！(/▽＼)` 
          : `* ${currentName} pounced and clung onto ${targetName} with full force! (/▽＼)`;
        break;
      case 'summon':
        actContent = isChinese 
          ? `* ${currentName} 挥舞手中的魔法杖，开启【二次元虚空法阵】，疯狂大声召唤 ${targetName} 出现！🔮✨` 
          : `* ${currentName} waved their magic wand to summon ${targetName} from the cosmic rift! 🔮✨`;
        break;
      default:
        return;
    }

    handleSendMessage(actContent, true, type);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'coser':
        return { name: isChinese ? '吃土Coser' : 'Coser', style: 'bg-pink-500/10 text-pink-400 border border-pink-500/30' };
      case 'photographer':
        return { name: isChinese ? '百亿单反' : 'Photog', style: 'bg-sky-500/10 text-sky-400 border border-sky-500/30' };
      case 'makeup':
        return { name: isChinese ? '神仙妆娘' : 'Makeup', style: 'bg-purple-500/10 text-purple-400 border border-purple-500/30' };
      case 'fan':
        return { name: isChinese ? '死宅萌友' : 'Otaku', style: 'bg-green-500/10 text-green-400 border border-green-500/30' };
      default:
        return { name: isChinese ? '异世界客' : 'Traveler', style: 'bg-amber-500/10 text-amber-400 border border-amber-500/30' };
    }
  };

  const currentChannelInfo = CHANNELS.find(c => c.id === activeChannelId);
  const activeFriendInfo = friendsList.find(f => f.uid === selectedFriendUid);

  return (
    <div id="moyu-chatroom-root" className="bg-[#101116] border border-white/5 rounded-3xl overflow-hidden shadow-2xl h-[680px] flex flex-col md:flex-row animate-fadeIn">
      {/* Sidebar: Channels and Friends */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 flex flex-col h-1/3 md:h-full shrink-0 bg-[#0d0e12]">
        
        {/* Quote Marquee - Extremely Anime style */}
        <div className="p-3 bg-pink-500/5 border-b border-pink-500/10 flex items-center gap-2 text-pink-400/90 text-xs font-mono">
          <Music className="w-3.5 h-3.5 shrink-0 animate-spin" />
          <span className="truncate transition-all duration-500">
            {ANIME_QUOTES[quoteIndex]}
          </span>
        </div>

        {/* Tab Header (Channels vs Friend Direct Messages) */}
        <div className="flex border-b border-white/5 p-2 bg-[#121319]">
          <button
            onClick={() => {
              setChatType('public');
              setActiveChannelId('global');
              setSelectedFriendUid(null);
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all",
              chatType === 'public'
                ? "bg-gradient-to-r from-pink-500/10 to-indigo-500/10 text-pink-400 border border-pink-500/20"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            {isChinese ? '公共星域' : 'Lobby'}
          </button>
          <button
            onClick={() => {
              setChatType('private');
              if (friendsList.length > 0) {
                handleSelectFriend(friendsList[0].uid);
              } else {
                setSelectedFriendUid(null);
                setActiveChannelId('');
              }
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all",
              chatType === 'private'
                ? "bg-gradient-to-r from-pink-500/10 to-indigo-500/10 text-pink-400 border border-pink-500/20"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Lock className="w-3.5 h-3.5" />
            {isChinese ? '二次元死党' : 'Friends'}
          </button>
        </div>

        {/* List items (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/5">
          {chatType === 'public' ? (
            CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => handleSelectChannel(ch.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 transition-all",
                  activeChannelId === ch.id && chatType === 'public'
                    ? "bg-[#181922] border border-pink-500/30 shadow-lg text-pink-400"
                    : "hover:bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-transparent"
                )}
              >
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-lg shrink-0">
                  {ch.flag}
                </div>
                <div className="truncate flex-1">
                  <div className="text-xs font-bold tracking-tight">
                    {isChinese ? ch.name : ch.enName}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {isChinese ? ch.desc : ch.enDesc}
                  </div>
                </div>
              </button>
            ))
          ) : friendsList.length > 0 ? (
            friendsList.map((fr) => (
              <button
                key={fr.uid}
                onClick={() => handleSelectFriend(fr.uid)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 transition-all",
                  selectedFriendUid === fr.uid && chatType === 'private'
                    ? "bg-[#181922] border border-pink-500/30 shadow-lg text-pink-400"
                    : "hover:bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-transparent"
                )}
              >
                <div className="shrink-0 relative">
                  <UserAvatar uid={fr.uid} photoURL={fr.photoURL} className="w-8 h-8 border border-white/10" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#0d0e12] rounded-full" />
                </div>
                <div className="truncate flex-1">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span className="truncate">{fr.displayName}</span>
                    <span className={cn("text-[9px] px-1 py-0.5 rounded", getRoleBadge(fr.role).style)}>
                      {getRoleBadge(fr.role).name}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {isChinese ? '✨ 开启私密双人世界贴贴~' : 'Start private 1-on-1 chat'}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="py-16 text-center text-slate-500 text-xs px-4 flex flex-col items-center">
              <Users className="w-8 h-8 text-slate-600 mb-2 opacity-30" />
              <p>{isChinese ? '还没有添加好友哦，快去个人卡片加一些死党吧！' : 'No friends added yet. Connect with users to add friends!'}</p>
            </div>
          )}
        </div>

        {/* User Info Footer inside Side Nav */}
        {user && (
          <div className="p-3.5 border-t border-white/5 bg-[#121319] flex items-center gap-3.5 shrink-0">
            <UserAvatar uid={user.uid} photoURL={profile?.photoURL || user.photoURL || ''} className="w-9 h-9 border border-pink-500/20" />
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                {profile?.displayName || user.displayName || '二次元居民'}
              </div>
              <div className="text-[10px] text-pink-400 font-mono mt-0.5">
                ✦ {getRoleBadge(profile?.role || 'fan').name}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Chatroom Section */}
      <div className="flex-1 flex flex-col h-2/3 md:h-full bg-[#111218] relative">
        
        {/* Chat header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#121319]/50 backdrop-blur z-10 shrink-0">
          <div className="flex items-center gap-3">
            {chatType === 'public' ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center text-xl shrink-0 border border-pink-500/20">
                  {currentChannelInfo?.flag || '🌐'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {isChinese ? currentChannelInfo?.name : currentChannelInfo?.enName}
                    <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">PUBLIC</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs sm:max-w-md">
                    {isChinese ? currentChannelInfo?.desc : currentChannelInfo?.enDesc}
                  </p>
                </div>
              </>
            ) : activeFriendInfo ? (
              <>
                <UserAvatar uid={activeFriendInfo.uid} photoURL={activeFriendInfo.photoURL} className="w-10 h-10 border border-indigo-500/30" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {activeFriendInfo.displayName}
                    <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">PRIVATE</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isChinese ? '正在进行加密双人贴贴...' : 'Private direct chat session'}
                  </p>
                </div>
              </>
            ) : (
              <div className="py-2">
                <p className="text-xs text-slate-500">{isChinese ? '请选择一个对话开始聊天~' : 'Please select a contact to start chat'}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Instantly retrigger activeChannelId fetch via state update to save token usage
                const curr = activeChannelId;
                setActiveChannelId('');
                setTimeout(() => setActiveChannelId(curr), 50);
              }}
              className="p-2 text-slate-400 hover:text-pink-400 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
              title="刷新消息"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quota limit or local mode banner */}
        {isQuotaExceeded && (
          <div className="mx-4 mt-3 bg-pink-500/10 border border-pink-500/20 rounded-2xl p-3 flex items-center gap-2 text-pink-400 text-xs shadow-md z-10 shrink-0">
            <Sparkles className="w-4 h-4 shrink-0 animate-pulse text-pink-400" />
            <p>
              {isChinese 
                ? '【系统提示】触发了命运石之门之防线！云端额度已耗尽，已切换至本地无耗能聊天姬模式~(￣▽￣)"依然可以进行贴贴！' 
                : 'Server quota exceeded. Enjoy zero-token local mode! Custom patting & chatting works locally!'}
            </p>
          </div>
        )}

        {/* Chat message history container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/5 bg-[#111218] min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-pulse">
              <Sparkles className="w-8 h-8 mb-2 text-pink-500/30 animate-spin" />
              <p className="text-xs font-mono">{isChinese ? '正在调取平行宇宙信息...' : 'Loading cosmic waves...'}</p>
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === user?.uid;
              const roleInfo = getRoleBadge(msg.senderRole);

              if (msg.type === 'action') {
                return (
                  <div key={msg.id} className="flex justify-center my-1.5 animate-fadeIn">
                    <span className="px-3.5 py-1.5 bg-pink-500/[0.04] border border-pink-500/10 text-[11px] text-pink-300 font-medium rounded-full tracking-wide flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3 h-3 text-pink-400 shrink-0" />
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={cn("flex gap-3 max-w-[85%] sm:max-w-[75%] animate-fadeIn", isMe ? "ml-auto flex-row-reverse" : "")}>
                  <UserAvatar uid={msg.senderId} photoURL={msg.senderPhoto} className="w-9 h-9 border border-white/10 shrink-0 mt-0.5" />
                  
                  <div className="space-y-1">
                    <div className={cn("flex items-center gap-1.5 text-[10px]", isMe ? "justify-end flex-row-reverse" : "")}>
                      <span className="font-bold text-slate-200">{msg.senderName}</span>
                      <span className={cn("px-1 rounded text-[8px]", roleInfo.style)}>
                        {roleInfo.name}
                      </span>
                    </div>

                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-all shadow-sm",
                      isMe 
                        ? "bg-gradient-to-r from-pink-500/15 to-indigo-500/15 border border-pink-500/30 text-pink-100 rounded-tr-none" 
                        : "bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500/70 text-center px-6">
              <Coffee className="w-12 h-12 mb-3 text-pink-500/10 animate-bounce" />
              <p className="text-xs font-bold text-slate-400">{isChinese ? '星海酒馆目前空无一人...' : 'Rift tavern is quiet...'}</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
                {isChinese ? '快发送第一条信息打破寂静，或者使用下方的动漫表情和互动功能吧！' : 'Be the first to say hi or use the quick reaction widgets below!'}
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Interaction widget shortcuts */}
        {user && activeChannelId && (
          <div className="px-4 py-2 border-t border-white/5 bg-[#0f1015]/60 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 z-10">
            <button
              onClick={() => handleInteraction('nuzzle')}
              className="px-3 py-1 bg-pink-500/10 hover:bg-pink-500/25 border border-pink-500/20 text-pink-400 text-[10px] font-semibold rounded-full transition-all whitespace-nowrap flex items-center gap-1 shrink-0"
            >
              🌸 {isChinese ? '蹭一蹭' : 'Nuzzle'}
            </button>
            <button
              onClick={() => handleInteraction('pat')}
              className="px-3 py-1 bg-pink-500/10 hover:bg-pink-500/25 border border-pink-500/20 text-pink-400 text-[10px] font-semibold rounded-full transition-all whitespace-nowrap flex items-center gap-1 shrink-0"
            >
              🐱 {isChinese ? '摸摸头' : 'Pat Head'}
            </button>
            <button
              onClick={() => handleInteraction('cling')}
              className="px-3 py-1 bg-pink-500/10 hover:bg-pink-500/25 border border-pink-500/20 text-pink-400 text-[10px] font-semibold rounded-full transition-all whitespace-nowrap flex items-center gap-1 shrink-0"
            >
              ✨ {isChinese ? '贴贴' : 'Cling'}
            </button>
            <button
              onClick={() => handleInteraction('tea')}
              className="px-3 py-1 bg-pink-500/10 hover:bg-pink-500/25 border border-pink-500/20 text-pink-400 text-[10px] font-semibold rounded-full transition-all whitespace-nowrap flex items-center gap-1 shrink-0"
            >
              🥤 {isChinese ? '递奶茶' : 'Give Tea'}
            </button>
            <button
              onClick={() => handleInteraction('summon')}
              className="px-3 py-1 bg-pink-500/10 hover:bg-pink-500/25 border border-pink-500/20 text-pink-400 text-[10px] font-semibold rounded-full transition-all whitespace-nowrap flex items-center gap-1 shrink-0"
            >
              🔮 {isChinese ? '召见' : 'Summon'}
            </button>
          </div>
        )}

        {/* Input box bottom panel */}
        <div className="p-4 border-t border-white/5 bg-[#121319] shrink-0 z-10">
          {user ? (
            activeChannelId ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2.5"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isChinese ? "说点什么吧，支持发送二次元暗号..." : "Say something otaku..."}
                  className="flex-1 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05] border border-white/5 focus:border-pink-500/30 text-xs rounded-2xl text-slate-100 placeholder-slate-500 outline-none transition-all"
                  maxLength={150}
                />
                <button
                  type="submit"
                  className="p-3 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-2xl transition-all shadow-lg flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="text-center py-2 text-slate-500 text-xs font-mono">
                {isChinese ? '✦ 请先在左侧选择死党，以开启加密二密频道对话 ✦' : '✦ Select a friend from the left sidebar to start private messaging ✦'}
              </div>
            )
          ) : (
            <div className="text-center py-2.5 text-slate-400 text-xs">
              {isChinese ? '登录后即可加入星海摸鱼大厅，进行贴贴和私聊聊天！' : 'Login now to start chatting and sending interactive emotes!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
