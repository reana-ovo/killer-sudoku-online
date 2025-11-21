'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function Header({ 
  difficulty, 
  users, 
  isMultiplayerEnabled, 
  onToggleMultiplayer, 
  isConnected 
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
      padding: '0.75rem 1rem',
      marginBottom: '1rem',
      gap: '1rem',
      flexWrap: 'wrap',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '0.75rem',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      {/* Left: Home Button + Difficulty Display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button 
          onClick={() => router.push('/')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--foreground)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          返回首页
        </button>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          background: `${difficultyColorMap[difficulty]}15`,
          border: `1px solid ${difficultyColorMap[difficulty]}40`
        }}>
          <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>难度:</span>
          <span style={{ fontWeight: 'bold', color: difficultyColorMap[difficulty], fontSize: '0.9rem' }}>
            {difficultyMap[difficulty] || difficulty}
          </span>
        </div>
      </div>

      {/* Right: Online Count & Multiplayer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        
        {/* Online User Count */}
        {isMultiplayerEnabled && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 0.75rem',
            fontSize: '0.9rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--foreground)'
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
            padding: '0.5rem', 
            aspectRatio: '1', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: isMultiplayerEnabled ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
            color: isMultiplayerEnabled ? 'white' : 'var(--foreground)',
            borderRadius: '0.5rem',
            border: isMultiplayerEnabled ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title={isMultiplayerEnabled ? "多人模式已启用" : "启用多人模式"}
          onMouseEnter={(e) => {
            if (!isMultiplayerEnabled) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMultiplayerEnabled) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }
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
