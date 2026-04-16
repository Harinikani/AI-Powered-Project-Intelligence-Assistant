import os
import re
import datetime
import importlib.util
from typing import Dict, Any, List

# =========================================================
# STEP 1: Import Document Q&A Agent normally
# =========================================================
# This works because document_qa_agent.py uses a valid Python file name.
from agents.document_qa_agent import ask_and_generate as ask_document_agent

from agents.data_analysis_agent import ask_and_generate as ask_data_agent




# =========================================================
# STEP 3: Rule-based Router Agent
# =========================================================
# This router decides which agent should handle the query
# WITHOUT using Gemini or any LLM for classification.
#
# The decision is based on:
# - keywords
# - query patterns
# - analytical vs narrative intent
#
# Output:
# - "data_analysis"
# - "document_qa"
def classify_query(query: str) -> str:
    q = query.lower().strip()

    # -----------------------------------------------------
    # 3.1 Strong analytical keywords
    # -----------------------------------------------------
    # These strongly suggest the user wants structured/tabular analysis.
    data_keywords = [
        "budget", "spend", "actual", "forecast", "variance",
        "cost", "financial", "finance", "amount", "total", "sum",
        "average", "avg", "count", "maximum", "minimum", "highest",
        "lowest", "compare", "comparison", "trend", "increase", "decrease",
        "over budget", "under budget", "missing", "null", "blank",
        "csv", "excel", "spreadsheet", "table", "row", "column",
        "group by", "filter", "sort", "project id"
    ]

    # -----------------------------------------------------
    # 3.2 Strong document / narrative keywords
    # -----------------------------------------------------
    # These suggest the user wants explanation from PDFs/reports.
    document_keywords = [
        "report", "pdf", "document", "summary", "summarize",
        "risk", "issue", "issues", "milestone", "timeline",
        "delay", "blocked", "status", "why", "reason",
        "explain", "what happened", "what does the report say",
        "according to the report", "page", "section"
    ]

    # -----------------------------------------------------
    # 3.3 Explicit analytical question patterns
    # -----------------------------------------------------
    # These are useful because users may ask in natural language
    # without obvious keywords.
    analytical_patterns = [
        r"\bhow much\b",
        r"\bwhat is the total\b",
        r"\bshow .*missing\b",
        r"\bwhich project .*over budget\b",
        r"\bcompare\b",
        r"\btrend\b",
        r"\bhighest\b",
        r"\blowest\b",
        r"\bsum of\b",
        r"\baverage of\b",
        r"\bcount of\b"
    ]

    # -----------------------------------------------------
    # 3.4 Score both sides
    # -----------------------------------------------------
    data_score = 0
    document_score = 0

    for keyword in data_keywords:
        if keyword in q:
            data_score += 2

    for keyword in document_keywords:
        if keyword in q:
            document_score += 2

    for pattern in analytical_patterns:
        if re.search(pattern, q):
            data_score += 3

    # -----------------------------------------------------
    # 3.5 Bias rules
    # -----------------------------------------------------
    # If user explicitly mentions spreadsheet-like objects,
    # strongly prefer Data Analysis Agent.
    if any(word in q for word in ["csv", "excel", "spreadsheet", "table", "row", "column"]):
        data_score += 3

    # If user explicitly asks about PDF/report/document,
    # strongly prefer Document Q&A Agent.
    if any(word in q for word in ["pdf", "report", "document", "page", "section"]):
        document_score += 3

    # -----------------------------------------------------
    # 3.6 Final decision
    # -----------------------------------------------------
    # Default fallback:
    # - if analytical score is higher -> data_analysis
    # - otherwise -> document_qa
    if data_score > document_score:
        return "data_analysis"

    return "document_qa"


# =========================================================
# STEP 4: Main router function
# =========================================================
# This is the entry point used by your backend.
# It:
# 1. classifies the query
# 2. sends it to the correct agent
# 3. returns both the selected agent and the answer
def route_query(query: str, chat_history: List[Dict] = None) -> Dict[str, Any]:
    selected_agent = classify_query(query)

    if selected_agent == "data_analysis":
        answer = ask_data_agent(query, chat_history=chat_history or [])
    else:
        answer = ask_document_agent(query, chat_history=chat_history or [])

     # -----------------------------------------------------
    # 5.6 Optional logging
    # -----------------------------------------------------
    # This mirrors your document agent logging style.
    log_entry = f"""
### Created at: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}
**Question:** {query}
**Response:** {answer}
**Response:** {selected_agent}
---
"""

    with open("recent_chats.md", "a", encoding="utf-8") as f:
        f.write(log_entry)

    

    return {
        "agent": selected_agent,
        "query": query,
        "answer": answer
    }





# =========================================================
# STEP 5: Optional local test block
# =========================================================
# You can run this file directly to test routing quickly.
# python -m agents.router_agent.py
# if __name__ == "__main__":
#     test_queries = [
#         "Which project is over budget?",
#         "What does the latest project report say about the solar farm delay?",
#         "Show rows with missing actual spend",
#         "Summarize the key risks in the bridge rehabilitation report",
#         "Compare forecast spend vs actual spend by project"
#     ]

#     for q in test_queries:
#         result = route_query(q)
#         print("=" * 80)
#         print(f"Query: {result['query']}")
#         print(f"Routed To: {result['agent']}")
#         print(f"Answer:\n{result['answer']}")
#         print()