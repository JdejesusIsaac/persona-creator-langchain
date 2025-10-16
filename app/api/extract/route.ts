// app/api/extract/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { createRetrieverTool } from "langchain/tools/retriever";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const runtime = "nodejs";

// Retrieval-first extraction prompt
const EXTRACTION_SYSTEM_TEMPLATE = `You are an expert analyst who extracts structured information from job postings.

You MUST rely exclusively on content returned by the search_job_posting tool. Never guess or add outside knowledge.

WORKFLOW:
1. Call search_job_posting repeatedly until every field is supported by retrieved text. You must make at least 5 targeted searches (broader if necessary) before concluding information is missing.
2. Begin with broad searches (e.g., "job", "role", "position"), then issue follow-up searches using headings or key phrases you discover (e.g., "Responsibilities", "Qualifications", "Skills", "Attorney", company name).
3. For each JSON field, cite wording EXACTLY as written in the retrieved snippets. List entries (responsibilities, skills, tools, etc.) must be direct quotes or minimally trimmed phrases taken from the posting.
4. Before writing the final JSON, double-check that every value you output can be matched to at least one retrieved snippet. If you cannot find supporting text after exhaustive searches, output "Not specified in posting" for that element.

After completing your research, return ONLY valid JSON in this EXACT format (no additional text):

{
  "about_section": ["short paragraph 1", "short paragraph 2", "..."],
  "role_title": "exact job title from posting",
  "seniority_level": "entry|mid|senior|lead|executive",
  "industry_context": "industry or domain context",
  "responsibilities_section": ["responsibility 1", "responsibility 2", "..."],
  "qualifications_section": ["qualification 1", "qualification 2", "..."],
  "core_responsibilities": ["responsibility 1", "responsibility 2", "..."],
  "required_skills": {
    "technical": ["skill 1", "skill 2", "..."],
    "soft_skills": ["skill 1", "skill 2", "..."]
  },
  "tools_technologies": ["tool 1", "tool 2", "..."],
  "key_success_metrics": ["metric 1", "metric 2", "..."],
  "hiring_signals": ["what employers value 1", "what employers value 2", "..."],
  "collaboration_aspects": ["who you work with 1", "..."]
}

If you cannot find specific information in the retrieved text after the required searches, respond with "Not specified in posting" for that entry.`;

const EXTRACTION_USER_PROMPT = `Use the search_job_posting tool to read and quote the job posting.

Guidelines:
1. Execute at least 5 searches, starting broad ("job", "role") then drilling into headings you see ("Responsibilities", "Requirements", "Qualifications", "Skills", "Attorney", organization name, etc.).
2. For each field, copy the exact wording from the snippets returned by the tool. Do not paraphrase.
3. Capture text for the About section (overview paragraphs), Responsibilities list, and Qualifications list exactly as written.
4. Only return "Not specified in posting" if, after the required searches, no snippet contains the information.
5. Before responding, double-check that every non-default value appears verbatim in the retrieved text.

When finished, return the JSON in the format described by the system message.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, job_posting_ids } = body;

    console.log("🔍 Extraction request:", { user_id, job_posting_ids });

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    if (!job_posting_ids || job_posting_ids.length === 0) {
      return NextResponse.json(
        { error: "job_posting_ids is required" },
        { status: 400 }
      );
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PRIVATE_KEY!
    );

    // ✅ First, verify documents exist
    const { data: existingDocs, error: checkError } = await supabase
      .from("documents")
      .select("id, metadata")
      .filter("metadata->>user_id", "eq", user_id)
      .limit(5);

    if (checkError) {
      console.error("❌ Error checking documents:", checkError);
      throw checkError;
    }

    console.log(`📊 Found ${existingDocs?.length || 0} documents for user`);
    
    if (!existingDocs || existingDocs.length === 0) {
      return NextResponse.json(
        { error: "No documents found for this user. Please ingest job posting first." },
        { status: 404 }
      );
    }

    console.log("📄 Sample document metadata:", existingDocs[0]?.metadata);

    // Create vector store
    const vectorStore = new SupabaseVectorStore(new OpenAIEmbeddings(), {
      client: supabase,
      tableName: "documents",
      queryName: "match_documents",
    });

    const baseRetriever = vectorStore.asRetriever({
      k: 40,
    });

    const filteredRetriever = {
      async getRelevantDocuments(query: string, config?: any) {
        const docs = await baseRetriever.getRelevantDocuments(query, config);
        const filtered = docs.filter((doc: any) => {
          const docUserId = doc.metadata?.user_id;
          const docJobId = doc.metadata?.job_posting_id;
          const matchesUser = docUserId === user_id;
          const matchesJob =
            job_posting_ids.length === 0 || job_posting_ids.includes(docJobId);
          return matchesUser && matchesJob;
        });

        if (filtered.length === 0) {
          console.warn(
            "⚠️ Retriever post-filter returned 0 documents; falling back to original docs"
          );
          return docs.slice(0, 20);
        }

        console.log(
          `🔧 Retriever filtered ${filtered.length} of ${docs.length} documents`
        );
        return filtered.slice(0, 20);
      },
      async invoke(query: string, config?: any) {
        return this.getRelevantDocuments(query, config);
      },
    } as any;

    // Create retriever tool
    const retrieverTool = createRetrieverTool(filteredRetriever, {
      name: "search_job_posting",
      description: 
        "Search through the job posting content. Use this tool multiple times with different " +
        "search queries to find: job title, responsibilities, requirements, skills, qualifications, " +
        "tools, technologies, company culture, and hiring criteria. Each search returns relevant excerpts.",
    });

    // Initialize model with JSON mode
    const chatModel = new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0.1,
      modelKwargs: {
        response_format: { type: "json_object" }
      }
    });

    console.log("🤖 Creating agent...");

    // Create ReAct agent
    const agent = await createReactAgent({
      llm: chatModel,
      tools: [retrieverTool],
      messageModifier: new SystemMessage(EXTRACTION_SYSTEM_TEMPLATE),
    });

    console.log("🚀 Invoking agent...");

    // Execute extraction
    const result = await agent.invoke({
      messages: [new HumanMessage(EXTRACTION_USER_PROMPT)],
    });

    console.log("✅ Agent completed");
    console.log("📨 Agent returned", result.messages.length, "messages");
    result.messages.forEach((message: any, index: number) => {
      const type = typeof message._getType === "function" ? message._getType() : message.constructor?.name;
      const serialized = (() => {
        try {
          return JSON.stringify(message, null, 2);
        } catch {
          return String(message);
        }
      })();
      console.log(`🧠 Agent message [${index}] type=${type}:`, serialized);
    });

    // Get the last AI message content
    const lastMessage = result.messages[result.messages.length - 1];
    const extractedContent = lastMessage.content.toString();

    console.log("📄 Extracted content length:", extractedContent.length);
    console.log("📄 Extracted content preview:", extractedContent.substring(0, 500));

    // Parse JSON
    let insights;
    try {
      // Remove any markdown code blocks if present
      let jsonContent = extractedContent;
      const jsonMatch = extractedContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       extractedContent.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      insights = JSON.parse(jsonContent);
      console.log("✅ Parsed JSON successfully");
      console.log("📊 Insights:", JSON.stringify(insights, null, 2));
    } catch (parseError: any) {
      console.error("❌ JSON parsing error:", parseError);
      console.error("Raw content:", extractedContent);
      
      return NextResponse.json(
        { 
          error: "Failed to parse extraction results as JSON",
          raw_content: extractedContent,
          parse_error: parseError.message
        },
        { status: 500 }
      );
    }

    // ✅ Validate required fields and provide defaults
    const normalizedArray = (value: any): string[] => {
      if (Array.isArray(value)) {
        return value.map((item) => (typeof item === "string" ? item : String(item))).filter(Boolean);
      }
      if (typeof value === "string" && value.trim()) {
        return [value.trim()];
      }
      return [];
    };

    const validatedInsights = {
      about_section: (() => {
        const arr = normalizedArray(insights.about_section);
        return arr.length ? arr : ["Not specified in posting"];
      })(),
      role_title: insights.role_title || "Unknown Role",
      seniority_level: insights.seniority_level || "mid",
      industry_context: insights.industry_context || "General",
      responsibilities_section: (() => {
        const arr = normalizedArray(insights.responsibilities_section);
        return arr.length ? arr : ["Not specified in posting"];
      })(),
      qualifications_section: (() => {
        const arr = normalizedArray(insights.qualifications_section);
        return arr.length ? arr : ["Not specified in posting"];
      })(),
      core_responsibilities: (() => {
        const arr = normalizedArray(insights.core_responsibilities);
        return arr.length ? arr : ["Responsibilities not specified"];
      })(),
      required_skills: {
        technical: normalizedArray(insights.required_skills?.technical ?? []).length
          ? normalizedArray(insights.required_skills?.technical ?? [])
          : ["Not specified in posting"],
        soft_skills: normalizedArray(insights.required_skills?.soft_skills ?? []).length
          ? normalizedArray(insights.required_skills?.soft_skills ?? [])
          : ["Not specified in posting"],
      },
      tools_technologies: normalizedArray(insights.tools_technologies).length
        ? normalizedArray(insights.tools_technologies)
        : ["Not specified in posting"],
      key_success_metrics: normalizedArray(insights.key_success_metrics).length
        ? normalizedArray(insights.key_success_metrics)
        : ["Not specified in posting"],
      hiring_signals: normalizedArray(insights.hiring_signals).length
        ? normalizedArray(insights.hiring_signals)
        : ["Not specified in posting"],
      collaboration_aspects: normalizedArray(insights.collaboration_aspects).length
        ? normalizedArray(insights.collaboration_aspects)
        : ["Not specified in posting"],
      extracted_at: new Date().toISOString(),
      sources_analyzed: job_posting_ids.length,
    };

    console.log("✅ Validated insights:", validatedInsights.role_title);

    // Store in database
    const { data: roleInsight, error: insertError } = await supabase
      .from("role_insights")
      .insert({
        user_id,
        job_posting_ids,
        role_title: validatedInsights.role_title,
        seniority_level: validatedInsights.seniority_level,
        industry_context: validatedInsights.industry_context,
        insights: validatedInsights,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      throw insertError;
    }

    console.log("✅ Stored insights in database:", roleInsight.id);

    return NextResponse.json({
      success: true,
      role_insight_id: roleInsight.id,
      insights: validatedInsights,
    });

  } catch (error: any) {
    console.error("❌ Extraction error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        error: error.message || "Extraction failed",
        details: error.toString(),
        code: error.code,
      },
      { status: 500 }
    );
  }
}