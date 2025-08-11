from pydantic import BaseModel, ValidationError
from typing import Union


class ConnectMessage(BaseModel):
    type: str = "connect"
    room_id: str
    name: str
    client_id: str | None = None


class TextMessage(BaseModel):
    type: str = "text"
    content: str
    client_id: str


class CursorMessage(BaseModel):
    type: str = "cursor"
    ln: int
    pos: int
    client_id: str


class TypingMessage(BaseModel):
    type: str = "typing"
    is_typing: bool
    client_id: str


class InitialDumpRequest(BaseModel):
    type: str = "initial_dump_request"
    room_id: str
    client_id: str


MessageType = Union[ConnectMessage, TextMessage, CursorMessage, TypingMessage]


def validate_message(message: dict) -> Union[MessageType, None]:
    """
    Validates and parses a message dictionary into the appropriate message type.
    Returns the parsed message object if valid, None if invalid.
    """
    print("Validating message:", message)
    print("Message type:", type(message))
    if not isinstance(message, dict) or "type" not in message:
        return None

    try:
        message_type = message.get("type")

        if message_type == "connect":
            return ConnectMessage(**message)
        elif message_type == "text":
            return TextMessage(**message)
        elif message_type == "cursor":
            return CursorMessage(**message)
        elif message_type == "typing":
            return TypingMessage(**message)
        elif message_type == "initial_dump_request":
            return InitialDumpRequest(**message)
        else:
            return None

    except ValidationError:
        return None
