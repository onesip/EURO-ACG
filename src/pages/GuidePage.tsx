import React from 'react';
import { Smartphone, BookOpen, UserPlus, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../components/LanguageProvider';

export default function GuidePage() {
  const { lang } = useLanguage();

  const sections = {
    pwa: {
      title: lang === 'zh' ? '📱 保存到手机桌面 (PWA 指南)' : '📱 Save to Mobile Screen (PWA)',
      intro: lang === 'zh' ? 'EUROACG 完美支持网页应用 (PWA) 模式，您可以将其像原生 App 一样添加在手机桌面上，享受沉浸式全屏和流畅体验。' : 'EUROACG supports Web App (PWA) mode. You can add it to your home screen just like a native App, enjoying a full-screen immersive experience.',
      steps: [
        {
          device: 'Apple iOS (Safari)',
          desc: lang === 'zh' ? '在 Safari 浏览器中打开 EUROACG 网站，点击底部的【分享】(Share) 按钮，向下滚动并选择【添加到主屏幕】(Add to Home Screen) 即可！' : 'Open EUROACG in Safari, tap the Share button at the bottom, scroll down and select "Add to Home Screen".'
        },
        {
          device: 'Android (Chrome / Firefox)',
          desc: lang === 'zh' ? '打开 Chrome 浏览器，点击右上角【三个点】菜单，选择【添加至主屏幕】(Add to Home Screen) 即可一键生成手机桌面上 App 图标。' : 'Open in Chrome, tap the 3-dot menu icon on top-right, and select "Add to Home Screen".'
        }
      ]
    },
    zones: {
      title: lang === 'zh' ? '🚀 四大核心功能版块说明' : '🚀 Core Zones Walkthrough',
      items: [
        {
          name: lang === 'zh' ? '📅 同好活动 (Activities)' : '📅 Activities & Meetups',
          desc: lang === 'zh' ? '专为欧洲同好聚会、漫展约行、外景拍摄打造。点击“发布活动”发起集结，大家可以直接点击“报名”。页面会自动展示报名伙伴的头像及二次元属性，方便在场内一秒面基！' : 'Designed for European meetups, conventions, and photoshoots. Tap "New Activity" to initiate, and participants can join in one click, showing everyone’s avatar and role.'
        },
        {
          name: lang === 'zh' ? '💬 社区吹水 (Community)' : '💬 Community Hub',
          desc: lang === 'zh' ? '吐槽、分享、扩列、求助的港湾。本版块最酷的一点是支持链接自动识别：当您发布 Bilibili / YouTube 视频，或小红书/照片链接时，系统将直接在卡片中为您生成原画播放器或首图，大家无需跳转即可看到精彩内容！' : 'Our hub for posts and expansion. Supports URL embedding: paste a Bilibili, YouTube, or image link, and the system automatically generates an in-card media player or high-resolution preview!'
        },
        {
          name: lang === 'zh' ? '🛍️ 回血集市 (Market)' : '🛍️ Market Bazaar',
          desc: lang === 'zh' ? '欧洲吃土人专属的回血、求物、拼团集市。不管是手办、Cos服、本子还是周边，一键挂牌出掉，同好可以通过点击“敲窗私聊”一键呼出微信/QQ/小红书/IG等，省去繁琐交易中介！' : 'A marketplace dedicated to European ACG collectors for pre-loved goods, requests, or group buys. Fellow collectors can contact you instantly via WeChat, QQ, IG, etc. by clicking "Contact Seller".'
        },
        {
          name: lang === 'zh' ? '📸 ACG 服务 (Services)' : '📸 Local Services',
          desc: lang === 'zh' ? '为摄影师、妆娘、毛娘（假发师）及排版后期提供的专业展示区。根据接单领域分类展示，让欧洲漫展上每一位 Coser 都能在身边最快速度寻到靠谱的后勤老师！' : 'Showcases for local photographers, makeup artists, wig stylists, and editors. Easily find nearby service providers in Europe to elevate your next cosplay photoshoot!'
        }
      ]
    },
    profile: {
      title: lang === 'zh' ? '👤 档案创建与多国家常驻' : '👤 Profile & Multi-Region Guide',
      steps: [
        {
          title: lang === 'zh' ? '设置您的自定义头像' : 'Upload custom avatars',
          desc: lang === 'zh' ? '点击个人档案页，您可以直接上传心仪的二次元头像（支持 JPG/PNG），这将作为您在全站发表贴子和加入活动的公开形象！' : 'Go to Profile, tap your avatar to upload your anime character image, which will represent you all across the app.'
        },
        {
          title: lang === 'zh' ? '定义多地区活动边界 (新功能)' : 'Select Resident & Target Regions',
          desc: lang === 'zh' ? '您可以多选自己【常驻的国家】（例如常驻：荷兰、比利时）和【常去/规划去的国家】。这些地区信息会直接显示在您的个人卡片中，并且我们在各个版块支持了【国家圈子过滤】，归属感满满，找同城同好一起玩更简单！' : 'You can multiselect your Resident Countries (e.g., Netherlands) and Visited Countries. This helps others in Europe find you for regional meetups and groups!'
        },
        {
          title: lang === 'zh' ? '填入您的“本命与同好社交”' : 'Declare Fandoms & Contact Socials',
          desc: lang === 'zh' ? '填写您的常追新番、本命角色、CP，以及绑定社交方式。系统会自动同步到您的回血和活动卡片上，敲窗交流更顺畅。' : 'Fill in your favorite anime, beloved characters, and active socials (Instagram, Red, WeChat, QQ) to let others connect instantly.'
        }
      ]
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/10 via-[#141416] to-indigo-500/5 border border-white/5 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="p-4 bg-indigo-500/10 rounded-2xl">
            <BookOpen className="w-10 h-10 text-indigo-400" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {lang === 'zh' ? 'EUROACG 新手指引' : 'EUROACG User Guide'}
            </h1>
            <p className="text-slate-400 mt-2 text-sm md:text-base leading-relaxed max-w-xl">
              {lang === 'zh' 
                ? '欢迎来到欧洲同好大本营！这里是欧洲首个集漫展约伴、二手交易、约妆约摄于一体的二次元社区，以下是为您准备的使用攻略。' 
                : 'Welcome to the European ACG Community! Use this guide to easily navigate meetups, second-hand trade, and local services.'}
            </p>
          </div>
        </div>
        {/* Background glow decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* PWA Section */}
      <section className="bg-[#141416] p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">{sections.pwa.title}</h2>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{sections.pwa.intro}</p>
        <div className="grid md:grid-cols-2 gap-4 mt-2">
          {sections.pwa.steps.map((step, idx) => (
            <div key={idx} className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-sm font-semibold text-indigo-400">{step.device}</span>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Profile Section */}
      <section className="bg-[#141416] p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <UserPlus className="w-6 h-6 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">{sections.profile.title}</h2>
        </div>
        <div className="space-y-4">
          {sections.profile.steps.map((step, idx) => (
            <div key={idx} className="flex gap-4 items-start">
              <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Zones Walkthrough */}
      <section className="bg-[#141416] p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">{sections.zones.title}</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {sections.zones.items.map((item, idx) => (
            <div key={idx} className="bg-slate-900/50 p-5 rounded-xl border border-white/5 hover:border-indigo-500/20 transition-all space-y-2">
              <h3 className="text-sm font-bold text-white">{item.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community Etiquette */}
      <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-white">
            {lang === 'zh' ? '有爱交流，共建欧洲 ACG 同好大本营' : 'Be Respectful & Create Fandom Bond'}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed mt-1">
            {lang === 'zh' 
              ? '为了维护良好的交流环境，请大家相互尊重、友善发布信息，拒绝一切人身攻击与不良商业推广。让我们在欧洲一起开心扩列！'
              : 'To foster a supportive environment, please be kind, avoid spam, and support each other. Enjoy expanding your circle in Europe!'}
          </p>
        </div>
      </div>
    </div>
  );
}
