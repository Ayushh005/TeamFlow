import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeWorkspace } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const activeWorkspaceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('token') || '';
    const socketInstance = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      if (activeWorkspace?.id) {
        socketInstance.emit('join_workspace', { workspaceId: activeWorkspace.id });
        activeWorkspaceIdRef.current = activeWorkspace.id;
      }
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user?.id]);

  // When active workspace changes, switch rooms
  useEffect(() => {
    if (!socket || !connected || !activeWorkspace?.id) return;

    if (activeWorkspaceIdRef.current && activeWorkspaceIdRef.current !== activeWorkspace.id) {
      socket.emit('leave_workspace', { workspaceId: activeWorkspaceIdRef.current });
    }

    socket.emit('join_workspace', { workspaceId: activeWorkspace.id });
    activeWorkspaceIdRef.current = activeWorkspace.id;
  }, [activeWorkspace?.id, socket, connected]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
