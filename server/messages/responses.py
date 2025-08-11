from pydantic import BaseModel
from typing import Union, List, Dict, Any


class ConnectAckResponse(BaseModel):
    type: str = "connect_ack"
    client_id: str


class AddClientResponse(BaseModel):
    type: str = "addclient"
    client_id: str
    name: str


class CursorResponse(BaseModel):
    type: str = "cursor_update"
    client_id: str
    position: Dict[str, int]  # {"line": int, "column": int}


class TypingResponse(BaseModel):
    type: str = "typing_indicator"
    client_id: str
    typing: bool


class InitialDumpResponse(BaseModel):
    type: str = "initial_dump"
    content: str


class TextResponse(BaseModel):
    type: str = "update"
    deltas: List[Dict[str, Any]]


ResponseType = Union[
    ConnectAckResponse,
    AddClientResponse, 
    CursorResponse,
    TypingResponse,
    InitialDumpResponse,
    TextResponse
]


def create_connect_ack_response(client_id: str) -> dict:
    """Create a connect_ack response"""
    return ConnectAckResponse(client_id=client_id).model_dump()


def create_addclient_response(client_id: str, name: str) -> dict:
    """Create an addclient response"""
    return AddClientResponse(client_id=client_id, name=name).model_dump()


def create_cursor_response(client_id: str, line: int, column: int) -> dict:
    """Create a cursor_update response"""
    return CursorResponse(
        client_id=client_id,
        position={"line": line, "column": column}
    ).model_dump()


def create_typing_response(client_id: str, typing: bool) -> dict:
    """Create a typing_indicator response"""
    return TypingResponse(client_id=client_id, typing=typing).model_dump()


def create_initial_dump_response(content: str) -> dict:
    """Create an initial_dump response"""
    return InitialDumpResponse(content=content).model_dump()


def create_text_response(deltas: List[Dict[str, Any]]) -> dict:
    """Create an update response"""
    return TextResponse(deltas=deltas).model_dump()