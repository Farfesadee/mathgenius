from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class SolveRequest(BaseModel):
    """Schema for solve endpoint."""
    expression: str = Field(..., min_length=1, max_length=1000, description="Math expression to solve")
    mode: str = Field(default="solve", description="solve, differentiate, or integrate")

    @validator("mode")
    def validate_mode(cls, v):
        if v not in ["solve", "differentiate", "integrate"]:
            raise ValueError("mode must be 'solve', 'differentiate', or 'integrate'")
        return v


class ExplainRequest(BaseModel):
    """Schema for explain endpoint."""
    expression: str = Field(..., max_length=1000)
    result: str = Field(..., max_length=2000)


class ImageSolveRequest(BaseModel):
    """Schema for image-based solving."""
    image_base64: str = Field(..., description="Base64 encoded image")
    image_type: str = Field(default="image/jpeg")
    extra_instruction: Optional[str] = None


class PracticeRequest(BaseModel):
    """Schema for practice question generation."""
    topic: str = Field(..., max_length=200)
    level: str = Field(default="secondary", max_length=50)
    difficulty: str = Field(default="easy")
    question_number: int = Field(default=1, ge=1)
    previous_questions: List[str] = []
    exam_context: str = ""


class GradeRequest(BaseModel):
    """Schema for grading a practice answer."""
    topic: str = Field(..., max_length=200)
    question: str = Field(..., max_length=2000)
    correct_answer: str = Field(..., max_length=2000)
    student_answer: str = Field(..., max_length=2000)


class TeachRequest(BaseModel):
    """Schema for tutoring request."""
    question: str = Field(..., min_length=1, max_length=2000)
    topic: str = Field(default="General Mathematics", max_length=200)
    level: str = Field(default="sss", max_length=50)
    conversation_history: List[dict] = []
    user_id: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    """Schema for profile updates."""
    display_name: Optional[str] = Field(None, max_length=200)
    level: Optional[str] = Field(None, max_length=50)
    target_exam: Optional[str] = Field(None, max_length=50)
    target_score: Optional[int] = Field(None, ge=0, le=100)
    study_goal_mins_per_day: Optional[int] = Field(None, ge=0, le=1440)


class SessionStartRequest(BaseModel):
    """Schema for starting a study session."""
    user_id: str = Field(...)
    exam_type: str = Field(...)
    year: Optional[int] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = Field(default="medium")


class QuestionAttemptRequest(BaseModel):
    """Schema for logging a question attempt."""
    user_id: str
    session_id: str
    question_id: str
    topic: Optional[str] = None
    selected_answer: str
    correct_answer: str
    is_correct: bool
    time_spent_secs: int = 0
    skipped: bool = False
    hint_used: bool = False


class ErrorResponse(BaseModel):
    """Standard error response schema."""
    error: str
    detail: Optional[str] = None
    request_id: Optional[str] = None


class SuccessResponse(BaseModel):
    """Standard success response schema."""
    success: bool = True
    data: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)
