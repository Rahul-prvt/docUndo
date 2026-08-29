"""AI triage and chat routers"""
import logging
import json

from fastapi import APIRouter, status
from app.models.schemas import TriageRequest, TriageResponse, ChatRequest, ChatResponse
from app.services.groq_client import groq_service
import asyncio


router = APIRouter()
logger = logging.getLogger(__name__)

SPECIALTY_FALLBACK_LIST = [
    "General Practitioner",
    "Cardiologist",
    "Dermatologist",
    "Gastroenterologist",
    "Neurologist",
    "Orthopedist",
    "Psychiatrist",
    "Pediatrician",
    "ENT",
    "Ophthalmologist",
]

CHAT_SYSTEM_PROMPT = """You are DoctorUndo's friendly medical assistant helping patients in Kerala, India.
Your role is to:
1. Listen to the patient's symptoms or health concerns with empathy.
2. Ask brief clarifying questions when needed (one question at a time).
3. Based on the conversation, suggest the most appropriate medical specialty to consult.
4. Always include a medical disclaimer.
5. Keep replies concise — 2-4 sentences unless more detail is truly needed.
6. Respond in the same language the patient uses (English or Malayalam).

When you have gathered enough information to suggest a specialty, include at the END of your message
a JSON block on its own line in this exact format:
SPECIALTY_SUGGESTION: {"specialty": "Specialty Name"}

Medical specialties available: General Practitioner, Cardiologist, Dermatologist, Gastroenterologist,
Neurologist, Orthopedist, Psychiatrist, Pediatrician, ENT, Ophthalmologist, Urologist,
Gynecologist, Pulmonologist, Rheumatologist, Endocrinologist.

Important: You are NOT a doctor. Never diagnose. Always recommend consulting a real physician."""


@router.post("/triage", response_model=TriageResponse, status_code=status.HTTP_200_OK)
async def get_specialty_suggestion(request: TriageRequest):
    """
    Get AI-suggested specialty based on symptoms.
    Falls back to manual picker if AI is unavailable.
    """
    logger.info("Triage request received symptom_length=%s", len(request.symptoms))
    try:
        result = await asyncio.wait_for(
            groq_service.suggest_specialty(request.symptoms),
            timeout=5.0
        )

        if result:
            logger.info("Triage completed ai_available=true specialty=%s", result.get("specialty"))
            return TriageResponse(
                suggested_specialty=result.get("specialty", "General Practitioner"),
                disclaimer=result.get("disclaimer", "This is not a diagnosis."),
                ai_available=True,
                alternatives=SPECIALTY_FALLBACK_LIST[:5]
            )
    except asyncio.TimeoutError:
        logger.warning("Triage Groq request timed out")
    except Exception:
        logger.exception("Triage request failed")

    logger.info("Triage completed ai_available=false fallback=General Practitioner")
    return TriageResponse(
        suggested_specialty="General Practitioner",
        disclaimer="AI triage unavailable. Please browse by specialty or contact a clinic directly.",
        ai_available=False,
        alternatives=SPECIALTY_FALLBACK_LIST
    )


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_with_assistant(request: ChatRequest):
    """
    Multi-turn conversational AI assistant.
    Accepts a list of {role, content} messages and returns the assistant reply.
    The system prompt is prepended here so the caller never has to manage it.
    """
    logger.info("Chat request received messages=%s", len(request.messages))

    # Check if Groq is configured at all
    if groq_service.get_client() is None:
        return ChatResponse(
            reply="I'm currently unavailable — the AI service isn't configured. "
                  "Please describe your symptoms and use the specialty filter to find the right doctor.",
            suggested_specialty=None,
            ai_available=False,
        )

    # Build full message list: system prompt + conversation history
    messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})

    try:
        raw = await asyncio.wait_for(
            groq_service.chat(messages, max_tokens=400),
            timeout=12.0,
        )
    except asyncio.TimeoutError:
        logger.warning("Chat Groq request timed out")
        return ChatResponse(
            reply="The response took too long. Please try again.",
            suggested_specialty=None,
            ai_available=True,
        )
    except Exception:
        logger.exception("Chat request failed")
        return ChatResponse(
            reply="Something went wrong. Please try again.",
            suggested_specialty=None,
            ai_available=True,
        )

    if raw is None:
        # Rate limited or Groq returned nothing
        return ChatResponse(
            reply="I'm a little busy right now. Please try again in a moment.",
            suggested_specialty=None,
            ai_available=True,
        )

    # Extract optional specialty suggestion embedded in the reply
    suggested_specialty = None
    reply_text = raw
    marker = "SPECIALTY_SUGGESTION:"
    if marker in raw:
        parts = raw.split(marker, 1)
        reply_text = parts[0].strip()
        try:
            suggestion_json = parts[1].strip().split("\n")[0]
            parsed = json.loads(suggestion_json)
            suggested_specialty = parsed.get("specialty")
        except Exception:
            pass  # Malformed JSON — ignore specialty extraction

    logger.info("Chat reply sent specialty=%s", suggested_specialty)
    return ChatResponse(
        reply=reply_text,
        suggested_specialty=suggested_specialty,
        ai_available=True,
    )
