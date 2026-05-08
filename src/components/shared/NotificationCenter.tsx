'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppStore } from '@/store/useAppStore';
import type { AppNotification } from '@/types';
import EmptyState from '@/components/ui/EmptyState';

export default function NotificationCenter() {
  const { user } = useAppStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ ...d.data(), notificationId: d.id } as AppNotification));
      setNotifications(rows.slice(0, 30));
    });
  }, [user]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const handleOpenItem = async (notification: AppNotification) => {
    if (!user || !notification.notificationId) return;
    if (!notification.read) {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', notification.notificationId), {
        read: true,
      });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-white/50 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] leading-4 rounded-full text-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-[#141414] border border-white/[0.08] shadow-xl z-50">
            <div className="px-3 py-2 border-b border-white/[0.06] text-white/70 text-xs uppercase tracking-wider">
              Notifications
            </div>
            {notifications.length === 0 ? (
              <div className="p-3">
                <EmptyState title="No notifications" description="You are all caught up for now." />
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.notificationId}
                  onClick={() => handleOpenItem(notification)}
                  className={`w-full text-left px-3 py-3 border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors ${
                    notification.read ? 'text-white/50' : 'text-white/80 bg-white/[0.02]'
                  }`}
                >
                  <p className="text-sm leading-snug">{notification.message}</p>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
