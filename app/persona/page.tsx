"use client";

import { useState } from "react";
import { JobPostingInput } from "@/components/JobPostingInput";
import { InsightsReview } from "@/components/InsightsReview";
import { PersonaGeneration } from "@/components/PersonaGeneration";

type Step = "input" | "review" | "generate";

export default function PersonaBuilder() {
  const [step, setStep] = useState<Step>("input");
  const [userId] = useState(() => `user_${Date.now()}`); // Temporary user ID
  const [jobPostingId, setJobPostingId] = useState<string | null>(null);
  const [roleInsightId, setRoleInsightId] = useState<string | null>(null);
  const [insights, setInsights] = useState<any>(null);

  return (
    <main className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-4xl font-bold text-center mb-8">
        AI Persona Builder
      </h1>
      
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          <Step number={1} label="Input" active={step === "input"} />
          <div className="w-12 h-1 bg-gray-300" />
          <Step number={2} label="Review" active={step === "review"} />
          <div className="w-12 h-1 bg-gray-300" />
          <Step number={3} label="Generate" active={step === "generate"} />
        </div>
      </div>

      {step === "input" && (
        <JobPostingInput
          userId={userId}
          onSuccess={(jobId) => {
            setJobPostingId(jobId);
            setStep("review");
          }}
        />
      )}

      {step === "review" && jobPostingId && (
        <InsightsReview
          userId={userId}
          jobPostingId={jobPostingId}
          onSuccess={(insightId, extractedInsights) => {
            setRoleInsightId(insightId);
            setInsights(extractedInsights);
            setStep("generate");
          }}
          onBack={() => setStep("input")}
        />
      )}

      {step === "generate" && roleInsightId && insights && (
        <PersonaGeneration
          userId={userId}
          roleInsightId={roleInsightId}
          insights={insights}
          onBack={() => setStep("review")}
        />
      )}
    </main>
  );
}

function Step({ number, label, active }: { number: number; label: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
          active ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
        }`}
      >
        {number}
      </div>
      <span className="text-sm mt-2">{label}</span>
    </div>
  );
}