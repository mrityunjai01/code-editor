import json
from client import Client
from logger import connect_logger
from messages.validate import ConnectMessage


async def handle_connect(websocket, message: ConnectMessage, state):
    room_id = message.room_id
    name = message.name
    client = Client(websocket, name, room_id, message.client_id)

    connect_logger.log_message_received(
        "connect", data={"room_id": room_id, "name": name}
    )

    state.add_client_to_room(room_id, client)
    connect_logger.log_connection(client.client_id, room_id, name)
    connect_logger.log_room_state(room_id, state.get_client_count(room_id))

    # Send client_id back to the connecting client
    response = {
        "type": "connect_ack",
        "client_id": client.client_id,
        "room_id": room_id,
    }

    state.queue_message(json.dumps(response), client.client_id)
    connect_logger.log_message_sent("connect_ack", 1, response)

    return client
