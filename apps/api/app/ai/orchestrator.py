# apps/api/app/ai/orchestrator.py
"""
Core AI Agent Orchestration - CursorCode AI
LangGraph-based multi-agent system powered by xAI Grok (multi-model routing).
Handles: architecture → frontend/backend → security/qa → devops → deploy.
With tools, RAG/memory, credit metering, email notifications, persistence.
"""

import logging
import asyncio
from typing import TypedDict, Annotated, Sequence, Dict, Any, List
from uuid import uuid4

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.redis import RedisSaver
from langgraph.prebuilt import ToolNode
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_xai import ChatXAI
from tenacity import retry, stop_after_attempt, wait_exponential
import asyncpg
from pgvector.asyncpg import register_vector

from app.core.config import settings
from app.db.session import async_session_factory
from app.models.project import Project, ProjectStatus
from app.services.billing import deduct_credits, refund_credits
from app.services.email import (
    send_deployment_success_email,
    send_email_task,
)
from app.services.logging import audit_log
from app.tasks.metering import report_grok_usage
from .nodes import agent_node  # Per-agent node factory
from .tools import tools       # All available tools
from .router import route_model  # Grok model router

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────
# Agent State
# ────────────────────────────────────────────────
class AgentState(TypedDict):
    project_id: str
    user_id: str
    org_id: str
    messages: Annotated[Sequence[BaseMessage], "add_messages"]
    prompt: str
    architecture: Dict[str, Any] | None
    frontend_code: str | None
    backend_code: str | None
    tests: List[str] | None
    deployment_scripts: str | None
    errors: List[str]
    memory: Dict[str, Any]  # RAG results
    total_tokens_used: int = 0  # For metering


# ────────────────────────────────────────────────
# RAG Helper (pgvector)
# ────────────────────────────────────────────────
async def get_project_memory(prompt: str, org_id: str) -> Dict:
    """
    Retrieve similar past projects via vector similarity (pgvector).
    """
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL)
        await register_vector(conn)

        # Assume embeddings table: id, embedding (vector(1536)), content, org_id
        # Mock embedding (in prod: use Grok or OpenAI embeddings)
        embedding = [0.0] * 1536  # Replace with real embedding call

        results = await conn.fetch(
            """
            SELECT content, metadata
            FROM embeddings
            WHERE org_id = $1
            ORDER BY embedding <-> $2
            LIMIT 3
            """,
            org_id, embedding
        )
        await conn.close()

        return {
            "similar_projects": [
                {"content": r["content"], "metadata": r["metadata"]}
                for r in results
            ]
        }
    except Exception as e:
        logger.exception("RAG failed")
        return {"similar_projects": []}


# ────────────────────────────────────────────────
# Tool Node
# ────────────────────────────────────────────────
tool_node = ToolNode(tools)


# ────────────────────────────────────────────────
# Conditional Routing
# ────────────────────────────────────────────────
def should_continue(state: AgentState) -> str:
    if state["errors"]:
        return "error_handler"
    last_msg = state["messages"][-1]
    if isinstance(last_msg, AIMessage) and last_msg.tool_calls:
        return "tools"
    return "next"


# ────────────────────────────────────────────────
# Error Handler Node
# ────────────────────────────────────────────────
async def error_handler(state: AgentState) -> Dict:
    logger.error(f"Project {state['project_id']} failed: {state['errors']}")

    # Refund credits
    await refund_credits(
        user_id=state["user_id"],
        amount=10,  # Adjust based on actual usage
        reason="Project build failed",
        db=await async_session_factory().__anext__(),
    )

    # Notify user
    send_email_task.delay(
        to="user_email_from_db",  # Resolve in real impl
        subject="Project Build Failed",
        template_id=settings.SENDGRID_BUILD_FAILED_TEMPLATE_ID,
        dynamic_data={
            "project_id": state["project_id"],
            "errors": "\n".join(state["errors"]),
            "support_url": f"{settings.FRONTEND_URL}/support"
        }
    )

    return {"messages": [AIMessage(content="Build failed due to errors")]}


# ────────────────────────────────────────────────
# Build Graph
# ────────────────────────────────────────────────
def build_agent_graph():
    graph = StateGraph(AgentState)

    # RAG Inject Node
    async def rag_inject(state: AgentState):
        memory = await get_project_memory(state["prompt"], state["org_id"])
        return {"memory": memory, "messages": [HumanMessage(content=state["prompt"])]}

    graph.add_node("rag_inject", rag_inject)

    # Agent Nodes (using factory)
    graph.add_node("architect", lambda s: agent_node(s, "architect", 
        "Design full system architecture. Use memory: {memory}. Prompt: {prompt}"))
    graph.add_node("frontend", lambda s: agent_node(s, "frontend", 
        "Generate frontend code (Next.js/React) from architecture: {architecture}"))
    graph.add_node("backend", lambda s: agent_node(s, "backend", 
        "Generate backend code (FastAPI/Node) from architecture: {architecture}"))
    graph.add_node("security", lambda s: agent_node(s, "security", 
        "Scan generated code for vulnerabilities and compliance issues"))
    graph.add_node("qa", lambda s: agent_node(s, "qa", 
        "Write unit/integration/E2E tests and debug issues"))
    graph.add_node("devops", lambda s: agent_node(s, "devops", 
        "Generate CI/CD pipelines, Dockerfiles, deployment scripts"))

    graph.add_node("tools", tool_node)
    graph.add_node("error_handler", error_handler)

    # Edges
    graph.set_entry_point("rag_inject")
    graph.add_edge("rag_inject", "architect")

    # Architect → Tools loop or next
    graph.add_conditional_edges(
        "architect",
        should_continue,
        {"tools": "tools", "next": "frontend", "error_handler": "error_handler"}
    )
    graph.add_edge("tools", "architect")

    # Parallel frontend/backend after architect
    graph.add_edge("architect", "frontend")
    graph.add_edge("architect", "backend")
    graph.add_edge(["frontend", "backend"], "security")

    # Security → Tools loop or QA
    graph.add_conditional_edges(
        "security",
        should_continue,
        {"tools": "tools", "next": "qa", "error_handler": "error_handler"}
    )
    graph.add_edge("tools", "security")

    # QA → Tools loop or DevOps
    graph.add_conditional_edges(
        "qa",
        should_continue,
        {"tools": "tools", "next": "devops", "error_handler": "error_handler"}
    )
    graph.add_edge("tools", "qa")

    # End
    graph.add_edge("devops", END)

    # Persistence
    saver = RedisSaver.from_conn_string(settings.REDIS_URL)
    return graph.compile(checkpointer=saver)


# ────────────────────────────────────────────────
# Trigger Task (Celery)
# ────────────────────────────────────────────────
@shared_task(name="ai.run_agent_graph", bind=True, max_retries=3)
def run_agent_graph_task(
    self,
    project_id: str,
    prompt: str,
    user_id: str,
    org_id: str,
):
    """
    Celery task to run full agent graph.
    Handles credit gate, execution, metering, notifications.
    """
    estimated_cost = 10  # Credits - adjust based on complexity

    async def _run():
        async with async_session_factory() as db:
            # Credit gate
            success, msg = await deduct_credits(
                user_id=user_id,
                amount=estimated_cost,
                reason=f"Project orchestration: {prompt[:50]}...",
                db=db,
            )
            if not success:
                await send_email_task(
                    to="user_email",  # Resolve from DB
                    subject="Insufficient Credits",
                    template_id=settings.SENDGRID_LOW_CREDITS_TEMPLATE_ID,
                    dynamic_data={"remaining": 0}
                )
                raise ValueError(msg)

            # Build & run graph
            graph = build_agent_graph()
            config = {"configurable": {"thread_id": project_id}}

            initial_state = AgentState(
                project_id=project_id,
                user_id=user_id,
                org_id=org_id,
                messages=[],
                prompt=prompt,
                errors=[],
                total_tokens_used=0,
            )

            try:
                final_state = await graph.ainvoke(initial_state, config)

                # Save results
                project = await db.get(Project, project_id)
                project.status = ProjectStatus.COMPLETED
                project.code_repo_url = "git-generated-repo-url"  # In prod: upload to Git
                project.deploy_url = "https://project.cursorcode.app"  # Mock or real
                await db.commit()

                # Notify success
                send_deployment_success_email(
                    email="user_email",  # Resolve
                    project_title=project.title or "New Project",
                    deploy_url=project.deploy_url,
                )

                # Meter actual usage
                total_tokens = final_state.get("total_tokens_used", 5000)
                report_grok_usage.delay(
                    user_id=user_id,
                    tokens_used=total_tokens,
                    model_name="mixed_grok",
                )

                audit_log.delay(
                    user_id=user_id,
                    action="project_completed",
                    metadata={"project_id": project_id, "tokens": total_tokens}
                )

            except Exception as exc:
                # Refund on failure
                await refund_credits(
                    user_id=user_id,
                    amount=estimated_cost,
                    reason="Orchestration failed",
                    db=db,
                )
                project = await db.get(Project, project_id)
                project.status = ProjectStatus.FAILED
                project.error_message = str(exc)
                await db.commit()

                send_email_task.delay(
                    to="user_email",
                    subject="Project Build Failed",
                    template_id=settings.SENDGRID_BUILD_FAILED_TEMPLATE_ID,
                    dynamic_data={"project_id": project_id, "error": str(exc)}
                )

                raise self.retry(exc=exc)

    asyncio.run(_run())