# apps/api/app/ai/router.py
"""
Grok Model Router - CursorCode AI
Intelligent multi-model routing across xAI Grok family (2026 standards).
Optimizes for reasoning depth, speed, cost, and task type.
"""

import logging
import os
from typing import Optional

from app.core.config import settings
from app.services.logging import audit_log

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────
# Model Registry (from env + defaults)
# ────────────────────────────────────────────────
MODELS = {
    "default_reasoning": settings.DEFAULT_XAI_MODEL or "grok-4-latest",
    "fast_reasoning": settings.FAST_REASONING_MODEL or "grok-4-1-fast-reasoning",
    "fast_non_reasoning": settings.FAST_NON_REASONING_MODEL or "grok-4-1-fast-non-reasoning",
}

# ────────────────────────────────────────────────
# Agent → Model Mapping (core logic)
# ────────────────────────────────────────────────
AGENT_MODEL_PREFERENCE = {
    # Deep reasoning / planning agents
    "architect": "default_reasoning",
    "product": "default_reasoning",

    # Code generation with tool calling (agentic)
    "frontend": "fast_reasoning",
    "backend": "fast_reasoning",
    "security": "fast_reasoning",     # Needs reasoning + tools

    # High-throughput / validation / simple tasks
    "qa": "fast_non_reasoning",
    "devops": "fast_non_reasoning",
}

# Optional overrides (e.g. for Pro/Premier tiers → more reasoning)
def get_model_for_agent(
    agent_type: str,
    user_tier: str = "starter",           # "starter", "standard", "pro", "premier", "ultra"
    task_complexity: str = "medium",      # "low", "medium", "high"
    force_model: Optional[str] = None,
) -> str:
    """
    Returns the optimal Grok model for the given agent/task.
    Factors: agent type, user plan, task complexity, cost optimization.
    """
    if force_model and force_model in MODELS.values():
        return force_model

    # High-tier users get more reasoning power
    if user_tier in ["premier", "ultra"] and task_complexity in ["medium", "high"]:
        preferred = "default_reasoning"
    else:
        # Default mapping
        preferred = AGENT_MODEL_PREFERENCE.get(agent_type, "fast_non_reasoning")

    # Complexity override
    if task_complexity == "high" and preferred != "default_reasoning":
        logger.info(f"Task complexity high → upgrading to default_reasoning for {agent_type}")
        preferred = "default_reasoning"

    # Cost optimization fallback (e.g. Starter → always fast)
    if user_tier == "starter" and preferred == "default_reasoning":
        logger.info(f"Starter tier → downgrading to fast_non_reasoning for {agent_type}")
        preferred = "fast_non_reasoning"

    selected = MODELS.get(preferred, MODELS["fast_non_reasoning"])

    # Audit routing decision
    audit_log.delay(
        user_id=None,  # Will be filled by caller
        action="grok_model_routed",
        metadata={
            "agent_type": agent_type,
            "user_tier": user_tier,
            "task_complexity": task_complexity,
            "selected_model": selected,
            "reason": preferred
        }
    )

    logger.info(f"Routed {agent_type} (tier={user_tier}, complexity={task_complexity}) → {selected}")

    return selected


# ────────────────────────────────────────────────
# LLM Factory (used in nodes.py)
# ────────────────────────────────────────────────
def get_routed_llm(
    agent_type: str,
    user_tier: str = "starter",
    task_complexity: str = "medium",
    temperature: float = 0.3,             # Lower for precision
    max_tokens: int = 8192,
    tools: Optional[List] = None,
):
    """
    Returns configured ChatXAI instance with correct model.
    """
    model_name = get_model_for_agent(agent_type, user_tier, task_complexity)

    llm = ChatXAI(
        model=model_name,
        api_key=settings.XAI_API_KEY.get_secret_value(),
        base_url="https://api.x.ai/v1",
        temperature=temperature,
        max_tokens=max_tokens,
    )

    if tools:
        llm = llm.bind_tools(tools)

    return llm


# ────────────────────────────────────────────────
# Utility: Estimate tokens (fallback if usage not returned)
# ────────────────────────────────────────────────
def estimate_tokens(text: str) -> int:
    """Rough token estimation (4 chars ≈ 1 token)"""
    return len(text) // 4 + 1