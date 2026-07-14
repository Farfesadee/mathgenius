# MathGenius Presentation Guide

## Project Overview

MathGenius is an AI-powered mathematics learning platform built to help students preparing for exams such as WAEC, JAMB, NECO, BECE, and NABTEB.

The platform combines:

- AI tutoring
- step-by-step math solving
- CBT exam practice
- past questions
- progress tracking
- personalized study support

The best way to present it is as a problem-solution-demo story.

## How To Structure Your Presentation

### 1. Start with the problem

Explain the challenge students face:

- many students get stuck without instant help
- most platforms only give answers, not explanations
- students often do not know their weak topics
- exam preparation is rarely personalized

### 2. Introduce the solution

You can say:

> MathGenius is an AI-powered mathematics learning platform that helps students learn, practice, and track their progress in one place.

### 3. Explain the system in two parts

This helps your audience understand the project clearly.

#### Core platform

- authentication and onboarding
- dashboard
- CBT practice
- past questions
- bookmarks and notes
- performance tracking

#### AI layer

- AI tutor
- AI solver
- AI quiz generation
- AI answer grading
- AI study planning
- AI explanations and topic support

This distinction is important.

You should emphasize that AI is not the whole app. AI is the intelligence layer that makes the platform adaptive and interactive.

## The Main Role of AI in the Project

The most important point to make is:

> AI in this project is not just a chatbot. It functions as a tutor, explanation engine, quiz generator, grading assistant, and study support system.

## What Exactly AI Does in MathGenius

### 1. AI Solver

AI helps solve mathematical problems and explain the steps involved, instead of only showing the final answer.

### 2. AI Tutor

Students can ask questions by topic and receive simplified explanations tailored to their learning level.

An important point to mention is that Teach mode is now grounded in different textbooks depending on the learner's level:

- primary uses the primary mathematics textbook
- jss uses the junior secondary mathematics textbook
- sss, secondary, and university currently use the engineering mathematics textbook

This makes the AI more context-aware and helps it explain topics using material that matches the learner category selected in the app.

### 3. AI Quiz and Practice Support

AI helps generate questions, assess responses, and provide feedback on practice attempts.

### 4. AI Study Planner

AI helps create personalized study plans based on a student's weak areas and learning needs.

### 5. AI Topic Support

AI helps generate topic overviews, study notes, and wiki-style learning content.

### 6. AI Exam Feedback

AI helps summarize CBT performance and identify areas where the student needs improvement.

### 7. AI with Math and Data Systems

AI works alongside other systems in the project:

- SymPy for symbolic math computation
- Supabase for authentication and data storage
- backend APIs for orchestration
- question banks and stored textbooks for context-aware responses

This means the platform is not relying on AI alone. AI is integrated with a proper learning system.

## Strong Statement To Use in Your Presentation

You can say:

> Without AI, this would only be a practice platform. With AI, it becomes an interactive tutor that can explain, adapt, guide, and respond to each student personally.

That is one of the strongest ways to explain the value of the project.

## Recommended Slide Structure

### Slide 1: Title

**MathGenius: An AI-Powered Mathematics Learning Platform**

### Slide 2: The Problem

Discuss:

- students struggle to get instant academic support
- many learning tools are not personalized
- students need explanations, not just answers

### Slide 3: The Solution

Explain that MathGenius combines learning, testing, and tracking in one intelligent system.

### Slide 4: Core Features

Mention:

- dashboard
- CBT mode
- past questions
- progress tracking
- bookmarks
- notes

### Slide 5: The Role of AI

This should be your key slide.

Mention:

- AI tutor
- AI solver
- AI grading assistant
- AI quiz generator
- AI study planner
- AI explanation engine
- level-based textbook grounding for better context

### Slide 6: How the System Works

Simple flow:

1. student enters a question or starts a practice activity
2. frontend sends request to backend
3. backend connects AI services, math engine, and database
4. the student gets a personalized response, explanation, or recommendation

### Slide 7: Impact

Explain the value:

- faster learning
- instant help
- personalized support
- improved exam readiness

## How To Explain the AI Technically

If your audience is technical, say:

- AI handles natural language understanding and content generation
- SymPy handles symbolic mathematics
- Supabase manages authentication, profiles, and stored progress
- the backend coordinates communication between the frontend, AI services, and the database
- a RAG pipeline with ingested textbooks allows Teach mode to retrieve level-specific context before responding

This shows that AI is one layer of a broader technical architecture.

## Best Live Demo Order

If you are presenting the product live, use this order:

1. ask the AI tutor a mathematics question
2. show the step-by-step explanation or solution
3. generate or grade a practice question
4. show the dashboard and progress tracking
5. show the personalized study support

This order makes the role of AI very clear.

## Textbook Mapping To Mention

If you want to show a concrete example of how AI is personalized in this project, mention the current mapping:

- `primary` -> `Mathematics_Textbook_For_Primary_Schools.pdf`
- `jss` -> `Mathematics_Textbook_For_Junior_Secondary_Schools.pdf`
- `sss`, `secondary`, and `university` -> `Engineering_Mathematics_Stroud.pdf`

You can explain this as:

> The AI does not answer from a single generic knowledge source. It first checks the student's selected level, retrieves relevant textbook context for that level, and then generates a response based on that material.

## Key Message To Repeat

Your central message should be:

> MathGenius is not just digitizing math practice. It is using AI to simulate personalized tutoring at scale.

## Short Closing Pitch

You can end with:

> MathGenius combines artificial intelligence, mathematics tools, and learning analytics to give students a smarter and more personalized way to prepare for exams.

## Short Spoken Version

If you want a brief explanation during your presentation, you can say:

> MathGenius is an AI-powered mathematics learning platform designed for exam preparation. Its major strength is the role of AI. AI is used not only to answer questions, but to explain concepts, generate practice, grade responses, support study planning, and personalize learning. In simple terms, AI transforms the platform from a normal practice app into an intelligent tutor that supports each student based on their needs.
