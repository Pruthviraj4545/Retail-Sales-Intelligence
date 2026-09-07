'use client';

import { useEffect, useRef, useState } from 'react';
import { COLORS, type StageId } from './constants';
import PipelineNav from './PipelineNav';
import NavBar from '../../components/NavBar';
import Hero from './Hero';
import IngestSection from './sections/IngestSection';
import CleanSection from './sections/CleanSection';
import WarehouseSection from './sections/WarehouseSection';
import AnalyzeSection from './sections/AnalyzeSection';
import SegmentSection from './sections/SegmentSection';

export default function Dashboard() {
  const [activeStage, setActiveStage] = useState<StageId>('ingest');

  const ingestRef    = useRef<HTMLElement>(null);
  const cleanRef     = useRef<HTMLElement>(null);
  const warehouseRef = useRef<HTMLElement>(null);
  const analyzeRef   = useRef<HTMLElement>(null);
  const segmentRef   = useRef<HTMLElement>(null);

  const refs: Record<StageId, React.RefObject<HTMLElement | null>> = {
    ingest:    ingestRef,
    clean:     cleanRef,
    warehouse: warehouseRef,
    analyze:   analyzeRef,
    segment:   segmentRef,
  };

  // Scroll-based active stage via IntersectionObserver
  useEffect(() => {
    const entries: Record<StageId, boolean> = {
      ingest: false, clean: false, warehouse: false, analyze: false, segment: false,
    };
    const order: StageId[] = ['ingest', 'clean', 'warehouse', 'analyze', 'segment'];

    const obs = new IntersectionObserver(
      (ioEntries) => {
        ioEntries.forEach(e => {
          const id = e.target.getAttribute('data-stage') as StageId;
          if (id) entries[id] = e.isIntersecting;
        });
        // Use last intersecting stage in order
        const visible = order.filter(id => entries[id]);
        if (visible.length > 0) setActiveStage(visible[visible.length - 1]);
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    Object.entries(refs).forEach(([id, ref]) => {
      if (ref.current) {
        ref.current.setAttribute('data-stage', id);
        obs.observe(ref.current);
      }
    });

    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollTo = (id: StageId) => {
    setActiveStage(id);
    refs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ background: COLORS.paper, minHeight: '100vh', color: COLORS.ink }}>
      <NavBar />
      <PipelineNav activeStage={activeStage} onStageClick={scrollTo} navTop={48} />
      <Hero />
      <IngestSection    innerRef={ingestRef}    />
      <CleanSection     innerRef={cleanRef}     />
      <WarehouseSection innerRef={warehouseRef} />
      <AnalyzeSection   innerRef={analyzeRef}   />
      <SegmentSection   innerRef={segmentRef}   />

      <footer
        style={{
          textAlign:   'center',
          padding:     '36px 24px',
          borderTop:   `1px solid ${COLORS.line}`,
          background:  COLORS.paperAlt,
        }}
      >
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkMuted, letterSpacing: '0.06em' }}>
          Python &middot; R &middot; SQLite &middot; Power BI &middot; scikit-learn
        </p>
      </footer>
    </div>
  );
}
