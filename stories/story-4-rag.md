# Story 4: High-Compliance RAG Engine

**Role:** AI Engineer
**Feature:** Context Awareness
**Status:** Todo

## Description
Implement the local RAG system to ensure agents follow instructions by injecting project context.

## Technical Tasks
1.  [ ] Install `langchain`, `@xenova/transformers`.
2.  [ ] Create `lib/rag.ts` (Backend):
    *   `ingest(file)`: Read file -> Chunk -> Embed -> Store in MemoryVectorStore.
    *   `query(text)`: Return top 3 relevant chunks.
3.  [ ] Create API Endpoints:
    *   `POST /api/rag/ingest`: Trigger ingestion for a file.
    *   `POST /api/rag/query`: Retrieve context.
4.  [ ] Update `useNeuralAutonomy` to query RAG before sending prompts to the LLM.

## Acceptance Criteria
*   Backend can embed a text file.
*   Querying "How do I add a route?" returns the `server.js` snippet.
*   Agents receive this context in their system prompt.
