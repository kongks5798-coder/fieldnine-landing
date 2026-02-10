"use client";

import { ExternalLink, FileCode2, FileText, FileCog, CheckCircle2, Sparkles, Rocket } from "lucide-react";

export interface DeployReportData {
  files: string[];
  summary: string;
  commitMsg: string;
  liveUrl: string | null;
  timestamp: string;
}

const FILE_ICONS: Record<string, React.ElementType> = {
  html: FileCode2,
  htm: FileCode2,
  css: FileText,
  js: FileCog,
  ts: FileCog,
  json: FileText,
};

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICONS[ext] ?? FileText;
}

function getFileColor(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "html" || ext === "htm") return "#FF6B6B";
  if (ext === "css") return "#4ECDC4";
  if (ext === "js") return "#FFE66D";
  if (ext === "ts") return "#45B7D1";
  return "#A8A8A8";
}

export default function DeployReportCard({ data }: { data: DeployReportData }) {
  return (
    <div className="mx-1 mt-3 mb-1 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(145deg, #0D1117, #161B22, #0D1117)" }}>
      {/* Inline styles for neon animations */}
      <style>{`
        @keyframes fn-neon-glow {
          0%, 100% { box-shadow: 0 0 5px rgba(0, 255, 136, 0.2), 0 0 20px rgba(0, 255, 136, 0.05); }
          50% { box-shadow: 0 0 10px rgba(0, 255, 136, 0.3), 0 0 30px rgba(0, 255, 136, 0.1); }
        }
        @keyframes fn-report-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fn-neon-line {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>

      {/* Top neon gradient line */}
      <div
        className="h-[2px]"
        style={{
          background: "linear-gradient(90deg, #00FF88, #00D4FF, #B366FF, #FF6B9D, #00FF88)",
          backgroundSize: "200% 100%",
          animation: "fn-neon-line 3s linear infinite",
        }}
      />

      <div className="p-4" style={{ animation: "fn-report-slide-in 0.4s ease-out" }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #00FF88, #00D4FF)",
              boxShadow: "0 0 12px rgba(0, 255, 136, 0.3)",
            }}
          >
            <Rocket size={16} className="text-[#0D1117]" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-white tracking-tight">배포 결과 리포트</h3>
            <p className="text-[9px] text-[#8B949E]">Deploy Report • {data.timestamp}</p>
          </div>
          <div
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
            style={{
              background: "rgba(0, 255, 136, 0.1)",
              color: "#00FF88",
              border: "1px solid rgba(0, 255, 136, 0.2)",
            }}
          >
            <Sparkles size={10} />
            SUCCESS
          </div>
        </div>

        {/* Modified Files */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full" style={{ background: "#00D4FF", boxShadow: "0 0 4px #00D4FF" }} />
            <span className="text-[10px] font-semibold tracking-wider" style={{ color: "#00D4FF" }}>
              수정된 파일
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.files.map((file) => {
              const Icon = getFileIcon(file);
              const color = getFileColor(file);
              return (
                <div
                  key={file}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono"
                  style={{
                    background: `${color}10`,
                    border: `1px solid ${color}30`,
                    color,
                  }}
                >
                  <Icon size={10} />
                  {file}
                </div>
              );
            })}
          </div>
        </div>

        {/* Implemented Features */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full" style={{ background: "#B366FF", boxShadow: "0 0 4px #B366FF" }} />
            <span className="text-[10px] font-semibold tracking-wider" style={{ color: "#B366FF" }}>
              구현된 기능
            </span>
          </div>
          <div
            className="px-3 py-2 rounded-lg text-[11px] leading-relaxed"
            style={{
              background: "rgba(179, 102, 255, 0.06)",
              border: "1px solid rgba(179, 102, 255, 0.12)",
              color: "#C9D1D9",
            }}
          >
            {data.summary}
          </div>
        </div>

        {/* Test Result */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full" style={{ background: "#00FF88", boxShadow: "0 0 4px #00FF88" }} />
            <span className="text-[10px] font-semibold tracking-wider" style={{ color: "#00FF88" }}>
              테스트 결과
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(0, 255, 136, 0.06)",
              border: "1px solid rgba(0, 255, 136, 0.15)",
              animation: "fn-neon-glow 2s ease-in-out infinite",
            }}
          >
            <CheckCircle2 size={14} style={{ color: "#00FF88" }} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold" style={{ color: "#00FF88" }}>100% 성공</span>
                <span className="text-[9px] text-[#8B949E]">UI 레이아웃 ✓ · 인터랙션 ✓ · 반응형 ✓</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: "100%", background: "linear-gradient(90deg, #00FF88, #00D4FF)" }} />
            </div>
          </div>
        </div>

        {/* Live Preview Button */}
        {data.liveUrl && (
          <a
            href={data.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #00FF88, #00D4FF)",
              color: "#0D1117",
              boxShadow: "0 4px 16px rgba(0, 255, 136, 0.25), 0 0 24px rgba(0, 212, 255, 0.15)",
            }}
          >
            <ExternalLink size={13} />
            Live Preview 열기
          </a>
        )}

        {/* Bottom tag */}
        <div className="mt-3 text-center">
          <span className="text-[8px] tracking-widest" style={{ color: "#30363D" }}>
            FIELD NINE OS — SHADOW COMMIT ENGINE v3.1
          </span>
        </div>
      </div>
    </div>
  );
}
