from pydantic import BaseModel
from typing import Union, List, Dict, Any


class ConnectAckResponse(BaseModel):
    type: str = "connect_ack"
    client_id: str


class ClientInfo(BaseModel):
    client_id: str
    name: str


class AddClientResponse(BaseModel):
    type: str = "addclient"
    clients: List[ClientInfo]


class RemoveClientResponse(BaseModel):
    type: str = "removeclient"
    clients: List[ClientInfo]


class CursorResponse(BaseModel):
    type: str = "cursor_update"
    ln: int
    pos: int
    client_id: str


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
    TextResponse,
]
