import React, { useState } from 'react';
import { AssetRecord, TamilNaduMicroZoneId } from '../types/risk';
import { TAMIL_NADU_ZONES } from '../data/tamilNaduGeodata';
import { Bot, Send, X, Sparkles, BookOpen, AlertTriangle } from 'lucide-react';

interface AICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedZone: TamilNaduMicroZoneId;
  activeAsset?: AssetRecord;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: { title: string; source: string }[];
  modelInfo?: string;
  timestamp: string;
}

const SAMPLE_QUESTIONS = [
  'Why does Chennai experience tidal lock during cyclones?',
  'Explain the 7 calculation stages in Loss Anatomy.',
  'How does civil plinth height reduce expected loss?',
  'What is the formula for Technical Risk Rate in basis points?',
  'Compare TN-RCC-2024 vs TN-Industrial-PEB vulnerability curves.',
];

export const AICopilotModal: React.FC<AICopilotModalProps> = ({
  isOpen,
  onClose,
  selectedZone,
  activeAsset,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Welcome to the VYOM Underwriter Copilot. I am specialized in Tamil Nadu catastrophe perils (Bay of Bengal cyclones, estuarine river flooding, and orographic cloudbursts). I search our custom Vector Database of calibrated disaster management papers, vulnerability curves, and underwriting rules. How can I assist your risk evaluation today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const zoneData = TAMIL_NADU_ZONES[selectedZone];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          assetContext: activeAsset
            ? {
                id: activeAsset.id,
                name: activeAsset.name,
                insuredValueInr: activeAsset.insuredValueInr,
                type: activeAsset.type,
                constructionCategory: activeAsset.constructionCategory,
                plinthHeight: activeAsset.plinthHeightMeters,
              }
            : undefined,
          zoneContext: {
            id: zoneData.id,
            name: zoneData.name,
            elevationMeters: zoneData.elevationMeters,
            hazardScores: zoneData.hazardScores,
            primaryDriver: zoneData.primaryRiskDriver,
          },
        }),
      });

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'No response returned from the catastrophe engine.',
        sources: data.retrievedSources || [],
        modelInfo: data.source || 'VYOM Vector RAG',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `[Vector Knowledge Base Offline Fallback]
Regarding "${query}":
• Tamil Nadu micro-zones feature severe compound risks during the Northeast Monsoon (Oct–Dec).
• Coastal structures face combined tidal lock and backwater surges.
• Physical vulnerability uses local IS codes (TN-RCC-2024 / TN-Industrial-PEB) rather than FEMA Hazus.

This report supports expert review and is not an automatic underwriting decision.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl h-[650px] max-h-[90vh] rounded-xl bg-[#0c0f16] border border-[#232f42] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Copilot Header */}
        <div className="px-5 py-4 border-b border-[#1a2230] bg-[#0a0d13] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141b25] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#f8fafc]">
                  VYOM Catastrophe Underwriter Copilot
                </h3>
                <span className="text-[9px] font-mono bg-[#d4af37]/15 text-[#dfba4f] border border-[#d4af37]/30 px-1.5 py-0.2 rounded">
                  Vector RAG
                </span>
              </div>
              <div className="text-[11px] text-[#64748b] font-mono">
                Context: {zoneData.name} ({zoneData.vulnerabilityGrade} Hazard)
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#64748b] hover:text-[#f8fafc] hover:bg-[#161f2c] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed space-y-2 ${
                  m.sender === 'user'
                    ? 'bg-[#182333] text-[#f8fafc] border border-[#26374f]'
                    : 'bg-[#0f141e] text-[#cbd5e1] border border-[#1a2230]'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Sources & Citations */}
                {m.sources && m.sources.length > 0 && (
                  <div className="pt-2 border-t border-[#1a2332] text-[10px] font-mono space-y-1">
                    <div className="text-[#d4af37] flex items-center gap-1 font-semibold">
                      <BookOpen className="w-3 h-3" />
                      <span>Retrieved Vector Knowledge Sources:</span>
                    </div>
                    {m.sources.map((s, idx) => (
                      <div key={idx} className="text-[#64748b] pl-3 border-l border-[#242f42]">
                        • {s.title} ({s.source})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-[10px] font-mono text-[#64748b] mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#d4af37] animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Querying Catastrophe Vector Database & Synthesizing...</span>
            </div>
          )}
        </div>

        {/* Quick Question Prompts */}
        <div className="px-4 py-2 border-t border-[#161f2c] bg-[#090b0e] shrink-0 overflow-x-auto flex gap-2">
          {SAMPLE_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-[11px] font-mono text-[#94a3b8] hover:text-[#dfba4f] hover:bg-[#141b25] px-2.5 py-1 rounded bg-[#0f131a] border border-[#1e2736] transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#1a2230] bg-[#0a0d13] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask the Underwriter Copilot about Tamil Nadu perils, loss anatomy, or formulas..."
              className="flex-1 py-2 px-3.5 rounded-lg bg-[#0f141e] border border-[#232f42] text-xs text-[#f8fafc] font-mono focus:border-[#d4af37] outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="py-2 px-4 rounded-lg bg-[#d4af37] hover:bg-[#dfba4f] text-[#0a0d13] font-semibold text-xs font-mono transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>

          <div className="mt-2 text-[10px] text-center text-[#556377] font-mono">
            “This report supports expert review and is not an automatic underwriting decision.”
          </div>
        </div>
      </div>
    </div>
  );
};
