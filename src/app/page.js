'use client';

import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { createNewGame } from '@/lib/sudokuGenerator';
import { supabase } from '@/lib/supabaseClient';
import { useState } from 'react';

const isSupabaseConfigured = 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project.supabase.co';

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const startNewGame = async () => {
    setCreating(true);
    const roomId = uuidv4();
    
    if (isSupabaseConfigured) {
        const gameData = createNewGame();
        // Upload initial game state to Supabase
        const { error } = await supabase
        .from('games')
        .insert([{ id: roomId, board_state: gameData }]);

        if (error) {
            console.error('Error creating game:', error);
            // Fallback to local if server fails
            // We can pass state via query param or just let the room generate it
            // For simplicity, let's just go to the room. The room will see it's missing and generate it (if we update room logic)
            // But for now, let's just alert if it's a real error, or proceed if it's just config missing.
            if (process.env.NODE_ENV === 'development') alert('Supabase error (check console). Proceeding locally.');
        }
    }

    // Navigate to the room. 
    // If offline, the room component needs to generate the game.
    // We'll handle that in the room component.
    router.push(`/${roomId}?create=true`);
  };

  return (
    <main className="container">
      <div className="glass-panel animate-fade-in" style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1>Killer Sudoku Online</h1>
        <p>
          Challenge your friends to a real-time multiplayer Killer Sudoku battle.
          Solve the same puzzle together or race to finish!
        </p>
        
        {!isSupabaseConfigured && (
            <div style={{ padding: '1rem', background: 'rgba(255, 165, 0, 0.1)', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid orange' }}>
                <p style={{ color: 'orange', marginBottom: 0, fontSize: '0.9rem' }}>
                    ⚠️ Multiplayer is disabled (Supabase not configured). Game will run in offline mode.
                </p>
            </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <button 
            className="btn" 
            onClick={startNewGame}
            disabled={creating}
          >
            {creating ? 'Starting...' : 'Start New Game'}
          </button>
        </div>
      </div>
    </main>
  );
}
