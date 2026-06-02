"""
Search module:
- Loads FAISS index and metadata from vectordb/company_data/
- Uses sentence-transformers to compute query embeddings
- Returns top-k relevant document chunks with text and metadata

Data flow:
- `search(query)` -> computes embedding -> searches FAISS -> returns list of {text, source, page}

Notes:
- If vectordb files are missing, the function returns an empty list (server stays up).
"""
from pathlib import Path
from typing import List, Dict
import json
import numpy as np

# Optional imports; will raise at runtime if not installed
try:
    import faiss
    from sentence_transformers import SentenceTransformer
except Exception:
    faiss = None
    SentenceTransformer = None

VECTORDb_DIR = Path(__file__).resolve().parents[1] / "vectordb" / "company_data"
INDEX_PATH = VECTORDb_DIR / "index.faiss"
METADATA_PATH = VECTORDb_DIR / "metadata.json"


class VectorSearch:
    def __init__(self, embedding_model_name: str = "all-MiniLM-L6-v2"):
        self.index = None
        self.metadata = None
        self.embedding_model = None
        # Lazy load underlying models only when search invoked
        self.embedding_model_name = embedding_model_name

        if not VECTORDb_DIR.exists():
            # Directory missing; create it so users know where to place data
            VECTORDb_DIR.mkdir(parents=True, exist_ok=True)

    def _load_index_and_meta(self):
        # Load FAISS index and metadata if present
        if faiss is None or SentenceTransformer is None:
            raise RuntimeError("faiss and sentence-transformers must be installed to use search.")

        if self.index is None:
            if INDEX_PATH.exists():
                try:
                    self.index = faiss.read_index(str(INDEX_PATH))
                except Exception:
                    # Try alternative load path or fail gracefully
                    self.index = None
            else:
                self.index = None

        if self.metadata is None:
            if METADATA_PATH.exists():
                with open(METADATA_PATH, "r", encoding="utf-8") as fh:
                    self.metadata = json.load(fh)
            else:
                self.metadata = None

        if self.embedding_model is None:
            # Load the embedding model (may download if not present locally)
            self.embedding_model = SentenceTransformer(self.embedding_model_name)

    def search(self, query: str, top_k: int = 3) -> List[Dict]:
        """Return a list of top-k documents: [{"text":..., "source":..., "page":...}, ...]

        If the index or metadata are missing, return an empty list.
        """
        try:
            self._load_index_and_meta()
        except Exception:
            return []

        if self.index is None or self.metadata is None:
            return []

        # Compute embedding for query
        q_embedding = self.embedding_model.encode([query])
        # Ensure float32
        q_vec = np.array(q_embedding, dtype=np.float32)
        # Search
        D, I = self.index.search(q_vec, top_k)
        results = []
        # metadata assumed to be a list or dict mapping int ids
        for idx in I[0]:
            if idx < 0:
                continue
            item = None
            if isinstance(self.metadata, list):
                if idx < len(self.metadata):
                    item = self.metadata[idx]
            elif isinstance(self.metadata, dict):
                # keys might be strings
                item = self.metadata.get(str(idx)) or self.metadata.get(idx)

            if item is None:
                continue

            results.append(
                {
                    "text": item.get("text") or item.get("content") or "",
                    "source": item.get("source") or item.get("document") or "unknown",
                    "page": item.get("page") or item.get("page_number") or 1,
                }
            )
        return results


# Module-level search helper
_searcher: VectorSearch = None


def get_searcher() -> VectorSearch:
    global _searcher
    if _searcher is None:
        _searcher = VectorSearch()
    return _searcher


def search(query: str, top_k: int = 3) -> List[Dict]:
    return get_searcher().search(query, top_k=top_k)