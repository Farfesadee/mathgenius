from fastapi import APIRouter
from pydantic import BaseModel
from app.services.groq_service import ask_groq
from app.routers.tracking import log_teach_interaction, TeachLogRequest

router = APIRouter(prefix="/teach", tags=["Teach"])

class TeachRequest(BaseModel):
    question: str
    topic: str = "General Mathematics"
    level: str = "secondary"
    conversation_history: list = []
    user_id: str = None  # optional — if provided, interaction is logged

class TopicRequest(BaseModel):
    topic: str
    level: str = "secondary"

@router.post("/ask")
async def ask_tutor(request: TeachRequest):
    prompt = f"""Topic: {request.topic}
Student Level: {request.level}
Student's question: {request.question}
Please explain thoroughly with step-by-step working, using LaTeX for all math."""
    response = ask_groq(prompt, request.conversation_history)

    # Log interaction if user_id provided (non-fatal)
    if request.user_id:
        import asyncio
        try:
            await log_teach_interaction(TeachLogRequest(
                user_id=request.user_id,
                topic=request.topic,
                question=request.question,
                response_length=len(response),
                level=request.level,
            ))
        except Exception:
            pass  # Don't break teaching flow if logging fails

    return {"success": True, "response": response, "topic": request.topic}

@router.post("/overview")
async def topic_overview(request: TopicRequest):
    prompt = f"""Give a clear structured overview of '{request.topic}' for a {request.level} student.
Include: 1. Simple definition  2. Real world use  3. Key formulas in LaTeX  4. Worked example  5. Common mistakes"""
    response = ask_groq(prompt)
    return {"success": True, "overview": response, "topic": request.topic}

@router.get("/topics")
async def get_topics():
    topics = {
        "secondary": {
            "Number & Numeration": [
                "Number Bases (Binary, Octal, Hexadecimal)",
                "Fractions, Decimals and Percentages",
                "Approximation and Significant Figures",
                "Standard Form (Scientific Notation)",
                "Indices and Laws of Indices",
                "Surds and Simplification of Surds",
                "Rational and Irrational Numbers",
                "Ratios, Proportions and Rates",
                "Logarithms and Laws of Logarithms",
            ],
            "Algebra": [
                "Algebraic Expressions and Simplification",
                "Linear Equations",
                "Simultaneous Linear Equations",
                "Quadratic Equations",
                "Polynomials and Remainder Theorem",
                "Factor Theorem",
                "Variation (Direct, Inverse, Joint, Partial)",
                "Inequalities and Number Lines",
                "Sequences and Series (AP and GP)",
                "Binomial Expansion",
                "Functions and Mappings",
                "Partial Fractions",
            ],
            "Geometry & Mensuration": [
                "Angles and Parallel Lines",
                "Triangles (Congruency, Similarity)",
                "Quadrilaterals and Polygons",
                "Circle Theorems (Chords, Tangents, Arcs)",
                "Mensuration (Perimeter, Area, Volume)",
                "Surface Area and Volume of Solids",
                "Plane Geometry and Proofs",
                "Construction and Loci",
                "Transformation (Translation, Reflection, Rotation, Enlargement)",
            ],
            "Trigonometry": [
                "Trigonometric Ratios (sin, cos, tan)",
                "Right-Angled Triangles",
                "Angles of Elevation and Depression",
                "Bearings and Distances",
                "Sine Rule and Cosine Rule",
                "Area of Triangle using Trigonometry",
                "Trigonometric Identities",
                "Graphs of Trigonometric Functions",
                "Solving Trigonometric Equations",
            ],
            "Earth Geometry": [
                "Longitude and Latitude",
                "Great Circles and Small Circles",
                "Distance Along a Great Circle",
                "Distance Along a Circle of Latitude",
                "Time Zones and Local Time",
            ],
            "Coordinate Geometry": [
                "Cartesian Plane and Plotting Points",
                "Distance Between Two Points",
                "Midpoint of a Line Segment",
                "Gradient (Slope) of a Line",
                "Equation of a Straight Line",
                "Parallel and Perpendicular Lines",
                "Equation of a Circle",
            ],
            "Statistics & Probability": [
                "Data Collection and Presentation",
                "Frequency Tables and Histograms",
                "Mean, Median, Mode",
                "Range, Variance and Standard Deviation",
                "Cumulative Frequency and Ogive",
                "Box and Whisker Plots",
                "Probability (Basic, Addition, Multiplication Rule)",
                "Permutations and Combinations",
            ],
            "Vectors & Matrices": [
                "Vector Notation and Representation",
                "Addition and Subtraction of Vectors",
                "Position Vectors and Magnitude",
                "Matrix Notation and Operations",
                "Determinant and Inverse of a 2×2 Matrix",
                "Solving Simultaneous Equations using Matrices",
                "Transformation Matrices",
            ],
            "Introductory Calculus": [
                "Limits and Continuity",
                "Differentiation from First Principles",
                "Rules of Differentiation",
                "Differentiation of Trig Functions",
                "Tangent and Normal to a Curve",
                "Maximum and Minimum Values",
                "Integration as Reverse Differentiation",
                "Definite and Indefinite Integrals",
                "Area Under a Curve",
            ],
        },
        "university": {
            "Algebra & Pre-Calculus": [
                "Sets, Relations and Functions",
                "Complex Numbers and Argand Diagram",
                "Polar Form and De Moivre's Theorem",
                "Polynomial Division and Rational Functions",
                "Exponential and Logarithmic Functions",
                "Hyperbolic Functions",
                "Partial Fractions (All cases)",
                "Mathematical Induction",
                "Binomial Theorem (General term)",
            ],
            "Calculus I": [
                "Limits and L'Hôpital's Rule",
                "Continuity and Differentiability",
                "Differentiation — All Rules",
                "Implicit and Parametric Differentiation",
                "Higher Order Derivatives",
                "Taylor and Maclaurin Series",
                "Curve Sketching and Optimisation",
                "Integration by Substitution",
                "Integration by Parts",
                "Integration by Partial Fractions",
                "Trigonometric Substitution",
                "Reduction Formulae",
                "Improper Integrals",
            ],
            "Calculus II": [
                "Area Between Curves",
                "Volumes of Revolution",
                "Arc Length and Surface Area",
                "Sequences and Series (Convergence Tests)",
                "Power Series and Radius of Convergence",
                "Fourier Series",
            ],
            "Multivariable Calculus": [
                "Partial Derivatives",
                "Gradient, Divergence and Curl",
                "Directional Derivatives",
                "Double and Triple Integrals",
                "Change of Variables (Jacobian)",
                "Line Integrals and Surface Integrals",
                "Green's Theorem",
                "Stokes' Theorem",
                "Divergence Theorem",
            ],
            "Differential Equations": [
                "First Order ODEs (Separable, Linear, Exact)",
                "Integrating Factor Method",
                "Bernoulli's Equation",
                "Second Order ODEs",
                "Method of Undetermined Coefficients",
                "Variation of Parameters",
                "Laplace Transforms",
                "Inverse Laplace Transforms",
                "Systems of Differential Equations",
                "Partial Differential Equations (Intro)",
            ],
            "Linear Algebra": [
                "Vectors in 2D and 3D",
                "Dot Product and Cross Product",
                "Lines and Planes in 3D",
                "Matrix Operations and Types",
                "Determinants (Any Order)",
                "Matrix Inverse (Gauss-Jordan)",
                "Systems of Linear Equations",
                "Vector Spaces and Subspaces",
                "Eigenvalues and Eigenvectors",
                "Diagonalisation",
                "Linear Transformations",
            ],
            "Numerical Methods": [
                "Errors in Numerical Computation",
                "Bisection Method",
                "Newton-Raphson Method",
                "Lagrange Interpolation",
                "Newton's Divided Differences",
                "Trapezoidal Rule",
                "Simpson's Rule",
                "Euler's Method",
                "Runge-Kutta Methods",
                "Gauss-Seidel Iteration",
            ],
            "Statistics & Probability": [
                "Conditional Probability and Bayes' Theorem",
                "Discrete Random Variables",
                "Binomial and Poisson Distributions",
                "Normal Distribution",
                "t-Distribution and Chi-Square",
                "Sampling Theory and Central Limit Theorem",
                "Hypothesis Testing",
                "Regression and Correlation",
                "Analysis of Variance (ANOVA)",
            ],
            "Engineering Mathematics": [
                "Laplace Transforms (Full — K.A. Stroud)",
                "Z-Transforms",
                "Fourier Transforms",
                "Vector Analysis",
                "Calculus of Variations",
                "Optimisation Methods",
                "Complex Analysis",
                "Cauchy's Integral Theorem",
                "Residues and Poles",
            ],
        }
    }
    return {"success": True, "topics": topics}


@router.get("/wiki/{topic}")
async def get_topic_wiki(topic: str):
    """Generate structured study notes for a topic (displayed in Topic Wiki page)."""
    prompt = f"""Create concise study notes for Nigerian secondary school students on: {topic}

Use clear markdown formatting with these exact sections:

## Overview
Brief plain-English explanation (2-3 sentences max).

## Key Concepts
- Bullet list of the most important ideas

## Core Formulas
List each formula with a short label. Use LaTeX notation (e.g. $$x = \\frac{{-b \\pm \\sqrt{{b^2 - 4ac}}}}{{2a}}$$).

## Worked Example
One clear step-by-step worked example with a final boxed answer.

## Common Exam Mistakes
- 2-3 mistakes students commonly make in WAEC/JAMB/NECO

Keep each section brief and exam-focused. Target: WAEC/JAMB/NECO level."""

    content = ask_groq(prompt, [])
    return {"topic": topic, "content": content}