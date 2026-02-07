# apps/api/app/ai/nodes.py
"""
Per-Agent Node Implementations - CursorCode AI
Each agent has specialized prompt, tools, model routing, and state updates.
Integrates token metering, retries, error handling, and audit logging.
"""

import logging
from typing import Dict, Any, Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage
from langchain_core.exceptions import OutputParserException
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import sentry_sdk

from app.core.config import settings
from app.services.logging import audit_log
from app.tasks.metering import report_grok_usage
from .llm import get_routed_llm
from .tools import (
    tools,  # Full set
    architect_tools, frontend_tools, backend_tools, security_tools, qa_tools, devops_tools
)

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────
# Agent-specific system prompts (concise, role-focused)
# ────────────────────────────────────────────────
AGENT_PROMPTS = {
    "architect": """
You are the Architect Agent for CursorCode AI.
Design complete, scalable system architecture based on user prompt.
Use memory and tools to get latest stack info.
Output structured JSON: {"stack": "...", "db": "...", "auth": "...", "api": "...", "reasoning": "..."}
Be precise, production-ready, and cost-aware.
""",
    "frontend": """
You are the Frontend Agent.
Generate modern, responsive UI/UX code (Next.js App Router + Tailwind + Shadcn preferred).
Use architecture from previous step.
Output code files as dict: {"path": "content", ...}
Focus on accessibility, performance, best practices.
""",
    "backend": """
You are the Backend Agent.
Generate secure, scalable backend (FastAPI preferred, or Node/Express/Go).
Use architecture from previous step.
Output code files as dict: {"path": "content", ...}
Include REST/GraphQL APIs, DB models, auth, error handling.
""",
    "security": """
You are the Security Agent.
Audit code for vulnerabilities (OWASP Top 10, secrets, injection, auth bypass, etc.).
Use tools to scan if needed.
Output: {"issues": [{"severity": "high", "description": "...", "fix": "..."}], "score": 8/10}
""",
    "qa": """
You are the QA Agent.
Write unit, integration, E2E tests.
Debug issues, suggest fixes.
Use code execution tool to validate.
Output: {"tests": [{"file": "tests/test_xx.py", "content": "..."}], "coverage": "85%", "issues_fixed": [...]}
""",
    "devops": """
You are the DevOps Agent.
Generate CI/CD (GitHub Actions), Dockerfiles, deployment scripts (K8s or Vercel).
Output files as dict: {"Dockerfile": "...", ".github/workflows/deploy.yml": "..."}
Focus on zero-downtime, auto-scaling, monitoring.
"""
}


# ────────────────────────────────────────────────
# Per-agent tool subsets (optimize token usage & security)
# ────────────────────────────────────────────────
AGENT_TOOLS = {
    "architect": architect_tools,      # e.g. search_latest_stack_trends
    "frontend": frontend_tools,        # e.g. fetch_ui_component_example
    "backend": backend_tools,          # e.g. validate_api_schema
    "security": security_tools,        # e.g. vuln_scan, secrets_check
    "qa": qa_tools,                    # e.g. execute_code_snippet
    "devops": devops_tools,            # e.g. generate_dockerfile
}


# ────────────────────────────────────────────────
# Generic Agent Node (with token metering)
# ────────────────────────────────────────────────
@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=1, min=4, max=30),
    retry=retry_if_exception_type((Exception, OutputParserException)),
    reraise=True,
)
async def agent_node(
    state: Dict[str, Any],
    agent_type: str,
    system_prompt_key: str = None,
) -> Dict[str, Any]:
    """
    Generic node for any agent.
    - Routes to correct model
    - Binds agent-specific tools
    - Runs LLM call
    - Tracks tokens for metering
    - Updates state
    - Audits call
    """
    # Get system prompt (use key or fallback to agent_type)
    system_prompt = AGENT_PROMPTS.get(system_prompt_key or agent_type, AGENT_PROMPTS[agent_type])

    # Bind tools (agent-specific subset)
    tools_subset = AGENT_TOOLS.get(agent_type, tools)
    llm = get_routed_llm(agent_type, tools=tools_subset)

    # Build prompt
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", system_prompt + "\nUse tools only when necessary. Be concise and production-ready."),
        *state["messages"],
    ])

    # Inject initial prompt if first message
    if not state["messages"]:
        prompt_template = prompt_template.append(("human", state["prompt"]))

    try:
        # Invoke LLM
        response: AIMessage = await llm.ainvoke(prompt_template.format_messages(**state))

        # Token usage (Grok returns usage in response)
        usage = getattr(response, "usage", None)
        tokens_used = usage.total_tokens if usage else len(response.content) // 4  # Rough estimate fallback

        # Queue metering
        report_grok_usage.delay(
            user_id=state["user_id"],
            tokens_used=tokens_used,
            model_name=llm.model,
            request_id=str(uuid4()),
            timestamp=int(datetime.now(timezone.utc).timestamp()),
        )

        # Audit
        audit_log.delay(
            user_id=state["user_id"],
            action=f"agent_{agent_type}_executed",
            metadata={
                "project_id": state["project_id"],
                "tokens": tokens_used,
                "model": llm.model,
                "has_tool_calls": bool(response.tool_calls),
            },
        )

        # Update state
        updates = {
            "messages": [response],
            "total_tokens_used": state.get("total_tokens_used", 0) + tokens_used,
        }

        # Agent-specific state updates (structured parsing)
        if not response.tool_calls:
            content = response.content.strip()
            if agent_type in ["architect", "security", "qa"]:
                try:
                    parsed = json.loads(content)
                    updates[agent_type] = parsed
                except json.JSONDecodeError:
                    updates[agent_type] = content
            else:
                updates[f"{agent_type}_code"] = content

        return updates

    except Exception as exc:
        logger.exception(f"Agent {agent_type} failed for project {state['project_id']}")
        sentry_sdk.capture_exception(exc)
        return {
            "messages": [AIMessage(content=f"Agent {agent_type} failed: {str(exc)}")],
            "errors": state.get("errors", []) + [f"{agent_type}: {str(exc)}"],
        }


# ────────────────────────────────────────────────
# Specialized Node Wrappers (optional readability)
# ────────────────────────────────────────────────
async def architect_node(state: Dict[str, Any]) -> Dict[str, Any]:
    return await agent_node(state, "architect")

async def frontend_node(state: Dict[str, Any]) -> Dict[str, Any]:
    return await agent_node(state, "frontend")

async def backend_node(state: Dict[str, Any]) -> Dict[str, Any]:
    return await agent_node(state, "backend")

async def security_node(state: Dict[str, Any]) -> Dict[str, Any]:
    return await agent_node(state, "security")

async def qa_node(state: Dict[str, Any]) -> Dict[str, Any]:
    return await agent_node(state, "qa")

async def devops_node(state: Dict[str, Any]) -> Dict[str, Any]:
    return await agent_node(state, "devops")