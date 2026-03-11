import os
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

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


async def ask_groq(
    user_message: str,
    conversation_history: list = [],
    image_base64: str = None,
    image_type: str = "image/jpeg",
) -> str:
    """
    Async version — awaitable, does not block the event loop.
    Use this for non-streaming responses (overview, wiki, grading etc.)
    """
    messages = await _build_messages(user_message, conversation_history, image_base64, image_type)

    response = await client.chat.completions.create(
        model=_model(image_base64),
        messages=messages,
        temperature=0.7,
        max_tokens=4096,
    )
    raw = response.choices[0].message.content
    from app.services.latex_cleaner import clean_response
    return clean_response(raw)


async def ask_groq_stream(
    user_message: str,
    conversation_history: list = [],
    image_base64: str = None,
    image_type: str = "image/jpeg",
):
    """
    Async generator — yields text chunks as they arrive from Groq.
    Use this for the /teach/ask streaming endpoint.
    """
    messages = await _build_messages(user_message, conversation_history, image_base64, image_type)

    stream = await client.chat.completions.create(
        model=_model(image_base64),
        messages=messages,
        temperature=0.7,
        max_tokens=4096,
        stream=True,
    )
    async for chunk in stream:
        token = chunk.choices[0].delta.content
        if token:
            yield token


# ── Internal helpers ──────────────────────────────────────────────────

def _model(image_base64):
    return (
        "meta-llama/llama-4-scout-17b-16e-instruct"
        if image_base64
        else "llama-3.3-70b-versatile"
    )


async def _build_messages(user_message, conversation_history, image_base64, image_type):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # RAG context — only for text questions
    if not image_base64 and user_message:
        from app.rag.retriever import retrieve_context
        context = retrieve_context(user_message)
        if context:
            messages.append({"role": "system", "content": context})

    # Conversation history
    for turn in conversation_history:
        messages.append(turn)

    # User message
    if image_base64:
        content = [
            {
                "type": "image_url",
                "image_url": {"url": f"data:{image_type};base64,{image_base64}"},
            },
            {
                "type": "text",
                "text": user_message or "Please read this image and solve the mathematics question. Show ALL methods.",
            },
        ]
    else:
        content = user_message

    messages.append({"role": "user", "content": content})
    return messages




# from fastapi import APIRouter
# from fastapi.responses import StreamingResponse
# from pydantic import BaseModel
# from app.services.groq_service import ask_groq, ask_groq_stream
# from app.routers.tracking import log_teach_interaction, TeachLogRequest
# import asyncio

# router = APIRouter(prefix="/teach", tags=["Teach"])


# class TeachRequest(BaseModel):
#     question: str
#     topic: str = "General Mathematics"
#     level: str = "secondary"
#     conversation_history: list = []
#     user_id: str = None


# class TopicRequest(BaseModel):
#     topic: str
#     level: str = "secondary"


# @router.post("/ask")
# async def ask_tutor(request: TeachRequest):
#     """
#     Streaming endpoint — returns text/event-stream.
#     The frontend reads chunks as they arrive, so the first word
#     appears in ~300ms instead of waiting 5-15s for the full response.
#     """
#     prompt = (
#         f"Topic: {request.topic}\n"
#         f"Student Level: {request.level}\n"
#         f"Student's question: {request.question}\n"
#         f"Please explain thoroughly with step-by-step working, using LaTeX for all math."
#     )

#     async def event_stream():
#         full_response = []
#         try:
#             async for token in ask_groq_stream(prompt, request.conversation_history):
#                 full_response.append(token)
#                 # Server-Sent Events format: "data: <token>\n\n"
#                 yield f"data: {token}\n\n"
#         except Exception as e:
#             yield f"data: [ERROR] {str(e)}\n\n"
#         finally:
#             # Log after streaming completes — non-blocking, non-fatal
#             if request.user_id:
#                 asyncio.create_task(
#                     log_teach_interaction(TeachLogRequest(
#                         user_id=request.user_id,
#                         topic=request.topic,
#                         question=request.question,
#                         response_length=sum(len(t) for t in full_response),
#                         level=request.level,
#                     ))
#                 )

#         # Signal stream end
#         yield "data: [DONE]\n\n"

#     return StreamingResponse(event_stream(), media_type="text/event-stream")


# @router.post("/overview")
# async def topic_overview(request: TopicRequest):
#     prompt = (
#         f"Give a clear structured overview of '{request.topic}' for a {request.level} student.\n"
#         f"Include: 1. Simple definition  2. Real world use  3. Key formulas in LaTeX  "
#         f"4. Worked example  5. Common mistakes"
#     )
#     response = await ask_groq(prompt)
#     return {"success": True, "overview": response, "topic": request.topic}


# @router.get("/topics")
# async def get_topics():
#     topics = {
#         "secondary": {
#             "Number & Numeration": [
#                 "Number Bases (Binary, Octal, Hexadecimal)",
#                 "Fractions, Decimals and Percentages",
#                 "Approximation and Significant Figures",
#                 "Standard Form (Scientific Notation)",
#                 "Indices and Laws of Indices",
#                 "Surds and Simplification of Surds",
#                 "Rational and Irrational Numbers",
#                 "Ratios, Proportions and Rates",
#                 "Logarithms and Laws of Logarithms",
#             ],
#             "Algebra": [
#                 "Algebraic Expressions and Simplification",
#                 "Linear Equations",
#                 "Simultaneous Linear Equations",
#                 "Quadratic Equations",
#                 "Polynomials and Remainder Theorem",
#                 "Factor Theorem",
#                 "Variation (Direct, Inverse, Joint, Partial)",
#                 "Inequalities and Number Lines",
#                 "Sequences and Series (AP and GP)",
#                 "Binomial Expansion",
#                 "Functions and Mappings",
#                 "Partial Fractions",
#             ],
#             "Geometry & Mensuration": [
#                 "Angles and Parallel Lines",
#                 "Triangles (Congruency, Similarity)",
#                 "Quadrilaterals and Polygons",
#                 "Circle Theorems (Chords, Tangents, Arcs)",
#                 "Mensuration (Perimeter, Area, Volume)",
#                 "Surface Area and Volume of Solids",
#                 "Plane Geometry and Proofs",
#                 "Construction and Loci",
#                 "Transformation (Translation, Reflection, Rotation, Enlargement)",
#             ],
#             "Trigonometry": [
#                 "Trigonometric Ratios (sin, cos, tan)",
#                 "Right-Angled Triangles",
#                 "Angles of Elevation and Depression",
#                 "Bearings and Distances",
#                 "Sine Rule and Cosine Rule",
#                 "Area of Triangle using Trigonometry",
#                 "Trigonometric Identities",
#                 "Graphs of Trigonometric Functions",
#                 "Solving Trigonometric Equations",
#             ],
#             "Earth Geometry": [
#                 "Longitude and Latitude",
#                 "Great Circles and Small Circles",
#                 "Distance Along a Great Circle",
#                 "Distance Along a Circle of Latitude",
#                 "Time Zones and Local Time",
#             ],
#             "Coordinate Geometry": [
#                 "Cartesian Plane and Plotting Points",
#                 "Distance Between Two Points",
#                 "Midpoint of a Line Segment",
#                 "Gradient (Slope) of a Line",
#                 "Equation of a Straight Line",
#                 "Parallel and Perpendicular Lines",
#                 "Equation of a Circle",
#             ],
#             "Statistics & Probability": [
#                 "Data Collection and Presentation",
#                 "Frequency Tables and Histograms",
#                 "Mean, Median, Mode",
#                 "Range, Variance and Standard Deviation",
#                 "Cumulative Frequency and Ogive",
#                 "Box and Whisker Plots",
#                 "Probability (Basic, Addition, Multiplication Rule)",
#                 "Permutations and Combinations",
#             ],
#             "Vectors & Matrices": [
#                 "Vector Notation and Representation",
#                 "Addition and Subtraction of Vectors",
#                 "Position Vectors and Magnitude",
#                 "Matrix Notation and Operations",
#                 "Determinant and Inverse of a 2x2 Matrix",
#                 "Solving Simultaneous Equations using Matrices",
#                 "Transformation Matrices",
#             ],
#             "Introductory Calculus": [
#                 "Limits and Continuity",
#                 "Differentiation from First Principles",
#                 "Rules of Differentiation",
#                 "Differentiation of Trig Functions",
#                 "Tangent and Normal to a Curve",
#                 "Maximum and Minimum Values",
#                 "Integration as Reverse Differentiation",
#                 "Definite and Indefinite Integrals",
#                 "Area Under a Curve",
#             ],
#         },
#         "university": {
#             "Algebra & Pre-Calculus": [
#                 "Sets, Relations and Functions",
#                 "Complex Numbers and Argand Diagram",
#                 "Polar Form and De Moivre's Theorem",
#                 "Polynomial Division and Rational Functions",
#                 "Exponential and Logarithmic Functions",
#                 "Hyperbolic Functions",
#                 "Partial Fractions (All cases)",
#                 "Mathematical Induction",
#                 "Binomial Theorem (General term)",
#             ],
#             "Calculus I": [
#                 "Limits and L'Hopital's Rule",
#                 "Continuity and Differentiability",
#                 "Differentiation — All Rules",
#                 "Implicit and Parametric Differentiation",
#                 "Higher Order Derivatives",
#                 "Taylor and Maclaurin Series",
#                 "Curve Sketching and Optimisation",
#                 "Integration by Substitution",
#                 "Integration by Parts",
#                 "Integration by Partial Fractions",
#                 "Trigonometric Substitution",
#                 "Reduction Formulae",
#                 "Improper Integrals",
#             ],
#             "Calculus II": [
#                 "Area Between Curves",
#                 "Volumes of Revolution",
#                 "Arc Length and Surface Area",
#                 "Sequences and Series (Convergence Tests)",
#                 "Power Series and Radius of Convergence",
#                 "Fourier Series",
#             ],
#             "Multivariable Calculus": [
#                 "Partial Derivatives",
#                 "Gradient, Divergence and Curl",
#                 "Directional Derivatives",
#                 "Double and Triple Integrals",
#                 "Change of Variables (Jacobian)",
#                 "Line Integrals and Surface Integrals",
#                 "Green's Theorem",
#                 "Stokes' Theorem",
#                 "Divergence Theorem",
#             ],
#             "Differential Equations": [
#                 "First Order ODEs (Separable, Linear, Exact)",
#                 "Integrating Factor Method",
#                 "Bernoulli's Equation",
#                 "Second Order ODEs",
#                 "Method of Undetermined Coefficients",
#                 "Variation of Parameters",
#                 "Laplace Transforms",
#                 "Inverse Laplace Transforms",
#                 "Systems of Differential Equations",
#                 "Partial Differential Equations (Intro)",
#             ],
#             "Linear Algebra": [
#                 "Vectors in 2D and 3D",
#                 "Dot Product and Cross Product",
#                 "Lines and Planes in 3D",
#                 "Matrix Operations and Types",
#                 "Determinants (Any Order)",
#                 "Matrix Inverse (Gauss-Jordan)",
#                 "Systems of Linear Equations",
#                 "Vector Spaces and Subspaces",
#                 "Eigenvalues and Eigenvectors",
#                 "Diagonalisation",
#                 "Linear Transformations",
#             ],
#             "Numerical Methods": [
#                 "Errors in Numerical Computation",
#                 "Bisection Method",
#                 "Newton-Raphson Method",
#                 "Lagrange Interpolation",
#                 "Newton's Divided Differences",
#                 "Trapezoidal Rule",
#                 "Simpson's Rule",
#                 "Euler's Method",
#                 "Runge-Kutta Methods",
#                 "Gauss-Seidel Iteration",
#             ],
#             "Statistics & Probability": [
#                 "Conditional Probability and Bayes' Theorem",
#                 "Discrete Random Variables",
#                 "Binomial and Poisson Distributions",
#                 "Normal Distribution",
#                 "t-Distribution and Chi-Square",
#                 "Sampling Theory and Central Limit Theorem",
#                 "Hypothesis Testing",
#                 "Regression and Correlation",
#                 "Analysis of Variance (ANOVA)",
#             ],
#             "Engineering Mathematics": [
#                 "Laplace Transforms (Full — K.A. Stroud)",
#                 "Z-Transforms",
#                 "Fourier Transforms",
#                 "Vector Analysis",
#                 "Calculus of Variations",
#                 "Optimisation Methods",
#                 "Complex Analysis",
#                 "Cauchy's Integral Theorem",
#                 "Residues and Poles",
#             ],
#         },
#     }
#     return {"success": True, "topics": topics}


# @router.get("/wiki/{topic}")
# async def get_topic_wiki(topic: str):
#     prompt = (
#         f"Create concise study notes for Nigerian secondary school students on: {topic}\n\n"
#         f"Use clear markdown formatting with these exact sections:\n\n"
#         f"## Overview\nBrief plain-English explanation (2-3 sentences max).\n\n"
#         f"## Key Concepts\n- Bullet list of the most important ideas\n\n"
#         f"## Core Formulas\nList each formula with a short label. Use LaTeX notation "
#         f"(e.g. $$x = \\frac{{-b \\pm \\sqrt{{b^2 - 4ac}}}}{{2a}}$$).\n\n"
#         f"## Worked Example\nOne clear step-by-step worked example with a final boxed answer.\n\n"
#         f"## Common Exam Mistakes\n- 2-3 mistakes students commonly make in WAEC/JAMB/NECO\n\n"
#         f"Keep each section brief and exam-focused. Target: WAEC/JAMB/NECO level."
#     )
#     content = await ask_groq(prompt, [])
#     return {"topic": topic, "content": content}