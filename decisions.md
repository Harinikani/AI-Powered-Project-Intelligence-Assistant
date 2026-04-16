# DECISIONS.md

## Key Technical Decisions and Trade-offs

This document records the main technical decisions I made while building the AI-Powered Project Intelligence Assistant. I kept the system practical and simple because the main goal was to get a working end-to-end prototype that I can explain clearly.

---

## 1. I used a two-agent design instead of building many agents

**Decision**
I split the system into:

- Document Q&A Agent
- Data Analysis Agent

A router decides which one should handle the user’s question.

**Why I chose this**
The assignment requires at least these two agent types, so I focused on implementing the minimum architecture properly before adding more complexity. This gave me a cleaner separation between text-heavy document questions and spreadsheet/data questions.

**Trade-off**
This is less advanced than having more specialised agents like a risk agent, summary agent, or validation agent. Some questions may also sit between both categories, so the routing is not perfect.

**Why I still think it was the right decision**
As a junior developer, I wanted a design that is realistic to finish, debug, and explain during interview. A smaller multi-agent system is easier to reason about and less likely to break.

---

## 2. I used Gemini for both the LLM and embeddings

**Decision**
I used Gemini models for answer generation and Gemini embeddings for document indexing.

**Why I chose this**
Using the same provider for both parts kept the stack simpler. It reduced setup time, avoided mixing too many services, and made the implementation easier to manage.

**Trade-off**
This gives less flexibility compared to mixing providers. For example, another embedding model might perform better for retrieval, or another LLM might be cheaper.

**Why I still think it was the right decision**
For this assessment, I preferred consistency and faster implementation over heavy optimisation. My goal was to build something stable first.

---

## 3. I used Chroma as the vector database

**Decision**
I stored document embeddings in Chroma and persisted them locally in `my_vector_db`.

**Why I chose this**
Chroma is lightweight, easy to integrate with LangChain, and suitable for a prototype. I did not need to set up an external hosted vector database, which saved time and kept the project easier to run locally.

**Trade-off**
A local vector database is not the best choice for large-scale production systems. It is less scalable than managed options and may be harder to operate under heavier traffic.

**Why I still think it was the right decision**
This project is a take-home assessment, not a production system. Chroma was enough for the size of the synthetic dataset and let me focus more on the RAG pipeline and agent flow.

---

## 4. I used a RAG pipeline for document questions instead of asking the LLM directly

**Decision**
For document-related questions, I retrieve relevant chunks from the vector database first, then send those chunks together with the user’s query to the LLM.

**Why I chose this**
The assistant needs to answer based on uploaded project documents and provide citations. If I relied only on the LLM without retrieval, the answers would be much less grounded and more likely to hallucinate.

**Trade-off**
RAG adds more components such as chunking, embedding, storing vectors, and retrieval tuning. This makes the system more complex than a direct prompt-to-LLM approach.

**Why I still think it was the right decision**
Since the assessment is based on project files, RAG is the more correct approach. It improves factual grounding and supports source-based answers.

---

## 5. I handled spreadsheet questions separately using a Data Analysis path

**Decision**
Questions about CSV or Excel data go through the Data Analysis Agent, which loads the data and runs pandas-style logic before optionally using the LLM to explain the result.

**Why I chose this**
Tabular questions are different from document questions. For example, if the user asks about totals, budgets, or comparisons, it is better to calculate directly from the data rather than depend only on semantic retrieval.

**Trade-off**
This creates two different answer flows in the backend, which increases code branching. It also means the router has to decide correctly which path to use.

**Why I still think it was the right decision**
This separation makes the system more reliable for financial or structured questions. It also makes the agent roles clearer.

---

## 6. I added lightweight session memory instead of building a full memory system

**Decision**
I used `session_id` and recent chat history so the system can support follow-up questions in the same conversation.

**Why I chose this**
The assessment requires follow-up queries within a conversation session. A lightweight session memory was enough to support that without building a more complex long-term memory design.

**Trade-off**
This is limited compared to a full conversation memory system. Only recent context is used, so the assistant may still miss older details from the same session.

**Why I still think it was the right decision**
It satisfies the core requirement while keeping the implementation manageable. It was a practical middle ground between no memory and over-engineering memory.

---

## 7. I used FastAPI and Next.js because they are simple and practical for this project

**Decision**
I used FastAPI for the backend and Next.js/React with TypeScript for the frontend.

**Why I chose this**
FastAPI is good for building clean REST APIs quickly, and Next.js/React makes it straightforward to build a file upload plus chat-style interface. TypeScript also helps keep frontend code safer and easier to manage.

**Trade-off**
This still requires handling both frontend and backend separately, which adds coordination work compared to a single full-stack framework.

**Why I still think it was the right decision**
These tools are common, well-supported, and fit the assessment requirements well. They also make the project easier for another developer to understand later.

---

## 8. I prioritised a working prototype over advanced optimisation

**Decision**
I focused on getting the full pipeline working first: upload, ingest, index, route, answer, and return citations.

**Why I chose this**
The assignment values a working system and clean reasoning more than unnecessary complexity. I wanted to make sure the main user flow worked from end to end.

**Trade-off**
Because of that, some advanced improvements were not prioritised, such as better observability, stronger prompt-injection protection, retrieval evaluation, or more advanced routing.

**Why I still think it was the right decision**
Shipping a complete and explainable prototype is more important than half-finishing many advanced features.

---

## Final Reflection

Most of my decisions were based on one main principle: keep the system simple, modular, and explainable. As a junior developer, I think it is better to submit a smaller architecture that works and that I fully understand, rather than a bigger design that is harder to defend during the interview.
