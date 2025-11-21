'use client';

import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

const isSupabaseConfigured = 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project.supabase.co';

export default function Home() {
  const router = useRouter();

  const startGameWithDifficulty = (difficulty) => {
    const roomId = uuidv4();
    router.push(`/${roomId}?create=true&difficulty=${difficulty}`);
  };

  const difficulties = [
    { name: '简单', value: 'Easy', color: '#10b981', description: '适合新手，有较多提示' },
    { name: '中等', value: 'Medium', color: '#3b82f6', description: '适度挑战，有一些提示' },
    { name: '困难', value: 'Hard', color: '#f59e0b', description: '高难度，无提示' },
    { name: '专家', value: 'Expert', color: '#ef4444', description: '极限挑战，部分区域无笼子' }
  ];

  return (
    <main className="container">
      <div className="glass-panel animate-fade-in" style={{ textAlign: 'center', maxWidth: '40rem', padding: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(135deg, var(--primary), #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          杀手数独在线版
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
          挑战你的朋友，实时多人杀手数独对战
        </p>
        
        {!isSupabaseConfigured && (
          <div style={{ 
            padding: '1rem', 
            background: 'rgba(255, 165, 0, 0.1)', 
            borderRadius: '0.75rem', 
            marginBottom: '2rem', 
            border: '1px solid rgba(255, 165, 0, 0.3)' 
          }}>
            <p style={{ color: '#f59e0b', marginBottom: 0, fontSize: '0.9rem' }}>
              ⚠️ 多人模式未启用（未配置 Supabase）。游戏将以离线模式运行。
            </p>
          </div>
        )}

        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', color: 'var(--foreground)' }}>
          选择难度开始游戏
        </h2>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          {difficulties.map(({ name, value, color }) => (
            <button
              key={value}
              onClick={() => startGameWithDifficulty(value)}
              style={{
                padding: '1rem 2rem',
                borderRadius: '0.75rem',
                border: `2px solid ${color}`,
                background: `linear-gradient(135deg, ${color}15, ${color}05)`,
                color: 'var(--foreground)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                minWidth: '8rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 20px ${color}40`;
                e.currentTarget.style.borderColor = color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: 'bold',
                color: color
              }}>
                {name}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
