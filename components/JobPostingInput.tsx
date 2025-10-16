"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  userId: string;
  onSuccess: (jobPostingId: string) => void;
}

export function JobPostingInput({ userId, onSuccess }: Props) {
  const [inputType, setInputType] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          source_type: inputType,
          content: inputType === "text" ? text : undefined,
          url: inputType === "url" ? url : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ingestion failed");
      }

      onSuccess(data.job_posting_id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Step 1: Add Job Posting</h2>
      
      <Tabs value={inputType} onValueChange={(v) => setInputType(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text">Paste Text</TabsTrigger>
          <TabsTrigger value="url">From URL</TabsTrigger>
        </TabsList>
        
        <TabsContent value="text" className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the complete job posting here..."
            className="min-h-[300px]"
            disabled={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="url" className="space-y-4">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://linkedin.com/jobs/..."
            disabled={isLoading}
          />
          <p className="text-sm text-gray-600">
            Supported: LinkedIn, Indeed, company career pages
          </p>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isLoading || (inputType === "text" && !text.trim()) || (inputType === "url" && !url.trim())}
        className="mt-4 w-full"
      >
        {isLoading ? "Processing..." : "Analyze Job Posting"}
      </Button>
    </Card>
  );
}