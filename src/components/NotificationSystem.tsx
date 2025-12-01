import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, X, Eye, Check, AlertCircle, Calendar, Upload, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  client_id?: string;
  meeting_id?: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  action_type?: string;
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationSystemProps {
  userId: string;
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationSystem({ userId, onNotificationClick }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();

    const subscription = supabase
      .channel('notifications_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);


  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id);

    fetchNotifications();

    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm('Clear all notifications?')) return;

    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    fetchNotifications();
  };

  const getNotificationIcon = (actionType?: string) => {
    switch (actionType) {
      case 'screenshot_uploaded':
        return <Upload size={18} className="text-blue-500" />;
      case 'meeting_attended':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'meeting_cancelled':
        return <XCircle size={18} className="text-red-500" />;
      case 'payment_received':
        return <TrendingUp size={18} className="text-green-500" />;
      case 'license_due':
      case 'license_expired':
        return <AlertCircle size={18} className="text-orange-500" />;
      default:
        return <Calendar size={18} className="text-purple-500" />;
    }
  };

  const getNotificationBg = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-gray-50 border-gray-200';

    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-300';
      case 'error':
        return 'bg-red-50 border-red-300';
      case 'warning':
        return 'bg-orange-50 border-orange-300';
      default:
        return 'bg-blue-50 border-blue-300';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div ref={panelRef} className="fixed right-4 top-20 z-[100] w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-300 flex flex-col max-h-[calc(100vh-100px)]">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl">
                    <Bell size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Notifications</h2>
                    <p className="text-sm text-gray-600">{unreadCount} unread</p>
                  </div>
                </div>
              </div>

              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Clear All Notifications
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell size={64} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-medium text-lg">No notifications</p>
                  <p className="text-gray-400 text-sm mt-2">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`border-2 rounded-xl p-4 transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-[1.02] ${getNotificationBg(
                        notification.type,
                        notification.is_read
                      )} ${!notification.is_read ? 'shadow-md' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.action_type)}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${notification.is_read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.created_at).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {!notification.is_read && (
                            <span className="inline-block mt-2 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                              NEW
                            </span>
                          )}
                          <p className="text-xs text-purple-600 font-semibold mt-2">
                            Click to view details →
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
      </div>
    </div>
  );
}
