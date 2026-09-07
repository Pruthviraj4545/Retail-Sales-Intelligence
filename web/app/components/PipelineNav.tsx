'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { COLORS, stages, type StageId } from './constants';

interface PipelineNavProps {
  activeStage:  StageId;
  onStageClick: (id: StageId) => void;
  navTop?:      number;
}

export default function PipelineNav({ activeStage, onStageClick, navTop = 0 }: PipelineNavProps) {
  const activeIdx = stages.findIndex(s => s.id === activeStage);

  return (
    <div
      style={{
        position:     'sticky',
        top:          navTop,
        zIndex:       10,
        background:   COLORS.paperAlt,
        borderBottom: `1px solid ${COLORS.line}`,
      }}
    >
      <div className="max-w-[1080px] mx-auto" style={{ padding: '0 24px' }}>
        <div style={{ position: 'relative', padding: '12px 0 10px' }}>

          {/* ── Dashed connector track ───────────────────────────────── */}
          <div
            style={{
              position:   'absolute',
              top:        26,
              left:       '10%',
              right:      '10%',
              height:     1,
              borderTop:  `2px dashed ${COLORS.line}`,
            }}
          />

          {/* ── Filled track (ledger blue) ───────────────────────────── */}
          <motion.div
            style={{
              position:        'absolute',
              top:             26,
              left:            '10%',
              height:          1,
              borderTop:       `2px solid ${COLORS.ledger}`,
              width:           activeIdx > 0 ? `${activeIdx * 20}%` : '0%',
              transformOrigin: 'left',
            }}
            animate={{ width: activeIdx > 0 ? `${activeIdx * 20}%` : '0%' }}
            transition={{ duration: 0.5, ease: [0.25, 0, 0, 1] }}
          />

          {/* ── Parcel stops ─────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {stages.map((stage, i) => {
              const isActive = stage.id === activeStage;
              const isPast   = i < activeIdx;
              const Icon     = stage.icon;

              return (
                <button
                  key={stage.id}
                  onClick={() => onStageClick(stage.id)}
                  style={{
                    display:       'flex',
                    flexDirection: 'column',
                    alignItems:    'center',
                    gap:           6,
                    background:    'none',
                    border:        'none',
                    cursor:        'pointer',
                    padding:       0,
                    position:      'relative',
                    zIndex:        1,
                    outline:       'none',
                  }}
                >
                  {/* Parcel-stop node */}
                  <div
                    style={{
                      width:           28,
                      height:          28,
                      borderRadius:    2,
                      background:      isActive ? COLORS.stamp : isPast ? COLORS.ledger : COLORS.paper,
                      border:          `1.5px solid ${isActive ? COLORS.stamp : isPast ? COLORS.ledger : COLORS.line}`,
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                      transition:      'background 0.2s, border-color 0.2s',
                    }}
                  >
                    {isPast ? (
                      <Check size={13} color={COLORS.paper} strokeWidth={3} />
                    ) : (
                      <Icon
                        size={12}
                        color={isActive ? COLORS.paper : COLORS.inkMuted}
                      />
                    )}
                  </div>

                  {/* Stage label */}
                  <span
                    style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize:   11,
                      fontWeight: isActive ? 600 : 400,
                      color:      isActive ? COLORS.stamp : isPast ? COLORS.ledger : COLORS.inkMuted,
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {stage.label}
                  </span>

                  {/* Status sub-label */}
                  {isActive && (
                    <motion.span
                      key={stage.id}
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0  }}
                      transition={{ duration: 0.2 }}
                      style={{
                        fontFamily:    "'IBM Plex Mono', monospace",
                        fontSize:      9,
                        color:         COLORS.ledger,
                        letterSpacing: '0.08em',
                        whiteSpace:    'nowrap',
                        position:      'absolute',
                        bottom:        -13,
                        left:          '50%',
                        transform:     'translateX(-50%)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {stage.status}
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
