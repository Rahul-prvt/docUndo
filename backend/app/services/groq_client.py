"""Groq AI client using OpenAI-compatible interface."""

import asyncio
import json
import logging
import time
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class GroqTriageService:
    """Groq-backed triage/chat service via the OpenAI-compatible API."""

    def __init__(self):
        self.client = None
        self.model = "llama-3.1-8b-instant"
        self.rate_limiter = RateLimiter(
            max_rpm=settings.groq_rate_limit_rpm,
            max_tpm=settings.groq_rate_limit_tpm,
        )

    def get_client(self):
        """Lazily create the OpenAI client pointed at Groq's base URL."""
        if not settings.groq_api_key:
            logger.info("Groq client unavailable: GROQ_API_KEY is not configured")
            return None
        if self.client is None:
            from openai import OpenAI

            self.client = OpenAI(
                api_key=settings.groq_api_key,
                base_url="https://api.groq.com/openai/v1",
            )
            logger.info("Groq OpenAI-compatible client created model=%s", self.model)
        return self.client

    # ── Single-turn specialty suggestion (used by /triage) ──────────────────

    async def suggest_specialty(self, symptoms: str) -> Optional[dict]:
        """
        Suggest a medical specialty based on symptoms.
        Returns {"specialty": str, "disclaimer": str} or None if AI unavailable.
        """
        try:
            client = self.get_client()
            if client is None:
                return None

            if not await self.rate_limiter.can_proceed():
                logger.warning("Groq request skipped: rate limit reached")
                return None

            system_prompt = (
                "You are a medical triage assistant. Based on patient symptoms, "
                "suggest ONE appropriate medical specialty. IMPORTANT: You are NOT a doctor. "
                "This is for routing purposes only.\n\n"
                "Return ONLY a JSON object with this exact structure:\n"
                '{"specialty": "Specialty Name", "disclaimer": "This is not a diagnosis."}\n\n'
                "Medical specialties: General Practitioner, Cardiologist, Dermatologist, "
                "Gastroenterologist, Neurologist, Orthopedist, Psychiatrist, Pediatrician, "
                "ENT, Ophthalmologist, Urologist, Gynecologist, Pulmonologist, "
                "Rheumatologist, Endocrinologist"
            )

            response = await asyncio.to_thread(
                client.chat.completions.create,
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Symptoms: {symptoms}"},
                ],
                max_tokens=100,
                temperature=0.3,
            )

            if response.usage:
                await self.rate_limiter.add_usage(tokens=response.usage.total_tokens)

            content = response.choices[0].message.content or ""
            result = json.loads(content)
            logger.info("Groq specialty suggestion specialty=%s", result.get("specialty"))
            return result

        except Exception:
            logger.exception("Groq suggest_specialty failed")
            return None

    # ── Multi-turn chat (used by /chat) ──────────────────────────────────────

    async def chat(self, messages: list[dict], max_tokens: int = 400) -> Optional[str]:
        """
        Send a conversation history to Groq and return the assistant reply text.
        messages must be a list of {"role": ..., "content": ...} dicts
        (system prompt should already be prepended by the caller).
        Returns None if AI is unavailable.
        """
        try:
            client = self.get_client()
            if client is None:
                return None

            if not await self.rate_limiter.can_proceed():
                logger.warning("Groq chat request skipped: rate limit reached")
                return None

            response = await asyncio.to_thread(
                client.chat.completions.create,
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.5,
            )

            if response.usage:
                await self.rate_limiter.add_usage(tokens=response.usage.total_tokens)

            reply = response.choices[0].message.content or ""
            logger.info("Groq chat reply received tokens=%s", response.usage.total_tokens if response.usage else "?")
            return reply

        except Exception:
            logger.exception("Groq chat failed")
            return None


class RateLimiter:
    """Simple in-process rate limiter for Groq API."""

    def __init__(self, max_rpm: int, max_tpm: int):
        self.max_rpm = max_rpm
        self.max_tpm = max_tpm
        self.request_times: list[float] = []
        self.token_usage: list[dict] = []

    async def can_proceed(self) -> bool:
        """Return True and record the request if within rate limits."""
        now = time.time()
        cutoff = now - 60
        self.request_times = [t for t in self.request_times if t > cutoff]

        if len(self.request_times) >= self.max_rpm:
            return False

        self.request_times.append(now)
        return True

    async def add_usage(self, tokens: int):
        """Track token usage for the last 60 seconds."""
        self.token_usage.append({"timestamp": time.time(), "tokens": tokens})
        cutoff = time.time() - 60
        self.token_usage = [u for u in self.token_usage if u["timestamp"] > cutoff]


groq_service = GroqTriageService()
