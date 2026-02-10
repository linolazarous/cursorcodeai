# apps/api/app/ai/llm.py
"""
Grok LLM Factory - CursorCode AI
Creates routed LLM instances with optimal model, parameters, and tools.
Production-ready (February 2026): caching, tier-aware routing, dynamic params, streaming support.
Uses raw httpx to xAI API (OpenAI-compatible) – no langchain-groq dependency.
"""

import logging
from functools import lru_cache
from typing import List, Optional, Dict, Any, AsyncGenerator

import httpx
from langchain_core.messages import AIMessageChunk, AIMessage, BaseMessage

from app.core.config import settings
from app.ai.router import get_model_for_agent
from app.services.logging import audit_log

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────
# LLM Cache (per model + params combination)
# ────────────────────────────────────────────────
@lru_cache(maxsize=32)  # Adjust size based on concurrency
def get_llm(
    model_name: str,
    temperature: float = 0.7,
    max_tokens: int = 8192,
    top_p: float = 0.9,
    frequency_penalty: float = 0.0,
    presence_penalty: float = 0.0,
    tools: Optional[List] = None,
):
    """
    Cached LLM callable factory.
    Returns an async callable that makes xAI API calls.
    Caches based on model + generation params.
    """
    async def call(messages: List[Dict[str, str]]) -> AIMessage:
        """
        Async callable: send messages to xAI Grok API and return AIMessage.
        """
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "frequency_penalty": frequency_penalty,
            "presence_penalty": presence_penalty,
        }

        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.XAI_API_KEY.get_secret_value()}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()

            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return AIMessage(content=content)

        except httpx.HTTPStatusError as e:
            logger.error(f"xAI API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.exception("Unexpected error during xAI API call")
            raise

    # Bind tools if provided (mock - real binding would need LangChain)
    if tools:
        logger.warning("Tools binding not implemented in raw httpx mode")

    logger.debug(f"Created/cached LLM callable: {model_name} (temp={temperature}, tokens={max_tokens})")

    return call


# ────────────────────────────────────────────────
# Routed LLM Factory (synchronous call)
# ────────────────────────────────────────────────
def get_routed_llm(
    agent_type: str,
    user_tier: str = "starter",
    task_complexity: str = "medium",
    tools: Optional[List] = None,
    override_temperature: Optional[float] = None,
    override_max_tokens: Optional[int] = None,
):
    """
    Returns async callable for the routed Grok model.
    Use for non-streaming calls: await llm(messages)
    """
    model_name = get_model_for_agent(
        agent_type=agent_type,
        user_tier=user_tier,
        task_complexity=task_complexity,
    )

    # Dynamic parameters
    temperature = override_temperature if override_temperature is not None else 0.7
    max_tokens = override_max_tokens if override_max_tokens is not None else 8192

    if agent_type in ["architect", "security", "product"]:
        temperature = 0.2 if override_temperature is None else override_temperature
        max_tokens = 12288 if override_max_tokens is None else override_max_tokens
    elif agent_type in ["frontend", "backend"]:
        temperature = 0.5
        max_tokens = 8192
    else:
        temperature = 0.7
        max_tokens = 4096

    llm_callable = get_llm(
        model_name=model_name,
        temperature=temperature,
        max_tokens=max_tokens,
        tools=tools,
    )

    # Audit
    audit_log.delay(
        user_id=None,
        action="grok_llm_routed",
        metadata={
            "agent_type": agent_type,
            "user_tier": user_tier,
            "task_complexity": task_complexity,
            "model": model_name,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "tools_count": len(tools) if tools else 0,
            "streaming": False,
        }
    )

    logger.info(
        f"Routed LLM for {agent_type} (tier={user_tier}, complexity={task_complexity}): "
        f"{model_name} @ temp={temperature}, tokens={max_tokens}"
    )

    return llm_callable


# ────────────────────────────────────────────────
# Streaming Version (main entry point for streaming responses)
# ────────────────────────────────────────────────
async def stream_routed_llm(
    agent_type: str,
    messages: List[Dict[str, str]],
    user_tier: str = "starter",
    task_complexity: str = "medium",
    tools: Optional[List] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
) -> AsyncGenerator[str, None]:
    """
    Async generator that streams tokens from Grok API.
    Yields content chunks as they arrive.
    """
    model_name = get_model_for_agent(agent_type, user_tier, task_complexity)

    temp = temperature if temperature is not None else 0.7
    max_t = max_tokens if max_tokens is not None else 8192

    # Get LLM callable
    llm_callable = get_llm(
        model_name=model_name,
        temperature=temp,
        max_tokens=max_t,
        tools=tools,
    )

    # Audit streaming call
    audit_log.delay(
        user_id=None,
        action="grok_llm_stream_started",
        metadata={
            "agent_type": agent_type,
            "user_tier": user_tier,
            "task_complexity": task_complexity,
            "model": model_name,
            "temperature": temp,
            "max_tokens": max_t,
            "tools_count": len(tools) if tools else 0,
            "streaming": True,
        }
    )

    logger.info(
        f"Streaming LLM started for {agent_type} (tier={user_tier}, complexity={task_complexity}): "
        f"{model_name} @ temp={temp}, tokens={max_t}"
    )

    # Stream tokens
    try:
        full_response = ""
        async for chunk in llm_callable(messages):
            if isinstance(chunk, AIMessageChunk):
                if chunk.content:
                    full_response += chunk.content
                    yield chunk.content
        # End of stream
        yield "[DONE]"
    except Exception as exc:
        logger.exception("Streaming failed")
        yield f"[ERROR] Streaming failed: {str(exc)}"


# ────────────────────────────────────────────────
# Utility: Estimate tokens for pre-check (fallback)
# ────────────────────────────────────────────────
def estimate_prompt_tokens(messages: List[Dict[str, str]]) -> int:
    """
    Rough token estimation before call (4 chars ≈ 1 token).
    Used for credit pre-check in orchestrator.
    """
    total = 0
    for msg in messages:
        content = msg.get("content", "")
        total += len(content) // 4 + 10  # Overhead per message
    return total
