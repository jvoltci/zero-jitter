// ─────────────────────────────────────────────────────────────
// ZeroJitter Storybook Stories
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ZeroJitter } from '../src/components/ZeroJitter';
import type { ZeroJitterHandle } from '../src/types';
import { mockSSE } from './mockSSE';

const meta: Meta<typeof ZeroJitter> = {
  title: 'ZeroJitter',
  component: ZeroJitter,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    font: { control: 'text' },
    fontSize: { control: { type: 'range', min: 10, max: 48, step: 1 } },
    color: { control: 'color' },
    maxHeight: { control: { type: 'range', min: 100, max: 800, step: 50 } },
    autoScroll: { control: 'boolean' },
    whiteSpace: {
      control: 'select',
      options: ['normal', 'pre-wrap'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ZeroJitter>;

// ── Default: Static text ──
export const Default: Story = {
  render: (args) => {
    const ref = useRef<ZeroJitterHandle>(null);

    useEffect(() => {
      ref.current?.setText(
        'Hello, ZeroJitter! This is a static text rendering test. The canvas should display this text with correct line breaks and positioning.',
      );
    }, []);

    return (
      <div style={{ width: '100%', maxWidth: 600, border: '1px solid #333', borderRadius: 8, background: '#1a1a2e' }}>
        <ZeroJitter
          ref={ref}
          fontSize={16}
          color="#e0e0e0"
          padding={16}
          {...args}
        />
      </div>
    );
  },
};

// ── Streaming Simulation ──
export const StreamingSimulation: Story = {
  render: (args) => {
    const ref = useRef<ZeroJitterHandle>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const cancelRef = useRef<(() => void) | null>(null);

    const startStream = useCallback(() => {
      ref.current?.clear();
      setIsStreaming(true);

      cancelRef.current = mockSSE({
        tokensPerSecond: 30,
        onToken: (chunk) => ref.current?.appendText(chunk),
        onDone: () => setIsStreaming(false),
      });
    }, []);

    const stopStream = useCallback(() => {
      cancelRef.current?.();
      setIsStreaming(false);
    }, []);

    useEffect(() => {
      return () => cancelRef.current?.();
    }, []);

    return (
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
          <button
            onClick={startStream}
            disabled={isStreaming}
            style={{
              padding: '8px 16px',
              background: isStreaming ? '#555' : '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {isStreaming ? 'Streaming...' : '▶ Start Stream'}
          </button>
          <button
            onClick={stopStream}
            disabled={!isStreaming}
            style={{
              padding: '8px 16px',
              background: !isStreaming ? '#555' : '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: !isStreaming ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            ⏹ Stop
          </button>
        </div>
        <div style={{ border: '1px solid #333', borderRadius: 8, background: '#1a1a2e' }}>
          <ZeroJitter
            ref={ref}
            fontSize={16}
            color="#e0e0e0"
            maxHeight={400}
            padding={16}
            {...args}
          />
        </div>
      </div>
    );
  },
};

// ── Long Document (10k lines test) ──
export const LongDocument: Story = {
  render: (args) => {
    const ref = useRef<ZeroJitterHandle>(null);

    useEffect(() => {
      const lines = Array.from(
        { length: 500 },
        (_, i) => `Line ${i + 1}: The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.`,
      );
      ref.current?.setText(lines.join('\n'));
    }, []);

    return (
      <div style={{ width: '100%', maxWidth: 600, border: '1px solid #333', borderRadius: 8, background: '#1a1a2e' }}>
        <ZeroJitter
          ref={ref}
          fontSize={14}
          color="#e0e0e0"
          maxHeight={400}
          padding={16}
          whiteSpace="pre-wrap"
          {...args}
        />
      </div>
    );
  },
};

// ── Resize Handling ──
export const ResizeHandling: Story = {
  render: (args) => {
    const ref = useRef<ZeroJitterHandle>(null);
    const [width, setWidth] = useState(600);

    useEffect(() => {
      ref.current?.setText(
        'Resize the container by dragging the slider below. The text should re-wrap correctly without any layout jitter or flicker. This demonstrates the ResizeObserver integration that triggers re-layout through the worker.',
      );
    }, []);

    return (
      <div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#e0e0e0' }}>
            Container width: {width}px
            <input
              type="range"
              min={200}
              max={800}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              style={{ marginLeft: 12, width: 200 }}
            />
          </label>
        </div>
        <div style={{ width, border: '1px solid #333', borderRadius: 8, background: '#1a1a2e', transition: 'width 0.1s' }}>
          <ZeroJitter
            ref={ref}
            fontSize={16}
            color="#e0e0e0"
            padding={16}
            {...args}
          />
        </div>
      </div>
    );
  },
};

// ── Multi-Language ──
export const MultiLanguage: Story = {
  render: (args) => {
    const ref = useRef<ZeroJitterHandle>(null);

    useEffect(() => {
      ref.current?.setText(
        [
          'English: The quick brown fox jumps over the lazy dog.',
          '日本語: 色は匂へど散りぬるを。我が世誰ぞ常ならむ。',
          '中文: 天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。',
          'العربية: الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين',
          'Emoji: 🚀🌟🎨🔥💎✨🌈🎭🎪🎯🎲🎸🎹🎺🎻🎬',
          'हिन्दी: धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।',
          'Mixed: Hello 世界 مرحبا 🌍 こんにちは Привет',
        ].join('\n'),
      );
    }, []);

    return (
      <div style={{ width: '100%', maxWidth: 600, border: '1px solid #333', borderRadius: 8, background: '#1a1a2e' }}>
        <ZeroJitter
          ref={ref}
          fontSize={16}
          color="#e0e0e0"
          padding={16}
          whiteSpace="pre-wrap"
          {...args}
        />
      </div>
    );
  },
};
