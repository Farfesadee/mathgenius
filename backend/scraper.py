import time
import re
import argparse
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager


def setup_driver(headless=True):
    chrome_options = Options()
    if headless:
        chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver


# ── Junk-line patterns to strip from question text ──────────────────────
JUNK_PATTERNS = [
    re.compile(r"^View Answer", re.IGNORECASE),
    re.compile(r"^JAMB\s*$", re.IGNORECASE),
    re.compile(r"^\d{4}\s*$"),                        # bare year like "2025"
    re.compile(r"JAMB CBT", re.IGNORECASE),
    re.compile(r"JAMB.*Whatsapp", re.IGNORECASE),
    re.compile(r"Free Download", re.IGNORECASE),
    re.compile(r"Candidates.*Resellers", re.IGNORECASE),
    re.compile(r"^Literature in English", re.IGNORECASE),
    re.compile(r"^Exam\s*(Type|year)", re.IGNORECASE),
    re.compile(r"^Question Type", re.IGNORECASE),
    re.compile(r"^(Topics|Novels)\s*$", re.IGNORECASE),
    re.compile(r"^All\s*$", re.IGNORECASE),
    re.compile(r"^Objective\s*$", re.IGNORECASE),
]


def is_junk(line: str) -> bool:
    """Return True if the line matches any known junk pattern."""
    return any(p.search(line) for p in JUNK_PATTERNS)


def extract_questions(html):
    """
    Parse a listing page and return a list of question dicts:
      { "question": str, "options": [str, str, str, str], "answer_url": str|None }
    """
    soup = BeautifulSoup(html, "lxml")
    questions = []

    # Each question lives in a div whose class contains "question"
    blocks = soup.find_all("div", class_=re.compile(r"question"))

    for block in blocks:
        # ── Extract options from <li> elements ──────────────────────
        option_items = block.find_all("li")
        options = []
        for li in option_items:
            text = li.get_text(" ", strip=True)
            # The site puts  "A. option text"  inside the <li>
            if re.match(r"^[A-D]\.", text):
                options.append(text)

        if len(options) < 4:
            continue  # not a real question block

        # ── Extract the "View Answer" link (holds the question id) ──
        answer_url = None
        answer_link = block.find("a", href=re.compile(r"/classroom/"))
        if answer_link and "View Answer" in answer_link.get_text():
            answer_url = answer_link["href"]
            if not answer_url.startswith("http"):
                answer_url = "https://myschool.ng" + answer_url

        # ── Extract question text ───────────────────────────────────
        # Remove all <ul>/<ol> (options) and <a> tags from a copy
        block_copy = BeautifulSoup(str(block), "lxml")
        for tag in block_copy.find_all(["ul", "ol", "a"]):
            tag.decompose()

        raw_lines = block_copy.get_text("\n", strip=True).split("\n")

        # Filter junk lines, option-label-only lines ("A.", "B.", …),
        # and standalone bare numbers that duplicate the question number
        cleaned = []
        for line in raw_lines:
            line = line.strip()
            if not line:
                continue
            if re.match(r"^[A-D]\.\s*$", line):  # bare label
                continue
            if re.match(r"^\d+\s*$", line):  # bare number
                continue
            if is_junk(line):
                continue
            cleaned.append(line)

        question_text = "\n".join(cleaned).strip()

        questions.append({
            "question": question_text,
            "options": options[:4],
            "answer_url": answer_url,
        })

    return questions


def scrape_answer(driver, url):
    """Visit an individual question page and return the correct option letter."""
    try:
        driver.get(url)
        time.sleep(1.5)
        soup = BeautifulSoup(driver.page_source, "lxml")

        # Look for "Correct Answer: Option B" in an <h5> or any element
        for el in soup.find_all(["h5", "h4", "h3", "p", "div", "span"]):
            text = el.get_text(strip=True)
            m = re.search(r"Correct\s+Answer\s*:\s*Option\s+([A-D])", text, re.IGNORECASE)
            if m:
                return m.group(1).upper()
    except Exception:
        pass
    return None


def generate_markdown(questions, subject, year):
    """Produce clean markdown matching the literature.md format."""
    lines = []
    lines.append(f"Subject: {subject}\n")
    lines.append("Topic : \n")
    lines.append(f"Year: {year}\n")
    lines.append("Questions\n")

    for i, q in enumerate(questions, start=1):
        lines.append(f"{i}\\. {q['question']}\n")
        for opt in q["options"]:
            lines.append(opt)
        lines.append("\n")

    # ── Answer key ──────────────────────────────────────────────────
    answers = []
    for i, q in enumerate(questions, start=1):
        ans = q.get("answer", "?")
        answers.append(f"{i}. {ans}")

    if any(q.get("answer") for q in questions):
        lines.append("\nCorrect Answer\n")
        lines.append(" ".join(answers))
        lines.append("")

    return "\n".join(lines)


def scrape(subject_slug, exam_type, year, start_page, end_page, headless=True):
    driver = setup_driver(headless=headless)
    base_url = f"https://myschool.ng/classroom/{subject_slug}"

    all_questions = []

    # ── Phase 1: scrape question listings ───────────────────────────
    for page in range(start_page, end_page + 1):
        print(f"[Page {page}/{end_page}] Scraping questions...")
        url = (
            f"{base_url}"
            f"?exam_type={exam_type}"
            f"&exam_year={year}"
            f"&type=obj"
            f"&page={page}"
        )

        driver.get(url)
        time.sleep(3)

        html = driver.page_source
        page_questions = extract_questions(html)
        all_questions.extend(page_questions)

    print(f"\nFound {len(all_questions)} questions total.")

    # ── Phase 2: scrape correct answers ─────────────────────────────
    for i, q in enumerate(all_questions, start=1):
        if q.get("answer_url"):
            print(f"[Answer {i}/{len(all_questions)}] Fetching correct answer...")
            ans = scrape_answer(driver, q["answer_url"])
            q["answer"] = ans if ans else "?"
        else:
            q["answer"] = "?"

    driver.quit()
    return all_questions


def main():
    parser = argparse.ArgumentParser(
        description="Scrape past questions from myschool.ng into clean markdown."
    )
    parser.add_argument("--subject", required=True,
                        help="URL slug. Example: literature-in-english")
    parser.add_argument("--exam_type", required=True,
                        help="Example: jamb")
    parser.add_argument("--year", required=True,
                        help="Example: 2025")
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--end", type=int, required=True)
    parser.add_argument("--visible", action="store_true",
                        help="Run browser visibly instead of headless")

    args = parser.parse_args()

    questions = scrape(
        subject_slug=args.subject,
        exam_type=args.exam_type,
        year=args.year,
        start_page=args.start,
        end_page=args.end,
        headless=not args.visible
    )

    if not questions:
        print("No questions found. The page structure may have changed.")
        return

    subject_title = args.subject.replace("-", " ").title()
    output = generate_markdown(questions, subject_title, args.year)

    filename = f"{args.subject}_{args.exam_type}_{args.year}.md"

    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)

    print(f"\nDone! Saved {len(questions)} questions to {filename}")


if __name__ == "__main__":
    main()
