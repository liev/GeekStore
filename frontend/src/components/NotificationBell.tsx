import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { notificationsApi, type AppNotification } from '../api/client';

interface NotificationBellProps {
    token: string;
}

/**
 * In-app notification bell component with badge and dropdown.
 * Shows unread count as a badge, and a dropdown list of recent notifications.
 * Polls for new notifications every 30 seconds.
 */
export default function NotificationBell({ token }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications and unread count
    const fetchNotifications = async () => {
        const [all, count] = await Promise.all([
            notificationsApi.getAll(token),
            notificationsApi.getUnreadCount(token)
        ]);
        setNotifications(all);
        setUnreadCount(count);
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [token]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkRead = async (id: number) => {
        await notificationsApi.markRead(id, token);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllRead = async () => {
        await notificationsApi.markAllRead(token);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
    };

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'ahora';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'OrderUpdate': return '📦';
            case 'ReviewReceived': return '⭐';
            default: return '🔔';
        }
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    background: isOpen ? 'rgba(0,240,255,0.1)' : 'rgba(15,23,42,0.6)',
                    border: `1px solid ${isOpen ? 'rgba(0,240,255,0.5)' : 'rgba(100,116,139,0.3)'}`,
                    borderRadius: '12px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.3s',
                    color: isOpen ? '#00f0ff' : '#94a3b8'
                }}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 800,
                        minWidth: '18px',
                        height: '18px',
                        borderRadius: '999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 5px',
                        boxShadow: '0 0 8px rgba(244,63,94,0.6)',
                        animation: 'pulse 2s ease-in-out infinite'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '360px',
                    maxHeight: '450px',
                    background: 'rgba(15,23,42,0.98)',
                    border: '1px solid rgba(100,116,139,0.3)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 20px rgba(0,240,255,0.05)',
                    zIndex: 100,
                    overflow: 'hidden',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(100,116,139,0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(15,23,42,0.5)'
                    }}>
                        <span style={{
                            fontWeight: 700,
                            color: 'white',
                            fontSize: '14px',
                            fontFamily: 'Inter, sans-serif',
                            letterSpacing: '0.025em'
                        }}>
                            Notificaciones
                            {unreadCount > 0 && (
                                <span style={{
                                    marginLeft: '8px',
                                    fontSize: '11px',
                                    background: 'rgba(0,240,255,0.15)',
                                    color: '#00f0ff',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontWeight: 600
                                }}>
                                    {unreadCount} nuevas
                                </span>
                            )}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    title="Marcar todas como leídas"
                                    style={{
                                        background: 'rgba(0,240,255,0.1)',
                                        border: '1px solid rgba(0,240,255,0.2)',
                                        borderRadius: '8px',
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        color: '#00f0ff',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <CheckCheck size={12} /> Leer todo
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    padding: '4px',
                                    display: 'flex',
                                    transition: 'color 0.2s'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div style={{ overflowY: 'auto', maxHeight: '380px' }}>
                        {notifications.length === 0 ? (
                            <div style={{
                                padding: '40px 16px',
                                textAlign: 'center',
                                color: '#475569',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '13px'
                            }}>
                                <Bell size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                                <p>No tienes notificaciones</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => !n.isRead && handleMarkRead(n.id)}
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid rgba(100,116,139,0.1)',
                                        cursor: n.isRead ? 'default' : 'pointer',
                                        background: n.isRead ? 'transparent' : 'rgba(0,240,255,0.03)',
                                        transition: 'background 0.2s',
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'flex-start'
                                    }}
                                    onMouseEnter={e => {
                                        if (!n.isRead) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,240,255,0.06)';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLDivElement).style.background = n.isRead ? 'transparent' : 'rgba(0,240,255,0.03)';
                                    }}
                                >
                                    {/* Icon */}
                                    <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>
                                        {getTypeIcon(n.type)}
                                    </span>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '2px'
                                        }}>
                                            <span style={{
                                                fontSize: '13px',
                                                fontWeight: n.isRead ? 500 : 700,
                                                color: n.isRead ? '#94a3b8' : 'white',
                                                fontFamily: 'Inter, sans-serif',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {n.title}
                                            </span>
                                            <span style={{
                                                fontSize: '10px',
                                                color: '#475569',
                                                flexShrink: 0,
                                                marginLeft: '8px',
                                                fontFamily: 'monospace'
                                            }}>
                                                {formatTimeAgo(n.createdAt)}
                                            </span>
                                        </div>
                                        <p style={{
                                            fontSize: '12px',
                                            color: n.isRead ? '#64748b' : '#94a3b8',
                                            fontFamily: 'Inter, sans-serif',
                                            margin: 0,
                                            lineHeight: '1.4',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical'
                                        }}>
                                            {n.message}
                                        </p>
                                    </div>

                                    {/* Read indicator */}
                                    {!n.isRead && (
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: '#00f0ff',
                                            boxShadow: '0 0 6px rgba(0,240,255,0.5)',
                                            flexShrink: 0,
                                            marginTop: '6px'
                                        }} />
                                    )}
                                    {n.isRead && (
                                        <Check size={14} style={{ color: '#334155', flexShrink: 0, marginTop: '4px' }} />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
