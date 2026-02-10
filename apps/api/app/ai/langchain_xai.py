# apps/api/app/ai/langchain_xai.py
"""
Custom LangChain integration for xAI Grok API
OpenAI-compatible ChatModel wrapper using httpx.
Supports Grok models (grok-beta, grok-4, etc.) via https://api.x.ai/v1
"""

import logging
from typing import List, Any, Optional, Dict, Union

import httpx
from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    messages_from_dict,
)
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.pydantic_v1 import Field, SecretStr, validator

logger = logging.getLogger(__name__)

class ChatXAI(BaseChatModel):
    """Chat model for xAI Grok API."""

    model: str = Field(..., description="Model name, e.g. 'grok-beta'")
    api_key: SecretStr = Field(..., env="XAI_API_KEY")
    base_url: str = "https://api.x.ai/v1"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, ge=1)
    top_p: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    frequency_penalty: Optional[float] = Field(default=None, ge=-2.0, le=2.0)
    presence_penalty: Optional[float] = Field(default=None, ge=-2.0, le=2.0)

    @validator("api_key", pre=True)
    def validate_api_key(cls, v: Any) -> SecretStr:
        if isinstance(v, str):
            return SecretStr(v)
        raise ValueError("XAI_API_KEY must be a string")

    class Config:
        arbitrary_types_allowed = True

    @property
    def _llm_type(self) -> str:
        return "xai-grok"

    @property
    def _identifying_params(self) -> Dict[str, Any]:
        return {
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
            "frequency_penalty": self.frequency_penalty,
            "presence_penalty": self.presence_penalty,
        }

    def _convert_messages_to_dicts(self, messages: List[BaseMessage]) -> List[Dict]:
        result = []
        for message in messages:
            if isinstance(message, SystemMessage):
                role = "system"
            elif isinstance(message, HumanMessage):
                role = "user"
            elif isinstance(message, AIMessage):
                role = "assistant"
            else:
                raise ValueError(f"Unsupported message type: {type(message)}")

            result.append({
                "role": role,
                "content": message.content,
            })
        return result

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        payload = {
            "model": self.model,
            "messages": self._convert_messages_to_dicts(messages),
            "temperature": kwargs.get("temperature", self.temperature),
            "max_tokens": kwargs.get("max_tokens", self.max_tokens),
            "top_p": kwargs.get("top_p", self.top_p),
            "frequency_penalty": kwargs.get("frequency_penalty", self.frequency_penalty),
            "presence_penalty": kwargs.get("presence_penalty", self.presence_penalty),
            "stop": stop,
        }

        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}

        try:
            with httpx.Client(timeout=90.0) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key.get_secret_value()}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()

            data = response.json()
            choice = data["choices"][0]
            content = choice["message"]["content"]

            generation = ChatGeneration(
                message=AIMessage(content=content),
                generation_info={
                    "finish_reason": choice["finish_reason"],
                    "usage": data.get("usage", {}),
                },
            )

            return ChatResult(generations=[generation])

        except httpx.HTTPStatusError as e:
            logger.error(f"xAI API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.exception("Unexpected error during xAI API call")
            raise

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        payload = {
            "model": self.model,
            "messages": self._convert_messages_to_dicts(messages),
            "temperature": kwargs.get("temperature", self.temperature),
            "max_tokens": kwargs.get("max_tokens", self.max_tokens),
            "top_p": kwargs.get("top_p", self.top_p),
            "frequency_penalty": kwargs.get("frequency_penalty", self.frequency_penalty),
            "presence_penalty": kwargs.get("presence_penalty", self.presence_penalty),
            "stop": stop,
        }

        payload = {k: v for k, v in payload.items() if v is not None}

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key.get_secret_value()}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()

            data = response.json()
            choice = data["choices"][0]
            content = choice["message"]["content"]

            generation = ChatGeneration(
                message=AIMessage(content=content),
                generation_info={
                    "finish_reason": choice["finish_reason"],
                    "usage": data.get("usage", {}),
                },
            )

            return ChatResult(generations=[generation])

        except httpx.HTTPStatusError as e:
            logger.error(f"xAI API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.exception("Unexpected async error during xAI API call")
            raise
