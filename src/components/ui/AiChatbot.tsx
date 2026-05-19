/**
 * Meridian — AI Goal Coach Chatbot
 * Floating assistant panel with rule-based responses.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { DEMO_ACCOUNTS } from '@/lib/constants';
import {
  getChatResponse,
  detectAnomalies,
  getSmartSuggestions,
  getAnalyticsSummary,
  type ChatMessage,
} from '@/lib/ai-engine';
import { formatScore } from '@/lib/calculations';

export default function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationUserId, setConversationUserId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingResponseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageIdRef = useRef(0);

  const user = useAuthStore((s) => s.user);
  const { goals, goalSheets, quarterlyUpdates, thrustAreas, cycles, managerCheckins } = useDataStore();
  const userId = user?.id ?? null;
  const firstName = user?.name?.split(' ')[0] || 'there';

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const clearPendingResponse = useCallback(() => {
    if (pendingResponseRef.current) {
      clearTimeout(pendingResponseRef.current);
      pendingResponseRef.current = null;
    }
  }, []);

  const createWelcomeMessage = useCallback((name: string): ChatMessage => ({
    id: `welcome-${userId ?? 'guest'}`,
    role: 'assistant',
    content: `Hi ${name}! 👋 I'm your AI Goal Coach.\n\nI can help with performance insights, goal suggestions, and process guidance. Type **help** to see what I can do.`,
    timestamp: new Date(),
  }), [userId]);

  const beginConversationForCurrentUser = useCallback(() => {
    if (!userId) return;
    if (conversationUserId === userId) return;

    clearPendingResponse();
    setMessages([createWelcomeMessage(firstName)]);
    setConversationUserId(userId);
    setInput('');
    setIsTyping(false);
  }, [clearPendingResponse, conversationUserId, createWelcomeMessage, firstName, userId]);

  // Prevent delayed responses from a previous account after role switching.
  useEffect(() => {
    clearPendingResponse();
  }, [clearPendingResponse, userId]);

  useEffect(() => () => clearPendingResponse(), [clearPendingResponse]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const resolveDynamicResponse = (response: string): string => {
    if (!user) return 'Please sign in first.';

    const activeCycle = cycles.find((c) => c.isActive);
    const mySheet = goalSheets.find(
      (s) => s.employeeId === user.id && s.cycleId === activeCycle?.id
    );
    const myGoals = mySheet ? goals.filter((g) => g.sheetId === mySheet.id) : [];
    const myUpdates = quarterlyUpdates.filter((u) =>
      myGoals.some((g) => g.id === u.goalId)
    );

    switch (response) {
      case 'DYNAMIC:SCORE': {
        if (myGoals.length === 0) return 'You don\'t have any goals set up yet. Go to the **Goals** page to create your first goal.';
        if (myUpdates.length === 0) return 'No check-in data yet. Submit your quarterly achievements during the next open window.';

        const latestByGoal = new Map<string, number>();
        for (const u of myUpdates) {
          const existing = latestByGoal.get(u.goalId);
          if (existing === undefined || (u.computedScore ?? 0) !== existing) {
            latestByGoal.set(u.goalId, u.computedScore ?? 0);
          }
        }

        const lines = myGoals.map((g) => {
          const score = latestByGoal.get(g.id);
          return `- **${g.title}**: ${score !== undefined ? formatScore(score) : 'No data'}`;
        });

        const avg = [...latestByGoal.values()].reduce((a, b) => a + b, 0) / latestByGoal.size;
        return `**Your Current Scores:**\n\n${lines.join('\n')}\n\n📊 Overall average: **${formatScore(avg)}**`;
      }

      case 'DYNAMIC:RISK': {
        const anomalies = detectAnomalies(myGoals, myUpdates);
        if (anomalies.length === 0) return '✅ No anomalies detected. All your goals are progressing normally.';

        const lines = anomalies.map(
          (a) => `- ⚠️ **${a.goalTitle}**: ${a.message} (${a.severity} severity)`
        );
        return `**Goals at Risk:**\n\n${lines.join('\n')}`;
      }

      case 'DYNAMIC:SUGGEST': {
        const suggestions = getSmartSuggestions(user.department, myGoals, thrustAreas);
        if (suggestions.length === 0) return 'You already have a comprehensive set of goals! No additional suggestions at this time.';

        const lines = suggestions.slice(0, 3).map(
          (s) => `- **${s.title}** (${s.suggestedWeightage}%)\n  _${s.reasoning}_`
        );
        return `**Suggested Goals for ${user.department}:**\n\n${lines.join('\n\n')}`;
      }

      case 'DYNAMIC:TEAM': {
        if (user.role !== 'MANAGER') return 'Team status is available for managers. Switch to a manager account to see team insights.';

        // SECURITY: Only show direct reports, not all employees
        const directReportIds: Set<string> = new Set(
          DEMO_ACCOUNTS
            .filter((a) => a.managerId === user.id)
            .map((a) => a.id)
        );
        const teamSheets = goalSheets.filter((s) =>
          s.cycleId === activeCycle?.id && directReportIds.has(s.employeeId)
        );
        const pending = teamSheets.filter((s) => s.status === 'PENDING_APPROVAL').length;
        const locked = teamSheets.filter((s) => s.status === 'LOCKED').length;
        const draft = teamSheets.filter((s) => s.status === 'DRAFT').length;

        return `**Team Status (${directReportIds.size} direct reports):**\n\n- 🔒 Locked/Approved: **${locked}**\n- ⏳ Pending Review: **${pending}**\n- 📝 In Draft: **${draft}**\n\n${pending > 0 ? '⚠️ You have pending approvals. Review them in **Team Goals**.' : '✅ No pending actions.'}`;
      }

      case 'DYNAMIC:ANALYTICS': {
        // Build role-scoped analytics context — mirrors analytics page scope logic
        const employees =
          user.role === 'ADMIN'
            ? DEMO_ACCOUNTS.filter((a) => a.role === 'EMPLOYEE')
            : user.role === 'MANAGER'
              ? DEMO_ACCOUNTS.filter((a) => a.managerId === user.id)
              : DEMO_ACCOUNTS.filter((a) => a.id === user.id);
        const empIds: Set<string> = new Set(employees.map((e) => e.id));
        const scopedSheets = goalSheets.filter(
          (s) => empIds.has(s.employeeId) && s.cycleId === activeCycle?.id
        );
        const sheetIds = new Set(scopedSheets.map((s) => s.id));
        const scopedGoals = goals.filter((g) => sheetIds.has(g.sheetId));
        const goalIds = new Set(scopedGoals.map((g) => g.id));
        const scopedUpdates = quarterlyUpdates.filter((u) => goalIds.has(u.goalId));
        // SECURITY: Check-ins count only for scoped employees — no cross-boundary data
        const scopedCheckins = managerCheckins.filter((c) => empIds.has(c.employeeId));

        return getAnalyticsSummary({
          role: user.role,
          name: user.name,
          department: user.department,
          goals: scopedGoals,
          updates: scopedUpdates,
          thrustAreas,
          scopeSize: employees.length,
          checkinCount: scopedCheckins.length,
        });
      }

      default:
        return response;
    }
  };

  const handleSendMessage = (content: string) => {
    if (!user) return;

    const trimmed = content.trim();
    if (!trimmed) return;
    messageIdRef.current += 1;

    const userMsg: ChatMessage = {
      id: `msg-${messageIdRef.current}-user`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => (
      conversationUserId === user.id
        ? [...prev, userMsg]
        : [createWelcomeMessage(firstName), userMsg]
    ));
    setConversationUserId(user.id);
    setInput('');
    setIsTyping(true);

    // Simulate response delay
    clearPendingResponse();
    const responseUserId = user.id;
    pendingResponseRef.current = setTimeout(() => {
      pendingResponseRef.current = null;
      if (useAuthStore.getState().user?.id !== responseUserId) {
        return;
      }

      const rawResponse = getChatResponse(trimmed);
      const resolved = rawResponse.startsWith('DYNAMIC:')
        ? resolveDynamicResponse(rawResponse)
        : rawResponse;
      messageIdRef.current += 1;

      const botMsg: ChatMessage = {
        id: `msg-${messageIdRef.current}-bot`,
        role: 'assistant',
        content: resolved,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 700);
  };

  const handleSend = () => {
    handleSendMessage(input);
  };

  /* ── Simple markdown-to-JSX renderer ── */
  const renderMarkdown = (text: string) => {
    // Split by newlines first
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Parse **bold** and _italic_ within each line
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let keyIdx = 0;
      while (remaining.length > 0) {
        // Match **bold**
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        // Match _italic_
        const italicMatch = remaining.match(/(?<!\w)_(.+?)_(?!\w)/);

        // Find earliest match
        const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;
        const italicIdx = italicMatch ? remaining.indexOf(italicMatch[0]) : Infinity;

        if (boldIdx === Infinity && italicIdx === Infinity) {
          // No more matches
          parts.push(remaining);
          break;
        }

        if (boldIdx <= italicIdx && boldMatch) {
          // Add text before bold
          if (boldIdx > 0) parts.push(remaining.slice(0, boldIdx));
          parts.push(<strong key={`b-${lineIdx}-${keyIdx++}`} style={{ fontWeight: 700 }}>{boldMatch[1]}</strong>);
          remaining = remaining.slice(boldIdx + boldMatch[0].length);
        } else if (italicMatch) {
          // Add text before italic
          if (italicIdx > 0) parts.push(remaining.slice(0, italicIdx));
          parts.push(<em key={`i-${lineIdx}-${keyIdx++}`}>{italicMatch[1]}</em>);
          remaining = remaining.slice(italicIdx + italicMatch[0].length);
        }
      }

      return (
        <span key={`line-${lineIdx}`}>
          {lineIdx > 0 && <br />}
          {parts}
        </span>
      );
    });
  };

  const quickActions = [
    { label: 'My scores', query: "What's my score?" },
    { label: 'At risk', query: 'Which goals are at risk?' },
    { label: 'Suggest goals', query: 'Suggest goals for me' },
    { label: 'Analytics explained', query: 'Explain my analytics' },
  ];

  if (!user) return null;

  const isActiveConversation = conversationUserId === user.id;
  const visibleMessages = isActiveConversation
    ? messages
    : [createWelcomeMessage(firstName)];
  const visibleInput = isActiveConversation ? input : '';
  const visibleIsTyping = isActiveConversation && isTyping;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          className="ai-coach-trigger"
          onClick={() => {
            beginConversationForCurrentUser();
            setIsOpen(true);
          }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'var(--brand)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
            zIndex: 50,
            transition: 'transform 150ms ease, box-shadow 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          aria-label="Open AI Coach"
        >
          <Sparkles style={{ width: '22px', height: '22px' }} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="ai-coach-panel"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '380px',
            maxWidth: 'calc(100vw - 48px)',
            height: '520px',
            maxHeight: 'calc(100vh - 120px)',
            borderRadius: '16px',
            background: 'var(--bg-subtle, #fff)',
            border: '1px solid var(--border, #e2e8f0)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border, #e2e8f0)',
              background: 'var(--bg-subtle, #fff)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'var(--brand-muted, #eff6ff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot style={{ width: '16px', height: '16px', color: 'var(--brand, #2563eb)' }} />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: 0 }}>
                  Goal Coach
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary, #94a3b8)', margin: 0 }}>
                  AI-powered assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-tertiary, #94a3b8)',
              }}
              aria-label="Close"
            >
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {visibleMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
                    background: msg.role === 'user' ? 'var(--brand-muted, #eff6ff)' : 'var(--bg-muted, #f1f5f9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {msg.role === 'user' ? (
                    <User style={{ width: '13px', height: '13px', color: 'var(--brand, #2563eb)' }} />
                  ) : (
                    <Bot style={{ width: '13px', height: '13px', color: 'var(--text-secondary, #64748b)' }} />
                  )}
                </div>
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? 'var(--brand, #2563eb)' : 'var(--bg-muted, #f1f5f9)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary, #0f172a)',
                    fontSize: '13px',
                    lineHeight: '1.55',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {renderMarkdown(msg.content)}
                </div>
              </div>
            ))}

            {visibleIsTyping && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
                    background: 'var(--bg-muted, #f1f5f9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bot style={{ width: '13px', height: '13px', color: 'var(--text-secondary, #64748b)' }} />
                </div>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '14px 14px 14px 4px',
                    background: 'var(--bg-muted, #f1f5f9)',
                    display: 'flex',
                    gap: '4px',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--text-tertiary, #94a3b8)',
                        animation: `typingPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {visibleMessages.length <= 1 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      handleSendMessage(action.query);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border, #e2e8f0)',
                      background: 'var(--bg-subtle, #fff)',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--brand, #2563eb)',
                      cursor: 'pointer',
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border, #e2e8f0)',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              ref={inputRef}
              value={visibleInput}
              onChange={(e) => {
                beginConversationForCurrentUser();
                setInput(e.target.value);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your goals..."
              style={{
                flex: 1,
                height: '38px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1px solid var(--border, #e2e8f0)',
                background: 'var(--bg-canvas, #f8fafc)',
                fontSize: '13px',
                color: 'var(--text-primary, #0f172a)',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!visibleInput.trim()}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: 'none',
                background: visibleInput.trim() ? 'var(--brand, #2563eb)' : 'var(--bg-muted, #e2e8f0)',
                color: visibleInput.trim() ? '#fff' : 'var(--text-disabled, #94a3b8)',
                cursor: visibleInput.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Send style={{ width: '15px', height: '15px' }} />
            </button>
          </div>
        </div>
      )}

      {/* Typing animation keyframes */}
      <style>{`
        @keyframes typingPulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
