#!/usr/bin/env python3
"""
Script to download the GGUF model for OfficeGPT.
Downloads Llama-3-8B-Instruct-v0.3.Q4_K_M.gguf from Hugging Face.
"""
import sys
from pathlib import Path
try:
    from huggingface_hub import hf_hub_download
except ImportError:
    print("Error: huggingface_hub is not installed.")
    print("Please run: pip install huggingface_hub")
    sys.exit(1)

# Configuration
# Configuration
REPO_ID = "microsoft/Phi-3-mini-4k-instruct-gguf"
FILENAME = "Phi-3-mini-4k-instruct-q4.gguf"
# Save to: officegpt/model/phi-3-mini-4k-instruct-q4.gguf
DEST_DIR = Path(__file__).parent / "backend" / "model" # Relative to script location if in root, but let's be careful
# Actually, existing model is at officegpt/model/.
# Let's align with existing structure.
# If this script is at officegpt/download_model.py:
BASE_DIR = Path(__file__).parent
MODEL_DIR = BASE_DIR / "model"
TARGET_FILENAME = "phi-3-mini-4k-instruct-q4.gguf"

def main():
    print(f"Downloading {FILENAME} from {REPO_ID}...")
    print(f"Target directory: {MODEL_DIR}")
    
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        model_path = hf_hub_download(
            repo_id=REPO_ID,
            filename=FILENAME,
            local_dir=str(MODEL_DIR),
            local_dir_use_symlinks=False  # Download actual file
        )
        
        # Rename to consistent name if needed, or just warn user
        final_path = MODEL_DIR / TARGET_FILENAME
        downloaded_path = Path(model_path)
        
        if downloaded_path.name != TARGET_FILENAME:
            print(f"Renaming {downloaded_path.name} to {TARGET_FILENAME}...")
            downloaded_path.rename(final_path)
            
        print("\n✅ Model downloaded successfully!")
        print(f"Path: {final_path}")
        print(f"Size: {final_path.stat().st_size / (1024**3):.2f} GB")
        
    except Exception as e:
        print(f"\n❌ Error downloading model: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
