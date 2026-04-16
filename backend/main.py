# =============================================================================
# FILE: main.py
# DESCRIPTION: FastAPI application entry point 
# =============================================================================

from fastapi import FastAPI, UploadFile, File, HTTPException

from fastapi.middleware.cors import CORSMiddleware

import shutil
import os

from services.ingestion.pdf_ingestion import ingest_pdf 
from services.ingestion.tabular_ingestion import ingest_tabular_file 
from services.storage.chat_store import get_chat_history
from services.storage.document_store import list_documents
from services.storage.chat_store import add_chat, get_recent_chat_history, get_chat_sessions, get_chat_history
from agents.router_agent import route_query
from database.client import collection 
from pydantic import BaseModel
from fastapi import HTTPException



# Import routers
# from routes import auth, users, species, friendships, reports, scanned_species, vouchers, points, badges, quiz

# Create FastAPI application instance
app = FastAPI(
    title="AI-Powered Project Intelligence Assistant",
    description="A system that ingests project documents (PDFs, spreadsheets) and answers complex questions about project status, risks, and budgets using a multi-agent RAG architecture.",
    version="1.0.0"
)

# Configure CORS middleware - FIXED VERSION
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://appia-frontend-697926445452.us-central1.run.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Include all API routers
# app.include_router(auth.router)           # Authentication endpoints


# =============================================================================
# ROOT ENDPOINTS
# =============================================================================

@app.get("/")
async def root() -> dict:
    """
    Root endpoint - API welcome message
    
    Returns:
        dict: Welcome message and API information
    """
    return {
        "message": "Welcome to AI-Powered Project Intelligence Assistant API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "documentation": "/docs",
            "health_check": "/health"
        }
    }

@app.get("/health")
async def health_check() -> dict:
    """
    Health check endpoint for monitoring
    
    Returns:
        dict: API health status and timestamp
    """
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "APPIA API",
        "version": "1.0.0",
    }


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 🔥 Route ingestion based on file type
        if file.filename.endswith(".pdf"):
            num_chunks = ingest_pdf(file_path)

        elif file.filename.endswith((".csv", ".xlsx", ".xls")):
            num_chunks = ingest_tabular_file(file_path)

        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type"
            )

        return {
            "message": "File uploaded and processed successfully",
            "filename": file.filename,
            "chunks_added": num_chunks
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AskRequest(BaseModel):
    session_id: str
    question: str

@app.post("/ask")
async def ask_question_api(payload: AskRequest):
    try:
        recent_history = get_recent_chat_history(payload.session_id, limit=5)

        result = route_query(
            query=payload.question,
            chat_history=recent_history
        )

        add_chat(
            session_id=payload.session_id,
            question=result["query"],
            answer=result["answer"],
            agent=result["agent"]
        )

        return {
            "question": result["query"],
            "agent_used": result["agent"],
            "answer": result["answer"],
            "session_id": payload.session_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

    
@app.get("/chat-sessions")
async def list_chat_sessions():
    try:
        sessions = get_chat_sessions()
        return {
            "count": len(sessions),
            "sessions": sessions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/chat-sessions/{session_id}")
async def get_session_messages(session_id: str):
    try:
        history = get_chat_history(session_id=session_id)
        return {
            "session_id": session_id,
            "messages": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents")
async def get_documents():
    return {
        "documents": list_documents()
    }


@app.get("/documents/{filename}/chunks")
async def get_chunks(filename: str):
    try:
        results = collection.get(
            where={"filename": filename}
        )

        if not results["documents"]:
            return {
                "message": "No chunks found for this document",
                "filename": filename
            }

        return {
            "filename": filename,
            "total_chunks": len(results["documents"]),
            "chunks": [
                {
                    "chunk_index": meta.get("chunk_index"),
                    "page": meta.get("page"),
                    "row": meta.get("row"),  
                    "preview": doc[:200]  # truncate for UI
                }
                for doc, meta in zip(results["documents"], results["metadatas"])
            ]
        }

    except Exception as e:
        return {"error": str(e)}
    


