# Coding Assignment 2 - Module 4: AlphaStrategist Multi-Agent Swarm (Collaborative Agent System)
# Orchestrates 3 specialized autonomous agents (Market Research Agent -> Risk Analyst Agent -> Executive Strategy Agent)
# that pass messages and collaborate iteratively to solve complex financial planning tasks.

import os
import sys
import json
from common import get_llm_response

def run_agent_1_research(task_description, user_profile):
    """Agent 1: Market Intelligence & Research Specialist"""
    system_prompt = (
        "You are Agent 1 (Market Intelligence & Macroeconomic Researcher) in an autonomous multi-agent financial swarm. "
        "Your sole task is to investigate macroeconomic conditions, benchmark asset returns, inflation rates, "
        "and growth avenues relevant to the user's financial objective. "
        "Provide an objective, data-dense Intelligence Brief for Agent 2 (The Risk Analyst)."
    )
    user_prompt = f"""
TASK & GOAL:
{task_description}

USER FINANCIAL CONTEXT:
{user_profile}

OUTPUT YOUR AGENT 1 INTELLIGENCE BRIEF:
- Macro & Sector Backdrop
- Historical Return Benchmarks & Asset Classes
- Key Catalysts & Growth Vectors
- Specific Market Opportunities
"""
    return get_llm_response(user_prompt, system_prompt)

def run_agent_2_analyst(task_description, user_profile, agent1_brief):
    """Agent 2: Quantitative Risk & Financial Stress-Testing Analyst"""
    system_prompt = (
        "You are Agent 2 (Quantitative Risk Analyst & Stress-Tester) in an autonomous multi-agent financial swarm. "
        "Your task is to take the Market Intelligence Brief from Agent 1 and evaluate all downside risks, volatility exposures, "
        "liquidity bottlenecks, and worst-case stress test scenarios (e.g. market crash, sudden income drop, high inflation). "
        "Provide a rigorous Risk & Stress-Test Assessment for Agent 3 (The Executive Strategist)."
    )
    user_prompt = f"""
ORIGINAL GOAL:
{task_description}

USER CONTEXT:
{user_profile}

HANDOVER FROM AGENT 1 (RESEARCH BRIEF):
\"\"\"
{agent1_brief}
\"\"\"

OUTPUT YOUR AGENT 2 RISK ASSESSMENT:
- Volatility, Sharpe & Drawdown Sensitivity
- Liquidity & Cash-flow Buffer Requirements
- 3 Stress-Testing Scenarios (Mild Correction, Severe Recession, High Inflation)
- Risk Constraints & Allocation Ceilings
"""
    return get_llm_response(user_prompt, system_prompt)

def run_agent_3_strategist(task_description, user_profile, agent1_brief, agent2_assessment):
    """Agent 3: Executive Strategy & Masterplan Synthesis Agent"""
    system_prompt = (
        "You are Agent 3 (Executive Financial Strategist & Master Synthesizer) in an autonomous multi-agent financial swarm. "
        "Your role is to synthesize the Market Intelligence from Agent 1 and the Risk Constraints from Agent 2 into a single, "
        "flawless, milestone-driven Financial Masterplan in GitHub-Flavored Markdown."
    )
    user_prompt = f"""
ORIGINAL GOAL:
{task_description}

USER PROFILE:
{user_profile}

AGENT 1 RESEARCH INTELLIGENCE:
\"\"\"
{agent1_brief}
\"\"\"

AGENT 2 RISK & STRESS TEST ASSESSMENT:
\"\"\"
{agent2_assessment}
\"\"\"

CONSTRUCT THE FINAL COLLABORATIVE MULTI-AGENT MASTERPLAN:
# 🚀 AlphaStrategist Collaborative Masterplan

## 1. Multi-Agent Synthesis & Strategic Alignment
- Summary of how Research and Risk insights were integrated to reach this consensus.

## 2. Recommended Asset & Budget Allocation Model
- Provide a clear Markdown Table with Target Percentage Allocation, Recommended Vehicles (e.g. Index Funds, Debt/FDs, Gold Sovereign, Emergency Liquid Funds), and Expected Yield Range.

## 3. Phased Execution Roadmap
- **Phase 1: Immediate Foundation (Days 1–30)**
- **Phase 2: Tactical Accumulation & Compounding (Months 1–12)**
- **Phase 3: Long-term Optimization & Milestone Checkpoints (Years 2+)**

## 4. Automated Risk Controls & Contingency Triggers
- Automatic rebalancing triggers (e.g. +/- 5% drift), Stop-loss/Emergency draw protocols.

## 5. Swarm Consensus KPI Dashboard
- Specific quantifiable metrics to measure success each quarter.
"""
    return get_llm_response(user_prompt, system_prompt)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Missing Arguments",
            "message": "Usage: python multi_agent_swarm.py <goal_task_description> [user_profile_context]"
        }))
        sys.exit(1)
        
    task_description = sys.argv[1]
    user_profile = sys.argv[2] if len(sys.argv) > 2 else "Monthly Income: ₹1,20,000; Monthly Expenses: ₹45,000; Savings: ₹3,50,000; Risk Tolerance: Moderate"
    
    try:
        # Step 1: Agent 1 - Research
        agent1_brief = run_agent_1_research(task_description, user_profile)
        
        # Step 2: Agent 2 - Analyst
        agent2_assessment = run_agent_2_analyst(task_description, user_profile, agent1_brief)
        
        # Step 3: Agent 3 - Executive Synthesis
        final_strategy = run_agent_3_strategist(task_description, user_profile, agent1_brief, agent2_assessment)
        
        # Build swarm trace log
        swarm_timeline = [
            {
                "agent_id": "Agent-1",
                "agent_name": "Market Intelligence Agent",
                "role": "Macro & Opportunity Research",
                "status": "Completed",
                "handover_target": "Agent-2 (Risk Analyst)",
                "output_preview": agent1_brief[:280] + "..."
            },
            {
                "agent_id": "Agent-2",
                "agent_name": "Quantitative Risk Analyst",
                "role": "Stress-Testing & Risk Modeling",
                "status": "Completed",
                "handover_target": "Agent-3 (Executive Strategist)",
                "output_preview": agent2_assessment[:280] + "..."
            },
            {
                "agent_id": "Agent-3",
                "agent_name": "Executive Strategy Synthesizer",
                "role": "Final Masterplan Orchestration",
                "status": "Consensus Reached",
                "handover_target": "User / Portfolio Engine",
                "output_preview": final_strategy[:280] + "..."
            }
        ]

        output = {
            "success": True,
            "system": "AlphaStrategist Multi-Agent Swarm",
            "task": task_description,
            "user_profile": user_profile,
            "agents_collaborated": 3,
            "swarm_timeline": swarm_timeline,
            "agent_1_research": agent1_brief,
            "agent_2_analysis": agent2_assessment,
            "final_consensus_report": final_strategy
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": "Multi-Agent Swarm Execution Failure",
            "message": str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
