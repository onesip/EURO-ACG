import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, limit, addDoc, serverTimestamp, getDocs, doc, getDoc, onSnapshot, documentId, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { loadFromCache, saveToCache } from '../lib/cache';
import { MessageSquare, Send, Sparkles, Users, Coffee, RefreshCw, Heart, Lock, Globe, Smile, Music, ChevronLeft, Search, X } from 'lucide-react';
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
  
  // Mobile Navigation Split View ('list' vs 'chat')
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Friends & Relationship State
  const [friendsList, setFriendsList] = useState<{ uid: string; displayName: string; photoURL: string; role: string }[]>([]);
  const [friendRequestsSent, setFriendRequestsSent] = useState<any[]>([]);
  const [friendRequestsReceived, setFriendRequestsReceived] = useState<any[]>([]);
  const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);
  
  // Search & Discover States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [quoteIndex, setQuoteIndex] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const friendUid = searchParams.get('friend');
    if (friendUid && user) {
      setChatType('private');
      setSelectedFriendUid(friendUid);
      const minId = user.uid < friendUid ? user.uid : friendUid;
      const maxId = user.uid > friendUid ? user.uid : friendUid;
      setActiveChannelId(`pv_${minId}_${maxId}`);
      setMobileView('chat');

      // Clean up search param from the URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('friend');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, user]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isChinese = lang === 'zh';

  // Rotation of quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % ANIME_QUOTES.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Friends List (Real-time tracking to ensure list updates instantly)
  useEffect(() => {
    if (!user) {
      setFriendsList([]);
      return;
    }

    const friendsRef = collection(db, 'users', user.uid, 'friends');
    
    const unsubscribe = onSnapshot(friendsRef, async (snap) => {
      try {
        const friendIds = snap.docs.map(d => d.id);

        if (friendIds.length === 0) {
          setFriendsList([]);
          return;
        }

        // Fetch user profiles for each friend safely using document ID
        const fetchedFriends = [];
        
        // Split friendIds into chunks of 30 because Firestore limits 'in' queries to 30 elements
        const chunks = [];
        for (let i = 0; i < friendIds.length; i += 30) {
          chunks.push(friendIds.slice(i, i + 30));
        }

        for (const chunk of chunks) {
          try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where(documentId(), 'in', chunk));
            const userSnap = await getDocs(q);
            userSnap.forEach(docSnap => {
              const uData = docSnap.data() as UserProfile;
              fetchedFriends.push({
                uid: docSnap.id,
                displayName: uData.displayName || (isChinese ? '二次元萌友' : 'Moyu Friend'),
                photoURL: uData.photoURL || '',
                role: uData.role || 'other'
              });
            });
          } catch (err) {
            console.error("Error fetching profiles chunk:", err);
          }
        }

        // Fill in any friends whose profile we couldn't fetch
        const fetchedUids = new Set(fetchedFriends.map(f => f.uid));
        for (const fid of friendIds) {
          if (!fetchedUids.has(fid)) {
            fetchedFriends.push({
              uid: fid,
              displayName: isChinese ? '次元居民' : 'Moyu Member',
              photoURL: '',
              role: 'other'
            });
          }
        }

        setFriendsList(fetchedFriends);
      } catch (err: any) {
        console.error("Error in real-time friends list sync:", err);
      }
    }, (err) => {
      console.error("Friends list onSnapshot error:", err);
    });

    return () => unsubscribe();
  }, [user, isChinese]);

  // Handle switching private / public
  const handleSelectFriend = (friendUid: string) => {
    setSelectedFriendUid(friendUid);
    setChatType('private');
    setMobileView('chat');
    // For private channels, make channelId a deterministic ID based on uids
    if (user) {
      const minId = user.uid < friendUid ? user.uid : friendUid;
      const maxId = user.uid > friendUid ? user.uid : friendUid;
      setActiveChannelId(`pv_${minId}_${maxId}`);
    }
  };

  // Automatically select the first friend if in private mode but no friend is selected yet
  useEffect(() => {
    if (chatType === 'private' && !selectedFriendUid && friendsList.length > 0) {
      handleSelectFriend(friendsList[0].uid);
    }
  }, [chatType, selectedFriendUid, friendsList]);

  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setSelectedFriendUid(null);
    setChatType('public');
    setMobileView('chat');
  };

  // Listen to pending friend requests (sent and received) in real-time
  useEffect(() => {
    if (!user) {
      setFriendRequestsSent([]);
      setFriendRequestsReceived([]);
      return;
    }

    // 1. Sent requests
    const qSent = query(
      collection(db, 'friendRequests'),
      where('fromId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubSent = onSnapshot(qSent, async (snap) => {
      try {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const toIds = list.map((item: any) => item.toId);
        if (toIds.length === 0) {
          setFriendRequestsSent([]);
          return;
        }
        
        const fetchedProfiles: Record<string, any> = {};
        const chunks = [];
        for (let i = 0; i < toIds.length; i += 30) {
          chunks.push(toIds.slice(i, i + 30));
        }
        for (const chunk of chunks) {
          const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
          const userSnap = await getDocs(q);
          userSnap.forEach(docSnap => {
            fetchedProfiles[docSnap.id] = docSnap.data();
          });
        }
        
        const resolved = list.map((item: any) => ({
          requestId: item.id,
          uid: item.toId,
          displayName: fetchedProfiles[item.toId]?.displayName || item.toName || (isChinese ? '次元萌友' : 'Moyu Friend'),
          photoURL: fetchedProfiles[item.toId]?.photoURL || item.toPhoto || '',
          role: fetchedProfiles[item.toId]?.role || 'other'
        }));
        setFriendRequestsSent(resolved);
      } catch (err) {
        console.error("Error in real-time sent friend requests:", err);
      }
    });

    // 2. Received requests
    const qReceived = query(
      collection(db, 'friendRequests'),
      where('toId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubReceived = onSnapshot(qReceived, async (snap) => {
      try {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const fromIds = list.map((item: any) => item.fromId);
        if (fromIds.length === 0) {
          setFriendRequestsReceived([]);
          return;
        }
        
        const fetchedProfiles: Record<string, any> = {};
        const chunks = [];
        for (let i = 0; i < fromIds.length; i += 30) {
          chunks.push(fromIds.slice(i, i + 30));
        }
        for (const chunk of chunks) {
          const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
          const userSnap = await getDocs(q);
          userSnap.forEach(docSnap => {
            fetchedProfiles[docSnap.id] = docSnap.data();
          });
        }
        
        const resolved = list.map((item: any) => ({
          requestId: item.id,
          uid: item.fromId,
          displayName: fetchedProfiles[item.fromId]?.displayName || item.fromName || (isChinese ? '次元萌友' : 'Moyu Friend'),
          photoURL: fetchedProfiles[item.fromId]?.photoURL || item.fromPhoto || '',
          role: fetchedProfiles[item.fromId]?.role || 'other'
        }));
        setFriendRequestsReceived(resolved);
      } catch (err) {
        console.error("Error in real-time received friend requests:", err);
      }
    });

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [user, isChinese]);

  // Search/discover users
  const handleSearchUsers = async () => {
    if (!searchQuery.trim() || !user) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: any[] = [];
      const queryLower = searchQuery.toLowerCase();
      
      snap.forEach(docSnap => {
        const uData = docSnap.data();
        const dName = uData.displayName || '';
        if (docSnap.id !== user.uid && dName.toLowerCase().includes(queryLower)) {
          list.push({
            uid: docSnap.id,
            displayName: dName || (isChinese ? '次元居民' : 'Moyu Resident'),
            photoURL: uData.photoURL || '',
            role: uData.role || 'other'
          });
        }
      });
      setSearchResults(list.slice(0, 10)); // Limit to 10 results for token savings
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger search on typing change too for smooth interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearchUsers();
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Send friend request
  const handleSendFriendRequest = async (targetUid: string, targetDisplayName: string, targetPhoto: string) => {
    if (!user || !profile) return;
    try {
      await addDoc(collection(db, 'friendRequests'), {
        fromId: user.uid,
        fromName: profile.displayName || user.displayName || 'Moyu Resident',
        fromPhoto: profile.photoURL || user.photoURL || '',
        toId: targetUid,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Dispatch friend request notification
      const titleZh = "🤝 收到一份死党契约申请！";
      const titleEn = "🤝 New Friend Request!";
      const contentZh = `🌟 【${profile.displayName || '二次元同好'}】向你递交了一份死党契约，想要与你缔结羁绊哦！快去查看吧！(✿◡◡✿)`;
      const contentEn = `🌟 【${profile.displayName || 'ACG Pal'}】wants to forge a soul contract (friend request) with you! Go accept it! (✿◡◡✿)`;
      
      await addDoc(collection(db, 'notifications'), {
        userId: targetUid,
        senderId: user.uid,
        senderName: profile.displayName || user.displayName || 'Pal',
        senderPhoto: profile.photoURL || user.photoURL || '',
        type: 'friend_request',
        title: isChinese ? titleZh : titleEn,
        content: isChinese ? contentZh : contentEn,
        link: '/profile',
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  // Accept friend request
  const handleAcceptFriendRequest = async (requestId: string, fromId: string, fromDisplayName: string) => {
    if (!user || !profile) return;
    try {
      const batch = writeBatch(db);
      
      // Update request status to accepted
      batch.update(doc(db, 'friendRequests', requestId), { status: 'accepted' });
      
      // Add to friends subcollection for both users
      batch.set(doc(db, 'users', user.uid, 'friends', fromId), { 
        uid: fromId, 
        createdAt: serverTimestamp() 
      });
      batch.set(doc(db, 'users', fromId, 'friends', user.uid), { 
        uid: user.uid, 
        createdAt: serverTimestamp() 
      });
      
      await batch.commit();
      
      // Clear cache to force instant refresh in components
      localStorage.removeItem(`user_friends_list_${user.uid}`);
      localStorage.removeItem(`user_friends_list_${fromId}`);
      
      // Send a cute success notification
      const titleZh = "💖 羁绊缔结成功！(≧▽≦)/*";
      const titleEn = "💖 Soul Contract Signed!";
      const contentZh = `✨ 【${profile?.displayName || '同好'}】同意了你的死党契约！你们现在是真正的同好伙伴啦，快去私聊互动吧！`;
      const contentEn = `✨ 【${profile?.displayName || 'Pal'}】accepted your soul contract! You are now official friends! Go text each other!`;
      
      await addDoc(collection(db, 'notifications'), {
        userId: fromId,
        senderId: user.uid,
        senderName: profile?.displayName || user.displayName || 'Pal',
        senderPhoto: profile?.photoURL || user.photoURL || '',
        type: 'friend_accept',
        title: isChinese ? titleZh : titleEn,
        content: isChinese ? contentZh : contentEn,
        link: '/profile',
        isRead: false,
        createdAt: serverTimestamp()
      });
      
      // Select the new friend
      handleSelectFriend(fromId);
    } catch (err) {
      console.error("Failed to accept friend request in MoyuChatroom:", err);
    }
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

    const q = query(
      collection(db, 'chats'),
      where('channelId', '==', activeChannelId),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuotaExceeded(false);
      const fetched = snapshot.docs.map(d => {
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
    }, (err: any) => {
      console.error("Chats real-time fetch error:", err);
      if (err?.code === 'resource-exhausted') {
        setQuotaExceeded(true);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
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
      <div className={cn(
        "w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 flex flex-col md:h-full shrink-0 bg-[#0d0e12]",
        mobileView === 'list' ? 'h-full flex' : 'hidden md:flex'
      )}>
        
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

        {/* Search & Connect Panel (Only shown in Private Chat tab) */}
        {chatType === 'private' && (
          <div className="px-2.5 pb-2 pt-1.5 border-b border-white/5 bg-[#0e0f14]/50">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchUsers();
                  }
                }}
                placeholder={isChinese ? "🔍 搜昵称找同好/泡泡... (回车)" : "🔍 Search user name... (Enter)"}
                className="w-full bg-[#181922] border border-white/5 rounded-xl px-3.5 py-1.5 pl-8 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500/50 transition-all font-sans"
              />
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {isSearching && (
              <div className="text-[10px] text-slate-400 mt-1 text-center font-mono">
                {isChinese ? '正在搜索同好波段...' : 'Searching soulwaves...'}
              </div>
            )}
          </div>
        )}

        {/* List items (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3.5 scrollbar-thin scrollbar-thumb-white/5">
          {chatType === 'public' ? (
            <div className="space-y-1.5">
              {CHANNELS.map((ch) => (
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
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. Search Results */}
              {searchResults.length > 0 && (
                <div className="border border-pink-500/10 pb-2 bg-pink-500/[0.02] p-2 rounded-2xl">
                  <div className="text-[10px] text-pink-400 font-bold px-1.5 mb-2.5 flex items-center justify-between">
                    <span>{isChinese ? '🔍 发现的萌友' : '🔍 Found Members'}</span>
                    <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-[9px] hover:text-slate-300">
                      {isChinese ? '清除' : 'Clear'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {searchResults.map((fr) => {
                      const isFriend = friendsList.some(f => f.uid === fr.uid);
                      const isSent = friendRequestsSent.some(r => r.uid === fr.uid);
                      const isReceived = friendRequestsReceived.some(r => r.uid === fr.uid);
                      const receivedItem = friendRequestsReceived.find(r => r.uid === fr.uid);

                      return (
                        <div key={fr.uid} className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                          <div className="flex items-center gap-2 min-w-0">
                            <UserAvatar uid={fr.uid} photoURL={fr.photoURL} className="w-7 h-7 border border-white/5" />
                            <div className="truncate text-left">
                              <div className="text-xs font-bold text-slate-200 truncate">{fr.displayName}</div>
                              <div className="text-[9px] text-slate-500 truncate">{getRoleBadge(fr.role).name}</div>
                            </div>
                          </div>
                          <div className="shrink-0 pl-1.5">
                            {isFriend ? (
                              <button
                                onClick={() => handleSelectFriend(fr.uid)}
                                className="text-[10px] bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/20 px-2 py-1 rounded-lg transition-all font-bold"
                              >
                                {isChinese ? '发私聊' : 'Chat'}
                              </button>
                            ) : isSent ? (
                              <span className="text-[9px] text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2 py-1 rounded-lg font-bold">
                                {isChinese ? '已发契约' : 'Sent'}
                              </span>
                            ) : isReceived ? (
                              <button
                                onClick={() => handleAcceptFriendRequest(receivedItem.requestId, fr.uid, fr.displayName)}
                                className="text-[9px] bg-green-500 text-white hover:bg-green-600 px-2 py-1 rounded-lg transition-all font-bold animate-pulse"
                              >
                                {isChinese ? '接受' : 'Accept'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSendFriendRequest(fr.uid, fr.displayName, fr.photoURL)}
                                className="text-[9px] bg-pink-500 text-white hover:bg-pink-600 px-2 py-1 rounded-lg transition-all font-bold"
                              >
                                {isChinese ? '缔结契约' : 'Add'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Received requests */}
              {friendRequestsReceived.length > 0 && (
                <div className="border border-green-500/10 pb-2 bg-green-500/[0.02] p-2 rounded-2xl">
                  <div className="text-[10px] text-green-400 font-bold px-1.5 mb-2.5">
                    {isChinese ? '📥 收到契约邀请' : '📥 Incoming Contracts'}
                  </div>
                  <div className="space-y-1.5">
                    {friendRequestsReceived.map((fr) => (
                      <div key={fr.uid} className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar uid={fr.uid} photoURL={fr.photoURL} className="w-7 h-7 border border-green-500/10" />
                          <div className="truncate text-left">
                            <div className="text-xs font-bold text-slate-200 truncate">{fr.displayName}</div>
                            <div className="text-[9px] text-slate-500 truncate">{getRoleBadge(fr.role).name}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcceptFriendRequest(fr.requestId, fr.uid, fr.displayName)}
                          className="text-[10px] bg-green-500 text-white hover:bg-green-600 px-2.5 py-1 rounded-lg font-bold transition-all shrink-0"
                        >
                          {isChinese ? '同意' : 'Accept'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Sent requests */}
              {friendRequestsSent.length > 0 && (
                <div className="border border-amber-500/10 pb-2 bg-amber-500/[0.01] p-2 rounded-2xl">
                  <div className="text-[10px] text-amber-500 font-bold px-1.5 mb-2.5">
                    {isChinese ? '📤 正在建立链接...' : '📤 Outgoing Signals'}
                  </div>
                  <div className="space-y-1.5">
                    {friendRequestsSent.map((fr) => (
                      <div key={fr.uid} className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-white/[0.01] transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar uid={fr.uid} photoURL={fr.photoURL} className="w-7 h-7 border border-amber-500/10" />
                          <div className="truncate text-left">
                            <div className="text-xs font-bold text-slate-200 truncate">{fr.displayName}</div>
                            <div className="text-[9px] text-slate-500 truncate">{getRoleBadge(fr.role).name}</div>
                          </div>
                        </div>
                        <span className="text-[9px] text-amber-500 font-bold shrink-0 px-2 py-1 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          {isChinese ? '等待回应' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Friends List */}
              {friendsList.length > 0 ? (
                <div>
                  <div className="text-[10px] text-indigo-400 font-bold px-1.5 mb-2 flex items-center justify-between">
                    <span>{isChinese ? '🤝 已链接的死党' : '🤝 Connected Friends'}</span>
                    <span className="text-[9px] text-slate-500 font-normal">({friendsList.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {friendsList.map((fr) => (
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
                    ))}
                  </div>
                </div>
              ) : (
                friendRequestsReceived.length === 0 && friendRequestsSent.length === 0 && (
                  <div className="py-16 text-center text-slate-500 text-xs px-4 flex flex-col items-center">
                    <Users className="w-8 h-8 text-slate-600 mb-2 opacity-30" />
                    <p>{isChinese ? '还没有任何链接哦，在上方搜索“泡泡”试试！' : 'No connections yet! Try searching above!'}</p>
                  </div>
                )
              )}
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
      <div className={cn(
        "flex-1 flex flex-col md:h-full bg-[#111218] relative",
        mobileView === 'chat' ? 'h-full flex' : 'hidden md:flex'
      )}>
        
        {/* Chat header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#121319]/50 backdrop-blur z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back Arrow for Mobile View */}
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden flex items-center justify-center p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl mr-1 shrink-0"
              title={isChinese ? "返回列表" : "Back to list"}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

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
