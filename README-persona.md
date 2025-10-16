# Universal Persona Creator

## Overview

The Universal Persona Creator extends the base LangChain + Next.js starter into a focused workflow for transforming any job posting into platform-ready AI personas. The system ingest, extracts, and generates structured persona artifacts that work across ChatGPT and Claude. It is designed to be role-agnostic, resilient to formatting differences across postings, and observable end-to-end.

## Architecture

- **Ingestion (`app/api/ingest/route.ts`)**
  - Accepts raw text or URLs.
  - Uses `CheerioWebBaseLoader` to fetch and parse HTML.
  - Splits content with `RecursiveCharacterTextSplitter` and enriches each chunk with metadata including `user_id`, `job_posting_id`, `section_title`, and timing details.
  - Stores embeddings in Supabase via `SupabaseVectorStore`.

- **Extraction (`app/api/extract/route.ts`)**
  - Builds a filtered retriever over Supabase documents, post-filtered per `user_id` and optional `job_posting_id` to avoid RPC metadata conflicts.
  - Runs a LangGraph ReAct agent (`createReactAgent`) with strict prompts that:
    - Require at least five retrieval tool calls.
    - Demand verbatim citations from snippets.
    - Populate an expanded JSON schema with `about_section`, `responsibilities_section`, `qualifications_section`, and persona-critical fields.
  - Validates and normalizes the response before persisting to `role_insights`.

- **Persona Generation (`app/api/generate/route.ts`)**
  - Fetches stored insights.
  - Produces ChatGPT custom instructions and Claude Command Suite text using templates in `app/lib/templates/`.
  - Persists generated personas to `generated_personas` for later retrieval.

- **Frontend (`components/`)**
  - `PersonaGeneration.tsx` orchestrates the three steps (Input → Review → Generate).
  - `InsightsReview.tsx` surfaces extraction results with detailed error diagnostics and retry controls.

## Setup

1. **Clone & Install**
   ```bash
   git clone <repo>
   cd langchain-nextjs-template
   npm install
   ```
2. **Environment variables (`.env.local`)**
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PRIVATE_KEY`
   - Optional: `ANTHROPIC_API_KEY` for Claude output.
3. **Supabase schema**
   Ensure the following tables exist with JSONB columns where noted:
   - `documents` (vector store backing table).
   - `role_insights` (`insights` JSONB, `role_title`, `seniority_level`, `industry_context`, `job_posting_ids[]`).
   - `generated_personas` (`chatgpt_instructions`, `claude_commands`).

## Running Locally

```bash
npm run dev
```

Visit `http://localhost:3000/persona` and follow the wizard:

1. **Input** – Upload job posting text or URL.
2. **Review** – Observe retrieved insights. If anything looks off, retry extraction or inspect logs.
3. **Generate** – Produce persona artifacts for ChatGPT and Claude, copy or download as Markdown.

## Logging & Observability

- Server logs include chunk metadata, retriever filter information, and agent message traces to debug missing fields.
- Preview retrieval is intentionally disabled until Supabase metadata ambiguity is resolved; post-filtered retrieval avoids `42702` errors.
- Extraction failures respond with HTTP 4xx/5xx alongside diagnostic payloads which surface in the UI debug pane.

## Validation Guard Rails

- Extraction prompts enforce multi-step searches and disallow hallucinations; default fallback is `"Not specified in posting"` when content cannot be located.
- Normalization utilities in `app/api/extract/route.ts` coerce strings/arrays, ensuring the database always stores lists of strings.

## Extending the Persona Creator

- **Additional Fields** – Expand the `EXTRACTION_SYSTEM_TEMPLATE` JSON schema and update corresponding validation.
- **Alternative Vector Stores** – Swap `SupabaseVectorStore` for another compatible backend and adjust ingestion accordingly.
- **UI Hooks** – Extend `PersonaGeneration.tsx` to preview the new sections or allow manual edits before generation.
- **Template Variants** – Duplicate or extend the generators in `app/lib/templates/` to target other AI assistants or output formats.

## Troubleshooting

- **Extraction returns defaults** – Check logs for `42702` errors or lack of snippet content. Re-ingest the posting to ensure `section_title` metadata is present.
- **Persona generation missing data** – Confirm `role_insights` rows contain populated arrays; regenerate extraction if defaults remain.
- **Supabase rate limits** – Batch ingestions or throttle retries; adjust chunk sizes if documents are too large.
- **Runtime incompatibilities** – `ingest` and `extract` routes run under `nodejs` runtime to support `cheerio` and server-side tooling.

## Roadmap Ideas

- Add automated document preprocessing (PDF → HTML → text).
- Integrate confidence scores for each extracted field.
- Support bulk persona creation with background job queues.
- Provide downloadable persona bundles (JSON + Markdown exports).

## License

This project inherits the licensing of the upstream LangChain Next.js template. Refer to the root `LICENSE` file for details.
