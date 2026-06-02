import sys
from pathlib import Path

# Add the current directory to sys.path so we can import backend
sys.path.append(str(Path(__file__).parent))

from backend.llm import get_llm_instance

def main():
    print("Initializing LLM...")
    try:
        llm = get_llm_instance()
        print(f"Model loaded from: {llm.model_path}")
    except Exception as e:
        print(f"Failed to load model: {e}")
        sys.exit(1)

    prompt = "<|user|>\nHello, are you Phi-3?<|end|>\n<|assistant|>\n"
    print(f"Generating answer for prompt:\n{prompt}")
    
    try:
        answer = llm.generate_answer(prompt, max_tokens=50)
        print("\nGenerated Answer:")
        print(answer)
        print("\n✅ Verification successful!")
    except Exception as e:
        print(f"\n❌ Generation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
