
from database.client import collection
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_query_embedding(text):
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config={"task_type": "RETRIEVAL_QUERY"}  # important!
    )
    return response.embeddings[0].values

def ask_question(question, n_results=3):
    query_embedding = get_query_embedding(question)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )
    
    # combine the found snippets into one single string of context
    retrieved_context = "\n\n".join(results['documents'][0])
    
    # returns these variables so that generation.py can use them
    return retrieved_context, question 