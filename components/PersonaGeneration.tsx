"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  userId: string;
  roleInsightId: string;
  insights: any;
  onBack: () => void;
}

export function PersonaGeneration({ userId, roleInsightId, insights, onBack }: Props) {
  const [format, setFormat] = useState<"both" | "chatgpt" | "claude">("both");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          role_insight_id: roleInsightId,
          format,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setGenerated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!generated) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Step 3: Generate Persona</h2>
        
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Choose Output Format:</h3>
          <div className="grid grid-cols-3 gap-4">
            <FormatCard
              title="Both Formats"
              description="Get ChatGPT & Claude instructions"
              selected={format === "both"}
              onClick={() => setFormat("both")}
            />
            <FormatCard
              title="ChatGPT Only"
              description="Custom Instructions format"
              selected={format === "chatgpt"}
              onClick={() => setFormat("chatgpt")}
            />
            <FormatCard
              title="Claude Only"
              description="Command Suite format"
              selected={format === "claude"}
              onClick={() => setFormat("claude")}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={isGenerating}>
            Back
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1">
            {isGenerating ? "Generating..." : "Generate Persona Instructions"}
          </Button>
        </div>
      </Card>
    );
  }

  const chatgptSteps = [
    "Go to ChatGPT (https://chat.openai.com)",
    "Click your profile icon (bottom left)",
    "Select \"Settings\"",
    "Navigate to \"Personalization\"",
    "Scroll to \"Custom Instructions\"",
    "Copy ALL text above this line",
    "Paste into the \"How would you like ChatGPT to respond?\" field",
    "Click \"Save\"",
  ];

  const topResponsibilities: string[] = (insights.core_responsibilities ?? []).filter(Boolean).slice(0, 3);
  const usageBestFor = topResponsibilities.length
    ? topResponsibilities
    : [
        "Summarizing key responsibilities",
        "Prioritizing competing initiatives",
        "Drafting stakeholder communications",
      ];

  const examplePrompts = [
    `\"Review this [document/code/strategy] for a ${insights.role_title}\"`,
    `\"Help me prioritize these [tasks/features/initiatives]\"`,
    `\"Draft a [email/spec/report] about [topic]\"`,
    `\"What's the best approach to [specific ${insights.role_title} challenge]?\"`,
  ];

  if ((insights.tools_technologies ?? []).length > 0) {
    examplePrompts.push(`\"Help me with [tool: ${insights.tools_technologies[0]}] workflow\"`);
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">✨ Your Persona is Ready!</h2>
      
      <div className="mb-4 p-4 bg-green-50 rounded">
        <p className="font-semibold text-green-800">
          Generated: {insights.role_title} Assistant
        </p>
      </div>

      <Tabs defaultValue={generated.chatgpt_instructions ? "chatgpt" : "claude"}>
        <TabsList className="grid w-full grid-cols-2">
          {generated.chatgpt_instructions && (
            <TabsTrigger value="chatgpt">ChatGPT Instructions</TabsTrigger>
          )}
          {generated.claude_commands && (
            <TabsTrigger value="claude">Claude Commands</TabsTrigger>
          )}
        </TabsList>
        
        {generated.chatgpt_instructions && (
          <TabsContent value="chatgpt">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {generated.chatgpt_instructions}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleCopy(generated.chatgpt_instructions)}>
                  📋 Copy to Clipboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleDownload(
                    generated.chatgpt_instructions,
                    `${insights.role_title.replace(/\s+/g, '-').toLowerCase()}-chatgpt.md`
                  )}
                >
                  ⬇️ Download
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
        
        {generated.claude_commands && (
          <TabsContent value="claude">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {generated.claude_commands}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleCopy(generated.claude_commands)}>
                  📋 Copy to Clipboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleDownload(
                    generated.claude_commands,
                    `${insights.role_title.replace(/\s+/g, '-').toLowerCase()}-claude.md`
                  )}
                >
                  ⬇️ Download
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <div className="mt-6 p-4 bg-blue-50 rounded space-y-4 text-sm text-gray-700">
        <div>
          <h4 className="font-semibold mb-2">ChatGPT Setup</h4>
          <ol className="list-decimal list-inside space-y-1">
            {chatgptSteps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>

        <div>
          <h4 className="font-semibold mb-1">Usage Tips</h4>
          <p className="font-medium">Best For:</p>
          <ul className="list-disc list-inside space-y-1 mb-2">
            {usageBestFor.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

          <p className="font-medium">Example Prompts to Try:</p>
          <ul className="list-disc list-inside space-y-1 mb-2">
            {examplePrompts.map((prompt, index) => (
              <li key={index}>{prompt}</li>
            ))}
          </ul>

          <p className="italic">Note: These instructions work best when you provide context about your specific situation, constraints, and goals.</p>
        </div>

        <div>
          <h4 className="font-semibold mb-1">Claude Setup</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Create a Claude Project</li>
            <li>Add this file to Project Knowledge</li>
          </ul>
        </div>
      </div>

      <Button variant="outline" onClick={() => window.location.reload()} className="mt-4 w-full">
        ✨ Create Another Persona
      </Button>
    </Card>
  );
}

function FormatCard({ 
  title, 
  description, 
  selected, 
  onClick 
}: { 
  title: string; 
  description: string; 
  selected: boolean; 
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 border-2 rounded cursor-pointer transition ${
        selected ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}