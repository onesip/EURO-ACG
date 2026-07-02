export type UserRole = 'coser' | 'photographer' | 'makeup' | 'fan' | 'other';
export type ActivityType = 'meetup' | 'convention' | 'photoshoot';
export type PostType = 'market' | 'tips' | 'sos' | 'social' | 'drama';
export type ServiceType = 'photography' | 'makeup' | 'wig' | 'other';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  role: UserRole;
  favorites: {
    anime: string;
    characters: string;
    cp: string;
  };
  socials: {
    x: string;
    instagram: string;
    xiaohongshu: string;
    wechat: string;
    qq: string;
  };
  residentCountries?: string[];
  visitCountries?: string[];
}

export interface Activity {
  id: string;
  title: string;
  type: ActivityType;
  date: string;
  location: string;
  description: string;
  link: string;
  creatorId: string;
  participants: { uid: string; role: string; notes?: string; displayName?: string; photoURL?: string }[];
  createdAt: any;
  country?: string;
}

export interface Post {
  id: string;
  type: PostType;
  subCategory?: string;
  content: string;
  authorId: string;
  authorName?: string;
  authorPhoto?: string;
  createdAt: any;
  country?: string;
  coverImage?: string;
  videoLink?: string;
  likes?: string[];
}

export interface ServiceAd {
  id: string;
  type: ServiceType;
  content: string;
  authorId: string;
  authorName?: string;
  authorPhoto?: string;
  createdAt: any;
  country?: string;
  coverImage?: string;
  videoLink?: string;
  supports?: string[];
}
