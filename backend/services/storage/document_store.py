import json
import os
from datetime import datetime

DB_PATH = "data/documents.json"
os.makedirs("data", exist_ok=True)

def _load():
    if not os.path.exists(DB_PATH):
        _save([])  # create file with []
        return []

    with open(DB_PATH, "r") as f:
        content = f.read().strip()

        if not content:
            return []

        return json.loads(content)

def _save(data):
    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=2)

def add_document(filename: str, chunks: int):
    data = _load()

    record = {
        "id": len(data) + 1,
        "filename": filename,
        "chunks": chunks,
        "uploaded_at": datetime.utcnow().isoformat()
    }

    data.append(record)
    _save(data)

    return record

def list_documents():
    return _load()