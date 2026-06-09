/**
 * Offline Embedding & Semantic Similarity Service.
 * Implements S-BERT local embeddings via @huggingface/transformers
 * with a zero-dependency TF-IDF vector-space fallback for offline stability.
 */

let embeddingPipeline = null;

/**
 * Initializes the HuggingFace Transformers pipeline for feature extraction.
 */
async function getPipeline() {
  if (embeddingPipeline) return embeddingPipeline;
  
  try {
    // Dynamically import @huggingface/transformers or @xenova/transformers
    // This resolves bundler loading issues in Next.js API routes
    let transformers;
    try {
      transformers = await import('@huggingface/transformers');
    } catch {
      transformers = await import('@xenova/transformers');
    }
    
    if (transformers && transformers.pipeline) {
      embeddingPipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      return embeddingPipeline;
    }
  } catch (error) {
    console.warn('Could not initialize local Hugging Face transformer model, using TF-IDF fallback:', error.message);
  }
  return null;
}

/**
 * Computes cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Computes S-BERT embeddings for a given text.
 * Falls back to TF-IDF cosine similarity directly if pipeline is unavailable.
 */
export async function getEmbedding(text) {
  const pipe = await getPipeline();
  if (!pipe) return null;
  
  try {
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (err) {
    console.error('Error generating S-BERT embedding:', err);
    return null;
  }
}

/**
 * Computes semantic similarity between job description and resume text.
 * Uses S-BERT if available, otherwise falls back to custom TF-IDF cosine similarity.
 */
export async function computeSemanticSimilarity(jobDescription, resumeText) {
  if (!jobDescription || !resumeText || !jobDescription.trim() || !resumeText.trim()) {
    return 0;
  }

  // Attempt S-BERT embedding similarity
  const pipe = await getPipeline();
  if (pipe) {
    try {
      const embJD = await getEmbedding(jobDescription);
      const embResume = await getEmbedding(resumeText);
      if (embJD && embResume) {
        const similarity = cosineSimilarity(embJD, embResume);
        // Clamp and normalize between 0 and 1
        return Math.max(0, Math.min(1, similarity));
      }
    } catch (err) {
      console.warn('S-BERT similarity failed, falling back to TF-IDF:', err);
    }
  }

  // Fallback: Advanced TF-IDF Vector Space similarity
  return computeTFIDFSimilarity(jobDescription, resumeText);
}

/**
 * Zero-dependency TF-IDF Cosine Similarity implementation.
 */
function computeTFIDFSimilarity(textA, textB) {
  const tokenize = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2); // Filter short words/stop-words
  };

  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  
  const allTokens = new Set([...tokensA, ...tokensB]);
  
  // Calculate term frequency
  const getTF = (tokens) => {
    const tf = {};
    tokens.forEach(tok => {
      tf[tok] = (tf[tok] || 0) + 1;
    });
    return tf;
  };

  const tfA = getTF(tokensA);
  const tfB = getTF(tokensB);

  // Compute vector values
  const vecA = [];
  const vecB = [];

  allTokens.forEach(tok => {
    // In a two-document corpus, simplified IDF is used:
    // If a term appears in both, IDF is 1. If only in one, IDF is 1.5.
    const inA = tfA[tok] ? 1 : 0;
    const inB = tfB[tok] ? 1 : 0;
    const idf = (inA && inB) ? 1.0 : 1.5;

    vecA.push((tfA[tok] || 0) * idf);
    vecB.push((tfB[tok] || 0) * idf);
  });

  return cosineSimilarity(vecA, vecB);
}
