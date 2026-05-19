'use client';

/**
 * Thrust Area Treemap — Shows org-wide allocation of goal weight across strategic
 * pillars. Block size = total weight; color intensity = avg achievement score.
 * Helps Admin/HR see whether strategic focus is balanced.
 */

import { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { useDataStore } from '@/stores/data-store';
import { calculateProgressScore } from '@/lib/calculations';
import { type Quarter } from '@/lib/constants';
import type { Goal, QuarterlyUpdate } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

type LeafNode = { name: string; size: number; achievement: number; goalCount: number };

interface Props {
  /** Scoped goals — must be pre-filtered by role (employee/manager/admin). */
  goals: Goal[];
  /** Scoped quarterly updates — must be pre-filtered. */
  updates: QuarterlyUpdate[];
}

export default function ThrustAreaTreemap({ goals, updates }: Props) {
  const { thrustAreas } = useDataStore();

  const data = useMemo<LeafNode[]>(() => {
    // Determine latest quarter with any data within scope
    const latestQ: Quarter =
      [...QUARTERS].reverse().find((q) => updates.some((u) => u.quarter === q)) || 'Q1';

    return thrustAreas
      .map((area) => {
        const areaGoals = goals.filter((g) => g.thrustAreaId === area.id);
        const totalWeight = areaGoals.reduce((sum, g) => sum + g.weightage, 0);
        if (totalWeight === 0) return null;

        // Average weighted achievement for this thrust area
        let weightedScoreSum = 0;
        let weightSumWithData = 0;
        areaGoals.forEach((g) => {
          const update = updates.find((u) => u.goalId === g.id && u.quarter === latestQ);
          if (update != null) {
            const score = calculateProgressScore({
              uomType: g.uomType,
              target: g.target,
              actual: update.actualAchievement ?? 0,
              targetDate: g.targetDate,
              completionDate: update.completionDate,
            });
            weightedScoreSum += score * 100 * g.weightage;
            weightSumWithData += g.weightage;
          }
        });

        const achievement = weightSumWithData > 0 ? Math.round(weightedScoreSum / weightSumWithData) : 0;

        return {
          name: area.name,
          size: totalWeight,
          achievement,
          goalCount: areaGoals.length,
        };
      })
      .filter((x): x is LeafNode => x !== null)
      .sort((a, b) => b.size - a.size);
  }, [goals, thrustAreas, updates]);

  if (data.length === 0) {
    return (
      <div className="card" style={{ padding: '20px', minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No goals allocated to thrust areas yet.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="app-section-header">
        <div className="title">
          <h2>Thrust Area Allocation</h2>
          <p>Block size = total weight across all goals · color = average achievement</p>
        </div>
      </div>
      <div style={{ padding: '12px 16px 16px 16px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <Treemap
            data={data}
            dataKey="size"
            nameKey="name"
            stroke="var(--bg-surface-solid)"
            isAnimationActive={false}
            content={<CustomTreemapNode />}
          >
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const node = payload[0].payload as LeafNode;
                return (
                  <div style={{
                    background: 'var(--bg-surface-solid)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{node.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                      {node.goalCount} goals · {node.size}% total weight
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                      Avg achievement: <strong style={{ color: 'var(--text-primary)' }}>{node.achievement}%</strong>
                    </p>
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
          <span>Lower achievement</span>
          <div style={{ flex: 1, height: '6px', margin: '0 12px', borderRadius: '999px', background: 'linear-gradient(90deg, var(--danger), var(--warning), var(--success))' }} />
          <span>Higher achievement</span>
        </div>
      </div>
    </div>
  );
}

interface TreemapNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  achievement?: number;
  size?: number;
}

function CustomTreemapNode(props: TreemapNodeProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', achievement = 0, size = 0 } = props;

  const color =
    achievement >= 80 ? 'var(--success)' :
    achievement >= 60 ? '#10b981' :
    achievement >= 40 ? 'var(--warning)' :
    achievement >= 20 ? '#f59e0b' :
    'var(--danger)';

  // Increase the threshold so we never paint labels on cells that cannot fit
  // them \u2014 prevents the overlapping/clipped text artifact in dense treemaps.
  const showLabel = width > 86 && height > 44;
  const showAchievement = width > 110 && height > 60;
  const showWeight = width > 130 && height > 80;

  // Truncate label conservatively (~6.5px per glyph at fontSize 12, minus 20px
  // padding for left/right insets).
  const maxChars = Math.max(2, Math.floor((width - 20) / 6.5));

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.85}
        stroke="var(--bg-surface-solid)"
        strokeWidth={2}
        rx={4}
      />
      {(showLabel || showAchievement || showWeight) && (
        <foreignObject x={x} y={y} width={width} height={height} style={{ pointerEvents: 'none' }}>
          <div style={{ padding: '10px 10px', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', height: '100%', overflow: 'hidden' }}>
            {showLabel && (
              <span style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word', color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {name}
              </span>
            )}
            {showAchievement && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.95)', marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {achievement}% achieved
              </span>
            )}
            {showWeight && (
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {size}% weight
              </span>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 1)) + '…';
}
