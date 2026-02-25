from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.services.groq_service import ask_groq

router = APIRouter(prefix="/cbt", tags=["CBT"])


class ParseQuestionsRequest(BaseModel):
    markdown_content: str
    exam_type: str = "JAMB"
    year: Optional[int] = None
    subject: str = "Mathematics"


class ExplainRequest(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    student_answer: str
    topic: Optional[str] = None


class CBTReportRequest(BaseModel):
    questions: list
    score: int
    total: int
    time_taken_secs: int
    exam_type: str
    topic: Optional[str] = None


def parse_option(text: str, letter: str) -> str:
    """Extract option text from a line like 'A. some text'"""
    prefix = f"{letter}."
    if prefix in text:
        return text.split(prefix, 1)[1].strip()
    return text.strip()


def detect_correct_answer(options: dict, lines: list) -> Optional[str]:
    """
    Try to detect correct answer if marked in source.
    Returns A/B/C/D or None.
    """
    for line in lines:
        l = line.strip().upper()
        for letter in ['A', 'B', 'C', 'D']:
            if l.startswith(f"ANSWER: {letter}") or l.startswith(f"CORRECT: {letter}"):
                return letter
    return None


@router.post("/parse")
async def parse_questions(request: ParseQuestionsRequest):
    prompt = f"""You are given a raw markdown file containing {request.exam_type} past exam questions.

Parse EVERY question and return a JSON array. Each object must have:
- question_no: integer
- question_text: the full question (clean, no escape characters)
- option_a: text of option A only (no "A." prefix)
- option_b: text of option B only
- option_c: text of option C only
- option_d: text of option D only
- correct_answer: "A", "B", "C", or "D" — if marked, use it; otherwise use null
- topic: guess the math topic (e.g. "Quadratic Equations", "Probability", "Trigonometry")
- difficulty: guess "easy", "medium", or "hard"

Rules:
- Clean up any OCR artifacts like repeated text or broken fractions
- If a question references a diagram you cannot see, still include it
- Return ONLY the raw JSON array, no markdown, no explanation

Here is the content:
---
{request.markdown_content[:8000]}
---"""

    response = ask_groq(prompt)

    import json
    import re

    # Strip markdown fences
    clean = response.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        clean = parts[1] if len(parts) > 1 else clean
        if clean.startswith("json"):
            clean = clean[4:]
    clean = clean.strip().rstrip("```").strip()

    # Remove control characters that break JSON parsing
    clean = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', clean)

    # Fix common JSON issues
    clean = clean.replace('\t', ' ')

    try:
        questions = json.loads(clean)
        return {
            "success":   True,
            "questions": questions,
            "count":     len(questions),
        }
    except json.JSONDecodeError:
        # Try extracting just the array
        match = re.search(r'\[.*\]', clean, re.DOTALL)
        if match:
            try:
                questions = json.loads(match.group())
                return {
                    "success":   True,
                    "questions": questions,
                    "count":     len(questions),
                }
            except Exception:
                pass
        return {
            "success": False,
            "error":   "Could not parse JSON",
            "raw":     clean[:500],
        }


@router.post("/explain")
async def explain_answer(request: ExplainRequest):
    """Euler explains why the correct answer is right and others are wrong."""
    topic_str = f" (Topic: {request.topic})" if request.topic else ""
    wrong      = request.student_answer != request.correct_answer

    prompt = f"""A student answered a multiple choice mathematics question{topic_str}.

Question: {request.question_text}

Options:
A. {request.option_a}
B. {request.option_b}
C. {request.option_c}
D. {request.option_d}

Correct Answer: {request.correct_answer}
Student chose: {request.student_answer}
{"The student got it WRONG." if wrong else "The student got it CORRECT."}

{"Explain clearly why " + request.correct_answer + " is correct and why " + request.student_answer + " is wrong." if wrong else "Confirm why " + request.correct_answer + " is correct with a brief explanation."}

Also briefly explain why each wrong option is incorrect.
Be warm, encouraging and concise. Show any working needed."""

    explanation = ask_groq(prompt)
    return {"success": True, "explanation": explanation}


@router.post("/report-summary")
async def generate_report_summary(request: CBTReportRequest):
    """Generate an AI motivational summary for the CBT report."""
    correct   = request.score
    total     = request.total
    pct       = round((correct / total) * 100) if total > 0 else 0
    mins      = request.time_taken_secs // 60
    secs      = request.time_taken_secs % 60

    wrong_topics = list(set([
        q.get('topic', 'Unknown')
        for q in request.questions
        if not q.get('is_correct') and q.get('topic')
    ]))

    prompt = f"""A student just completed a {request.exam_type} Mathematics CBT exam.

Results:
- Score: {correct}/{total} ({pct}%)
- Time taken: {mins} minutes {secs} seconds
- Topics they got wrong: {', '.join(wrong_topics) if wrong_topics else 'None'}

Write a short (3-4 sentence) personalised report:
1. Congratulate or encourage based on score
2. Mention specific weak topics if any
3. Give one actionable tip to improve
4. End with a motivational line

Be warm, specific and encouraging like a caring Nigerian teacher."""

    summary = ask_groq(prompt)
    return {"success": True, "summary": summary, "percentage": pct}