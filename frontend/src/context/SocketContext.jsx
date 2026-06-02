/**
 * context/SocketContext.jsx
 * Real-time WebSocket connection via Socket.io.
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(window.location.origin, {
      withCredentials: true,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join:user', user.id);
    });

    socket.on('disconnect', () => setIsConnected(false));

    // Listen for real-time notifications (leave approvals, announcements, etc.)
    socket.on('notification', (notification) => {
      setNotifications((prev) => [notification, ...prev.slice(0, 49)]);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const emit = (event, data) => socketRef.current?.emit(event, data);

  const clearNotification = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  return (
    <SocketContext.Provider value={{ isConnected, notifications, emit, clearNotification }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);