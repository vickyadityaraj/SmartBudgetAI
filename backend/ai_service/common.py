import os
import sys
import json
from dotenv import load_dotenv

# Try to load .env from several levels up
possible_dotenv_paths = [
    os.path.join(os.path.dirname(__file__), '..', '..', '.env'),
    os.path.join(os.path.dirname(__file__), '..', '.env'),
    os.path.join(os.path.dirname(__file__), '.env'),
]

for path in possible_dotenv_paths:
    if os.path.exists(path):
        load_dotenv(path)
        break

def get_api_key():
    groq_key = os.environ.get("GROQ_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    return groq_key, gemini_key, openai_key

def get_llm_response(prompt, system_instruction=None):
    groq_key, gemini_key, openai_key = get_api_key()
    
    if not groq_key and not gemini_key and not openai_key:
        print(json.dumps({
            "error": "API Key Missing",
            "message": "Please configure GROQ_API_KEY in your .env file."
        }))
        sys.exit(1)
        
    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})
            
            # Candidate models to try in order
            candidate_models = [
                "openai/gpt-oss-120b",
                "qwen/qwen3.8-27b",
                "openai/gpt-oss-20b",
                "llama-3.3-70b-versatile",
                "llama-3.1-70b-versatile",
                "llama3-70b-8192"
            ]
            
            last_err = None
            for model_candidate in candidate_models:
                try:
                    response = client.chat.completions.create(
                        model=model_candidate,
                        messages=messages
                    )
                    return response.choices[0].message.content
                except Exception as me:
                    last_err = me
                    continue
            
            if last_err and not gemini_key and not openai_key:
                print(json.dumps({
                    "error": "Groq API Error",
                    "message": str(last_err)
                }))
                sys.exit(1)
        except Exception as e:
            if not gemini_key and not openai_key:
                print(json.dumps({
                    "error": "Groq API Error",
                    "message": str(e)
                }))
                sys.exit(1)
                
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            
            # Using gemini-1.5-flash
            model_name = 'gemini-1.5-flash'
            
            if system_instruction:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=system_instruction
                )
            else:
                model = genai.GenerativeModel(model_name=model_name)
                
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            if not openai_key:
                print(json.dumps({
                    "error": "Gemini API Error",
                    "message": str(e)
                }))
                sys.exit(1)
                
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
            return response.choices[0].message.content
        except Exception as e:
            print(json.dumps({
                "error": "OpenAI API Error",
                "message": str(e)
            }))
            sys.exit(1)
