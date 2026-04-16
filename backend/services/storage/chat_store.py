import json
import os
from datetime import datetime
from typing import List, Dict, Optional

DB_PATH = "data/chat_history.json"
os.makedirs("data", exist_ok=True)


def _load() -> List[Dict]:
    if not os.path.exists(DB_PATH):
        return []

    with open(DB_PATH, "r", encoding="utf-8") as f:
        content = f.read().strip()
        if not content:
            return []
        return json.loads(content)


def _save(data: List[Dict]):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def add_chat(session_id: str, question: str, answer: str, agent: str):
    data = _load()

    record = {
        "id": len(data) + 1,
        "session_id": session_id,
        "question": question,
        "answer": answer,
        "agent": agent,
        "timestamp": datetime.utcnow().isoformat()
    }

    data.append(record)
    _save(data)
    return record


def get_chat_history(session_id: Optional[str] = None):
    data = _load()

    if session_id is None:
        return data

    return [item for item in data if item.get("session_id") == session_id]


def get_recent_chat_history(session_id: str, limit: int = 5):
    history = get_chat_history(session_id=session_id)
    return history[-limit:]


def get_chat_sessions():
    """
    Returns exactly ONE item per session_id.
    Sidebar title is always the FIRST question in that session.
    """
    data = _load()

    grouped: Dict[str, List[Dict]] = {}

    for item in data:
        sid = str(item.get("session_id", "")).strip()
        if not sid:
            continue

        if sid not in grouped:
            grouped[sid] = []

        grouped[sid].append(item)

    sessions = []

    for sid, records in grouped.items():
        records.sort(key=lambda x: x.get("timestamp", ""))

        first_record = records[0]
        last_record = records[-1]

        sessions.append({
            "session_id": sid,
            "title": first_record.get("question", "Untitled chat"),
            "created_at": first_record.get("timestamp"),
            "last_updated": last_record.get("timestamp"),
            "message_count": len(records)
        })

    sessions.sort(key=lambda x: x["last_updated"] or "", reverse=True)
    return sessions