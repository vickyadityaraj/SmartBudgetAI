# Coding Assignment 1 - Task 2: Prompt Chaining
# Implements a multi-step chain: Summarizes a user's financial overview, extracts key actions, and asks 3 follow-up reflection questions.
import sys
import json
from common import get_llm_response

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Missing Argument",
            "message": "Usage: python insights_chain.py <financial_overview>"
        }))
        sys.exit(1)
        
    topic = sys.argv[1]
    
    try:
        # Step 1: Generate Summary of the Financial Situation (with strict financial scope validation)
        summary_instruction = (
            "You are a financial analyst summarizing user portfolios and spendings. "
            "You must ONLY process inputs related to personal finance, budgeting, income, expenses, savings, or wealth. "
            "If the input is completely unrelated to finance or money management, you must respond with exactly the word: 'OUT_OF_SCOPE'."
        )
        summary_prompt = f"Summarize the following financial situation in 3 sentences, highlighting the main challenges or strengths:\n{topic}"
        summary = get_llm_response(summary_prompt, summary_instruction)
        
        if "OUT_OF_SCOPE" in summary.strip().upper():
            refuse_msg = "The provided input is unrelated to financial guidance or saving money. Please provide finance-related information (e.g., your income, monthly bills, expenses, or savings goals) to generate insights."
            print(json.dumps({
                "success": True,
                "financial_overview": topic,
                "steps": [
                    {
                        "step": 1,
                        "title": "Analyze Situation",
                        "prompt": summary_prompt,
                        "output": refuse_msg
                    },
                    {
                        "step": 2,
                        "title": "Extract Action Steps",
                        "prompt": "Chain stopped: Unrelated topic",
                        "output": "Not applicable."
                    },
                    {
                        "step": 3,
                        "title": "Generate Reflection Questions",
                        "prompt": "Chain stopped: Unrelated topic",
                        "output": "Not applicable."
                    }
                ]
            }, indent=2))
            sys.exit(0)
            
        # Step 2: Extract Key Action Points using the Summary
        key_points_prompt = f"Based on the following financial summary, list 3 to 5 actionable steps to improve this person's financial health:\n{summary}"
        key_points = get_llm_response(key_points_prompt, "You are a budgeting coach. Extract bulleted key action items.")
        
        # Step 3: Generate 3 reflection questions based on the Summary & Action Points
        questions_prompt = f"Based on the financial summary and key actions, generate exactly 3 reflection questions for the user to help them evaluate their financial choices:\nSummary: {summary}\nKey Actions: {key_points}"
        questions = get_llm_response(questions_prompt, "You are a financial counselor. Ask 3 numbered questions.")
        
        print(json.dumps({
            "success": True,
            "financial_overview": topic,
            "steps": [
                {
                    "step": 1,
                    "title": "Analyze Situation",
                    "prompt": summary_prompt,
                    "output": summary
                },
                {
                    "step": 2,
                    "title": "Extract Action Steps",
                    "prompt": key_points_prompt,
                    "output": key_points
                },
                {
                    "step": 3,
                    "title": "Generate Reflection Questions",
                    "prompt": questions_prompt,
                    "output": questions
                }
            ]
        }, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
