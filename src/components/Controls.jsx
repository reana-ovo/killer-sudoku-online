'use client';

import React from 'react';

export default function Controls({ onNumberClick, onDelete, onRegenerate, onShare, inputMode, onModeChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', width: '100%', maxWidth: '300px' }}>
      <button className="btn" style={{ width: '100%' }} onClick={onShare}>
          Share Link
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        
        {/* Row 1: 1, 2, 3, Answer Mode */}
        {[1, 2, 3].map(num => (
            <button 
                key={num} 
                className="btn btn-secondary" 
                onClick={() => onNumberClick(num)} 
                style={{ 
                    fontSize: '1.5rem', 
                    padding: '0', 
                    aspectRatio: '1', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: inputMode === 'color' ? [
                        '#fecaca', '#fed7aa', '#fde68a', 
                        '#bbf7d0', '#a5f3fc', '#bfdbfe', 
                        '#ddd6fe', '#f5d0fe', '#e5e7eb'
                    ][num - 1] : undefined,
                    color: inputMode === 'color' ? 'transparent' : undefined,
                    border: inputMode === 'color' ? '2px solid var(--border)' : undefined
                }}
            >
                {num}
            </button>
        ))}
        <button 
            className={`btn ${inputMode === 'answer' ? '' : 'btn-secondary'}`} 
            style={{ padding: '0', aspectRatio: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={() => onModeChange('answer')}
            title="Answer Mode"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <text x="12" y="17" fontSize="12" textAnchor="middle" fill="currentColor" stroke="none">1</text>
            </svg>
        </button>

        {/* Row 2: 4, 5, 6, Center Mode */}
        {[4, 5, 6].map(num => (
            <button 
                key={num} 
                className="btn btn-secondary" 
                onClick={() => onNumberClick(num)} 
                style={{ 
                    fontSize: '1.5rem', 
                    padding: '0', 
                    aspectRatio: '1', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: inputMode === 'color' ? [
                        '#fecaca', '#fed7aa', '#fde68a', 
                        '#bbf7d0', '#a5f3fc', '#bfdbfe', 
                        '#ddd6fe', '#f5d0fe', '#e5e7eb'
                    ][num - 1] : undefined,
                    color: inputMode === 'color' ? 'transparent' : undefined,
                    border: inputMode === 'color' ? '2px solid var(--border)' : undefined
                }}
            >
                {num}
            </button>
        ))}
        <button 
            className={`btn ${inputMode === 'center' ? '' : 'btn-secondary'}`} 
            style={{ padding: '0', aspectRatio: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={() => onModeChange('center')}
            title="Center Mark Mode"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
            </svg>
        </button>

        {/* Row 3: 7, 8, 9, Corner Mode */}
        {[7, 8, 9].map(num => (
            <button 
                key={num} 
                className="btn btn-secondary" 
                onClick={() => onNumberClick(num)} 
                style={{ 
                    fontSize: '1.5rem', 
                    padding: '0', 
                    aspectRatio: '1', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: inputMode === 'color' ? [
                        '#fecaca', '#fed7aa', '#fde68a', 
                        '#bbf7d0', '#a5f3fc', '#bfdbfe', 
                        '#ddd6fe', '#f5d0fe', '#e5e7eb'
                    ][num - 1] : undefined,
                    color: inputMode === 'color' ? 'transparent' : undefined,
                    border: inputMode === 'color' ? '2px solid var(--border)' : undefined
                }}
            >
                {num}
            </button>
        ))}
        <button 
            className={`btn ${inputMode === 'corner' ? '' : 'btn-secondary'}`} 
            style={{ padding: '0', aspectRatio: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={() => onModeChange('corner')}
            title="Corner Mark Mode"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="17" cy="7" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="7" cy="17" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="17" cy="17" r="1.5" fill="currentColor" stroke="none" />
            </svg>
        </button>

        {/* Row 4: Delete (span 3), Color Mode */}
        <button
            className="btn btn-secondary"
            onClick={onDelete}
            style={{ gridColumn: 'span 3', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
        >
            ⌫ Delete
        </button>
        <button 
            className={`btn ${inputMode === 'color' ? '' : 'btn-secondary'}`} 
            style={{ padding: '0', aspectRatio: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={() => onModeChange('color')}
            title="Color Mode"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
        </button>

      </div>
    </div>
  );
}
