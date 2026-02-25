import os
import sys
import json
import re
import requests
from dotenv import load_dotenv

load_dotenv()


def clean_json_string(raw: str) -> str:
    """Aggressively clean a string to make it valid JSON."""
    # Strip markdown fences
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("[") or part.startswith("{"):
                raw = part
                break

    # Find the JSON array boundaries
    start = raw.find("[")
    end   = raw.rfind("]")
    if start != -1 and end != -1:
        raw = raw[start:end+1]

    # Remove control characters (except \n \r \t)
    raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw)

    # Fix common issues: trailing commas before } or ]
    raw = re.sub(r',\s*}', '}', raw)
    raw = re.sub(r',\s*]', ']', raw)

    return raw


def parse_questions_locally(content: str, exam_type: str, year: int) -> list:
    """
    Fallback parser: parse the markdown directly without Groq.
    Handles the format produced by scraper.py.
    """
    questions = []
    lines     = content.split('\n')

    # Find answer key section if present
    answer_map = {}
    answer_section = False
    for line in lines:
        if re.match(r'^\s*correct answer', line, re.IGNORECASE):
            answer_section = True
            continue
        if answer_section:
            # Format: "1. A 2. B 3. C ..."  or  "1. A\n2. B\n..."
            for match in re.finditer(r'(\d+)\.\s*([A-D?])', line, re.IGNORECASE):
                answer_map[int(match.group(1))] = match.group(2).upper()

    # Parse questions
    i         = 0
    q_num     = 0
    while i < len(lines):
        line = lines[i].strip()

        # Detect question start: "1\. text" or "1. text"
        m = re.match(r'^(\d+)\\?\.\s+(.+)', line)
        if m:
            q_num        = int(m.group(1))
            q_text_lines = [m.group(2).strip()]
            i += 1

            # Collect continuation lines until we hit options
            while i < len(lines):
                next_line = lines[i].strip()
                if re.match(r'^[A-D]\.\s+', next_line):
                    break
                if re.match(r'^\d+\\?\.\s+', next_line):
                    break
                if next_line:
                    q_text_lines.append(next_line)
                i += 1

            question_text = ' '.join(q_text_lines).strip()

            # Collect options A B C D
            opts = {}
            while i < len(lines):
                opt_line = lines[i].strip()
                om = re.match(r'^([A-D])\.\s+(.+)', opt_line)
                if om:
                    opts[om.group(1)] = om.group(2).strip()
                    i += 1
                else:
                    break

            if len(opts) >= 4 and question_text:
                questions.append({
                    'question_no':   q_num,
                    'question_text': question_text,
                    'option_a':      opts.get('A', ''),
                    'option_b':      opts.get('B', ''),
                    'option_c':      opts.get('C', ''),
                    'option_d':      opts.get('D', ''),
                    'correct_answer': answer_map.get(q_num),
                    'topic':         None,
                    'difficulty':    'medium',
                })
            continue

        i += 1

    return questions


def parse_via_groq(content: str, exam_type: str, year: int) -> list:
    """Try to parse using Groq via the backend API."""
    try:
        res = requests.post(
            'http://localhost:8000/cbt/parse',
            json={
                'markdown_content': content[:6000],  # limit size
                'exam_type':        exam_type,
                'year':             year,
                'subject':          'Mathematics',
            },
            timeout=60,
        )
        if not res.ok:
            return []

        data = res.json()
        if not data.get('success'):
            return []

        return data.get('questions', [])

    except Exception as e:
        print(f"  Groq parse failed: {e}")
        return []


def upload_to_supabase(questions: list, exam_type: str, year: int):
    """Upload parsed questions directly to Supabase."""
    from supabase import create_client

    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_KEY')

    if not url or not key:
        print("❌ Set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env")
        sys.exit(1)

    supabase = create_client(url, key)

    rows = []
    for q in questions:
        if not q.get('question_text'):
            continue
        rows.append({
            'exam_type':     exam_type,
            'subject':       'Mathematics',
            'year':          year,
            'topic':         q.get('topic'),
            'question_no':   q.get('question_no'),
            'question_text': str(q.get('question_text', '')),
            'option_a':      str(q.get('option_a', '')),
            'option_b':      str(q.get('option_b', '')),
            'option_c':      str(q.get('option_c', '')),
            'option_d':      str(q.get('option_d', '')),
            'correct_answer': q.get('correct_answer'),
            'difficulty':    q.get('difficulty', 'medium'),
        })

    if not rows:
        print("❌ No valid questions to upload.")
        return

    batch_size = 20
    total      = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        supabase.table('exam_questions').insert(batch).execute()
        total += len(batch)
        print(f"  ✅ Uploaded {total}/{len(rows)}...")

    print(f"\n🎉 Done! {total} questions uploaded.")
    print(f"   Exam: {exam_type} {year}")


def upload_questions(filepath: str, exam_type: str, year: int):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    print(f"📄 File loaded: {filepath}")
    print(f"   Exam: {exam_type} {year}")

    # Try Groq first, fall back to local parser
    print("\n🤖 Attempting Groq parse...")
    questions = parse_via_groq(content, exam_type, year)

    if questions:
        print(f"✅ Groq parsed {len(questions)} questions")
    else:
        print("⚠️  Groq parse failed — using local parser...")
        questions = parse_questions_locally(content, exam_type, year)
        print(f"✅ Local parser found {len(questions)} questions")

    if not questions:
        print("❌ No questions found. Check the file format.")
        return

    # Show preview
    print(f"\n📋 Preview of first question:")
    q = questions[0]
    print(f"   Q: {q['question_text'][:80]}")
    print(f"   A: {q.get('option_a', '')[:50]}")
    print(f"   Answer: {q.get('correct_answer', 'unknown')}")

    print(f"\n⬆️  Uploading {len(questions)} questions to Supabase...")
    upload_to_supabase(questions, exam_type, year)


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python upload_questions.py <file.md> <JAMB|WAEC|NECO> <year>")
        print("Example: python upload_questions.py mathematics_jamb_2025.md JAMB 2025")
        sys.exit(1)

    upload_questions(sys.argv[1], sys.argv[2].upper(), int(sys.argv[3]))