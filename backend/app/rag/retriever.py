import os

from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer

QDRANT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "qdrant_db")
COLLECTION = "mathgenius_books"
EMBED_MODEL = "all-MiniLM-L6-v2"

_client = None
_model = None

LEVEL_SOURCE_HINTS = {
    "primary": [
        "mathematics_textbook_for_primary_schools",
        "new_general_mathematics_for_primary_schools",
    ],
    "jss": [
        "mathematics_textbook_for_junior_secondary_schools",
        "new_general_mathematics_for_junior_secondary_schools",
        "new_general_mathematics_for_junior_secondary_school",
    ],
    "sss": [
        "engineering_mathematics_stroud",
    ],
    "secondary": [
        "engineering_mathematics_stroud",
    ],
    "university": [
        "engineering_mathematics_stroud",
    ],
}


def _get_client_and_model():
    global _client, _model
    if _client is not None and _model is not None:
        return _client, _model
    if not os.path.exists(QDRANT_DIR):
        return None, None
    try:
        _client = QdrantClient(path=QDRANT_DIR)
        _model = SentenceTransformer(EMBED_MODEL)
        collections = [c.name for c in _client.get_collections().collections]
        if COLLECTION not in collections:
            return None, None

        info = _client.get_collection(COLLECTION)
        if info.points_count == 0:
            print("RAG collection is empty - no books ingested yet.")
            return None, None

        print(f"Qdrant RAG loaded - {info.points_count} chunks available.")
        return _client, _model
    except Exception as e:
        print(f"Qdrant not available: {e}")
        return None, None


def _normalize_source_name(value: str) -> str:
    return (
        (value or "")
        .strip()
        .lower()
        .replace(".pdf", "")
        .replace(" ", "_")
    )


def _get_level_source_filter(level: str | None):
    hints = LEVEL_SOURCE_HINTS.get((level or "").strip().lower(), [])
    if not hints:
        return None

    return models.Filter(
        should=[
            models.FieldCondition(
                key="source",
                match=models.MatchValue(value=hint),
            )
            for hint in hints
        ]
    )


def retrieve_context(query: str, n_results: int = 4, level: str | None = None) -> str:
    client, model = _get_client_and_model()
    if client is None or model is None:
        return ""

    try:
        query_vector = model.encode(query).tolist()
        source_filter = _get_level_source_filter(level)
        preferred_sources = LEVEL_SOURCE_HINTS.get((level or "").strip().lower(), [])

        results = client.query_points(
            collection_name=COLLECTION,
            query=query_vector,
            limit=n_results,
            with_payload=True,
            query_filter=source_filter,
        )

        if not results.points:
            return ""

        context_parts = []
        for hit in results.points:
            source = hit.payload.get("source", "Unknown")
            text = hit.payload.get("text", "").strip()
            score = hit.score
            normalized_source = _normalize_source_name(source)

            if preferred_sources and normalized_source not in preferred_sources:
                continue
            if text and score > 0.3:
                context_parts.append(
                    f"[Source: {source} | Relevance: {score:.0%}]\n{text}"
                )

        if not context_parts:
            return ""

        return (
            "RELEVANT TEXTBOOK CONTENT - use this to ground your answer:\n\n"
            + "\n\n---\n\n".join(context_parts)
            + "\n\n---\n"
        )
    except Exception as e:
        print(f"Retrieval error: {e}")
        return ""
