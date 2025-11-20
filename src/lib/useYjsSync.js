import { useMemo, useEffect, useState } from 'react';
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
  

// ...

  // Supabase provider for sync
  // Create Yjs provider for Supabase
  const provider = useMemo(() => {
    if (!enabled || !roomId) return null;

    return new SupabaseYjsProvider(
      ydoc,
      supabase,
      {
        channel: `game:${roomId}`,
        tableName: 'yjs_updates',
        roomId: roomId
      }
    );
  }, [ydoc, roomId, enabled]);

  // Monitor connection status
  useEffect(() => {
    if (!provider) return;

    const handleSync = (isSynced) => {
      setIsSynced(true);
      console.log('Yjs: Synced with Supabase');
    };

    const handleConnect = () => {
      setIsConnected(true);
      console.log('Yjs: Connected to Supabase');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('Yjs: Disconnected from Supabase');
    };

    provider.on('sync', handleSync);
    provider.on('connect', handleConnect);
    provider.on('disconnect', handleDisconnect);

    // Connect after listeners are attached
    provider.connect();

    return () => {
      provider.off('sync', handleSync);
      provider.off('connect', handleConnect);
      provider.off('disconnect', handleDisconnect);
      setIsConnected(false);
      setIsSynced(false);
    };
  }, [provider]);

  // Undo Manager (tracks changes to board and notes only, not cages)
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
    provider,
    undoManager,
    isConnected,
    isSynced: provider ? isSynced : true,
    isOffline: !isSupabaseConfigured
  };
}
