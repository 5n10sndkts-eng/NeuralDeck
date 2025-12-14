
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { HuggingFaceTransformersEmbeddings } = require("@langchain/community/embeddings/hf_transformers");

// Singleton Store (In-Memory for V2 prototype)
let vectorStore = null;
let embeddings = null;

async function getEmbeddings() {
    if (!embeddings) {
        // Use a small, quantized model for speed on local CPU
        embeddings = new HuggingFaceTransformersEmbeddings({
            modelName: "Xenova/all-MiniLM-L6-v2",
        });
    }
    return embeddings;
}

async function getVectorStore() {
    if (!vectorStore) {
        const emb = await getEmbeddings();
        vectorStore = new MemoryVectorStore(emb);
    }
    return vectorStore;
}

const rag = {
    // 1. Ingest File
    ingest: async (content, metadata) => {
        try {
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });
            const docs = await splitter.createDocuments([content], [metadata]);

            const store = await getVectorStore();
            await store.addDocuments(docs);
            console.log(`[RAG] Ingested ${metadata.source} (${docs.length} chunks)`);
            return true;
        } catch (e) {
            console.error("[RAG ERROR]", e);
            return false;
        }
    },

    // 2. Query Context
    query: async (queryText, k = 3) => {
        try {
            const store = await getVectorStore();
            const results = await store.similaritySearch(queryText, k);
            return results.map(r => ({
                content: r.pageContent,
                source: r.metadata.source
            }));
        } catch (e) {
            console.error("[RAG QUERY ERROR]", e);
            return [];
        }
    }
};

module.exports = rag;
