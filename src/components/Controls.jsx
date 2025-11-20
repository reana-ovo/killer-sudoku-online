'use client';

import React from 'react';

export default function Controls({ onNumberClick, onDelete, onRegenerate, onShare, inputMode, onModeChange, isMultiSelectActive, onMultiSelectToggle, onShowRules, onUndo, onRedo, canUndo, canRedo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', width: '100%', maxWidth: '18.75rem' }}>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
            className="btn btn-secondary" 
            onClick={onShowRules}
            style={{ flex: '0 0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="How to Play"
        >
            ?
        </button>
        <button 
            className="btn btn-secondary" 
            onClick={onUndo}
            disabled={!canUndo}
            style={{ 
              flex: '0 0 auto', 
              padding: '0 0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              opacity: canUndo ? 1 : 0.5,
              cursor: canUndo ? 'pointer' : 'not-allowed'
            }}
            title="Undo (Ctrl+Z)"
        >
            ↶
        </button>
        <button 
            className="btn btn-secondary" 
            onClick={onRedo}
            disabled={!canRedo}
            style={{ 
              flex: '0 0 auto',
              padding: '0 0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              opacity: canRedo ? 1 : 0.5,
              cursor: canRedo ? 'pointer' : 'not-allowed'
            }}
            title="Redo (Ctrl+Shift+Z)"
        >
            ↷
        </button>
        <button className="btn" style={{ flex: '1' }} onClick={onShare}>
            Share Link
        </button>
      </div>

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
                    border: inputMode === 'color' ? '0.125rem solid var(--border)' : undefined
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
                    border: inputMode === 'color' ? '0.125rem solid var(--border)' : undefined
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
                    border: inputMode === 'color' ? '0.125rem solid var(--border)' : undefined
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

        {/* Row 4: Multi (span 1), Delete (span 2), Color Mode (span 1) */}
        <button
            className={`btn ${isMultiSelectActive ? '' : 'btn-secondary'}`}
            onClick={onMultiSelectToggle}
            style={{ 
                padding: '0', 
                aspectRatio: '1', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                backgroundColor: isMultiSelectActive ? 'var(--primary)' : undefined,
                color: isMultiSelectActive ? 'white' : undefined
            }}
            title="Multi-Select Toggle (Ctrl)"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" fill="currentColor" fillOpacity="0.5" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" fill="currentColor" fillOpacity="0.5" />
            </svg>
        </button>
        <button
            className="btn btn-secondary"
            onClick={onDelete}
            style={{ gridColumn: 'span 2', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
        >
            ⌫ Delete
        </button>
        <button 
            className={`btn ${inputMode === 'color' ? '' : 'btn-secondary'}`} 
            style={{ padding: '0', aspectRatio: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={() => onModeChange('color')}
            title="Color Mode"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
        </button>

      </div>
    </div>
  );
}
