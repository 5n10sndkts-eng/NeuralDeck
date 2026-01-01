# Story 4: High-Compliance RAG Engine

**Role:** AI Engineer
**Feature:** Context Awareness
**Status:** Done

## Description
Implement the local RAG system to ensure agents follow instructions by injecting project context.

## Technical Tasks
1.  [x] Install `langchain`, `@xenova/transformers`.
2.  [x] Create `lib/rag.ts` (Backend):
    *   `ingest(file)`: Read file -> Chunk -> Embed -> Store in MemoryVectorStore.
    *   `query(text)`: Return top 3 relevant chunks.
3.  [x] Create API Endpoints:
    *   `POST /api/rag/ingest`: Trigger ingestion for a file.
    *   `POST /api/rag/query`: Retrieve context.
4.  [x] Update `useNeuralAutonomy` to query RAG before sending prompts to the LLM.

## Acceptance Criteria
*   Backend can embed a text file.
*   Querying "How do I add a route?" returns the `server.js` snippet.
*   Agents receive this context in their system prompt.
