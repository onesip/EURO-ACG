import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type NotificationType = 'like' | 'comment' | 'message' | 'friend_request' | 'friend_accept' | 'system_update';

export interface AppNotification {
  id: string;
  userId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
  isRead: boolean;
  createdAt: any;
}

export const sendNotification = async (
  userId: string,
  senderId: string,
  senderName: string,
  senderPhoto: string,
  type: NotificationType,
  title: string,
  content: string,
  link?: string
) => {
  if (!userId || userId === senderId) return; // Don't notify oneself
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      senderId,
      senderName,
      senderPhoto: senderPhoto || '',
      type,
      title,
      content,
      link: link || '',
      isRead: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('[Notification] Failed to write notification record:', error);
  }
};
