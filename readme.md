# AI-Powered Project Intelligence Assistant

A multi-agent RAG system that ingests project documents and answers questions about project status, risks, budgets, and structured data.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Backend:** Python, FastAPI, LangChain
- **LLM / Embeddings:** Gemini
- **Vector Database:** Chroma

## Features

- Upload PDF, CSV, and Excel (`.xlsx`) files
- Ask questions with follow-up support using `session_id`
- Route questions to:
  - **Document Q&A Agent** for document-based queries
  - **Data Analysis Agent** for spreadsheet / tabular queries

- Retrieve answers with source citations

## Project Structure

```bash
frontend/   # Next.js frontend
backend/    # FastAPI backend
backend/my_vector_db/  # Chroma persisted vector store
```

## Prerequisites

Make sure you have these installed:

- **Node.js** 18+
- **Python** 3.10+
- **pip**
- A valid **Gemini API key**

## 1. Clone the repository

```bash
git clone <your-repo-url>
cd <your-repo-folder>
```

## 2. Backend setup

Go into the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it:

**Windows**

```bash
venv\Scripts\activate
```

**macOS / Linux**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the backend folder and add your Gemini key:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_DEFAULT_MODEL=your_modelname_here
GEMINI_HEAVY_MODEL=your_modelname_here
```

Run the FastAPI server:

```bash
uvicorn main:app --reload
```

Backend should run on:

```bash
http://127.0.0.1:8000
```

## 3. Frontend setup

Open a new terminal and go into the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file if needed for your frontend API base URL:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Run the frontend:

```bash
npm run dev
```

Frontend should run on:

```bash
http://localhost:3000
```

## 4. How to use

1. Open the frontend in your browser.
2. Upload PDF, CSV, or Excel files.
3. Start a chat session.
4. Ask a document question or a data question.
5. The system will route the query to the correct agent and return the answer.

## Example Queries

- What are the main risks mentioned in the latest status report?
- Which project has the highest budget variance?
- Summarise the project delays from the uploaded reports.
- What is the total cost in the financial summary?

## Notes

- Chroma vectors are stored locally in `my_vector_db`.
- Session-based follow-up questions depend on `session_id`.
- If no documents are uploaded, document retrieval answers may be empty or weak.

## Known Limitations

- Routing is still basic and may misclassify some queries.
- The system is designed as a prototype, not a production deployment.
- Error handling and validation can still be improved.

## License

For assessment / demo purposes only.
