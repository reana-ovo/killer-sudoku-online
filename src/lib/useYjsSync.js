import { useMemo, useEffect, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { SupabaseYjsProvider } from './SupabaseYjsProvider';
import { UndoManager } from 'yjs';
import { supabase } from './supabaseClient';

const isSupabaseConfigured = 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function useYjsSync(roomId, enabled = true, initialGameData) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  // Create Yjs document (persistent across renders)
  const ydoc = useMemo(() => new Y.Doc(), []);
  
  // Shared data structures
  const yboard = useMemo(() => ydoc.getArray('board'), [ydoc]);
  const ynotes = useMemo(() => ydoc.getMap('notes'), [ydoc]);
  const ycages = useMemo(() => ydoc.getArray('cages'), [ydoc]);
  const ymeta = useMemo(() => ydoc.getMap('meta'), [ydoc]);
  const ygivens = useMemo(() => ydoc.getArray('givens'), [ydoc]);
  

// ...

  // Supabase provider for sync

  const [users, setUsers] = useState([]);
  
  // Initialize current user with lazy state to avoid effect update
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    
    const storedName = localStorage.getItem('killer-sudoku-name');
    const randomId = Math.random().toString(36).substr(2, 9);
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    
    return {
      id: randomId,
      name: storedName || `Player ${randomId.substr(0, 4)}`,
      color: randomColor,
      online_at: new Date().toISOString(),
    };
  });

  const provider = useMemo(() => {
    if (!enabled || !roomId) return null;

    // ... (existing provider creation)
    const p = new SupabaseYjsProvider(ydoc, supabase, {
      channel: `room_${roomId}`,
      tableName: 'yjs_updates',
      roomId: roomId
    });
    return p;
  }, [roomId, enabled, ydoc]);

  useEffect(() => {
    if (!provider) {
      return;
    }

    const handleConnect = () => {
      setIsConnected(true);
      if (currentUser) {
        provider.updateUser(currentUser);
      }
    };
    
    const handleDisconnect = () => setIsConnected(false);
    const handleSync = (synced) => setIsSynced(synced);
    const handleAwareness = (usersList) => {
      setUsers(usersList);
    };

    provider.on('connect', handleConnect);
    provider.on('disconnect', handleDisconnect);
    provider.on('sync', handleSync);
    provider.on('awareness', handleAwareness);

    provider.connect();

    return () => {
      provider.off('connect', handleConnect);
      provider.off('disconnect', handleDisconnect);
      provider.off('sync', handleSync);
      provider.off('awareness', handleAwareness);
      provider.destroy();
      
      // Reset state on cleanup/provider change
      setIsConnected(false);
      setIsSynced(false);
    };
  }, [provider, currentUser]); // Re-run if currentUser changes to track immediately

  const updateUserName = useCallback((newName) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, name: newName };
    setCurrentUser(updatedUser);
    localStorage.setItem('killer-sudoku-name', newName);
    if (provider && isConnected) {
      provider.updateUser(updatedUser);
    }
  }, [currentUser, provider, isConnected]);

  // Undo Manager (tracks changes to board and notes only, not cages or givens)
  const undoManager = useMemo(() => {
    const manager = new UndoManager([yboard, ynotes], {
      trackedOrigins: new Set([null]) // Track all local changes
    });
    return manager;
  }, [yboard, ynotes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (provider) {
        provider.destroy();
      }
    };
  }, [provider]);

  return {
    ydoc,
    yboard,
    ynotes,
    ycages,
    ymeta,
    ygivens,
    provider,
    provider,
    undoManager,
    isConnected,
    isSynced: provider ? isSynced : true,
    isOffline: !isSupabaseConfigured
  };
}
