export type UserRole = 'coser' | 'photographer' | 'makeup' | 'fan' | 'other';
export type Gender = 'male' | 'female' | 'non-binary' | 'other' | 'prefer-not-to-say';
export type ActivityType = 'meetup' | 'convention' | 'photoshoot';
export type PostType = 'market' | 'tips' | 'sos' | 'social' | 'drama';
export type ServiceType = 'photography' | 'makeup' | 'wig' | 'other';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  role: UserRole;
  gender?: Gender;
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

export interface UserReview {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  createdAt: any;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromPhoto: string;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
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
  isPinned?: boolean;
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
  likeCount: number;
  commentCount: number;
  isPinned?: boolean;
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
  likeCount: number;
  commentCount: number;
  isPinned?: boolean;
}
