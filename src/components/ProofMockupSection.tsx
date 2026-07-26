import { ProofMockupCarousel } from './ProofMockupCarousel';
import type { ProofOfMindMockupScreen } from '../lib/proofOfMind';

type ProofMockupSectionProps = {
  screens?: ProofOfMindMockupScreen[] | null;
};

export function ProofMockupSection({ screens }: ProofMockupSectionProps) {
  return (
    <section className="concept-detail-section">
      <h2>Mockups and visual direction</h2>
      <ProofMockupCarousel screens={screens ?? []} />
    </section>
  );
}
