from client import Client
from logger import connect_logger
from messages.responses import (
    AddClientResponse,
    ClientInfo,
    ConnectAckResponse,
    RemoveClientResponse,
)
from messages.validate import ConnectMessage
from state import GlobalState


def handle_disconnect(client_id: str, room_id: str, state: GlobalState):
    # Send client_id back to the connecting client using proper response type
    response = RemoveClientResponse(
        clients=[ClientInfo(client_id=client_id, name="")]
    ).model_dump()

    room_clients = state.get_room_clients(room_id)

    for room_client in room_clients:
        if room_client.client_id != client_id:
            state.queue_message(response, room_client.client_id)
