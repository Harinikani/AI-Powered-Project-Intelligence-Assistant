import os
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google import genai
from database.client import collection  # your chroma collection
from dotenv import load_dotenv
from services.storage.document_store import add_document

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=100
)

def get_embeddings(texts):
    embeddings = []

    for text in texts:
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text,
            config={"task_type": "RETRIEVAL_DOCUMENT"}
        )
        embeddings.append(response.embeddings[0].values)

    return embeddings


def ingest_pdf(pdf_path: str):
    reader = PdfReader(pdf_path)

    filename = os.path.basename(pdf_path)
    chunk_counter = 0
    docs, ids, metas = [], [], []

    for page_idx, page in enumerate(reader.pages):
        text = page.extract_text()

        if not text or not text.strip():
            continue

        chunks = text_splitter.split_text(text)

        for chunk_idx, chunk in enumerate(chunks):
            docs.append(chunk)

            ids.append(f"{filename}_chunk_{chunk_counter}")

            metas.append({
                "filename": filename,
                "page": page_idx,
                "chunk_index": chunk_counter,
                "chunk_in_page": chunk_idx
            })

            chunk_counter += 1


    if not docs:
        return 0

    embeddings = get_embeddings(docs)

    collection.add(
        documents=docs,
        embeddings=embeddings,
        ids=ids,
        metadatas=metas
    )

    # ✅ Store document metadata
    add_document(filename, len(docs))

    return len(docs)