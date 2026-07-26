import { ProofMockupCarousel } from '../components/ProofMockupCarousel';
import type { ProofOfMindMockupScreen } from '../lib/proofOfMind';
import '../styles/proofMockupCarousel.css';

export function ProofOfMindMockupSection({ screens }: { screens: ProofOfMindMockupScreen[] }) {
  if (!screens.length) return null;
  return <ProofMockupCarousel screens={screens} />;
}
