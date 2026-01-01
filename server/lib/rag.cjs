/**
 * RAG (Retrieval-Augmented Generation) Service
 * Story 6.1: Codebase RAG Indexing System
 *
 * Provides semantic search capabilities for codebase understanding.
 * Uses LangChain with HuggingFace Transformers for local embeddings.
 */

const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { HuggingFaceTransformersEmbeddings } = require("@langchain/community/embeddings/hf_transformers");

// Singleton Store (In-Memory with optional persistence)
let vectorStore = null;
let embeddings = null;

// Track indexed documents for removal/update operations
const documentIndex = new Map(); // Map<source, docIds[]>
let totalChunks = 0;
let indexedFiles = new Set();

// Configuration
const RAG_CONFIG = {
    chunkSize: 2000,      // Task 1.6: Increased from 1000 for better context
    chunkOverlap: 300,    // Task 1.6: Increased from 200
    modelName: "Xenova/all-MiniLM-L6-v2",
    maxChunksPerFile: 500, // Safety limit
};

/**
 * Get or initialize the embeddings model (singleton)
 */
async function getEmbeddings() {
    if (!embeddings) {
        // Use a small, quantized model for speed on local CPU
        embeddings = new HuggingFaceTransformersEmbeddings({
            modelName: RAG_CONFIG.modelName,
        });
        console.log(`[RAG] Initialized embeddings model: ${RAG_CONFIG.modelName}`);
    }
    return embeddings;
}

/**
 * Get or initialize the vector store (singleton)
 */
async function getVectorStore() {
    if (!vectorStore) {
        const emb = await getEmbeddings();
        vectorStore = new MemoryVectorStore(emb);
        console.log('[RAG] Initialized in-memory vector store');
    }
    return vectorStore;
}

/**
 * Generate a unique ID for each document chunk
 */
function generateDocId(source, index) {
    return `${source}::chunk::${index}`;
}

const rag = {
    /**
     * Ingest a file into the vector store
     * @param {string} content - File content to ingest
     * @param {object} metadata - Metadata including source path
     * @returns {Promise<{success: boolean, chunks: number}>}
     */
    ingest: async (content, metadata) => {
        const startTime = Date.now();
        try {
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: RAG_CONFIG.chunkSize,
                chunkOverlap: RAG_CONFIG.chunkOverlap,
            });

            const docs = await splitter.createDocuments([content], [metadata]);

            // Safety limit for very large files
            if (docs.length > RAG_CONFIG.maxChunksPerFile) {
                console.warn(`[RAG] File ${metadata.source} exceeds chunk limit (${docs.length} > ${RAG_CONFIG.maxChunksPerFile}), truncating`);
                docs.length = RAG_CONFIG.maxChunksPerFile;
            }

            // Add unique IDs to each chunk for later removal
            const docIds = [];
            docs.forEach((doc, index) => {
                const docId = generateDocId(metadata.source, index);
                doc.metadata.docId = docId;
                doc.metadata.chunkIndex = index;
                doc.metadata.totalChunks = docs.length;
                docIds.push(docId);
            });

            const store = await getVectorStore();
            await store.addDocuments(docs);

            // Track document for removal/update
            documentIndex.set(metadata.source, docIds);
            totalChunks += docs.length;
            indexedFiles.add(metadata.source);

            const elapsed = Date.now() - startTime;
            console.log(`[RAG] Ingested ${metadata.source} (${docs.length} chunks) in ${elapsed}ms`);

            return { success: true, chunks: docs.length };
        } catch (e) {
            console.error(`[RAG ERROR] Failed to ingest ${metadata.source}:`, e.message);
            return { success: false, chunks: 0, error: e.message };
        }
    },

    /**
     * Task 1.2: Remove all chunks for a document by source path
     * @param {string} source - Source file path to remove
     * @returns {Promise<{success: boolean, removedChunks: number}>}
     */
    removeDocument: async (source) => {
        const startTime = Date.now();
        try {
            const docIds = documentIndex.get(source);

            if (!docIds || docIds.length === 0) {
                console.log(`[RAG] No chunks found for ${source}`);
                return { success: true, removedChunks: 0 };
            }

            const store = await getVectorStore();

            // MemoryVectorStore doesn't support direct deletion by ID,
            // so we need to filter the internal documents
            if (store.memoryVectors) {
                const originalLength = store.memoryVectors.length;
                store.memoryVectors = store.memoryVectors.filter(
                    vec => vec.metadata?.docId && !docIds.includes(vec.metadata.docId)
                );
                const removed = originalLength - store.memoryVectors.length;

                // Update tracking
                totalChunks -= removed;
                indexedFiles.delete(source);
                documentIndex.delete(source);

                const elapsed = Date.now() - startTime;
                console.log(`[RAG] Removed ${removed} chunks for ${source} in ${elapsed}ms`);

                return { success: true, removedChunks: removed };
            }

            return { success: false, removedChunks: 0, error: 'Vector store not initialized' };
        } catch (e) {
            console.error(`[RAG ERROR] Failed to remove ${source}:`, e.message);
            return { success: false, removedChunks: 0, error: e.message };
        }
    },

    /**
     * Task 1.3: Update a document (remove then re-ingest)
     * @param {string} content - New file content
     * @param {object} metadata - Metadata including source path
     * @returns {Promise<{success: boolean, removedChunks: number, newChunks: number}>}
     */
    updateDocument: async (content, metadata) => {
        const startTime = Date.now();
        try {
            // First remove existing chunks
            const removeResult = await rag.removeDocument(metadata.source);

            // Then ingest new content
            const ingestResult = await rag.ingest(content, metadata);

            const elapsed = Date.now() - startTime;
            console.log(`[RAG] Updated ${metadata.source} (${removeResult.removedChunks} removed, ${ingestResult.chunks} added) in ${elapsed}ms`);

            return {
                success: ingestResult.success,
                removedChunks: removeResult.removedChunks,
                newChunks: ingestResult.chunks
            };
        } catch (e) {
            console.error(`[RAG ERROR] Failed to update ${metadata.source}:`, e.message);
            return { success: false, removedChunks: 0, newChunks: 0, error: e.message };
        }
    },

    /**
     * Query the vector store for relevant context
     * @param {string} queryText - Search query
     * @param {number} k - Number of results to return (default 5)
     * @returns {Promise<Array<{content, source, score, chunkIndex}>>}
     */
    query: async (queryText, k = 5) => {
        const startTime = Date.now();
        try {
            const store = await getVectorStore();

            // Use similaritySearchWithScore for relevance scoring
            const results = await store.similaritySearchWithScore(queryText, k);

            const elapsed = Date.now() - startTime;
            console.log(`[RAG] Query "${queryText.substring(0, 50)}..." returned ${results.length} results in ${elapsed}ms`);

            return results.map(([doc, score]) => ({
                content: doc.pageContent,
                source: doc.metadata.source,
                score: score,
                chunkIndex: doc.metadata.chunkIndex,
                totalChunks: doc.metadata.totalChunks
            }));
        } catch (e) {
            console.error("[RAG QUERY ERROR]", e.message);
            return [];
        }
    },

    /**
     * Task 1.4: Get statistics about the RAG index
     * @returns {Promise<{fileCount, chunkCount, memoryUsage, isInitialized}>}
     */
    getStats: async () => {
        try {
            const store = await getVectorStore();
            const memUsage = process.memoryUsage();

            return {
                fileCount: indexedFiles.size,
                chunkCount: totalChunks,
                memoryUsage: {
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                    rss: Math.round(memUsage.rss / 1024 / 1024) // MB
                },
                isInitialized: vectorStore !== null,
                config: {
                    chunkSize: RAG_CONFIG.chunkSize,
                    chunkOverlap: RAG_CONFIG.chunkOverlap,
                    modelName: RAG_CONFIG.modelName
                },
                documentSources: Array.from(indexedFiles).slice(0, 20) // First 20 for debugging
            };
        } catch (e) {
            console.error("[RAG STATS ERROR]", e.message);
            return {
                fileCount: 0,
                chunkCount: 0,
                memoryUsage: {},
                isInitialized: false,
                error: e.message
            };
        }
    },

    /**
     * Task 1.5: Clear the entire vector store
     * @returns {Promise<{success: boolean, clearedChunks: number, clearedFiles: number}>}
     */
    clear: async () => {
        const startTime = Date.now();
        try {
            const clearedChunks = totalChunks;
            const clearedFiles = indexedFiles.size;

            // Reset the vector store
            vectorStore = null;
            documentIndex.clear();
            indexedFiles.clear();
            totalChunks = 0;

            // Re-initialize empty store
            await getVectorStore();

            const elapsed = Date.now() - startTime;
            console.log(`[RAG] Cleared index (${clearedFiles} files, ${clearedChunks} chunks) in ${elapsed}ms`);

            return {
                success: true,
                clearedChunks,
                clearedFiles
            };
        } catch (e) {
            console.error("[RAG CLEAR ERROR]", e.message);
            return { success: false, clearedChunks: 0, clearedFiles: 0, error: e.message };
        }
    },

    /**
     * Check if a file is already indexed
     * @param {string} source - Source file path
     * @returns {boolean}
     */
    isIndexed: (source) => {
        return indexedFiles.has(source);
    },

    /**
     * Get the configuration
     * @returns {object}
     */
    getConfig: () => ({ ...RAG_CONFIG })
};

module.exports = rag;
