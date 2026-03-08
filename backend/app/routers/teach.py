import asyncio
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.groq_service import ask_groq
from app.routers.tracking import log_teach_interaction, TeachLogRequest

router = APIRouter(prefix="/teach", tags=["Teach"])


class TeachRequest(BaseModel):
    question: str
    topic: str = "General Mathematics"
    level: str = "sss"
    conversation_history: list = []
    user_id: str = None


class TopicRequest(BaseModel):
    topic: str
    level: str = "sss"


# ── Level descriptions ────────────────────────────────────────────────

def get_level_description(level: str) -> str:
    descriptions = {
        "primary":    "primary school student (Primary 1–6, ages 6–12). Use very simple language, relatable real-life examples, and avoid jargon.",
        "jss":        "junior secondary school student (JSS 1–3, ages 11–15). Use clear simple explanations, build on primary knowledge, and introduce new concepts step by step with plenty of examples.",
        "sss":        "senior secondary school student (SSS 1–3, ages 15–18) preparing for WAEC, NECO, or JAMB. Use proper mathematical notation, show full working, and reference exam-relevant techniques.",
        "secondary":  "senior secondary school student preparing for WAEC, NECO, or JAMB. Use proper mathematical notation, show full working, and reference exam-relevant techniques.",
        "university": "university student. Use advanced mathematical concepts, rigorous notation where appropriate, and academic-level explanations.",
    }
    return descriptions.get(level, descriptions["sss"])


def get_textbook(level: str) -> str:
    books = {
        "primary":    "New General Mathematics for Primary Schools",
        "jss":        "New General Mathematics for Junior Secondary Schools (Books 1–3)",
        "sss":        "New General Mathematics for Senior Secondary Schools (Books 1–3)",
        "secondary":  "New General Mathematics for Senior Secondary Schools (Books 1–3)",
        "university": "relevant university mathematics textbooks",
    }
    return books.get(level, books["sss"])


# ── Endpoints ─────────────────────────────────────────────────────────

@router.post("/ask")
async def ask_tutor(request: TeachRequest):
    level_desc = get_level_description(request.level)
    prompt = f"""You are Euler, an expert Nigerian mathematics tutor.
You are teaching a {level_desc}.
Textbook reference: {get_textbook(request.level)}

Topic: {request.topic}
Student's question: {request.question}

Please explain thoroughly with step-by-step working.
Use LaTeX for all mathematical expressions (e.g. \\(x^2\\) inline, $$....$$ for display).
Be encouraging and patient."""

    response = await ask_groq(prompt, request.conversation_history)

    if request.user_id:
        try:
            asyncio.create_task(log_teach_interaction(TeachLogRequest(
                user_id=request.user_id,
                topic=request.topic,
                question=request.question,
                response_length=len(response),
                level=request.level,
            )))
        except Exception:
            pass

    return {"success": True, "response": response, "topic": request.topic}


@router.post("/overview")
async def topic_overview(request: TopicRequest):
    level_desc = get_level_description(request.level)
    prompt = f"""Give a clear structured overview of '{request.topic}' for a {level_desc}.
Include:
1. Simple plain-English definition
2. Real-world use or application
3. Key formulas in LaTeX
4. One fully worked example
5. Common mistakes to avoid"""
    response = await ask_groq(prompt)
    return {"success": True, "overview": response, "topic": request.topic}


@router.get("/topics")
async def get_topics():
    topics = {

        # ── Primary ───────────────────────────────────────────────────
        "primary": {
            "Number & Numeration": [
                "Counting and Place Value",
                "Addition and Subtraction",
                "Multiplication and Division",
                "Fractions (Half, Quarter, Third)",
                "Decimals and Money",
                "Percentages",
                "Factors and Multiples",
                "HCF and LCM",
                "Prime Numbers",
                "Roman Numerals",
            ],
            "Basic Geometry": [
                "2D Shapes (Triangle, Rectangle, Circle, Square)",
                "3D Shapes (Cube, Cuboid, Sphere, Cylinder)",
                "Angles (Right Angle, Acute, Obtuse)",
                "Lines (Parallel, Perpendicular)",
                "Symmetry",
                "Perimeter and Area",
            ],
            "Measurement": [
                "Length (cm, m, km)",
                "Mass (g, kg)",
                "Capacity (ml, l)",
                "Time (Hours, Minutes, Seconds)",
                "Temperature",
                "Money and Change",
            ],
            "Data Handling": [
                "Pictograms and Bar Charts",
                "Tally Charts",
                "Simple Tables",
                "Reading Graphs",
            ],
            "Everyday Maths": [
                "Buying and Selling",
                "Profit and Loss (Introduction)",
                "Simple Interest (Introduction)",
                "Distance, Speed and Time (Basic)",
            ],
        },

        # ── JSS ───────────────────────────────────────────────────────
        "jss": {
            "Number & Numeration": [
                "Whole Numbers and Place Value",
                "Fractions: Proper, Improper, Mixed Numbers",
                "Decimals and Decimal Places",
                "Percentages and Applications",
                "Ratio and Proportion",
                "HCF and LCM",
                "Prime Numbers and Factorisation",
                "Number Bases (Base 2, 8, 10)",
                "Approximation and Significant Figures",
                "Directed Numbers (Positive and Negative)",
                "Standard Form (Introduction)",
            ],
            "Basic Operations": [
                "Order of Operations (BODMAS/BIDMAS)",
                "Word Problems — Basic Operations",
                "Estimation and Rounding",
            ],
            "Algebra": [
                "Algebraic Expressions and Simplification",
                "Simple Equations in One Variable",
                "Simple Inequalities",
                "Substitution into Formulae",
                "Word Problems Leading to Equations",
                "Factorisation — Common Factors",
                "Expansion of Brackets",
                "Introduction to Simultaneous Equations",
            ],
            "Geometry": [
                "Types of Angles: Acute, Obtuse, Reflex, Right",
                "Angles on a Straight Line and at a Point",
                "Vertically Opposite Angles",
                "Angles in a Triangle",
                "Types of Triangles: Equilateral, Isosceles, Scalene",
                "Quadrilaterals: Square, Rectangle, Parallelogram, Rhombus, Trapezium",
                "Circles: Radius, Diameter, Circumference, Chord, Arc",
                "Construction: Bisecting Lines and Angles",
                "Symmetry: Line and Rotational",
                "Bearings (Introduction)",
            ],
            "Mensuration": [
                "Perimeter of Plane Shapes",
                "Area of Rectangles, Triangles, Circles, Trapeziums",
                "Volume of Cuboids and Cylinders",
                "Surface Area of Cuboids",
                "Units of Measurement and Conversion",
            ],
            "Statistics": [
                "Data Collection and Presentation",
                "Bar Charts, Pie Charts, Pictograms",
                "Frequency Tables",
                "Mean, Median, Mode for Ungrouped Data",
                "Range",
            ],
            "Everyday Mathematics": [
                "Profit and Loss",
                "Simple Interest",
                "Hire Purchase (Introduction)",
                "Rates, Taxes and Bills",
                "Foreign Exchange (Introduction)",
                "Venn Diagrams with Two Sets",
            ],
        },

        # ── SSS ───────────────────────────────────────────────────────
        "sss": {
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

        # ── Backwards compatibility alias ─────────────────────────────
        "secondary": None,  # filled below

        # ── University ────────────────────────────────────────────────
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
        },
    }

    # 'secondary' is an alias for 'sss' — backwards compat
    topics["secondary"] = topics["sss"]

    return {"success": True, "topics": topics}


@router.get("/wiki/{topic}")
async def get_topic_wiki(topic: str, level: str = "sss"):
    level_desc = get_level_description(level)
    prompt = f"""Create concise study notes on: {topic}
Target student: {level_desc}

Use clear markdown with these exact sections:

## Overview
Brief plain-English explanation (2–3 sentences max).

## Key Concepts
- Bullet list of the most important ideas

## Core Formulas
List each formula with a short label. Use LaTeX (e.g. $$x = \\frac{{-b \\pm \\sqrt{{b^2-4ac}}}}{{2a}}$$).

## Worked Example
One clear step-by-step worked example with a final boxed answer.

## Common Exam Mistakes
- 2–3 mistakes students commonly make

Keep each section brief and exam-focused."""

    content = await ask_groq(prompt, [])
    return {"topic": topic, "content": content}