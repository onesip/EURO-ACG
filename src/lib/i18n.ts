export type Language = 'en' | 'zh';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    'nav.activities': 'Activities',
    'nav.community': 'Community',
    'nav.members': 'Bond Ledger',
    'nav.market': 'Flea Market',
    'nav.profile': 'Profile',
    'nav.services': 'Services',
    'nav.guide': 'User Guide',
    'nav.login': 'Sign in with Google',
    'nav.logout': 'Sign Out',
    
    // Activities
    'act.title': 'Activities',
    'act.subtitle': 'Conventions, meetups, and photoshoots',
    'act.new': 'New Event',
    'act.joined': 'Joined',
    'act.participants': 'participants',
    'act.cancelJoin': 'Cancel Join',
    'act.join': 'Join Activity',
    'act.empty': 'No activities yet. Be the first to create one!',
    
    // Community
    'com.title': 'Community',
    'com.subtitle': 'Connect, share tips, and get help',
    'com.new': 'New Post',
    'com.tab.social': 'Discussion',
    'com.tab.tips': 'Tips & Guides',
    'com.tab.drama': 'Drama & Warnings',
    'com.tab.sos': 'Emergency',
    'com.like': 'Like',
    'com.comment': 'Comment',
    'com.empty': 'No posts in this category yet.',
    
    // Market
    'mkt.title': 'Flea Market',
    'mkt.subtitle': 'Buy, sell, and trade ACG goods',
    'mkt.new': 'List Item',
    'mkt.seller': 'Seller',
    'mkt.contact': 'Contact',
    'mkt.empty': 'No items listed yet.',
    
    // Profile
    'prof.create': 'Create Your Profile',
    'prof.joinText': 'Join the EuroACG community to connect with other fans, cosplayers, and photographers.',
    'prof.title': 'Your Profile',
    'prof.subtitle': 'Manage your public information and preferences',
    'prof.basicInfo': 'Basic Info',
    'prof.name': 'Display Name',
    'prof.role': 'Identity/Role',
    'prof.bio': 'Bio',
    'prof.acgFavs': 'ACG Favorites',
    'prof.favAnime': 'Favorite Anime/Games',
    'prof.favChar': 'Oshi / Main Characters',
    'prof.favCp': 'Favorite Ships (CPs)',
    'prof.socials': 'Social Connections',
    'prof.save': 'Save Profile',
    'prof.saving': 'Saving...',
    'prof.residentCountries': 'Resident Countries (Multiselect)',
    'prof.visitCountries': 'Will Go / Visiting Countries (Multiselect)',
    'prof.skinChange': 'Switch ACG skin theme',
    
    // Comments
    'comment.placeholder': 'Add a comment...',
    'comment.loginToComment': 'Sign in to comment',
    'comment.count': 'Comments',
    
    // Common
    'common.lang': 'en',
    
    // Roles
    'role.fan': 'Anime Fan',
    'role.coser': 'Coser',
    'role.photographer': 'Photographer',
    'role.makeup': 'Makeup Artist',
    'role.other': 'Other',
    
    // Activity Modal
    'act.modal.title': 'New Activity',
    'act.modal.name': 'Title',
    'act.modal.type': 'Type',
    'act.modal.date': 'Date',
    'act.modal.location': 'Location',
    'act.modal.desc': 'Description',
    'act.modal.link': 'Link (Optional)',
    'act.modal.submit': 'Create Activity',
    'act.modal.submitting': 'Creating...',
    'act.modal.type.meetup': 'Meetup',
    'act.modal.type.convention': 'Convention',
    'act.modal.type.photoshoot': 'Photoshoot',
    
    // Post Modal
    'com.modal.title': 'Create Post',
    'com.modal.submit': 'Post',
    'com.modal.submitting': 'Posting...',
    
    // Market Modal
    'mkt.modal.title': 'List an Item',
    'mkt.modal.desc': 'Describe your item, price, condition, and where you can meet up or ship...',
    'mkt.modal.submit': 'List Item',
    'mkt.modal.submitting': 'Listing...',
    
    // Services
    'srv.title': 'Services',
    'srv.subtitle': 'Book photographers, makeup artists, and more',
    'srv.new': 'Post an Ad',
    'srv.empty': 'No services listed yet.',
    'srv.modal.title': 'Post a Service Ad',
    'srv.modal.desc': 'Describe your service, experience, and pricing...',
    'srv.modal.submit': 'Post Ad',
    'srv.modal.submitting': 'Posting...',
    'srv.tab.photography': 'Photography',
    'srv.tab.makeup': 'Makeup & Styling',
    'srv.tab.wig': 'Wig Styling',
    'srv.tab.other': 'Other Services'
  },
  zh: {
    // Nav
    'nav.activities': '面基行动',
    'nav.community': '摸鱼广场',
    'nav.members': '次元羁绊册',
    'nav.market': '回血集市',
    'nav.profile': '本命档案',
    'nav.services': '神仙产粮',
    'nav.guide': '新手攻略',
    'nav.login': '签到登录',
    'nav.logout': '润了润了',
    
    // Activities
    'act.title': '面基行动',
    'act.subtitle': '漫展组队、聚餐跑团、正片约拍',
    'act.new': '发起集结',
    'act.joined': '已上车！',
    'act.participants': '位同好已就位',
    'act.cancelJoin': '咕咕咕 (取消)',
    'act.join': '上车加入',
    'act.empty': '这里空空如也，快来发起第一个面基吧！',
    
    // Community
    'com.title': '摸鱼广场',
    'com.subtitle': '日常贴贴、神仙安利、高能吃瓜',
    'com.new': '发射电波Biu~',
    'com.tab.social': '日常水贴(≧∇≦)ﾉ',
    'com.tab.tips': '吃我安利!!',
    'com.tab.drama': '高能吃瓜/避雷',
    'com.tab.sos': 'SOS！急救！',
    'com.like': '贴贴',
    'com.comment': '吐槽',
    'com.empty': '居然没有帖子，快来水一发！',
    
    // Market
    'mkt.title': '回血集市',
    'mkt.subtitle': '吃土人的在线回血/求物/拼团',
    'mkt.new': '上架回血',
    'mkt.seller': '摊主',
    'mkt.contact': '敲窗私聊TA',
    'mkt.empty': '目前集市还没开张哦~',
    
    // Profile
    'prof.create': '建立你的档案卡',
    'prof.joinText': '加入组织，发现更多同好！',
    'prof.title': '本命档案',
    'prof.subtitle': '管理你的公开情报和xp系统',
    'prof.basicInfo': '基础情报',
    'prof.name': 'CN/圈名',
    'prof.role': '主职业',
    'prof.bio': '个人签名',
    'prof.acgFavs': 'XP/偏好',
    'prof.favAnime': '常驻坑/墙头',
    'prof.favChar': '单推/本命角色',
    'prof.favCp': '主推CP (不拆不逆!)',
    'prof.socials': '社交扩列',
    'prof.save': '保存情报',
    'prof.saving': '正在记录...',
    'prof.residentCountries': '常驻国家 (多选)',
    'prof.visitCountries': '会去/规划国家 (多选)',
    'prof.skinChange': '更换二次元皮肤/界面色彩',
    
    // Comments
    'comment.placeholder': '发条弹幕吐槽一下...',
    'comment.loginToComment': '登录后发射弹幕',
    'comment.count': '条评论',
    
    // Common
    'common.lang': 'zh',
    
    // Roles
    'role.fan': '二次元萌新/老二次元',
    'role.coser': 'Coser大头',
    'role.photographer': '法师摄影',
    'role.makeup': '神仙妆/毛娘',
    'role.other': '神秘路人',
    
    // Activity Modal
    'act.modal.title': '发起集结',
    'act.modal.name': '代号 (活动标题)',
    'act.modal.type': '副本类型',
    'act.modal.date': '出击时间',
    'act.modal.location': '空投坐标 (地点)',
    'act.modal.desc': '任务简报 (打算做什么，有什么计划)',
    'act.modal.link': '传送门 (相关链接)',
    'act.modal.submit': '确认发起',
    'act.modal.submitting': '施法中...',
    'act.modal.type.meetup': '干饭/跑团',
    'act.modal.type.convention': '漫展游场',
    'act.modal.type.photoshoot': '正片约拍',
    
    // Post Modal
    'com.modal.title': '发送电波',
    'com.modal.submit': 'Biu~发送！',
    'com.modal.submitting': '发送中...',
    
    // Market Modal
    'mkt.modal.title': '上架吃土回血',
    'mkt.modal.desc': '描述你的宝贝：瑕疵情况、价格、面交/邮寄方式...',
    'mkt.modal.submit': '挂上闲鱼(bushi)',
    'mkt.modal.submitting': '上架中...',
    
    // Services
    'srv.title': '神仙产粮/约拍约妆',
    'srv.subtitle': '寻找靠谱法师、神仙妆娘毛娘',
    'srv.new': '发布通缉令(广告)',
    'srv.empty': '这块黑板目前空空的。',
    'srv.modal.title': '发布接单/约单广告',
    'srv.modal.desc': '描述你的业务范围、经验、价格以及档期...',
    'srv.modal.submit': '张贴海报',
    'srv.modal.submitting': '粘贴中...',
    'srv.tab.photography': '法师约拍',
    'srv.tab.makeup': '神仙妆娘',
    'srv.tab.wig': '手作毛娘',
    'srv.tab.other': '其他绝活'
  }
};
