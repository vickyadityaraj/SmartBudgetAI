# Coding Assignment 1 - Task 4: RAG Q&A
# Implements Document Text Extraction (PDF/TXT), chunking, in-memory TF-IDF semantic retrieval, and context-grounded LLM response generation.
import os
import sys
import json
import math
import re
from collections import Counter
from common import get_llm_response

def extract_text_from_file(filepath):
    _, ext = os.path.splitext(filepath.lower())
    if ext == '.txt':
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    elif ext == '.pdf':
        try:
            from pypdf import PdfReader
            reader = PdfReader(filepath)
            text = ""
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
            return text
        except ImportError:
            raise Exception("pypdf library not installed. Please install it using pip.")
    else:
        raise Exception(f"Unsupported file type: {ext}. Only .txt and .pdf are supported.")

def chunk_text(text, chunk_size=500, overlap=100):
    chunks = []
    start = 0
    text_len = len(text)
    
    if text_len <= chunk_size:
        return [text]
        
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
        
    return chunks

def tokenize(text):
    return re.findall(r'\w+', text.lower())

def compute_tfidf(chunks):
    dfs = Counter()
    tfs_list = []
    for chunk in chunks:
        tokens = tokenize(chunk)
        tf = Counter(tokens)
        tfs_list.append(tf)
        for t in set(tokens):
            dfs[t] += 1
            
    num_docs = len(chunks)
    idfs = {}
    for word, df in dfs.items():
        idfs[word] = math.log((1 + num_docs) / (1 + df)) + 1
        
    return tfs_list, idfs

def retrieve_relevant_chunks(query, chunks, tfs_list, idfs, top_k=3):
    query_tokens = tokenize(query)
    scores = []
    
    for idx, tf in enumerate(tfs_list):
        score = 0
        for q_t in query_tokens:
            if q_t in tf:
                score += tf[q_t] * idfs.get(q_t, 0)
        scores.append((score, idx))
        
    scores.sort(key=lambda x: x[0], reverse=True)
    
    results = [chunks[idx] for score, idx in scores[:top_k] if score > 0]
    if not results:
        results = chunks[:top_k]
        
    return results

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Missing Arguments",
            "message": "Usage: python doc_analyzer.py <document_path> <query>"
        }))
        sys.exit(1)
        
    doc_path = sys.argv[1]
    query = sys.argv[2]
    
    if not os.path.exists(doc_path):
        print(json.dumps({
            "error": "File Not Found",
            "message": f"The document file at {doc_path} does not exist."
        }))
        sys.exit(1)
        
    try:
        # 1. Document Extraction
        text = extract_text_from_file(doc_path)
        
        # 2. Text Chunking
        chunks = chunk_text(text)
        
        # 3. TF-IDF Calculation & Retrieval
        tfs_list, idfs = compute_tfidf(chunks)
        relevant_chunks = retrieve_relevant_chunks(query, chunks, tfs_list, idfs, top_k=3)
        
        context = "\n---\n".join(relevant_chunks)
        
        # 4. Grounded LLM Response with financial relevance validation
        rag_prompt = f"""
You are an expert Question Answering assistant for bank statements, tax policies, and financial documents. 
Answer the user query based ONLY on the provided context.

Your responses and analysis MUST be strictly restricted to financial, budgeting, saving money, transactional, billing, tax, or investment topics.
If the query or context is unrelated to finance, you must politely decline to answer, explaining that your capability is strictly limited to financial documents.

Context:
{context}

Query:
{query}

Answer:
"""
        answer = get_llm_response(rag_prompt, "You are a precise financial document assistant. You must refuse to answer any questions not related to finance or saving money.")
        
        print(json.dumps({
            "success": True,
            "document": os.path.basename(doc_path),
            "query": query,
            "retrieved_context_chunks": relevant_chunks,
            "answer": answer
        }, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
