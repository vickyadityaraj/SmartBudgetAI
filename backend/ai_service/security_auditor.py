# Coding Assignment 2 - Module 3: Sentinel Fraud & Threat Auditor (Security Log Agent)
# Autonomous agent that analyzes financial transaction & auth logs, identifies potential threats,
# classifies severity levels (CRITICAL/HIGH/MEDIUM/LOW), and produces mitigation playbooks.

import os
import sys
import json
import re
from common import get_llm_response

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Missing Arguments",
            "message": "Usage: python security_auditor.py <logs_or_scenario_text>"
        }))
        sys.exit(1)
        
    logs_content = sys.argv[1]
    
    try:
        system_prompt = (
            "You are Sentinel SecOps AI, an autonomous cybersecurity and financial fraud audit agent. "
            "Your role is to inspect authentication logs, financial transactions, API audit trails, and security alerts. "
            "You must detect anomalies (impossible travel, velocity fraud, credential stuffing, privilege escalation, token hijacking), "
            "classify severity levels (CRITICAL, HIGH, MEDIUM, LOW), map to attack tactics, and provide actionable, step-by-step mitigation playbooks."
        )
        
        user_prompt = f"""
Analyze the following security and transaction log stream:

LOG / ALERT INPUT:
\"\"\"
{logs_content}
\"\"\"

PLEASE PERFORM A RIGOROUS SECURITY & FRAUD AUDIT AND OUTPUT IN CLEAN MARKDOWN:

# 🛡️ Sentinel Threat & Fraud Audit Report

## 1. Incident Overview & Executive Summary
- Provide a crisp summary of the detected incident, attack vector, and affected system/accounts.

## 2. Severity Classification & Risk Rating
- **Severity Level**: [CRITICAL / HIGH / MEDIUM / LOW]
- **Risk Score**: [1 to 100 / 100]
- **Estimated Financial Exposure**: [e.g., ₹X,XXX or $X,XXX]
- **Attack Vector / Classification**: [e.g., Credential Stuffing / Velocity Drain / Privilege Escalation / Token Hijack]

## 3. Threat Breakdown & Indicators of Compromise (IoCs)
- Construct a Markdown table containing:
  | Timestamp / Log Line | Entity / IP / Account | Anomaly Detected | Threat Classification |
- List identified malicious IPs, anomalous user agents, or flagged account IDs.

## 4. Root Cause & Behavioral Analysis
- Explain step-by-step how the threat actor attempted or achieved the attack.

## 5. Immediate Mitigation Playbook (Action Plan)
- **Phase 1: Immediate Containment (0-15 min)**
  - Exact actions (e.g. freeze card #, revoke JWT session token, block CIDR IP, force password reset).
- **Phase 2: Remediation & Forensic Rollback (15-60 min)**
  - Reversal of fraudulent transactions, quarantine affected user profile, restore permissions.
- **Phase 3: Regulatory & Compliance Reporting**
  - Drafting incident notification for CERT-In / RBI / GDPR / FTC protocols.
- **Phase 4: Preventative Security Hardening**
  - Rule updates for WAF, rate limit policies, step-up biometric MFA enforcement.
"""

        audit_markdown = get_llm_response(user_prompt, system_prompt)
        
        # Determine high-level severity from text
        severity = "MEDIUM"
        if "CRITICAL" in audit_markdown[:600].upper() or "CRITICAL" in audit_markdown:
            severity = "CRITICAL"
        elif "HIGH" in audit_markdown[:600].upper() or "HIGH" in audit_markdown:
            severity = "HIGH"
        elif "LOW" in audit_markdown[:600].upper():
            severity = "LOW"

        output = {
            "success": True,
            "agent": "Sentinel Fraud & Threat Auditor",
            "severity_level": severity,
            "audit_report_markdown": audit_markdown,
            "threats_detected": 1 if severity in ["CRITICAL", "HIGH"] else 0,
            "remediation_status": "Playbook Generated"
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": "Security Audit Failure",
            "message": str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
