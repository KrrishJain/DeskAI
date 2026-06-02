#!/usr/bin/env python3
"""
OfficeGPT – Heading Based Embedding Script (Production Style)

Changes:
✔ Heading → Heading semantic chunking
✔ Prevents one-word chunks from broken PDFs
✔ Tables kept inside section context
✔ Converts table rows into semantic text
✔ Auto split if chunk too large (MiniLM safe)
"""

import sys
import json
from pathlib import Path
from typing import List, Dict
import numpy as np
import re

try:
    import faiss
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Install: pip install faiss-cpu sentence-transformers")
    sys.exit(1)

try:
    import PyPDF2
except ImportError:
    print("Install: pip install PyPDF2")
    sys.exit(1)


# -----------------------------
# HEADING DETECTOR
# -----------------------------
def is_heading(line: str) -> bool:
    """
    Detect section headings.
    Simple but effective for policy PDFs.
    """
    if len(line.split()) <= 2:
        return False
    if line.endswith(":"):
        return True
    if line.istitle():
        return True
    if line.isupper():
        return True
    return False


# -----------------------------
# TABLE DETECTOR
# -----------------------------
def is_table_like(text: str) -> bool:
    if "|" in text:
        return True
    if text.count("  ") > 6:
        return True
    digit_ratio = sum(c.isdigit() for c in text) / max(len(text), 1)
    if digit_ratio > 0.25:
        return True
    return False


# -----------------------------
# TABLE NORMALIZER
# -----------------------------
def normalize_table_text(text: str) -> str:
    """
    Convert table-like text into readable semantic format.
    Improves embedding retrieval for Q&A.
    """
    text = re.sub(r"\s{2,}", " | ", text)
    return text


# -----------------------------
# SPLIT LARGE CHUNK
# -----------------------------
def split_large_text(text: str, max_words: int):
    words = text.split()
    for i in range(0, len(words), max_words):
        yield " ".join(words[i:i + max_words])


# -----------------------------
# MAIN EXTRACTION (HEADING BASED)
# -----------------------------
def extract_text_from_pdf(pdf_path: Path) -> List[Dict]:
    chunks = []
    max_words = 180

    try:
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)

            current_heading = "General"
            current_text = ""

            for page_num, page in enumerate(reader.pages, start=1):
                raw_text = page.extract_text()

                if not raw_text:
                    continue

                # FIX broken PDF newlines
                raw_text = raw_text.replace("\r", " ")
                lines = [l.strip() for l in raw_text.split("\n") if l.strip()]

                for line in lines:

                    # Detect heading
                    if is_heading(line):

                        # Save previous section chunk
                        if current_text.strip():
                            text_block = current_text.strip()

                            if is_table_like(text_block):
                                text_block = normalize_table_text(text_block)

                            if len(text_block.split()) <= max_words:
                                chunks.append({
                                    "text": text_block,
                                    "source": pdf_path.name,
                                    "page": page_num,
                                    "section": current_heading
                                })
                            else:
                                for sub in split_large_text(text_block, max_words):
                                    chunks.append({
                                        "text": sub,
                                        "source": pdf_path.name,
                                        "page": page_num,
                                        "section": current_heading
                                    })

                        # Start new section
                        current_heading = line
                        current_text = line + " "
                    else:
                        current_text += line + " "

            # save last section
            if current_text.strip():
                text_block = current_text.strip()

                if is_table_like(text_block):
                    text_block = normalize_table_text(text_block)

                if len(text_block.split()) <= max_words:
                    chunks.append({
                        "text": text_block,
                        "source": pdf_path.name,
                        "page": page_num,
                        "section": current_heading
                    })
                else:
                    for sub in split_large_text(text_block, max_words):
                        chunks.append({
                            "text": sub,
                            "source": pdf_path.name,
                            "page": page_num,
                            "section": current_heading
                        })

    except Exception as e:
        print(f"Error processing {pdf_path.name}: {e}")

    # ✅ FALLBACK: if heading chunking produced nothing
    if len(chunks) == 0 and current_text.strip():

        words = current_text.split()
        max_words = 180

        for i in range(0, len(words), max_words):
            sub = " ".join(words[i:i+max_words])
            chunks.append({
                "text": sub,
                "source": pdf_path.name,
                "page": current_page,
                "section": "General"
            })
            
    return chunks


# -----------------------------
# PROCESS DOCS
# -----------------------------
def process_documents(folder: Path) -> List[Dict]:
    all_chunks = []
    pdf_files = list(folder.glob("*.pdf"))

    if not pdf_files:
        print("No PDFs found.")
        return []

    print(f"Found {len(pdf_files)} PDFs")

    for pdf in pdf_files:
        print(f"Processing: {pdf.name}")
        chunks = extract_text_from_pdf(pdf)
        print(f"  Extracted {len(chunks)} chunks")
        all_chunks.extend(chunks)

    print(f"\nTotal chunks: {len(all_chunks)}")
    return all_chunks


# -----------------------------
# EMBEDDINGS
# -----------------------------
def create_embeddings(chunks: List[Dict], model_name="all-MiniLM-L6-v2"):

    if not chunks:
        return None, None

    print(f"\nLoading model: {model_name}")
    model = SentenceTransformer(model_name)

    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=True)

    embeddings = np.array(embeddings, dtype=np.float32)

    dim = embeddings.shape[1]
    print(f"Creating FAISS index dim={dim}")

    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)

    return index, chunks


# -----------------------------
# SAVE VECTOR DB
# -----------------------------
def save_vectordb(index, metadata, output_dir: Path):

    output_dir.mkdir(parents=True, exist_ok=True)

    index_path = output_dir / "index.faiss"
    metadata_path = output_dir / "metadata.json"

    print(f"\nSaving index → {index_path}")
    faiss.write_index(index, str(index_path))

    print(f"Saving metadata → {metadata_path}")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print("✅ Vector DB ready")


# -----------------------------
# MAIN
# -----------------------------
def main():

    if len(sys.argv) < 2:
        print("Usage: python embed_documents.py ./docs")
        sys.exit(1)

    docs_folder = Path(sys.argv[1])

    if not docs_folder.exists() or not docs_folder.is_dir():
        print("Invalid folder path")
        sys.exit(1)

    print("=" * 50)
    print("OfficeGPT Heading-Based Chunker")
    print("=" * 50)

    chunks = process_documents(docs_folder)

    if not chunks:
        print("No chunks created.")
        sys.exit(1)

    index, metadata = create_embeddings(chunks)

    script_dir = Path(__file__).parent
    output_dir = script_dir / "vectordb" / "company_data"

    save_vectordb(index, metadata, output_dir)

    print("\nRestart OfficeGPT server after indexing.")


if __name__ == "__main__":
    main()