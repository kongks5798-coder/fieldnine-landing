"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { hero, stats } from "@/data/content";
import CodeEditor from "./CodeEditor";

export default function HeroSection() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-100/40 via-transparent to-purple-100/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 w-full">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div
            className={`mb-8 transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fn-black/5 text-sm text-fn-gray-600">
              <span className="w-2 h-2 rounded-full bg-fn-green animate-pulse" />
              {hero.badge}
            </span>
          </div>

          {/* Headline */}
          <h1
            className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] text-fn-black whitespace-pre-line transition-all duration-1000 delay-200 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {hero.headline}
          </h1>

          {/* Subheadline */}
          <p
            className={`mt-8 max-w-2xl text-lg sm:text-xl text-fn-gray-500 leading-relaxed transition-all duration-1000 delay-500 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {hero.subheadline}
          </p>

          {/* CTAs */}
          <div
            className={`mt-10 flex flex-col sm:flex-row items-center gap-4 transition-all duration-1000 delay-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <a
              href="/ide"
              className="group flex items-center gap-2 bg-fn-black text-white px-8 py-4 rounded-full text-base font-medium hover:bg-fn-gray-600 transition-all duration-300 hover:shadow-lg hover:shadow-fn-black/20"
            >
              {hero.cta_primary}
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
            <a
              href="#demo"
              className="group flex items-center gap-2 text-fn-gray-600 px-8 py-4 rounded-full text-base font-medium border border-fn-gray-200 hover:border-fn-gray-300 hover:bg-white/50 transition-all duration-300"
            >
              <Play size={16} className="text-fn-blue" />
              {hero.cta_secondary}
            </a>
          </div>
        </div>

        {/* Code Editor Preview */}
        <div
          className={`mt-16 md:mt-20 transition-all duration-1000 delay-1000 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <CodeEditor />
        </div>

        {/* Stats */}
        <div
          className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 transition-all duration-1000 delay-[1200ms] ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-fn-black">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-fn-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
