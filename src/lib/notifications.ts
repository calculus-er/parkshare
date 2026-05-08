import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { NotificationType } from '@/types';

export async function createNotification(
  uid: string,
  type: NotificationType,
  message: string,
  metadata: Record<string, string> = {}
): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'notifications'), {
    uid,
    type,
    message,
    metadata,
    read: false,
    createdAt: serverTimestamp(),
  });
}
