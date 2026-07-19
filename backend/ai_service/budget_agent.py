# Coding Assignment 1 - Task 3: Agentic AI
# Implements an autonomous AI Agent Planner with a Planning, Execution (using tools like Calculator, Compound Interest, Rules Lookup), and Synthesis loop.
import sys
import json
import re
from common import get_llm_response

# Define Agent Tools
def tool_calculator(expression):
    """Safely evaluate a mathematical expression."""
    clean_expr = re.sub(r'[^0-9+\-*/().\s**]', '', expression)
    try:
        result = eval(clean_expr, {"__builtins__": None})
        return str(result)
    except Exception as e:
        return f"Error evaluating expression: {str(e)}"

def tool_financial_rules(rule_name):
    """Retrieve guidelines for budgeting systems (e.g., 50/30/20, 70/20/10, zero-based)."""
    rules = {
        "50/30/20": "Needs (Rent/Bills/Groceries): 50%, Wants (Dining/Leisure): 30%, Savings/Debts: 20%.",
        "70/20/10": "Living Costs: 70%, Savings/Investments: 20%, Repayments/Donations: 10%.",
        "zero-based": "Zero-Based Budgeting: Allocate all monthly income to specific categories so that income minus expenses equals exactly zero."
    }
    for key in rules:
        if key in rule_name.lower():
            return rules[key]
    return "Budgeting rule not found. Recommended split: 50% Needs, 30% Wants, 20% Savings."

def tool_compound_interest(params_str):
    """Calculate compound interest. Format: principal,annual_rate,years,compounds_per_year. Example: 5000,0.06,3,12"""
    try:
        cleaned_params = re.sub(r'[^0-9.,-]', '', params_str)
        parts = [float(x.strip()) for x in cleaned_params.split(',')]
        p = parts[0]
        r = parts[1]
        t = parts[2]
        n = parts[3] if len(parts) > 3 else 1
        
        amount = p * ((1 + r/n) ** (n*t))
        interest = amount - p
        return f"Principal: ${p:,.2f}, Annual Rate: {r*100}%, Years: {t}, Compounding Periods/Yr: {n}. Final Value: ${amount:,.2f}, Interest Earned: ${interest:,.2f}"
    except Exception as e:
        return f"Error in interest calculation: {str(e)}"

TOOLS = {
    "calculator": tool_calculator,
    "financial_rules": tool_financial_rules,
    "compound_interest": tool_compound_interest
}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Missing Argument",
            "message": "Usage: python budget_agent.py <budget_task>"
        }))
        sys.exit(1)
        
    task = sys.argv[1]
    
    try:
        # Step 1: Planning with strict financial task validation
        planning_prompt = f"""
You are the Planning Module of an Agentic AI.
The user wants to complete the following budgeting task: "{task}"

Your expertise is strictly limited to personal finance, budgeting, saving money, investing, compound interest calculations, and wealth planning.
If the task is not related to finance or saving money (e.g. general code, general trivia, unrelated science, creative writing, etc.), you must create a single-step plan specifying:
- description: "Decline task because it is unrelated to finance"
- tool: "llm_reasoning"
- tool_input: "refuse_unrelated_topic"

Available Tools:
1. calculator(expression): Evaluates mathematical formulas. Example: "(4000 * 0.5) + 300"
2. financial_rules(rule_name): Returns guidelines for systems like "50/30/20", "70/20/10", or "zero-based".
3. compound_interest(p,r,t,n): Calculates interest. Format params as 'principal,rate,years,compounds_per_year'. Example: '5000,0.06,3,12'

Based on the task and available tools, create a step-by-step plan (max 3 steps).
For each step, specify:
- Step description
- Tool to use: either 'calculator', 'financial_rules', 'compound_interest', or 'llm_reasoning'
- Input parameter for the tool

Respond ONLY in a structured JSON format as a list of steps, like this:
[
  {{"step_number": 1, "description": "step description here", "tool": "tool_name", "tool_input": "input_string"}},
  ...
]
"""
        plan_str = get_llm_response(planning_prompt, "You are a precise JSON generator. Output only the JSON list.")
        
        # Clean potential markdown wrapping
        plan_str_clean = plan_str.replace("```json", "").replace("```", "").strip()
        try:
            plan = json.loads(plan_str_clean)
        except Exception:
            plan = [
                {"step_number": 1, "description": "Analyze request and perform calculations", "tool": "calculator", "tool_input": task},
                {"step_number": 2, "description": "Synthesize final answer", "tool": "llm_reasoning", "tool_input": "Synthesize"}
            ]

        execution_log = []
        
        # Step 2: Execution
        for step in plan:
            step_num = step.get("step_number")
            desc = step.get("description")
            tool_name = step.get("tool")
            tool_input = step.get("tool_input")
            
            log_entry = {
                "step": step_num,
                "description": desc,
                "tool": tool_name,
                "input": tool_input,
                "output": ""
            }
            
            if tool_name in TOOLS:
                log_entry["output"] = TOOLS[tool_name](tool_input)
            elif tool_name == "llm_reasoning":
                reason_prompt = f"Perform the following step of the task:\nStep: {desc}\nInput/Context: {tool_input}\nOriginal Task: {task}"
                log_entry["output"] = get_llm_response(reason_prompt, "You are the Execution Module of an AI Agent.")
            else:
                log_entry["output"] = "Skipping: tool unknown."
                
            execution_log.append(log_entry)
            
        # Step 3: Synthesis / Final Answer
        history_str = "\n".join([f"Step {e['step']}: {e['description']}\nTool Used: {e['tool']}\nInput: {e['input']}\nOutput: {e['output']}" for e in execution_log])
        
        synthesis_prompt = f"""
You are the Synthesis Module of an Agentic AI.
The original task was: "{task}"
Here is the step-by-step execution log of the tools:
{history_str}

If the log contains 'refuse_unrelated_topic', you must refuse to process the task, stating that you can only assist with personal finance, budgeting, and money-saving tasks.
Otherwise, please synthesize the final answer for the user. Explain the steps that were taken, show any calculations, and present the final output in an elegant, comprehensive manner.
"""
        final_answer = get_llm_response(synthesis_prompt, "You are a professional financial advisor and AI agent helper.")
        
        print(json.dumps({
            "success": True,
            "task": task,
            "plan": plan,
            "execution": execution_log,
            "final_output": final_answer
        }, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
