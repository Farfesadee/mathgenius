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
    explanation = ask_groq(prompt)
    return {"success": True, "explanation": explanation}


@router.post("/image")
async def solve_from_image(request: ImageSolveRequest):
    instruction = (
        request.extra_instruction or
        "Please read this image carefully and solve the mathematics question shown. "
        "Show ALL methods of solving it with full step-by-step working."
    )
    response = ask_groq(
        user_message=instruction,
        image_base64=request.image_base64,
        image_type=request.image_type
    )
    return {"success": True, "explanation": response}


@router.post("/practice/question")
async def generate_question(request: PracticeRequest):
    prompt = f"""Generate a {request.difficulty} difficulty mathematics practice question
on the topic: '{request.topic}' for a {request.level} student.

Question number {request.question_number} of 5.

Rules:
- Question must be clear and specific
- For easy: basic application of concept
- For medium: multi-step problem
- For hard: challenging problem requiring deep understanding
- Always include a complete worked solution

Respond in this exact format:
QUESTION: [the question text only]
ANSWER: [the complete worked solution and final answer]
HINT: [a small hint without giving away the answer]"""

    response = ask_groq(prompt)

    lines    = response.split('\n')
    question = ''
    answer   = ''
    hint     = ''

    for line in lines:
        if line.startswith('QUESTION:'):
            question = line.replace('QUESTION:', '').strip()
        elif line.startswith('ANSWER:'):
            answer = line.replace('ANSWER:', '').strip()
        elif line.startswith('HINT:'):
            hint = line.replace('HINT:', '').strip()

    if not question:
        question = response

    return {
        "success":  True,
        "question": question,
        "answer":   answer,
        "hint":     hint,
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

    response   = ask_groq(prompt)
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