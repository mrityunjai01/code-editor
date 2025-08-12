from client import Client
from logger import connect_logger
from messages.responses import AddClientResponse, ClientInfo, ConnectAckResponse
from messages.validate import ConnectMessage
from state import GlobalState
import asyncio


async def handle_connect(websocket, message: ConnectMessage, state: GlobalState):
    client = Client(websocket, message.name, message.room_id, message.client_id)

    connect_logger.log_message_received(
        "connect", data={"room_id": message.room_id, "name": message.name}
    )
    print(f"state before adding: {state.get_client_count(message.room_id)}")

    state.add_client_to_room(message.room_id, client)
    connect_logger.log_connection(client.client_id, message.room_id, message.name)
    print(f"state after adding: {state.get_client_count(message.room_id)}")
    connect_logger.log_room_state(
        message.room_id, state.get_client_count(message.room_id)
    )

    # Send client_id back to the connecting client using proper response type
    response = ConnectAckResponse(
        client_id=client.client_id,
    ).model_dump()

    connect_logger.log_message_sent("connect_ack", 1, response)
    await websocket.send_json(response)
    await asyncio.sleep(0.5)

    recipients = 0
    room_clients = state.get_room_clients(client.client_room)
    response = AddClientResponse(
        clients=[
            ClientInfo(client_id=room_client.client_id, name=room_client.name)
            for room_client in room_clients
        ]
    ).model_dump()
    recipients += 1
    await websocket.send_json(response)
    connect_logger.log_message_sent("addclient", recipients, response)

    recipients = 0
    response = AddClientResponse(
        clients=[ClientInfo(client_id=client.client_id, name=client.name)]
    ).model_dump()
    for room_client in room_clients:
        if room_client.client_id != client.client_id:
            recipients += 1
            state.queue_message(response, room_client.client_id)

    connect_logger.log_message_sent(
        "addclient",
        recipients,
        response,
    )
    return client
