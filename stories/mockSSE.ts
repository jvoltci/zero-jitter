// ─────────────────────────────────────────────────────────────
// Mock SSE Token Stream — for Storybook demos
// ─────────────────────────────────────────────────────────────

const SAMPLE_TEXT = `The universe is not only queerer than we suppose, but queerer than we can suppose. Every atom in your body came from a star that exploded. And, the atoms in your left hand probably came from a different star than your right hand. It really is the most poetic thing I know about physics: you are all stardust.

You wouldn't be here if stars hadn't exploded, because the elements — the carbon, nitrogen, oxygen, iron, all the things that matter for evolution and for life — weren't created at the beginning of time. They were created in the nuclear furnaces of stars, and the only way for them to get into your body is if those stars were kind enough to explode.

So forget Jesus. The stars died so that you could be here today. A physicist is just an atom's way of looking at itself. Science is not only compatible with spirituality; it is a profound source of spirituality. When we recognize our place in an immensity of light-years and in the passage of ages, when we grasp the intricacy, beauty, and subtlety of life, then that soaring feeling, that sense of elation and humility combined, is surely spiritual.

The cosmos is within us. We are made of star-stuff. We are a way for the universe to know itself. Somewhere, something incredible is waiting to be known. The nitrogen in our DNA, the calcium in our teeth, the iron in our blood, the carbon in our apple pies were made in the interiors of collapsing stars. We are made of starstuff.`;

export interface MockSSEOptions {
  /** Tokens per second. Default: 30 */
  tokensPerSecond?: number;
  /** Custom text to stream. */
  text?: string;
  /** Callback for each token chunk. */
  onToken: (chunk: string) => void;
  /** Callback when streaming is complete. */
  onDone?: () => void;
}

/**
 * Simulates an SSE token stream at a configurable rate.
 * Returns a cancel function.
 */
export function mockSSE(options: MockSSEOptions): () => void {
  const {
    tokensPerSecond = 30,
    text = SAMPLE_TEXT,
    onToken,
    onDone,
  } = options;

  // Tokenize by splitting on word boundaries, preserving whitespace
  const tokens: string[] = [];
  const regex = /(\S+|\s+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }

  let index = 0;
  const intervalMs = 1000 / tokensPerSecond;

  const timer = setInterval(() => {
    if (index >= tokens.length) {
      clearInterval(timer);
      onDone?.();
      return;
    }

    const token = tokens[index];
    if (token !== undefined) {
      onToken(token);
    }
    index++;
  }, intervalMs);

  return () => {
    clearInterval(timer);
  };
}
