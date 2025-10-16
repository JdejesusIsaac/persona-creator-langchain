// app/api/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { Document } from "@langchain/core/documents";

export const runtime = "nodejs";

async function loadFromUrl(url: string) {
  try {
    const loader = new CheerioWebBaseLoader(url);
    const docs = await loader.load();
    return docs;
  } catch (error: any) {
    throw new Error(`Failed to load URL: ${error.message}`);
  }
}

function deriveSectionTitle(content: string) {
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return "General";

  const headingPattern = /^(?<heading>[A-Z][A-Za-z0-9 &/\-]{2,})[:]?$/;
  for (const line of lines.slice(0, 6)) {
    const match = line.match(headingPattern);
    if (match?.groups?.heading) {
      return match.groups.heading;
    }
  }

  return lines[0].slice(0, 80);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      user_id, 
      source_type, 
      content, 
      url, 
      metadata = {} 
    } = body;

    console.log("📥 Ingestion request:", { user_id, source_type });

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    let rawContent = "";
    let sourceUrl = url || null;

    // Load content based on source type
    if (source_type === "text") {
      if (!content) {
        return NextResponse.json(
          { error: "content is required for text type" },
          { status: 400 }
        );
      }
      rawContent = content;
    } else if (source_type === "url") {
      if (!url) {
        return NextResponse.json(
          { error: "url is required for url type" },
          { status: 400 }
        );
      }
      const docs = await loadFromUrl(url);
      rawContent = docs.map(d => d.pageContent).join("\n\n");
    } else {
      return NextResponse.json(
        { error: "Invalid source_type. Must be 'text' or 'url'" },
        { status: 400 }
      );
    }

    if (!rawContent.trim()) {
      return NextResponse.json(
        { error: "No content to process" },
        { status: 400 }
      );
    }

    console.log("📄 Content length:", rawContent.length);

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PRIVATE_KEY!
    );

    // Store raw job posting
    const { data: jobPosting, error: jobError } = await supabase
      .from("job_postings")
      .insert({
        user_id,
        source_type,
        source_url: sourceUrl,
        raw_content: rawContent,
        metadata,
      })
      .select()
      .single();

    if (jobError) {
      console.error("❌ Job posting insert error:", jobError);
      throw jobError;
    }

    console.log("✅ Job posting created:", jobPosting.id);

    // Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });

    const chunks = await splitter.createDocuments([rawContent]);
    console.log("✂️ Created chunks:", chunks.length);

    // Create Document instances with metadata
    const enrichedChunks = chunks.map((chunk, index) => {
      const sectionTitle = deriveSectionTitle(chunk.pageContent);
      return new Document({
        pageContent: chunk.pageContent,
        metadata: {
          user_id: user_id,                    // ✅ Now stored in metadata JSONB
          job_posting_id: jobPosting.id,
          source_type: source_type,
          chunkIndex: index,
          totalChunks: chunks.length,
          ingestedAt: new Date().toISOString(),
          section_title: sectionTitle,
          ...metadata,
        },
      });
    });

    console.log("📦 Sample chunk metadata:", enrichedChunks[0].metadata);

    // Store in vector database
    const vectorStore = new SupabaseVectorStore(new OpenAIEmbeddings(), {
      client: supabase,
      tableName: "documents",
      queryName: "match_documents",
    });

    console.log("🔄 Adding documents to vector store...");
    await vectorStore.addDocuments(enrichedChunks);
    console.log("✅ Successfully added documents to vector store");

    return NextResponse.json({
      success: true,
      job_posting_id: jobPosting.id,
      chunks_created: chunks.length,
      message: `Successfully ingested ${chunks.length} chunks`,
    });

  } catch (error: any) {
    console.error("❌ Ingestion error:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      { 
        error: error.message,
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PRIVATE_KEY!
    );

    // Delete documents by metadata filter
    const { error: docsError } = await supabase
      .from("documents")
      .delete()
      .filter("metadata->>user_id", "eq", user_id);

    if (docsError) throw docsError;

    // Delete job postings
    const { error: jobsError } = await supabase
      .from("job_postings")
      .delete()
      .eq("user_id", user_id);

    if (jobsError) throw jobsError;

    return NextResponse.json({
      success: true,
      message: "All data deleted successfully",
    });

  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}