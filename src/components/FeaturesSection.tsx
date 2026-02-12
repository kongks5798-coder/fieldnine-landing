"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Rocket, Layout, Globe, Users, Puzzle, Heart, Smartphone, Zap } from "lucide-react";
import { features } from "@/data/content";

const iconMap: Record<string, React.ElementType> = {
  Sparkles,
  Rocket,
  Layout,
  Globe,
  Users,
  Puzzle,
  Heart,
  Smartphone,
  Zap,
};

export default function FeaturesSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="py-32 relative" ref={ref}>
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div
          className={`text-center max-w-3xl mx-auto transition-all duration-800 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-sm font-medium text-fn-blue uppercase tracking-widest">
            Features
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-fn-black">
            개발의 모든 것,{" "}
            <span className="bg-gradient-to-r from-fn-blue to-purple-500 bg-clip-text text-transparent">
              하나의 플랫폼에서
            </span>
          </h2>
          <p className="mt-6 text-lg text-fn-gray-500">
            복잡한 도구를 오가는 시간은 끝났습니다. 아이디어부터 배포까지, 모든
            여정을 함께합니다.
          </p>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            return (
              <div
                key={feature.title}
                className={`group relative p-8 rounded-3xl border border-fn-gray-200 bg-white/60 hover:bg-white hover:shadow-xl hover:shadow-fn-black/5 transition-all duration-500 ${
                  visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-12"
                }`}
                style={{ transitionDelay: `${300 + i * 150}ms` }}
              >
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-fn-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {Icon && <Icon size={24} className="text-white" />}
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-fn-black">
                  {feature.title}
                </h3>
                <p className="mt-2 text-fn-gray-500 font-medium">
                  {feature.description}
                </p>
                <p className="mt-4 text-sm text-fn-gray-400 leading-relaxed">
                  {feature.detail}
                </p>

                {/* Hover accent line */}
                <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-fn-blue to-purple-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-full" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
