'use client';

import { useEffect, useRef, useState } from 'react';
import { ZeroJitter, type ZeroJitterHandle } from 'zero-jitter';

export default function Stream() {
  const ref = useRef<ZeroJitterHandle>(null);
  const [streaming, setStreaming] = useState(false);

  function start() {
    ref.current?.clear();
    setStreaming(true);
    const es = new EventSource('/api/chat');
    es.onmessage = (e) => {
      if (e.data === '[DONE]') {
        es.close();
        setStreaming(false);
        return;
      }
      ref.current?.appendText(e.data);
    };
    es.onerror = () => {
      es.close();
      setStreaming(false);
    };
  }

  useEffect(() => () => ref.current?.clear(), []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={start}
          disabled={streaming}
          style={{
            padding: '8px 16px',
            background: streaming ? '#94a3b8' : '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: streaming ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {streaming ? 'Streaming…' : 'Start'}
        </button>
      </div>
      <div
        style={{
          border: '1px solid #1f2937',
          borderRadius: 12,
          background: '#0f172a',
          padding: 0,
        }}
      >
        <ZeroJitter
          ref={ref}
          font='16px "Inter", system-ui, sans-serif'
          color="#e2e8f0"
          maxHeight={420}
          padding={20}
          cursor={streaming ? 'blink' : 'off'}
        />
      </div>
    </div>
  );
}
