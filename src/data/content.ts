// Field Nine AI Super App - Landing Page Content

export interface Feature {
  icon: string;
  title: string;
  description: string;
  detail: string;
}

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  avatar: string;
}

export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

export interface DeployStep {
  label: string;
  status: string;
  duration: string;
}

export const hero = {
  headline: "생각하세요.\n코딩은 AI가.\n배포는 원클릭.",
  subheadline:
    "Cursor + Replit + Claude를 합친 올인원 AI IDE. 한국어로 코딩하는 가장 좋은 방법. 7개 프레임워크, 10개 한국 서비스 SDK, 플러그인 마켓까지.",
  cta_primary: "무료로 시작하기",
  cta_secondary: "라이브 데모 보기",
  badge: "Field Nine OS — 한국어 개발 AI 1등",
};

export const stats = [
  { value: "6,799+", label: "줄의 코드" },
  { value: "10+", label: "한국 서비스 SDK" },
  { value: "7", label: "프레임워크 지원" },
  { value: "∞", label: "가능성" },
];

export const features: Feature[] = [
  {
    icon: "Sparkles",
    title: "AI 코드 생성 & 페어 프로그래밍",
    description: "말로 설명하면, AI가 코드를 씁니다.",
    detail:
      "GPT-4, Claude, Gemini 등 멀티모델 AI가 실시간으로 코드를 생성합니다. Ghost Text 자동완성, 인라인 편집(Cmd+K), 버그 자동 감지, AI 페어 프로그래머까지.",
  },
  {
    icon: "Rocket",
    title: "원클릭 배포 & 커스텀 도메인",
    description: "Vercel 배포 + 커스텀 도메인 + SSL까지 한 번에.",
    detail:
      "버튼 하나로 Vercel에 배포하고, 커스텀 도메인 연결, SSL 인증서 자동 발급, DNS 전파 상태 실시간 확인까지.",
  },
  {
    icon: "Layout",
    title: "VS Code급 IDE 경험",
    description: "운영체제처럼 모든 걸 한 화면에서.",
    detail:
      "Monaco 에디터, 멀티탭 터미널, Git 패널(브랜치/커밋/푸시), 파일 탐색기(우클릭/드래그앤드롭), 커맨드 팔레트, 키보드 단축키 지원.",
  },
  {
    icon: "Globe",
    title: "한국 서비스 SDK 원클릭 연동",
    description: "카카오, 네이버, 토스 — 클릭 한 번이면 끝.",
    detail:
      "카카오 로그인/지도/공유, 네이버 로그인/지도, 토스 페이먼츠, 채널톡, GA4 등 10개 한국 서비스를 원클릭으로 연동.",
  },
  {
    icon: "Users",
    title: "팀 협업 & 실시간 공유",
    description: "혼자 만들고, 함께 성장하세요.",
    detail:
      "팀 워크스페이스, 실시간 편집 상태 표시, 활동 피드, 팀 채팅, 권한 관리까지. 프로젝트 공유 링크로 즉시 협업.",
  },
  {
    icon: "Puzzle",
    title: "플러그인 마켓플레이스",
    description: "필요한 기능을 골라 설치하세요.",
    detail:
      "AI, UI, 데이터, 배포, 소셜 등 6개 카테고리의 플러그인을 검색하고 원클릭 설치. MCP 프로토콜 기반 확장.",
  },
  {
    icon: "Heart",
    title: "커뮤니티 & 바운티",
    description: "다른 개발자의 프로젝트를 포크하고 리믹스하세요.",
    detail:
      "커뮤니티 허브에서 인기 프로젝트 탐색, 포크/좋아요, 바운티 프로그램으로 보상받는 오픈소스 기여.",
  },
  {
    icon: "Smartphone",
    title: "모바일 IDE",
    description: "스마트폰에서도 코딩하세요.",
    detail:
      "모바일 최적화 레이아웃, 터치 친화 툴바, 코드 스니펫 빠른 삽입, 스와이프로 에디터↔미리보기 전환.",
  },
  {
    icon: "Zap",
    title: "7개 프레임워크 지원",
    description: "Vanilla, React, Vue, Tailwind, Three.js, Next.js, Svelte",
    detail:
      "프로젝트 생성 시 프레임워크를 선택하면 최적화된 템플릿과 AI 프롬프트가 자동 적용됩니다.",
  },
];

export const codeLines = [
  { indent: 0, text: 'import { useState } from "react";', color: "keyword" },
  { indent: 0, text: 'import { Button } from "@fieldnine/ui";', color: "keyword" },
  { indent: 0, text: "", color: "default" },
  { indent: 0, text: "export default function Dashboard() {", color: "function" },
  { indent: 1, text: "const [projects, setProjects] = useState([]);", color: "variable" },
  { indent: 1, text: "const [isDeploying, setIsDeploying] = useState(false);", color: "variable" },
  { indent: 0, text: "", color: "default" },
  { indent: 1, text: "const handleDeploy = async (projectId: string) => {", color: "function" },
  { indent: 2, text: "setIsDeploying(true);", color: "default" },
  { indent: 2, text: 'await fetch("/api/deploy", {', color: "string" },
  { indent: 3, text: 'method: "POST",', color: "string" },
  { indent: 3, text: "body: JSON.stringify({ projectId }),", color: "default" },
  { indent: 2, text: "});", color: "default" },
  { indent: 2, text: "setIsDeploying(false);", color: "default" },
  { indent: 1, text: "};", color: "default" },
  { indent: 0, text: "", color: "default" },
  { indent: 1, text: "return (", color: "keyword" },
  { indent: 2, text: '<div className="grid grid-cols-3 gap-6">', color: "jsx" },
  { indent: 3, text: "{projects.map((project) => (", color: "default" },
  { indent: 4, text: "<ProjectCard", color: "jsx" },
  { indent: 5, text: "key={project.id}", color: "default" },
  { indent: 5, text: "onDeploy={() => handleDeploy(project.id)}", color: "default" },
  { indent: 5, text: 'status={isDeploying ? "배포 중..." : "준비 완료"}', color: "string" },
  { indent: 4, text: "/>", color: "jsx" },
  { indent: 3, text: "))}", color: "default" },
  { indent: 2, text: "</div>", color: "jsx" },
  { indent: 1, text: ");", color: "default" },
  { indent: 0, text: "}", color: "function" },
];

export const deploySteps: DeployStep[] = [
  { label: "코드 분석", status: "완료", duration: "0.3s" },
  { label: "AI 코드 생성", status: "완료", duration: "1.2s" },
  { label: "테스트 실행", status: "완료", duration: "0.8s" },
  { label: "빌드 최적화", status: "완료", duration: "2.1s" },
  { label: "글로벌 배포", status: "진행 중", duration: "..." },
];

export const testimonials: Testimonial[] = [
  {
    name: "김서진",
    role: "풀스택 개발자",
    company: "네이버",
    quote:
      "사이드 프로젝트를 주말에 시작해서 주말에 끝냈습니다. 예전이라면 한 달은 걸렸을 일이에요.",
    avatar: "SJ",
  },
  {
    name: "박현우",
    role: "스타트업 CTO",
    company: "토스랩",
    quote:
      "MVP를 3일 만에 만들었습니다. 투자자 미팅 전날 피칭 데모를 뚝딱 완성했어요.",
    avatar: "HW",
  },
  {
    name: "이지은",
    role: "프론트엔드 리드",
    company: "카카오",
    quote:
      "AI가 보일러플레이트를 처리하니, 저는 진짜 중요한 비즈니스 로직에만 집중할 수 있었습니다.",
    avatar: "JE",
  },
];

export const pricing: PricingTier[] = [
  {
    name: "Starter",
    price: "₩0",
    period: "영원히 무료",
    description: "개인 프로젝트와 학습용",
    features: [
      "AI 코드 생성 월 100회",
      "프로젝트 3개",
      "기본 배포 (공유 서버)",
      "커뮤니티 지원",
      "7개 프레임워크 지원",
    ],
    cta: "무료로 시작하기",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "₩29,000",
    period: "월",
    description: "프로 개발자와 소규모 팀",
    features: [
      "AI 코드 생성 무제한",
      "프로젝트 무제한",
      "전용 서버 배포",
      "커스텀 도메인 + SSL",
      "한국 서비스 SDK 전체",
      "팀 협업 (5인)",
      "플러그인 마켓 접근",
      "우선 지원",
    ],
    cta: "Pro 시작하기",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "문의",
    period: "",
    description: "대규모 팀과 기업",
    features: [
      "Pro의 모든 기능",
      "전용 인프라",
      "SSO / SAML",
      "SLA 보장",
      "전담 매니저",
      "온프레미스 옵션",
      "커스텀 플러그인 개발",
    ],
    cta: "영업팀 문의",
    highlighted: false,
  },
];

export const footerLinks = {
  product: [
    { label: "기능", href: "#features" },
    { label: "가격", href: "#pricing" },
    { label: "데모", href: "/ide" },
    { label: "변경 로그", href: "#" },
  ],
  developers: [
    { label: "문서", href: "#" },
    { label: "API 레퍼런스", href: "#" },
    { label: "커뮤니티", href: "#" },
    { label: "블로그", href: "#" },
  ],
  company: [
    { label: "소개", href: "#" },
    { label: "채용", href: "#" },
    { label: "이용약관", href: "#" },
    { label: "개인정보처리방침", href: "#" },
  ],
};
