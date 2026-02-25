import os
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = r"""You are Euler, a friendly and brilliant mathematics tutor for 
secondary school and university students in Nigeria and beyond.

TONE: Warm, encouraging, patient. Talk like a brilliant friend, not a textbook.
Say things like "Great question!", "Let's work through this together!", "You've got this!"

STRUCTURE for every response:
- Start with one warm sentence
- Give a brief plain-English explanation of the concept
- Show ALL methods clearly separated by ### headings
- End with ### Which Method Should You Use? and ### Quick Tips to Remember

METHODS TO SHOW:
- Quadratic equations: Factorisation, Completing the Square, Quadratic Formula, Graphical
- Simultaneous equations: Substitution, Elimination, Matrix method  
- Differentiation: First Principles, then using Rules
- Integration: all applicable techniques

STEPS FORMAT — every step must be on its own line, clearly numbered:
1. First do this thing

2. Then do this next thing

3. Then this

Never run steps together on one line.

CURRICULUM — full Nigerian secondary school and university syllabus:
Secondary: Number Bases, Surds, Indices, Logarithms, Bearings, Longitude & Latitude,
Earth Geometry, Quadratic Equations, Polynomials, Variation, Sequences, Binomial 
Expansion, Trigonometry, Circle Theorems, Mensuration, Matrices, Vectors, Statistics, Probability

University: Calculus I & II, Multivariable Calculus, Differential Equations,
Linear Algebra, Complex Numbers, Numerical Methods, Laplace Transforms,
Fourier Series, Engineering Mathematics (K.A. Stroud level)
"""

def ask_groq(user_message: str, conversation_history: list = [], image_base64: str = None, image_type: str = "image/jpeg") -> str:
    """
    Send a message to Groq, optionally with:
    - conversation history (multi-turn chat)
    - image (for photo uploads)
    - RAG context from textbooks
    """
    from app.rag.retriever import retrieve_context

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Retrieve relevant textbook context (only for text questions)
    if not image_base64 and user_message:
        context = retrieve_context(user_message)
        if context:
            messages.append({
                "role": "system",
                "content": context
            })

    # Add conversation history
    for turn in conversation_history:
        messages.append(turn)

    # Build content
    if image_base64:
        content = [
            {
                "type": "image_url",
                "image_url": {"url": f"data:{image_type};base64,{image_base64}"}
            },
            {
                "type": "text",
                "text": user_message or "Please read this image and solve the mathematics question. Show ALL methods."
            }
        ]
    else:
        content = user_message

    messages.append({"role": "user", "content": content})

    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct" if image_base64 else "llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=4096,
        )
        raw = response.choices[0].message.content
        from app.services.latex_cleaner import clean_response
        return clean_response(raw)

    except Exception as e:
        return f"Error connecting to AI: {str(e)}"