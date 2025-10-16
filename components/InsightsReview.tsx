"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  userId: string;
  jobPostingId: string;
  onSuccess: (roleInsightId: string, insights: any) => void;
  onBack: () => void;
}

export function InsightsReview({ userId, jobPostingId, onSuccess, onBack }: Props) {
  const [isExtracting, setIsExtracting] = useState(true);
  const [insights, setInsights] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [roleInsightId, setRoleInsightId] = useState<string | null>(null);

  useEffect(() => {
    extractInsights();
  }, []);

  const extractInsights = async () => {
    setIsExtracting(true);
    setError(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          job_posting_ids: [jobPostingId],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      setRoleInsightId(data.role_insight_id ?? null);
      setInsights(data.insights);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsExtracting(false);
    }
  };

  if (isExtracting) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Analyzing Job Posting...</h3>
          <p className="text-gray-600 mt-2">
            Our AI agent is extracting role insights (this may take 30-60 seconds)
          </p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="py-12">
          <div className="text-red-600 text-center mb-4 text-4xl">⚠️</div>
          <h3 className="text-lg font-semibold text-center mb-2">Extraction Error</h3>
          <p className="text-gray-600 text-center mb-4">
            {typeof error === "string" ? error : error?.error || "Extraction failed"}
          </p>

          <details className="mt-4 p-4 bg-gray-50 rounded text-sm">
            <summary className="cursor-pointer font-medium">Debug Info</summary>
            <pre className="mt-2 overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          </details>

          <div className="flex gap-2 justify-center mt-6">
            <Button onClick={extractInsights}>Retry Extraction</Button>
            <Button variant="outline" onClick={onBack}>Go Back</Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Step 2: Review Extracted Insights</h2>
      
      <div className="space-y-6">
        <Section title="Role Information">
          <InfoItem label="Title" value={insights.role_title} />
          <InfoItem label="Level" value={insights.seniority_level} />
          <InfoItem label="Industry" value={insights.industry_context} />
        </Section>

        <Section title={`Core Responsibilities (${insights.core_responsibilities?.length || 0})`}>
          <ul className="list-disc list-inside space-y-1">
            {insights.core_responsibilities?.map((r: string, i: number) => (
              <li key={i} className="text-gray-700">{r}</li>
            ))}
          </ul>
        </Section>

        <Section title="Required Skills">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Technical Skills:</h4>
              <ul className="list-disc list-inside">
                {insights.required_skills?.technical?.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700">{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Soft Skills:</h4>
              <ul className="list-disc list-inside">
                {insights.required_skills?.soft_skills?.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700">{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section title={`Tools & Technologies (${insights.tools_technologies?.length || 0})`}>
          <div className="flex flex-wrap gap-2">
            {insights.tools_technologies?.map((t: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {t}
              </span>
            ))}
          </div>
        </Section>

        <Section title="What Employers Value">
          <ul className="list-disc list-inside space-y-1">
            {insights.hiring_signals?.map((s: string, i: number) => (
              <li key={i} className="text-gray-700">{s}</li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="flex gap-2 mt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={() => roleInsightId && onSuccess(roleInsightId, insights)}
          disabled={!roleInsightId}
          className="flex-1"
        >
          Continue to Generate Persona →
        </Button>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-blue-600 pl-4">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 mb-1">
      <span className="font-medium">{label}:</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}