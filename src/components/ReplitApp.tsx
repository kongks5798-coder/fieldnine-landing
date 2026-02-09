"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Home,
  AppWindow,
  Globe,
  Settings,
  HelpCircle,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Plus,
  Search,
  MoreHorizontal,
  Clock,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { listProjects, createProject, deleteProject, type ProjectRecord } from "@/lib/projects";

/* ===== Types ===== */
type PromptTab = "app" | "design";

/* ===== Sidebar Nav Items ===== */
const NAV_ITEMS = [
  { icon: Home, label: "Home", id: "home" as const },
  { icon: AppWindow, label: "My Apps", id: "apps" as const },
  { icon: Globe, label: "Published", id: "published" as const },
];

const BOTTOM_NAV = [
  { icon: HelpCircle, label: "Help" },
  { icon: Settings, label: "Settings" },
];

/* ===== Prompt Templates ===== */
const TEMPLATES = [
  "Build a landing page with hero section",
  "Create a todo app with local storage",
  "Make a personal portfolio site",
  "Build a weather dashboard",
];

/* ===== Time formatting ===== */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

interface ReplitAppProps {
  onStartProject: (prompt: string, projectSlug: string) => void;
  onOpenProject: (projectSlug?: string) => void;
  currentView: "dashboard";
}

export default function ReplitApp({ onStartProject, onOpenProject }: ReplitAppProps) {
  const [activeNav, setActiveNav] = useState<"home" | "apps" | "published">("home");
  const [promptTab, setPromptTab] = useState<PromptTab>("app");
  const [promptText, setPromptText] = useState("");
  const [buildType, setBuildType] = useState("Web app");
  const [showBuildDropdown, setShowBuildDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  /* ===== Load projects from Supabase ===== */
  useEffect(() => {
    listProjects().then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  /* ===== Create project + start IDE ===== */
  const handleSubmit = useCallback(async () => {
    if (!promptText.trim() || creating) return;
    setCreating(true);

    const name = promptText.trim().slice(0, 60);
    const record = await createProject({
      name,
      description: `${buildType} — ${promptTab}`,
      prompt: promptText.trim(),
    });

    setCreating(false);

    if (record) {
      onStartProject(promptText.trim(), record.slug);
    } else {
      // Fallback: open IDE without Supabase record
      onStartProject(promptText.trim(), `local-${Date.now().toString(36)}`);
    }
  }, [promptText, creating, buildType, promptTab, onStartProject]);

  /* ===== Open existing project ===== */
  const handleOpenExisting = useCallback(
    (slug: string) => {
      onOpenProject(slug);
    },
    [onOpenProject],
  );

  /* ===== New blank project ===== */
  const handleNewBlank = useCallback(async () => {
    setCreating(true);
    const record = await createProject({ name: "Untitled App" });
    setCreating(false);
    if (record) {
      onOpenProject(record.slug);
    } else {
      onOpenProject(`local-${Date.now().toString(36)}`);
    }
  }, [onOpenProject]);

  /* ===== Delete project ===== */
  const handleDelete = useCallback(async (slug: string) => {
    setMenuOpen(null);
    await deleteProject(slug);
    setProjects((prev) => prev.filter((p) => p.slug !== slug));
  }, []);

  const filteredProjects = projects.filter(
    (p) =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const publishedProjects = projects.filter((p) => p.deployed_url);

  return (
    <div className="flex h-screen bg-[#F9F9F7] text-[#1D2433]">
      {/* ===== Left Sidebar (48px) — hidden on mobile ===== */}
      <div className="hidden md:flex w-12 bg-white flex-col items-center py-3 border-r border-[#E4E4E0] shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0079f2] to-[#00c2ff] flex items-center justify-center mb-6">
          <Sparkles size={14} className="text-white" />
        </div>

        <div className="flex flex-col items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`group relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-[#E8F2FF] text-[#0079F2]"
                    : "text-[#5F6B7A] hover:text-[#1D2433] hover:bg-[#F0F0ED]"
                }`}
                aria-label={item.label}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                <span className="absolute left-full ml-2 px-2 py-1 bg-[#1D2433] text-xs text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className="group relative w-9 h-9 rounded-lg flex items-center justify-center text-[#5F6B7A] hover:text-[#1D2433] hover:bg-[#F0F0ED] transition-all"
                aria-label={item.label}
              >
                <Icon size={18} strokeWidth={1.5} />
                <span className="absolute left-full ml-2 px-2 py-1 bg-[#1D2433] text-xs text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {activeNav === "home" && (
          <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-8 sm:pt-16 pb-12">
            <h1 className="text-[22px] sm:text-[28px] font-semibold text-[#1D2433] mb-6 sm:mb-8">
              Hi, what do you want to make?
            </h1>

            {/* Prompt Box */}
            <div className="bg-white rounded-2xl border border-[#E4E4E0] overflow-hidden shadow-sm">
              <div className="flex border-b border-[#E4E4E0]">
                {(["app", "design"] as PromptTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPromptTab(tab)}
                    className={`px-5 py-3 text-[13px] font-medium capitalize transition-colors relative ${
                      promptTab === tab
                        ? "text-[#1D2433]"
                        : "text-[#5F6B7A] hover:text-[#1D2433]"
                    }`}
                  >
                    {tab === "app" ? "App" : "Design"}
                    {promptTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0079F2]" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-4">
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    promptTab === "app"
                      ? "Describe your app idea... (e.g., 'Build a weather dashboard with search')"
                      : "Describe the design you want... (e.g., 'A modern dark-themed landing page')"
                  }
                  className="w-full bg-transparent text-[14px] text-[#1D2433] placeholder-[#9DA5B0] resize-none outline-none min-h-[80px] leading-relaxed"
                  rows={3}
                />

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E4E4E0]">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowBuildDropdown(!showBuildDropdown)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F3] text-[13px] text-[#5F6B7A] rounded-lg hover:bg-[#F0F0ED] transition-colors"
                      >
                        <Globe size={13} />
                        {buildType}
                        <ChevronDown size={12} />
                      </button>
                      {showBuildDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-[#E4E4E0] rounded-xl shadow-lg z-50 py-1 min-w-[140px]">
                          {["Web app", "API server", "Static site", "Full-stack"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setBuildType(opt);
                                setShowBuildDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors ${
                                buildType === opt
                                  ? "bg-[#0079F2]/10 text-[#0079F2]"
                                  : "text-[#5F6B7A] hover:bg-[#F5F5F3]"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F3] text-[13px] text-[#5F6B7A] rounded-lg hover:bg-[#F0F0ED] transition-colors"
                    >
                      <Sparkles size={13} />
                      Auto
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!promptText.trim() || creating}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0079F2] text-white text-[13px] font-semibold rounded-xl hover:bg-[#0066CC] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    {creating ? (
                      <><Loader2 size={14} className="animate-spin" /> Creating...</>
                    ) : (
                      <>Start <ArrowRight size={14} /></>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="flex flex-wrap gap-2 mt-4">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setPromptText(tpl)}
                  className="px-3 py-1.5 bg-white border border-[#E4E4E0] text-[12px] text-[#5F6B7A] rounded-full hover:text-[#1D2433] hover:border-[#C8C8C4] transition-colors"
                >
                  {tpl}
                </button>
              ))}
            </div>

            {/* Recent Projects */}
            <div className="mt-8 sm:mt-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-[15px] font-semibold text-[#1D2433]">Recent Apps</h2>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9DA5B0]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search apps..."
                      className="pl-8 pr-3 py-1.5 bg-white border border-[#E4E4E0] text-[12px] text-[#1D2433] placeholder-[#9DA5B0] rounded-xl outline-none focus:border-[#0079F2] transition-colors w-full sm:w-[180px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleNewBlank}
                    disabled={creating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0079F2] text-white text-[12px] font-medium rounded-xl hover:bg-[#0066CC] disabled:opacity-50 transition-colors shrink-0"
                  >
                    <Plus size={13} />
                    New App
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-[#5F6B7A]" />
                  <span className="ml-2 text-[13px] text-[#5F6B7A]">Loading projects...</span>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <AppWindow size={40} className="text-[#E4E4E0] mx-auto mb-3" />
                  <p className="text-[13px] text-[#5F6B7A]">
                    {searchQuery ? "No matching apps found" : "No apps yet — create one above!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#F5F5F3] transition-colors group"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenExisting(project.slug)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#F0F0ED] flex items-center justify-center shrink-0">
                          <AppWindow size={16} className="text-[#5F6B7A]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-[#1D2433] truncate">
                            {project.name}
                          </div>
                          <div className="text-[11px] text-[#5F6B7A] truncate">
                            {project.description || project.prompt?.slice(0, 60) || "No description"}
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        {project.deployed_url && (
                          <a
                            href={project.deployed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-[#00B894] hover:bg-[#00B894]/10 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title="View deployed site"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <span className="text-[11px] text-[#9DA5B0] flex items-center gap-1">
                          <Clock size={11} />
                          {timeAgo(project.updated_at)}
                        </span>
                        <div className="relative">
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#E4E4E0] text-[#5F6B7A] transition-all"
                            onClick={() => setMenuOpen(menuOpen === project.slug ? null : project.slug)}
                            aria-label="More options"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {menuOpen === project.slug && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-[#E4E4E0] rounded-xl shadow-lg z-50 py-1 min-w-[120px]">
                              <button
                                type="button"
                                onClick={() => handleDelete(project.slug)}
                                className="w-full text-left px-3 py-1.5 text-[12px] text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeNav === "apps" && (
          <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-8 sm:pt-16 pb-12">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-[22px] font-semibold text-[#1D2433]">My Apps</h1>
              <button
                type="button"
                onClick={handleNewBlank}
                disabled={creating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0079F2] text-white text-[12px] font-medium rounded-xl hover:bg-[#0066CC] disabled:opacity-50 transition-colors"
              >
                <Plus size={13} />
                New App
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-[#5F6B7A]" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-16">
                <AppWindow size={48} className="text-[#E4E4E0] mx-auto mb-4" />
                <p className="text-[14px] text-[#5F6B7A] mb-2">No apps yet</p>
                <p className="text-[12px] text-[#9DA5B0]">Create your first app from the Home screen</p>
              </div>
            ) : (
              <div className="space-y-1">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleOpenExisting(project.slug)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#F5F5F3] transition-colors group text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#F0F0ED] flex items-center justify-center shrink-0">
                      <AppWindow size={16} className="text-[#5F6B7A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#1D2433] truncate">{project.name}</div>
                      <div className="text-[11px] text-[#5F6B7A]">{project.description || "No description"}</div>
                    </div>
                    <span className="text-[11px] text-[#9DA5B0]">{timeAgo(project.updated_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeNav === "published" && (
          <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-8 sm:pt-16 pb-12">
            <h1 className="text-[22px] font-semibold text-[#1D2433] mb-6">Published Apps</h1>
            {publishedProjects.length === 0 ? (
              <div className="text-center py-16">
                <Globe size={48} className="text-[#E4E4E0] mx-auto mb-4" />
                <p className="text-[14px] text-[#5F6B7A] mb-2">No published apps yet</p>
                <p className="text-[12px] text-[#9DA5B0]">Deploy your first app to see it here</p>
              </div>
            ) : (
              <div className="space-y-1">
                {publishedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#F5F5F3] transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenExisting(project.slug)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#00B894]/10 flex items-center justify-center shrink-0">
                        <Globe size={16} className="text-[#00B894]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#1D2433] truncate">{project.name}</div>
                        <div className="text-[11px] text-[#00B894] truncate">{project.deployed_url}</div>
                      </div>
                    </button>
                    <a
                      href={project.deployed_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-[12px] text-[#00B894] bg-[#00B894]/10 rounded-lg hover:bg-[#00B894]/15 transition-colors flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Visit
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Mobile Bottom Navigation ===== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E4E4E0] flex items-center justify-around py-2 z-50">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveNav(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? "text-[#0079F2]" : "text-[#5F6B7A]"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
