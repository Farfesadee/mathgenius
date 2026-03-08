from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.math_service import solve_expression, differentiate, integrate_expr
from app.services.groq_service import ask_groq

router = APIRouter(prefix="/solve", tags=["Solve"])


class SolveRequest(BaseModel):
    expression: str
    mode: str = "solve"

class ExplainRequest(BaseModel):
    expression: str
    result: str

class ImageSolveRequest(BaseModel):
    image_base64: str
    image_type: str = "image/jpeg"
    extra_instruction: Optional[str] = None

class PracticeRequest(BaseModel):
    topic: str
    level: str = "secondary"
    difficulty: str = "easy"
    question_number: int = 1
    previous_questions: list = []   # tracks what was already asked this session
    exam_context: str = ""          # e.g. "WAEC exam style" for predicted mode

class WorkedExampleRequest(BaseModel):
    topic: str
    level: str = "secondary"
    difficulty: str = "easy"

class HintsRequest(BaseModel):
    topic: str
    question: str
    answer: str          # used to craft progressive hints without giving it away

class RetryQuestionRequest(BaseModel):
    topic: str
    level: str = "secondary"
    original_question: str
    student_wrong_answer: str

class GradeRequest(BaseModel):
    topic: str
    question: str
    correct_answer: str
    student_answer: str


@router.post("/")
async def solve(request: SolveRequest):
    if request.mode == "differentiate":
        result = differentiate(request.expression)
    elif request.mode == "integrate":
        result = integrate_expr(request.expression)
    else:
        result = solve_expression(request.expression)
    return {"success": True, "data": result}


@router.post("/explain")
async def explain_solution(request: ExplainRequest):
    prompt = f"""A student solved '{request.expression}' and got '{request.result}'.
Show ALL methods for solving this problem step-by-step with full working.
Make it very clear, warm and easy for a student to understand."""
    explanation = await ask_groq(prompt)   # ← was missing await
    return {"success": True, "explanation": explanation}


@router.post("/image")
async def solve_from_image(request: ImageSolveRequest):
    instruction = (
        request.extra_instruction or
        "Please read this image carefully and solve the mathematics question shown. "
        "Show ALL methods of solving it with full step-by-step working."
    )
    response = await ask_groq(          # ← was missing await
        user_message=instruction,
        image_base64=request.image_base64,
        image_type=request.image_type
    )
    return {"success": True, "explanation": response}


@router.post("/practice/question")
async def generate_question(request: PracticeRequest):
    # Build the avoid-repeats block from session history
    avoid_block = ""
    if request.previous_questions:
        avoid_block = "\n\nDo NOT repeat or closely resemble any of these questions already asked this session:\n"
        for i, q in enumerate(request.previous_questions, 1):
            avoid_block += f"  {i}. {q}\n"
        avoid_block += "Generate a COMPLETELY DIFFERENT question covering a distinct aspect of the topic."

    exam_block = f"\n\nIMPORTANT: {request.exam_context}" if request.exam_context else ""

    prompt = f"""Generate question {request.question_number} of 5 for a {request.level} student.
Topic: {request.topic}
Difficulty: {request.difficulty}

Difficulty guide:
- easy: single-step, direct application of one rule or formula
- medium: 2-3 step problem requiring method selection
- hard: multi-step problem requiring deep understanding and synthesis
{avoid_block}{exam_block}

CRITICAL FORMAT — respond using EXACTLY these three markers on their own lines, with all content after the colon:
QUESTION: [Write the full, self-contained question here. Include all numbers, units, and context needed.]
ANSWER: [Write the complete step-by-step worked solution here. Show every step. End with "Therefore, the answer is X."]
HINT1: [Tiny nudge — just remind the student which concept or formula applies. Do NOT show any working.]
HINT2: [Show the first step only — set up the problem but don't solve it.]
HINT3: [Show the method clearly up to the second-to-last step, leaving only the final calculation.]

Do not add any text before QUESTION: or after the HINT: line."""

    response = await ask_groq(prompt)

    # Multi-line-safe parser: capture everything between section markers
    import re
    question, answer, hint = "", "", ""

    import re as _re
    q_match  = _re.search(r"QUESTION:\s*(.+?)(?=\nANSWER:|\Z)",  response, _re.DOTALL)
    a_match  = _re.search(r"ANSWER:\s*(.+?)(?=\nHINT1:|\Z)",     response, _re.DOTALL)
    h1_match = _re.search(r"HINT1:\s*(.+?)(?=\nHINT2:|\Z)",      response, _re.DOTALL)
    h2_match = _re.search(r"HINT2:\s*(.+?)(?=\nHINT3:|\Z)",      response, _re.DOTALL)
    h3_match = _re.search(r"HINT3:\s*(.+?)\Z",                    response, _re.DOTALL)

    question = q_match.group(1).strip()  if q_match  else response.strip()
    answer   = a_match.group(1).strip()  if a_match  else ""
    hint1    = h1_match.group(1).strip() if h1_match else ""
    hint2    = h2_match.group(1).strip() if h2_match else ""
    hint3    = h3_match.group(1).strip() if h3_match else ""

    if not answer:
        parts = response.split("ANSWER:")
        if len(parts) > 1:
            answer = parts[1].split("HINT1:")[0].strip()

    return {
        "success":  True,
        "question": question,
        "answer":   answer,
        "hints":    [h for h in [hint1, hint2, hint3] if h],
    }


@router.post("/practice/worked-example")
async def get_worked_example(request: WorkedExampleRequest):
    """Return a fully solved example before the session starts."""
    prompt = f"""Create a worked example for a {request.level} student studying {request.topic}.
Difficulty: {request.difficulty}

Write ONE clear example problem with a complete step-by-step solution.
This is shown BEFORE the student attempts questions, so make it instructive and clear.

Use EXACTLY this format:
EXAMPLE: [A specific, concrete example problem]
SOLUTION: [Full step-by-step working. Number each step. End with "Therefore, the answer is X."]
TAKEAWAY: [One key insight or tip the student should remember from this example]"""

    response = await ask_groq(prompt)
    import re as _re
    ex_match = _re.search(r"EXAMPLE:\s*(.+?)(?=\nSOLUTION:|\Z)",  response, _re.DOTALL)
    so_match = _re.search(r"SOLUTION:\s*(.+?)(?=\nTAKEAWAY:|\Z)", response, _re.DOTALL)
    ta_match = _re.search(r"TAKEAWAY:\s*(.+?)\Z",                   response, _re.DOTALL)

    return {
        "success":   True,
        "example":   ex_match.group(1).strip() if ex_match else "",
        "solution":  so_match.group(1).strip() if so_match else "",
        "takeaway":  ta_match.group(1).strip() if ta_match else "",
    }


@router.post("/practice/retry-question")
async def get_retry_question(request: RetryQuestionRequest):
    """Generate a simpler version of a question the student got wrong."""
    prompt = f"""A student got this question wrong. Generate a SIMPLER version to help them understand the concept.

Topic: {request.topic} ({request.level})
Original question: {request.original_question}
Student's wrong answer: {request.student_wrong_answer}

Rules:
- Make it simpler (smaller numbers, more scaffolded, fewer steps)
- Cover the SAME concept so they can build confidence
- This is a remedial question, not a penalty — be encouraging

CRITICAL FORMAT:
QUESTION: [The simpler remedial question]
ANSWER: [Full step-by-step solution]
HINT1: [Gentle first nudge — which concept applies]
HINT2: [First step of the working]
HINT3: [Almost complete working, one step left]"""

    response = await ask_groq(prompt)
    import re as _re
    q_match  = _re.search(r"QUESTION:\s*(.+?)(?=\nANSWER:|\Z)",  response, _re.DOTALL)
    a_match  = _re.search(r"ANSWER:\s*(.+?)(?=\nHINT1:|\Z)",     response, _re.DOTALL)
    h1_match = _re.search(r"HINT1:\s*(.+?)(?=\nHINT2:|\Z)",      response, _re.DOTALL)
    h2_match = _re.search(r"HINT2:\s*(.+?)(?=\nHINT3:|\Z)",      response, _re.DOTALL)
    h3_match = _re.search(r"HINT3:\s*(.+?)\Z",                    response, _re.DOTALL)

    return {
        "success":  True,
        "question": q_match.group(1).strip()  if q_match  else "",
        "answer":   a_match.group(1).strip()  if a_match  else "",
        "hints":    [h.group(1).strip() for h in [h1_match, h2_match, h3_match] if h],
        "is_retry": True,
    }


@router.post("/practice/grade")
async def grade_answer(request: GradeRequest):
    prompt = f"""A student answered a mathematics question. Grade their answer.

Topic: {request.topic}
Question: {request.question}
Correct Answer: {request.correct_answer}
Student Answer: {request.student_answer}

Assess if the student's answer is correct or partially correct.
Be generous — if the method is right but there is a small arithmetic error, say partially correct.

Respond in this exact format:
RESULT: [CORRECT or INCORRECT or PARTIAL]
SCORE: [0, 50, or 100]
FEEDBACK: [2-3 encouraging sentences explaining what they got right/wrong and how to improve]
MOTIVATION: [one short motivational sentence]"""

    response   = await ask_groq(prompt)   # ← was missing await
    result     = 'INCORRECT'
    score      = 0
    feedback   = response
    motivation = "Keep practising!"

    for line in response.split('\n'):
        if line.startswith('RESULT:'):
            result = line.replace('RESULT:', '').strip()
        elif line.startswith('SCORE:'):
            try:
                score = int(line.replace('SCORE:', '').strip())
            except Exception:
                score = 0
        elif line.startswith('FEEDBACK:'):
            feedback = line.replace('FEEDBACK:', '').strip()
        elif line.startswith('MOTIVATION:'):
            motivation = line.replace('MOTIVATION:', '').strip()

    return {
        "success":    True,
        "result":     result,
        "score":      score,
        "feedback":   feedback,
        "motivation": motivation,
        "is_correct": result == 'CORRECT',
    }