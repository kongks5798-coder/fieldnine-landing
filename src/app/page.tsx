"use client";
import { useState, useEffect } from "react";
import SkeletonCard from "@/components/ui/SkeletonCard";

// 임시 데이터 타입 정의
type Project = {
  id: string;
  title: string;
  desc: string;
};

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // API 호출 시뮬레이션 (실제 API 연동 시 교체)
    const fetchData = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 800)); // 로딩 느낌 연출
        // setProjects([...]); // 데이터가 있으면 여기에 세팅
        setIsLoading(false);
      } catch {
        setError(true);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <section className="flex flex-col gap-12">
      {/* Hero Section: Boss의 질문을 더 정중하고 명확하게 */}
      <div className="text-center space-y-4 py-10">
        <h1 className="text-5xl font-bold tracking-tight text-field-black">
          What will you build, Boss?
        </h1>
        <p className="text-field-gray text-lg">
          Select a project to verify business feasibility.
        </p>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Case 1: Loading State */}
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {/* Case 2: Empty State (데이터가 없을 때) */}
        {!isLoading && !error && projects.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-black/10 rounded-2xl">
            <p className="text-field-black font-medium mb-2">No active projects.</p>
            <button className="px-6 py-3 bg-field-black text-white rounded-lg hover:bg-black/80 transition-all font-medium text-sm">
              + Initialize First Project
            </button>
          </div>
        )}

        {/* Case 3: Error State */}
        {error && (
          <div className="col-span-full text-center text-red-500 py-10">
            System Alert: Failed to load project data. Please check the connection.
          </div>
        )}
      </div>
    </section>
  );
}
