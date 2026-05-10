import Stream from './components/Stream';

export default function Page() {
  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Streaming chat</h1>
      <Stream />
    </main>
  );
}
