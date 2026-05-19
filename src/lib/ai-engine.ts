/**
 * Meridian — Client-Side AI/ML Engine
 *
 * Deterministic algorithms running entirely in the browser.
 * No external API calls. Zero cost. Demo-friendly.
 */

import type { Goal, QuarterlyUpdate, ThrustArea } from '@/types';
import type { UoMType, Quarter } from '@/lib/constants';

// ─── Types ──────────────────────────────────────────────────────

export interface PredictionResult {
  predictedScore: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
  projectedQ3: number;
  projectedQ4: number;
}

export interface AnomalyAlert {
  goalId: string;
  goalTitle: string;
  type: 'score_drop' | 'outlier' | 'stagnant' | 'overachiever';
  severity: 'low' | 'medium' | 'high';
  message: string;
  quarter: Quarter;
}

export interface GoalSuggestion {
  title: string;
  description: string;
  thrustArea: string;
  uomType: UoMType;
  suggestedTarget: number;
  suggestedWeightage: number;
  reasoning: string;
}

export interface SentimentResult {
  score: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  keywords: string[];
}

export interface SmartInsight {
  id: string;
  icon: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'prediction';
}

// ─── Goal Completion Predictor (Linear Regression) ──────────────

function linearRegression(points: number[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0] ?? 0 };

  const xs = points.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = points.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * points[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function predictGoalCompletion(
  quarterlyScores: { quarter: Quarter; score: number }[]
): PredictionResult {
  if (quarterlyScores.length === 0) {
    return { predictedScore: 0, confidence: 0, trend: 'stable', projectedQ3: 0, projectedQ4: 0 };
  }

  const scores = quarterlyScores.map((q) => q.score);
  const { slope, intercept } = linearRegression(scores);
  const n = scores.length;

  const projectedQ3 = Math.max(0, Math.min(1.5, intercept + slope * (n)));
  const projectedQ4 = Math.max(0, Math.min(1.5, intercept + slope * (n + 1)));
  const predictedScore = Math.max(0, Math.min(1.5, intercept + slope * n));

  // Confidence based on data points and variance
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / n;
  const consistency = Math.max(0, 1 - Math.sqrt(variance));
  const dataConfidence = Math.min(1, n / 4);
  const confidence = consistency * 0.6 + dataConfidence * 0.4;

  let trend: PredictionResult['trend'] = 'stable';
  if (slope > 0.03) trend = 'improving';
  else if (slope < -0.03) trend = 'declining';

  return { predictedScore, confidence, trend, projectedQ3, projectedQ4 };
}

// ─── Anomaly Detection ──────────────────────────────────────────

export function detectAnomalies(
  goals: Goal[],
  updates: QuarterlyUpdate[]
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  const quarters: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

  for (const goal of goals) {
    const goalUpdates = updates
      .filter((u) => u.goalId === goal.id)
      .sort((a, b) => quarters.indexOf(a.quarter) - quarters.indexOf(b.quarter));

    if (goalUpdates.length < 2) continue;

    for (let i = 1; i < goalUpdates.length; i++) {
      const prev = goalUpdates[i - 1];
      const curr = goalUpdates[i];
      const prevScore = prev.computedScore ?? 0;
      const currScore = curr.computedScore ?? 0;

      // Score drop > 20%
      if (prevScore > 0 && (prevScore - currScore) / prevScore > 0.2) {
        alerts.push({
          goalId: goal.id,
          goalTitle: goal.title,
          type: 'score_drop',
          severity: (prevScore - currScore) / prevScore > 0.4 ? 'high' : 'medium',
          message: `Score dropped from ${(prevScore * 100).toFixed(0)}% to ${(currScore * 100).toFixed(0)}% between ${prev.quarter} and ${curr.quarter}`,
          quarter: curr.quarter,
        });
      }

      // Stagnant (< 2% change)
      if (Math.abs(currScore - prevScore) < 0.02 && currScore < 0.8) {
        alerts.push({
          goalId: goal.id,
          goalTitle: goal.title,
          type: 'stagnant',
          severity: 'low',
          message: `No meaningful progress between ${prev.quarter} and ${curr.quarter}`,
          quarter: curr.quarter,
        });
      }
    }

    // Overachiever detection
    const latest = goalUpdates[goalUpdates.length - 1];
    if (latest && (latest.computedScore ?? 0) > 1.15) {
      alerts.push({
        goalId: goal.id,
        goalTitle: goal.title,
        type: 'overachiever',
        severity: 'low',
        message: `Exceeding target by ${((latest.computedScore! - 1) * 100).toFixed(0)}% — consider raising the bar`,
        quarter: latest.quarter,
      });
    }
  }

  return alerts;
}

// ─── Smart Goal Suggestions ─────────────────────────────────────

const GOAL_TEMPLATES: Record<string, GoalSuggestion[]> = {
  'Sales & BD': [
    { title: 'Achieve quarterly revenue target', description: 'Hit the assigned revenue number for the quarter across all product categories.', thrustArea: 'Revenue Growth', uomType: 'NUMERIC_MIN', suggestedTarget: 500, suggestedWeightage: 30, reasoning: 'Core revenue KPI aligned to company growth targets' },
    { title: 'Expand dealer network coverage', description: 'Onboard new dealers in under-penetrated geographies.', thrustArea: 'Revenue Growth', uomType: 'NUMERIC_MIN', suggestedTarget: 25, suggestedWeightage: 20, reasoning: 'Distribution expansion drives long-term revenue' },
    { title: 'Improve channel partner NPS', description: 'Raise Net Promoter Score across dealer and distributor base.', thrustArea: 'Customer Centricity', uomType: 'NUMERIC_MIN', suggestedTarget: 72, suggestedWeightage: 20, reasoning: 'Partner satisfaction correlates with sell-through rates' },
  ],
  'Technology': [
    { title: 'Reduce production bug escape rate', description: 'Lower the number of bugs reaching production per release cycle.', thrustArea: 'Operational Excellence', uomType: 'PERCENTAGE_MAX', suggestedTarget: 2, suggestedWeightage: 25, reasoning: 'Code quality directly impacts customer experience' },
    { title: 'Improve API response latency P95', description: 'Optimize the 95th percentile API response time across all services.', thrustArea: 'Innovation & Technology', uomType: 'NUMERIC_MAX', suggestedTarget: 200, suggestedWeightage: 25, reasoning: 'Performance is critical for IoT device interactions' },
    { title: 'Complete cloud cost optimization', description: 'Reduce monthly infrastructure spend through architecture improvements.', thrustArea: 'Cost Optimization', uomType: 'NUMERIC_MAX', suggestedTarget: 15000, suggestedWeightage: 20, reasoning: 'Infrastructure cost reduction supports profitability' },
  ],
  'Operations': [
    { title: 'Reduce service turnaround time', description: 'Lower average days from complaint to resolution.', thrustArea: 'Operational Excellence', uomType: 'NUMERIC_MAX', suggestedTarget: 3, suggestedWeightage: 30, reasoning: 'Service speed is the #1 customer satisfaction driver' },
    { title: 'Achieve zero safety incidents', description: 'Maintain zero reportable safety incidents across all facilities.', thrustArea: 'Compliance & Risk', uomType: 'ZERO_BASED', suggestedTarget: 0, suggestedWeightage: 25, reasoning: 'Safety is non-negotiable in manufacturing operations' },
    { title: 'Improve warehouse fulfillment accuracy', description: 'Raise order accuracy rate for spare parts fulfillment.', thrustArea: 'Operational Excellence', uomType: 'PERCENTAGE_MIN', suggestedTarget: 99, suggestedWeightage: 20, reasoning: 'Accurate fulfillment reduces rework and customer complaints' },
  ],
  'Marketing': [
    { title: 'Grow brand awareness score', description: 'Increase unaided brand recall in target demographics.', thrustArea: 'Revenue Growth', uomType: 'PERCENTAGE_MIN', suggestedTarget: 35, suggestedWeightage: 25, reasoning: 'Brand awareness drives organic demand generation' },
    { title: 'Achieve digital campaign ROAS target', description: 'Maintain Return on Ad Spend above target across digital channels.', thrustArea: 'Cost Optimization', uomType: 'NUMERIC_MIN', suggestedTarget: 4, suggestedWeightage: 25, reasoning: 'Marketing efficiency directly impacts profitability' },
    { title: 'Launch new product campaign', description: 'Execute go-to-market campaign for upcoming product line.', thrustArea: 'Innovation & Technology', uomType: 'TIMELINE', suggestedTarget: 0, suggestedWeightage: 20, reasoning: 'Timely launch support maximizes new product revenue window' },
  ],
  'Finance': [
    { title: 'Reduce monthly close cycle time', description: 'Shorten the number of working days to complete monthly financial close.', thrustArea: 'Operational Excellence', uomType: 'NUMERIC_MAX', suggestedTarget: 5, suggestedWeightage: 30, reasoning: 'Faster close enables earlier business decision-making' },
    { title: 'Improve forecast accuracy', description: 'Reduce variance between quarterly forecast and actual results.', thrustArea: 'Operational Excellence', uomType: 'PERCENTAGE_MAX', suggestedTarget: 5, suggestedWeightage: 25, reasoning: 'Accurate forecasting improves capital allocation' },
    { title: 'Complete internal audit findings', description: 'Resolve all high-priority internal audit observations.', thrustArea: 'Compliance & Risk', uomType: 'TIMELINE', suggestedTarget: 0, suggestedWeightage: 20, reasoning: 'Timely audit resolution maintains regulatory compliance' },
  ],
};

export function getSmartSuggestions(
  department: string,
  existingGoals: Goal[],
  thrustAreas: { id: string; name: string }[]
): GoalSuggestion[] {
  const templates = GOAL_TEMPLATES[department] || GOAL_TEMPLATES['Technology']!;
  const existingTitles = existingGoals.map((g) => g.title.toLowerCase());

  return templates
    .filter((t) => {
      const candidate = t.title.toLowerCase();
      // Semantic overlap detection: reject if any existing goal shares >50% words
      const candidateWords = new Set(candidate.split(/\s+/).filter((w) => w.length > 3));
      for (const existing of existingTitles) {
        if (existing === candidate) return false; // Exact match
        const existingWords = new Set(existing.split(/\s+/).filter((w) => w.length > 3));
        const overlap = [...candidateWords].filter((w) => existingWords.has(w)).length;
        const similarity = candidateWords.size > 0 ? overlap / candidateWords.size : 0;
        if (similarity > 0.5) return false; // Semantically too similar
      }
      return true;
    })
    .map((t) => ({
      ...t,
      thrustArea: thrustAreas.find((ta) => ta.name === t.thrustArea)?.id || t.thrustArea,
    }));
}

// ─── Goal Quality Scorer (Real-Time SMART Analysis) ─────────────

export interface GoalQualityResult {
  score: number; // 0-100
  grade: 'excellent' | 'good' | 'fair' | 'poor';
  feedback: string[];
}

/**
 * Score a goal title + description for SMART criteria quality.
 * Returns a 0-100 score with actionable feedback.
 */
export function scoreGoalQuality(title: string, description?: string): GoalQualityResult {
  const feedback: string[] = [];
  let score = 0;
  const text = `${title} ${description || ''}`.toLowerCase();
  const words = title.trim().split(/\s+/);

  // Specific: Does it name a concrete outcome?
  const specificWords = ['reduce', 'increase', 'achieve', 'launch', 'complete', 'improve', 'deliver', 'ship', 'build', 'optimize', 'implement', 'deploy', 'lower', 'raise', 'grow', 'expand', 'maintain'];
  if (specificWords.some((w) => text.includes(w))) {
    score += 25;
  } else {
    feedback.push('Make it specific — use action verbs like "reduce", "achieve", "launch"');
  }

  // Measurable: Does it contain a number or metric reference?
  if (/\d+/.test(text) || ['%', 'rate', 'score', 'nps', 'csat', 'tat', 'count', 'revenue', 'cost'].some((w) => text.includes(w))) {
    score += 25;
  } else {
    feedback.push('Add a measurable metric — include numbers or KPI references');
  }

  // Attainable: Reasonable length (not too vague, not too verbose)
  if (words.length >= 4 && words.length <= 15) {
    score += 20;
  } else if (words.length < 4) {
    feedback.push('Too brief — add more context to make the goal actionable');
    score += 5;
  } else {
    feedback.push('Too verbose — keep the title concise (4-15 words)');
    score += 10;
  }

  // Relevant: Does it reference a business area?
  const businessWords = ['customer', 'revenue', 'team', 'product', 'service', 'quality', 'safety', 'compliance', 'efficiency', 'growth', 'market', 'partner', 'employee'];
  if (businessWords.some((w) => text.includes(w))) {
    score += 15;
  } else {
    feedback.push('Connect to business impact — reference customers, revenue, or team outcomes');
  }

  // Time-bound: Is there a time reference?
  if (['quarter', 'q1', 'q2', 'q3', 'q4', 'monthly', 'annual', 'deadline', 'by', 'before', 'within'].some((w) => text.includes(w)) || /20\d{2}/.test(text)) {
    score += 15;
  } else {
    score += 5; // Partial credit since timeline is set via UoM
    feedback.push('Consider adding time context in the description');
  }

  const grade: GoalQualityResult['grade'] =
    score >= 85 ? 'excellent' : score >= 65 ? 'good' : score >= 40 ? 'fair' : 'poor';

  if (score >= 85) feedback.unshift('Excellent SMART goal — well structured!');
  else if (score >= 65) feedback.unshift('Good goal — minor improvements possible');

  return { score, grade, feedback };
}

// ─── Semantic Overlap Detection ─────────────────────────────────

/**
 * Check if a new goal title is too similar to existing goals.
 * Returns overlap alerts for any goal with >40% word similarity.
 */
export function detectGoalOverlap(
  newTitle: string,
  existingGoals: { id: string; title: string }[]
): { goalId: string; goalTitle: string; similarity: number }[] {
  const newWords = new Set(newTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  if (newWords.size === 0) return [];

  return existingGoals
    .map((goal) => {
      const existingWords = new Set(goal.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
      const overlap = [...newWords].filter((w) => existingWords.has(w)).length;
      const similarity = overlap / Math.max(newWords.size, existingWords.size);
      return { goalId: goal.id, goalTitle: goal.title, similarity };
    })
    .filter((r) => r.similarity > 0.4)
    .sort((a, b) => b.similarity - a.similarity);
}

// ─── Auto-Tag Thrust Area ───────────────────────────────────────

const KEYWORD_MAP: Record<string, string[]> = {
  'Revenue Growth': ['revenue', 'sales', 'growth', 'target', 'pipeline', 'deal', 'conversion', 'market', 'expand', 'dealer', 'channel'],
  'Operational Excellence': ['efficiency', 'process', 'tat', 'turnaround', 'reduce', 'optimize', 'quality', 'sla', 'delivery', 'fulfillment'],
  'Customer Centricity': ['customer', 'nps', 'csat', 'satisfaction', 'retention', 'service', 'support', 'experience', 'feedback'],
  'People & Culture': ['team', 'training', 'certification', 'engagement', 'culture', 'hiring', 'onboarding', 'mentoring', 'development'],
  'Innovation & Technology': ['innovation', 'technology', 'product', 'launch', 'r&d', 'platform', 'digital', 'app', 'iot', 'ai', 'automation'],
  'Cost Optimization': ['cost', 'expense', 'budget', 'savings', 'procurement', 'cloud', 'infrastructure', 'spend', 'roas'],
  'Compliance & Risk': ['compliance', 'audit', 'safety', 'risk', 'regulatory', 'incident', 'security', 'policy', 'zero'],
};

export function autoTagThrustArea(title: string): { name: string; confidence: number }[] {
  const lower = title.toLowerCase();
  const scores: { name: string; confidence: number }[] = [];

  for (const [area, keywords] of Object.entries(KEYWORD_MAP)) {
    const matches = keywords.filter((kw) => lower.includes(kw));
    if (matches.length > 0) {
      scores.push({
        name: area,
        confidence: Math.min(1, matches.length * 0.35),
      });
    }
  }

  return scores.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

// ─── Sentiment Analysis (Rule-Based NLP) ────────────────────────

const POSITIVE_WORDS = ['excellent', 'great', 'strong', 'exceeded', 'outstanding', 'ahead', 'well', 'good', 'impressive', 'above', 'healthy', 'stabilized', 'completed', 'improved', 'proactive', 'accelerate', 'beaten', 'positive', 'confident', 'recommend'];
const NEGATIVE_WORDS = ['concern', 'delay', 'below', 'missed', 'behind', 'risk', 'gap', 'issue', 'poor', 'declined', 'stalled', 'escalate', 'failed', 'incident', 'corrective', 'regression', 'deteriorated', 'blocker', 'warning'];

export function analyzeSentiment(text: string): SentimentResult {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  let positiveCount = 0;
  let negativeCount = 0;
  const keywords: string[] = [];

  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '');
    if (POSITIVE_WORDS.includes(clean)) {
      positiveCount++;
      keywords.push(clean);
    }
    if (NEGATIVE_WORDS.includes(clean)) {
      negativeCount++;
      keywords.push(clean);
    }
  }

  const total = positiveCount + negativeCount;
  if (total === 0) return { score: 0, label: 'neutral', keywords: [] };

  const score = (positiveCount - negativeCount) / total;
  const label: SentimentResult['label'] = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';

  return { score, label, keywords: [...new Set(keywords)].slice(0, 5) };
}

// ─── Smart Insights Generator ───────────────────────────────────

export function generateInsights(
  goals: Goal[],
  updates: QuarterlyUpdate[],
  employeeName: string,
  role: string
): SmartInsight[] {
  const insights: SmartInsight[] = [];

  if (role === 'EMPLOYEE') {
    // Personal performance insights
    const latestUpdates = updates.filter((u) => goals.some((g) => g.id === u.goalId));
    const avgScore = latestUpdates.length > 0
      ? latestUpdates.reduce((sum, u) => sum + (u.computedScore ?? 0), 0) / latestUpdates.length
      : 0;

    if (avgScore >= 0.9) {
      insights.push({ id: 'perf-high', icon: '🏆', title: 'Top Performer', description: `${employeeName} is averaging ${(avgScore * 100).toFixed(0)}% across all goals — well above the 80% benchmark.`, type: 'success' });
    } else if (avgScore >= 0.7) {
      insights.push({ id: 'perf-track', icon: '📈', title: 'On Track', description: `Current average of ${(avgScore * 100).toFixed(0)}% shows steady progress. Focus on underperforming goals to close the gap.`, type: 'info' });
    } else if (avgScore > 0) {
      insights.push({ id: 'perf-risk', icon: '⚠️', title: 'Needs Attention', description: `Average score of ${(avgScore * 100).toFixed(0)}% is below the 80% threshold. Prioritize lagging goals immediately.`, type: 'warning' });
    }

    const completedGoals = latestUpdates.filter((u) => u.status === 'COMPLETED').length;
    if (completedGoals > 0) {
      insights.push({ id: 'completed', icon: '✅', title: `${completedGoals} Goal${completedGoals > 1 ? 's' : ''} Completed`, description: `${completedGoals} of ${goals.length} goals have reached completion status.`, type: 'success' });
    }
  }

  if (role === 'MANAGER') {
    const anomalies = detectAnomalies(goals, updates);
    const highSeverity = anomalies.filter((a) => a.severity === 'high');

    if (highSeverity.length > 0) {
      insights.push({ id: 'anomaly-alert', icon: '🚨', title: `${highSeverity.length} High-Risk Goal${highSeverity.length > 1 ? 's' : ''}`, description: `Significant score drops detected. Review ${highSeverity.map((a) => `"${a.goalTitle}"`).join(', ')} immediately.`, type: 'warning' });
    }

    if (anomalies.filter((a) => a.type === 'overachiever').length > 0) {
      insights.push({ id: 'overachievers', icon: '🌟', title: 'Stretch Opportunities', description: 'Some team members are significantly exceeding targets. Consider raising the bar for next quarter.', type: 'info' });
    }
  }

  return insights;
}

// ─── Chatbot Response Engine ────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const FAQ_PATTERNS: { patterns: RegExp[]; response: string }[] = [
  {
    patterns: [/how.*(submit|create|add).*goal/i, /submit.*goal/i],
    response: '**To submit your goals:**\n1. Go to the **Goals** page\n2. Click **"Add Goal"** to create goals\n3. Set title, UoM type, target, and weightage\n4. Ensure total weightage = exactly **100%**\n5. Click **Submit for Approval**\n\nYour manager will then review and approve or return for rework.',
  },
  {
    patterns: [/what.*(score|progress|performance)/i, /my.*score/i, /current.*score/i],
    response: 'DYNAMIC:SCORE',
  },
  {
    patterns: [/which.*goal.*(risk|behind|danger)/i, /at.*risk/i, /risk.*goal/i],
    response: 'DYNAMIC:RISK',
  },
  {
    patterns: [/suggest.*goal/i, /recommend.*goal/i, /goal.*idea/i],
    response: 'DYNAMIC:SUGGEST',
  },
  {
    patterns: [/team.*(status|progress|health)/i, /my.*team/i, /how.*team.*doing/i],
    response: 'DYNAMIC:TEAM',
  },
  {
    patterns: [/what.*(check.?in|checkin)/i, /how.*(check.?in|checkin)/i, /quarterly.*update/i],
    response: '**Quarterly Check-ins** let you log your actual achievement against planned targets.\n\n- **Q1**: July window\n- **Q2**: October window\n- **Q3**: January window\n- **Q4**: March-April window\n\nDuring each window, enter your actual values and your manager will add coaching comments.',
  },
  {
    patterns: [/analytic/i, /explain.*dashboard/i, /what.*chart/i, /dashboard.*show/i, /interpret.*analytic/i, /read.*analytic/i, /understand.*analytic/i, /what.*analytic.*page/i],
    response: 'DYNAMIC:ANALYTICS',
  },
  {
    patterns: [/what.*weightage/i, /weightage.*rule/i, /100.*percent/i],
    response: `**Weightage Rules:**\n- Total across all goals must equal **exactly 100%**\n- Minimum per goal: **${10}%**\n- Maximum per goal: **${100}%**\n- Maximum **8 goals** per cycle\n\nThe submit button enables only when total = 100%.`,
  },
  {
    patterns: [/what.*uom/i, /unit.*measure/i, /uom.*type/i],
    response: '**Unit of Measurement Types:**\n\n| Type | Formula | Example |\n|------|---------|----------|\n| Numeric (Min) | Actual ÷ Target | Revenue |\n| Numeric (Max) | Target ÷ Actual | Cost, TAT |\n| Percentage (Min) | Actual ÷ Target | CSAT |\n| Percentage (Max) | Target ÷ Actual | Defect rate |\n| Timeline | Completion vs Deadline | Project delivery |\n| Zero-Based | Zero = 100% | Safety incidents |',
  },
  {
    patterns: [/help/i, /what.*can.*do/i, /commands/i],
    response: 'I can help with:\n- 📊 **"What\'s my score?"** — Current performance\n- ⚠️ **"Which goals are at risk?"** — Anomaly detection\n- 💡 **"Suggest goals"** — AI recommendations\n- 👥 **"Team status"** — Manager team overview\n- 📋 **"How to submit goals"** — Process guide\n- 📏 **"Weightage rules"** — BRD constraints\n- 📐 **"UoM types"** — Score formulas\n- 📈 **"Explain my analytics"** — Analytics page walkthrough',
  },
];

export function getChatResponse(message: string): string {
  const input = message.trim();

  for (const faq of FAQ_PATTERNS) {
    for (const pattern of faq.patterns) {
      if (pattern.test(input)) {
        return faq.response;
      }
    }
  }

  return "I'm not sure about that. Try asking:\n- \"What's my score?\"\n- \"Which goals are at risk?\"\n- \"Suggest goals for me\"\n- \"How do I submit goals?\"\n- \"Explain my analytics\"\n- Type **help** for all commands.";
}

// ─── Analytics Page Summarizer ──────────────────────────────────

export interface AnalyticsSummaryInput {
  role: string;
  name: string;
  department: string;
  goals: Goal[];
  updates: QuarterlyUpdate[];
  thrustAreas: ThrustArea[];
  /** Number of employees in scope (for manager/admin) */
  scopeSize: number;
  /** Number of completed check-ins */
  checkinCount: number;
}

/**
 * Generates a human-readable analytics page summary.
 * Only uses data that is already role-scoped — no cross-boundary access.
 */
export function getAnalyticsSummary(input: AnalyticsSummaryInput): string {
  const { role, name, goals, updates, thrustAreas, scopeSize, checkinCount, department } = input;
  const firstName = name.split(' ')[0];

  if (goals.length === 0) {
    return `📊 **Your Analytics Dashboard**\n\nHi ${firstName}! Your analytics page is currently empty because no goals have been set up yet.\n\n**Next step:** Head to the Goals page and create your first goal to start seeing performance data here.`;
  }

  const lines: string[] = [];

  // ── Scope intro ──
  if (role === 'EMPLOYEE') {
    lines.push(`📊 **Your Analytics Dashboard** — Here's what your analytics page is showing you:`);
    lines.push('');
  } else if (role === 'MANAGER') {
    lines.push(`📊 **Team Analytics Dashboard** — Here's what's shown for your ${scopeSize} direct report${scopeSize !== 1 ? 's' : ''}:`);
    lines.push('');
  } else {
    lines.push(`📊 **Org Analytics Dashboard** — Here's an overview of all ${scopeSize} employee${scopeSize !== 1 ? 's' : ''} in scope:`);
    lines.push('');
  }

  // ── Overall score ──
  const latestScores: number[] = [];
  for (const goal of goals) {
    const goalUpdates = updates
      .filter((u) => u.goalId === goal.id)
      .sort((a, b) => ['Q1','Q2','Q3','Q4'].indexOf(b.quarter) - ['Q1','Q2','Q3','Q4'].indexOf(a.quarter));
    const latest = goalUpdates[0];
    if (latest?.computedScore != null) latestScores.push(latest.computedScore);
  }

  if (latestScores.length > 0) {
    const avg = latestScores.reduce((a, b) => a + b, 0) / latestScores.length;
    const pct = Math.round(avg * 100);
    const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '📈' : pct >= 50 ? '⚠️' : '🚨';
    const verdict = pct >= 90 ? 'Excellent performance' : pct >= 70 ? 'On track' : pct >= 50 ? 'Needs attention' : 'At risk';
    lines.push(`${emoji} **Overall Score: ${pct}%** — ${verdict}`);
  } else {
    lines.push(`📋 No check-in data recorded yet — the score charts will populate once quarterly updates are submitted.`);
  }

  // ── Goal count & status ──
  lines.push(`\n**Goal Overview:** ${goals.length} goal${goals.length !== 1 ? 's' : ''} tracked`);

  // ── Top & bottom goals ──
  if (latestScores.length > 0) {
    const scoredGoals = goals
      .map((g) => {
        const gu = updates
          .filter((u) => u.goalId === g.id)
          .sort((a, b) => ['Q1','Q2','Q3','Q4'].indexOf(b.quarter) - ['Q1','Q2','Q3','Q4'].indexOf(a.quarter));
        return { title: g.title, score: gu[0]?.computedScore ?? null, weightage: g.weightage };
      })
      .filter((g) => g.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    if (scoredGoals.length > 0) {
      const top = scoredGoals[0];
      lines.push(`\n🥇 **Strongest goal:** "${top.title}" at **${Math.round((top.score ?? 0) * 100)}%**`);
    }
    if (scoredGoals.length > 1) {
      const bottom = scoredGoals[scoredGoals.length - 1];
      const bottomPct = Math.round((bottom.score ?? 0) * 100);
      if (bottomPct < 80) {
        lines.push(`⚠️ **Needs focus:** "${bottom.title}" at **${bottomPct}%** — this goal is dragging the average down.`);
      }
    }
  }

  // ── Thrust area distribution ──
  const taMap = new Map<string, number>();
  for (const goal of goals) {
    const ta = thrustAreas.find((t) => t.id === goal.thrustAreaId);
    const name = ta?.name ?? 'Uncategorized';
    taMap.set(name, (taMap.get(name) ?? 0) + goal.weightage);
  }
  if (taMap.size > 0) {
    const topTA = [...taMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const taList = topTA.map(([n, w]) => `${n} (${w}%)`).join(', ');
    lines.push(`\n🗂️ **Thrust Areas in focus:** ${taList}`);
  }

  // ── Anomaly callout ──
  const anomalies = detectAnomalies(goals, updates);
  const highRisk = anomalies.filter((a) => a.severity === 'high');
  if (highRisk.length > 0) {
    lines.push(`\n🚨 **${highRisk.length} high-risk goal${highRisk.length > 1 ? 's' : ''} detected** — score drops of >40% between quarters. Review these urgently.`);
  } else if (anomalies.length > 0) {
    lines.push(`\n⚠️ **${anomalies.length} performance signal${anomalies.length > 1 ? 's' : ''} flagged** — some goals show stagnation or mild drops.`);
  } else if (latestScores.length > 0) {
    lines.push(`\n✅ **No anomalies** — all goals are progressing without significant drops.`);
  }

  // ── Check-ins ──
  if (role === 'MANAGER' || role === 'ADMIN') {
    lines.push(`\n📋 **Check-ins completed:** ${checkinCount} structured manager check-in${checkinCount !== 1 ? 's' : ''} on record.`);
  }

  // ── Role-specific tips ──
  lines.push(`\n💡 **Tips for your dashboard:`);
  if (role === 'EMPLOYEE') {
    lines.push(`- The **Score vs Target** gauge shows your latest quarterly achievement\n- The **Quarterly Trend** chart plots Q1–Q4 progress across all goals\n- The **Thrust Area Radar** shows which strategic areas you're strongest in\n- Ask me "which goals are at risk?" to see AI anomaly detection results`);
  } else if (role === 'MANAGER') {
    lines.push(`- The **Planned vs Actual** bars compare goal targets across your team\n- The **Heat Map** table lets you spot who needs coaching at a glance\n- Employees in red (< 50%) need immediate attention\n- Ask me "team status" for a quick summary`);
  } else {
    lines.push(`- The **Treemap** shows org-wide thrust area weightage distribution\n- The **Submission Status** chart tracks goal sheet lifecycle across all employees\n- Use the **Trend** charts to spot org-level performance patterns\n- Ask me "team status" for department-level highlights`);
  }

  return lines.join('\n');
}

// ─── Smart Weightage Recommendation (A.3/8.04) ─────────────────

/** Historical norms per thrust area — used for weightage suggestions */
const THRUST_AREA_NORMS: Record<string, { min: number; max: number; typical: number }> = {
  'Revenue Growth': { min: 20, max: 40, typical: 30 },
  'Cost Optimization': { min: 15, max: 30, typical: 20 },
  'Customer Excellence': { min: 15, max: 30, typical: 20 },
  'Safety & Sustainability': { min: 10, max: 25, typical: 15 },
  'People Development': { min: 10, max: 20, typical: 15 },
  'Innovation & Quality': { min: 10, max: 25, typical: 15 },
  'Process Excellence': { min: 10, max: 25, typical: 15 },
  'Digital Transformation': { min: 10, max: 30, typical: 20 },
};

/**
 * Recommend weightage for a goal based on historical org norms for its thrust area.
 */
export function recommendWeightage(
  thrustAreaName: string,
  existingGoalsCount: number,
  remainingPool: number
): { suggested: number; range: { min: number; max: number }; rationale: string } {
  const norms = THRUST_AREA_NORMS[thrustAreaName] || { min: 10, max: 30, typical: 20 };

  // Adjust suggestion based on remaining pool and goal count
  let suggested = norms.typical;
  if (existingGoalsCount === 0) suggested = Math.min(40, norms.max); // First goal can be bigger
  if (remainingPool < suggested) suggested = remainingPool;
  suggested = Math.max(10, Math.min(suggested, remainingPool)); // Clamp to valid range

  return {
    suggested,
    range: { min: Math.max(10, norms.min), max: Math.min(remainingPool, norms.max) },
    rationale: `${thrustAreaName} goals typically carry ${norms.min}–${norms.max}% weightage across the organization.`,
  };
}

// ─── Check-in Comment Quality Analyzer (C.1) ────────────────────

export interface CommentQualityResult {
  score: number; // 0-100
  grade: 'excellent' | 'good' | 'fair' | 'low';
  suggestions: string[];
}

const LOW_VALUE_PATTERNS = [
  /^(good|nice|ok|fine|great)\s*(job|work)?\.?$/i,
  /^(no comment|n\/a|na|none|-)\.?$/i,
  /^(keep it up|well done|noted)\.?$/i,
];

const HIGH_VALUE_MARKERS = [
  'next quarter', 'action', 'improve', 'focus on', 'recommend', 'target',
  'increase', 'reduce', 'deadline', 'milestone', 'priority', 'training',
  'coaching', 'support', 'resource', 'plan', 'strategy', 'review',
];

/**
 * Analyze a manager's check-in comment for specificity and actionability.
 * Flags low-value inputs and prompts for better coaching language.
 */
export function analyzeCommentQuality(comment: string): CommentQualityResult {
  const suggestions: string[] = [];
  let score = 0;
  const text = comment.trim();
  const words = text.split(/\s+/);

  // Check for empty or very short comments
  if (text.length === 0) return { score: 0, grade: 'low', suggestions: ['Please add a substantive comment.'] };

  // Check for low-value boilerplate
  if (LOW_VALUE_PATTERNS.some((p) => p.test(text))) {
    return {
      score: 10,
      grade: 'low',
      suggestions: [
        'This comment lacks specificity. Replace with actionable feedback.',
        'Example: "Solid progress on revenue target. For Q3, focus on closing the gap in enterprise pipeline."',
      ],
    };
  }

  // Length: sufficient detail?
  if (words.length >= 15) { score += 30; }
  else if (words.length >= 8) { score += 20; suggestions.push('Add more detail — aim for 15+ words for actionable feedback.'); }
  else { score += 5; suggestions.push('Comment is too brief. Provide specific observations and forward-looking guidance.'); }

  // Actionability: forward-looking language?
  const actionHits = HIGH_VALUE_MARKERS.filter((m) => text.toLowerCase().includes(m));
  if (actionHits.length >= 3) { score += 35; }
  else if (actionHits.length >= 1) { score += 20; suggestions.push('Include forward-looking actions: "Next quarter, focus on..."'); }
  else { score += 0; suggestions.push('Add coaching guidance — use phrases like "recommend", "focus on", "action plan".'); }

  // Specificity: mentions numbers or metrics?
  if (/\d+/.test(text) || ['%', 'target', 'actual', 'score', 'delta'].some((w) => text.toLowerCase().includes(w))) {
    score += 20;
  } else {
    suggestions.push('Reference specific metrics or data points from the goal.');
  }

  // Sentiment balance: both positive and constructive?
  const sent = analyzeSentiment(text);
  if (sent.keywords.length >= 2) { score += 15; }
  else { suggestions.push('Balance your feedback with both recognition and areas for improvement.'); }

  const grade: CommentQualityResult['grade'] =
    score >= 80 ? 'excellent' : score >= 55 ? 'good' : score >= 30 ? 'fair' : 'low';

  if (score >= 80) suggestions.unshift('Excellent coaching comment — specific and actionable!');

  return { score, grade, suggestions };
}

// ─── AI Talking Points for Managers (C.2) ───────────────────────

/**
 * Generate data-driven discussion topics for a manager before a check-in.
 */
export function generateTalkingPoints(
  goals: Goal[],
  updates: QuarterlyUpdate[]
): string[] {
  const points: string[] = [];

  // Find at-risk goals
  const atRisk = goals.filter((g) => {
    const update = updates.find((u) => u.goalId === g.id);
    return update && (update.computedScore ?? 0) < 0.5;
  });
  if (atRisk.length > 0) {
    points.push(`⚠️ Review progress on "${atRisk[0].title}" — currently below 50% achievement.`);
  }

  // Find overachievers
  const over = goals.filter((g) => {
    const update = updates.find((u) => u.goalId === g.id);
    return update && (update.computedScore ?? 0) > 1.0;
  });
  if (over.length > 0) {
    points.push(`🌟 Acknowledge overachievement on "${over[0].title}" — discuss stretch targets.`);
  }

  // Check for goals with no updates
  const noUpdate = goals.filter((g) => !updates.some((u) => u.goalId === g.id));
  if (noUpdate.length > 0) {
    points.push(`📋 ${noUpdate.length} goal(s) have no check-in data yet — clarify expected timelines.`);
  }

  // Weightage analysis
  const highWeight = goals.filter((g) => g.weightage >= 30).sort((a, b) => b.weightage - a.weightage);
  if (highWeight.length > 0) {
    points.push(`📊 High-impact goal "${highWeight[0].title}" (${highWeight[0].weightage}%) — prioritize discussion.`);
  }

  // Default if nothing to flag
  if (points.length === 0) {
    points.push('📈 All goals appear on track. Discuss Q-over-Q improvement opportunities.');
  }

  return points.slice(0, 5);
}
