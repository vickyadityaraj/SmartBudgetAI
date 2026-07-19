# Coding Assignment 1 - Task 1: LLM Workflow
# Exposes a simple LLM workflow that answers financial queries.
import sys
import json
from common import get_llm_response

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Missing Argument",
            "message": "Usage: python advisor_chat.py <prompt>"
        }))
        sys.exit(1)
        
    prompt = sys.argv[1]
    
    # Theme the assistant for financial advising with strict guardrails
    system_instruction = (
        "You are a certified financial advisor for FinGenius. "
        "Your expertise is strictly limited to personal finance, budgeting, saving money, investing, taxes, and money management. "
        "You must ONLY respond to queries related to these financial topics. "
        "If the user query is not related to finance (e.g. asking about science, history, coding, general trivia, writing general text, advice on unrelated personal topics, etc.), "
        "you must politely refuse to answer, explaining that your role is to provide financial guidance and money-saving advice only."
    )
    
    try:
        response = get_llm_response(prompt, system_instruction)
        print(json.dumps({
            "success": True,
            "prompt": prompt,
            "response": response
        }, indent=2))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
