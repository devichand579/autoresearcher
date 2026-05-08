"""ChromaDB-based semantic memory for long-horizon research understanding."""
import chromadb
from chromadb.utils import embedding_functions
from ..config import get_settings

settings = get_settings()

_client: chromadb.PersistentClient | None = None
_collection = None


def _get_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.chroma_persist_directory)
    return _client


def _get_collection():
    global _collection
    if _collection is None:
        client = _get_client()
        ef = embedding_functions.DefaultEmbeddingFunction()
        _collection = client.get_or_create_collection(
            name="research_articles",
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def store_article(article_id: int, text: str, metadata: dict) -> str:
    """Store article embedding; returns the chroma document ID."""
    collection = _get_collection()
    doc_id = f"article_{article_id}"
    clean_meta = {k: str(v) if v is not None else "" for k, v in metadata.items()}
    collection.upsert(
        ids=[doc_id],
        documents=[text],
        metadatas=[clean_meta],
    )
    return doc_id


def query_similar(text: str, n_results: int = 5, topic_id: int | None = None) -> list[dict]:
    """Find semantically similar articles."""
    collection = _get_collection()
    where = {"topic_id": str(topic_id)} if topic_id is not None else None
    try:
        results = collection.query(
            query_texts=[text],
            n_results=min(n_results, max(collection.count(), 1)),
            where=where,
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        return []

    output = []
    if results["ids"] and results["ids"][0]:
        for i, doc_id in enumerate(results["ids"][0]):
            output.append({
                "id": doc_id,
                "document": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i],
            })
    return output


def get_article_count() -> int:
    try:
        return _get_collection().count()
    except Exception:
        return 0
