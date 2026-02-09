"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, Plus, Check, Package, X, ExternalLink } from "lucide-react";

interface CDNLibrary {
  name: string;
  description: string;
  tag: string; // <script> or <link> tag
  category: string;
}

const CDN_LIBRARIES: CDNLibrary[] = [
  // Frameworks
  { name: "React 18", description: "UI component library", tag: '<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>\n<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>', category: "Framework" },
  { name: "Vue 3", description: "Progressive JS framework", tag: '<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>', category: "Framework" },
  { name: "Alpine.js", description: "Lightweight reactive framework", tag: '<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>', category: "Framework" },
  { name: "HTMX", description: "HTML-driven interactivity", tag: '<script src="https://unpkg.com/htmx.org@1.9.12"></script>', category: "Framework" },

  // Animation
  { name: "GSAP", description: "Professional animation library", tag: '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>', category: "Animation" },
  { name: "Anime.js", description: "Lightweight animation", tag: '<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js"></script>', category: "Animation" },
  { name: "AOS", description: "Animate on scroll", tag: '<link rel="stylesheet" href="https://unpkg.com/aos@2.3.4/dist/aos.css">\n<script src="https://unpkg.com/aos@2.3.4/dist/aos.js"></script>', category: "Animation" },
  { name: "Lottie", description: "After Effects animations", tag: '<script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>', category: "Animation" },

  // 3D / Graphics
  { name: "Three.js", description: "3D graphics library", tag: '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.162.0/three.min.js"></script>', category: "3D" },
  { name: "p5.js", description: "Creative coding", tag: '<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>', category: "3D" },

  // CSS
  { name: "Tailwind CSS (CDN)", description: "Utility-first CSS", tag: '<script src="https://cdn.tailwindcss.com"></script>', category: "CSS" },
  { name: "Bootstrap 5", description: "CSS component framework", tag: '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">\n<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>', category: "CSS" },
  { name: "Font Awesome 6", description: "Icon library", tag: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">', category: "CSS" },
  { name: "Google Fonts (Inter)", description: "Inter font family", tag: '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">', category: "CSS" },

  // Utilities
  { name: "Chart.js", description: "Simple charts", tag: '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>', category: "Utility" },
  { name: "Axios", description: "HTTP client", tag: '<script src="https://cdn.jsdelivr.net/npm/axios@1.6.8/dist/axios.min.js"></script>', category: "Utility" },
  { name: "Lodash", description: "JS utility library", tag: '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>', category: "Utility" },
  { name: "Day.js", description: "Date manipulation", tag: '<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>', category: "Utility" },
  { name: "Marked", description: "Markdown parser", tag: '<script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>', category: "Utility" },
  { name: "Confetti.js", description: "Confetti effects", tag: '<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>', category: "Utility" },
];

interface CDNManagerProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  onInsertTag: (tag: string) => void;
}

export default function CDNManager({ isOpen, onClose, htmlContent, onInsertTag }: CDNManagerProps) {
  const [query, setQuery] = useState("");

  const isInstalled = useCallback((lib: CDNLibrary) => {
    // Check if any part of the tag URL is already in the HTML
    const urls = lib.tag.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
    return urls.some(url => htmlContent.includes(url));
  }, [htmlContent]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return CDN_LIBRARIES;
    return CDN_LIBRARIES.filter(
      (lib) => lib.name.toLowerCase().includes(q) || lib.category.toLowerCase().includes(q) || lib.description.toLowerCase().includes(q)
    );
  }, [query]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, CDNLibrary[]>();
    for (const lib of filtered) {
      const arr = map.get(lib.category) ?? [];
      arr.push(lib);
      map.set(lib.category, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[500px] max-h-[70vh] bg-[var(--r-bg)] border border-[var(--r-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--r-border)] shrink-0">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-[#0079F2]" />
            <span className="text-[13px] font-semibold text-[var(--r-text)]">CDN Libraries</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[var(--r-text-secondary)] hover:text-[var(--r-text)] rounded transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-[var(--r-border)] shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--r-text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search libraries... (react, gsap, tailwind)"
              className="w-full pl-9 pr-3 py-2 bg-[var(--r-surface)] border border-[var(--r-border)] text-[13px] text-[var(--r-text)] placeholder-[#9DA5B0] rounded-xl outline-none focus:border-[#0079f2] transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Library List */}
        <div className="flex-1 overflow-y-auto py-2">
          {grouped.map(([category, libs]) => (
            <div key={category}>
              <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--r-text-muted)]">
                {category}
              </div>
              {libs.map((lib) => {
                const installed = isInstalled(lib);
                return (
                  <div
                    key={lib.name}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--r-surface-hover)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-[var(--r-text)] font-medium">{lib.name}</div>
                      <div className="text-[11px] text-[var(--r-text-muted)]">{lib.description}</div>
                    </div>
                    {installed ? (
                      <span className="flex items-center gap-1 text-[11px] text-[#00B894] bg-[#00B894]/10 px-2 py-1 rounded-lg shrink-0">
                        <Check size={11} />
                        Added
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onInsertTag(lib.tag)}
                        className="flex items-center gap-1 text-[11px] text-[#0079F2] bg-[#0079F2]/10 px-2 py-1 rounded-lg hover:bg-[#0079F2]/20 transition-colors shrink-0"
                      >
                        <Plus size={11} />
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--r-text-muted)]">
              No libraries found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--r-border)] text-[10px] text-[var(--r-text-muted)] shrink-0">
          {CDN_LIBRARIES.length} libraries available — Tags are auto-inserted into &lt;head&gt;
        </div>
      </div>
    </div>
  );
}
