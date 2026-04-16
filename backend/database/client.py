import chromadb

# Persistent DB (stored on disk)
client = chromadb.PersistentClient(path="./my_vector_db")

# IMPORTANT: No embedding function here
# because we manually pass Gemini embeddings
collection = client.get_or_create_collection(
    name="project_docs"
)