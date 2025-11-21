'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function Header({ 
  difficulty, 
  users, 
  isMultiplayerEnabled, 
  onToggleMultiplayer, 
  isConnected,
  puzzleId,
  onNextPuzzle,
  onNewGame,
  generationStatus
}) {
  const router = useRouter();

  const difficultyMap = {
    'Easy': '简单',
    'Medium': '中等',
    'Hard': '困难',
    'Expert': '专家'
  };

  const difficultyColorMap = {
    'Easy': '#10b981',
    'Medium': '#3b82f6',
    'Hard': '#f59e0b',
    'Expert': '#ef4444'
  };

  return (
    <header style={{ 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '0',
      marginBottom: '0',
      gap: '1rem',
      flexWrap: 'wrap'
    }}>
      {/* Left: Home Button + Difficulty Display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button 
          onClick={() => router.push('/')}
          title="返回首页"
          style={{
            padding: '0.5rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            background: 'rgba(0, 0, 0, 0.03)',
            color: 'var(--foreground)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            width: '2.5rem',
            height: '2.5rem',
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          padding: '0 1rem',
          borderRadius: '0.5rem',
          background: `${difficultyColorMap[difficulty]}15`,
          border: `1px solid ${difficultyColorMap[difficulty]}40`,
          height: '2.5rem',
          boxSizing: 'border-box'
        }}>
          <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>难度:</span>
          <span style={{ fontWeight: 'bold', color: difficultyColorMap[difficulty], fontSize: '0.9rem' }}>
            {difficultyMap[difficulty] || difficulty}
          </span>
        </div>
      </div>

      {/* Right: Puzzle Controls & Multiplayer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        
        {/* Puzzle Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Random Puzzle Switcher */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0 0.5rem 0 1rem',
                borderRadius: '0.5rem',
                background: 'rgba(0, 0, 0, 0.03)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                height: '2.5rem',
                boxSizing: 'border-box'
            }}>
                <span style={{ whiteSpace: 'nowrap' }}>ID: {puzzleId || '---'}</span>
                <button 
                    onClick={onNextPuzzle}
                    title="随机切换题目"
                    disabled={!!generationStatus}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--foreground)',
                        cursor: generationStatus ? 'wait' : 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        opacity: generationStatus ? 0.7 : 1,
                        width: '2rem',
                        height: '2rem',
                        transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => !generationStatus && (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)')}
                    onMouseLeave={(e) => !generationStatus && (e.currentTarget.style.background = 'none')}
                >
                    <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{
                            animation: generationStatus ? 'spin 1s linear infinite' : 'none'
                        }}
                    >
                        <path d="M23 4v6h-6" />
                        <path d="M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    <style jsx>{`
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </button>
            </div>

            {/* Generate New Puzzle */}
            <button 
                onClick={onNewGame}
                title="生成新题目"
                disabled={!!generationStatus}
                style={{
                    padding: '0 1rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.03)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    color: 'var(--foreground)',
                    cursor: generationStatus ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap',
                    height: '2.5rem',
                    boxSizing: 'border-box',
                    opacity: generationStatus ? 0.7 : 1,
                    transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => !generationStatus && (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)')}
                onMouseLeave={(e) => !generationStatus && (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)')}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                </svg>
                <span>生成新题目</span>
            </button>
        </div>

        {/* Online User Count */}
        {isMultiplayerEnabled && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0 1rem',
            fontSize: '0.9rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            background: 'rgba(0, 0, 0, 0.03)',
            color: 'var(--foreground)',
            height: '2.5rem',
            boxSizing: 'border-box',
            whiteSpace: 'nowrap'
          }}>
            <div style={{ 
              width: '0.5rem', 
              height: '0.5rem', 
              borderRadius: '50%', 
              backgroundColor: isConnected ? '#4ade80' : '#fbbf24' 
            }} />
            {users.length} 在线
          </div>
        )}

        {/* Multiplayer Button */}
        <button 
          onClick={onToggleMultiplayer}
          style={{ 
            padding: '0', 
            width: '2.5rem',
            height: '2.5rem',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: isMultiplayerEnabled ? 'rgba(0, 0, 0, 0.03)' : 'rgba(0, 0, 0, 0.03)',
            color: isMultiplayerEnabled ? 'var(--primary)' : 'var(--foreground)',
            borderRadius: '0.5rem',
            border: isMultiplayerEnabled ? '1px solid var(--primary)' : '1px solid rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box'
          }}
          title={isMultiplayerEnabled ? "多人模式已启用" : "启用多人模式"}
          onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
      </div>
    </header>
  );
}
