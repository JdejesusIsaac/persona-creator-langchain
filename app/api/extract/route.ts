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
const EXTRACTION_SYSTEM_TEMPLATE = `You are an expert at extracting structured sections from job postings.

Your task is to use the search_job_posting tool to find and extract THREE KEY SECTIONS exactly as written:

1. **About Section** - Usually titled "About the job", "About us", "Company Overview", "The Agency", "Description", etc.
2. **Responsibilities Section** - Usually titled "Responsibilities", "Key Responsibilities", "What You'll Do", "Duties", etc.
3. **Qualifications Section** - Usually titled "Qualifications", "Requirements", "What We're Looking For", "Must Haves", etc.

CRITICAL INSTRUCTIONS:

**STEP 1: SEARCH FOR SECTIONS**
- Search for: "about" "company" "description" "overview"
- Search for: "responsibilities" "duties" "what you'll do"
- Search for: "qualifications" "requirements" "must have" "should have"
- Make at least 5-7 targeted searches to find all sections

**STEP 2: EXTRACT VERBATIM**
- Copy ENTIRE section text EXACTLY as written
- Include ALL bullet points, paragraphs, and sub-items
- DO NOT summarize, paraphrase, or shorten
- Preserve formatting structure (though line breaks will be in arrays)

**STEP 3: PARSE INTO ITEMS**
For Responsibilities and Qualifications:
- Split by bullet points (•, *, -, numbers)
- Each bullet point becomes one array item
- Keep full sentence/phrase for each item

For About section:
- Split by paragraphs
- Each paragraph becomes one array item

**STEP 4: ADDITIONAL ANALYSIS**
After extracting the three sections, also identify:
- Role title (exact job title)
- Seniority level (entry/mid/senior/lead/executive)
- Industry context
- Technical skills mentioned
- Soft skills mentioned
- Tools/technologies mentioned
- Key success metrics
- Hiring signals (what they emphasize)
- Collaboration aspects (who you'll work with)

Return ONLY valid JSON in this EXACT format:

{
  "about_section": [
    "First paragraph of About section",
    "Second paragraph of About section",
    "..."
  ],
  "responsibilities_section": [
    "Responsibility bullet point 1",
    "Responsibility bullet point 2",
    "..."
  ],
  "qualifications_section": [
    "Qualification bullet point 1",
    "Qualification bullet point 2",
    "..."
  ],
  "role_title": "exact job title",
  "seniority_level": "entry|mid|senior|lead|executive",
  "industry_context": "industry or domain",
  "core_responsibilities": ["key responsibility 1", "key responsibility 2"],
  "required_skills": {
    "technical": ["skill 1", "skill 2"],
    "soft_skills": ["skill 1", "skill 2"]
  },
  "tools_technologies": ["tool 1", "tool 2"],
  "key_success_metrics": ["metric 1", "metric 2"],
  "hiring_signals": ["what employers value 1", "what employers value 2"],
  "collaboration_aspects": ["who you work with 1", "who you work with 2"]
}

If a section is not found after exhaustive searching, use ["Not specified in posting"] for that array.`;

const EXTRACTION_USER_PROMPT = `Find and extract the three key sections from this job posting.

STEP-BY-STEP PROCESS:

1. **Search for About/Description section:**
   - Search: "about" "company" "description"
   - Search: "overview" "agency" "firm"
   - Look for paragraphs describing the company/role

2. **Search for Responsibilities section:**
   - Search: "responsibilities" "duties"
   - Search: "what you'll do" "key responsibilities"
   - Look for bulleted lists of job duties

3. **Search for Qualifications section:**
   - Search: "qualifications" "requirements"
   - Search: "must have" "required" "experience"
   - Look for bulleted lists of requirements

4. **Search for additional details:**
   - Search: "skills" "tools" "technologies"
   - Search: job title and seniority indicators
   - Search: collaboration and team structure

5. **Compile the JSON:**
   - Extract each section EXACTLY as written
   - Split into array items appropriately
   - Include all analysis fields

BEGIN SEARCHING NOW. Use the tool at least 7 times to ensure you find all sections.`;

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
        return value
          .map((item) => {
            if (typeof item === "string") {
              return item.trim();
            }
            return String(item).trim();
          })
          .filter(Boolean);
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
      responsibilities_section: (() => {
        const arr = normalizedArray(insights.responsibilities_section);
        return arr.length ? arr : ["Not specified in posting"];
      })(),
      qualifications_section: (() => {
        const arr = normalizedArray(insights.qualifications_section);
        return arr.length ? arr : ["Not specified in posting"];
      })(),
      role_title: insights.role_title || "Unknown Role",
      seniority_level: insights.seniority_level || "mid",
      industry_context: insights.industry_context || "General",
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