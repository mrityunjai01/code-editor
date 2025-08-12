from handlers.disconnect import handle_disconnect
from starlette.applications import Starlette
from starlette.websockets import WebSocket, WebSocketDisconnect
from starlette.routing import WebSocketRoute
import json
import asyncio

from state import state
from handlers.connect import handle_connect
from handlers.update import handle_update
from handlers.typing import handle_typing_indicator
from handlers.cursor import handle_cursor_update
from handlers.input import handle_input_request, handle_initial_dump_request
from logger import main_logger
from messages.validate import validate_message
from messages.message_queue import message_queue_processor
# Remove the old rooms dict - now using centralized state


async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    main_logger.logger.info(f"WebSocket connection established from {websocket.client}")
    i = 0
    client = None

    try:
        while True:
            i += 1
            print(f"loop iter {i}")
            data = await websocket.receive_text()
            print(f"loop iter {i}")
            try:
                print(f"Received data: {data}")
                print(f"type of data: {type(data)}")
                messages = json.loads(data)
                if not isinstance(messages, list):
                    messages = [messages]

                main_logger.logger.debug(f"Raw messages received: {messages}")
                messages = [validate_message(msg) for msg in messages]
                for message in messages:
                    if message is None:
                        main_logger.log_error(
                            f"Invalid message format, closing connection: {data}"
                        )
                        await websocket.close(
                            code=1003, reason="Invalid message format"
                        )
                        return

                    message_type = message.type

                    if message_type == "connect":
                        client = await handle_connect(websocket, message, state)

                    elif message_type == "update" and client is not None:
                        await handle_update(websocket, message, state, client)

                    elif message_type == "typing" and client is not None:
                        await handle_typing_indicator(websocket, message, state, client)

                    elif message_type == "cursor" and client is not None:
                        await handle_cursor_update(websocket, message, state, client)

                    elif message_type == "input_request" and client is not None:
                        await handle_input_request(websocket, message, state, client)

                    elif message_type == "initial_dump_request" and client is not None:
                        await handle_initial_dump_request(
                            websocket, message, state, client
                        )

                    else:
                        main_logger.log_error(
                            f"Unknown message type, closing connection: {message_type}"
                        )
                        await websocket.close(code=1003, reason="Unknown message type")
                        return

            except json.JSONDecodeError as e:
                main_logger.log_error(
                    f"Invalid JSON received, closing connection: {data}", e
                )
                await websocket.close(code=1003, reason="Invalid JSON format")
                return
            except Exception as e:
                main_logger.log_error(f"Error processing message: {message_type}", e)
                await websocket.close(code=1011, reason="Internal server error")
                return

    except WebSocketDisconnect:
        main_logger.logger.info(f"WebSocket disconnected: {websocket.client}")
        main_logger.logger.debug(f"Handling disconnection..., 'client': {client}")
        main_logger.logger.debug(
            f"Handling client attrs..., 'client': {client.__dict__}"
        )
        if (
            client is not None
            and hasattr(client, "client_id")
            and hasattr(client, "client_room")
        ):
            main_logger.log_disconnection(client.client_id, client.client_room)

            # Remove client from room using centralized state
            room_became_empty = state.remove_client_from_room(
                client.client_room, client
            )
            main_logger.logger.debug("handlingdisconnect")

            if room_became_empty:
                main_logger.logger.info(
                    f"Room {client.client_room} deleted (no clients remaining)"
                )
            else:
                final_count = state.get_client_count(client.client_room)
                main_logger.log_room_state(client.client_room, final_count)
                main_logger.logger.debug(
                    f"Room {client.client_room} still has {final_count} clients, so we instead handle disconnect"
                )
                handle_disconnect(client.client_id, client.client_room, state)

    except Exception as e:
        main_logger.log_error(f"Unexpected error in websocket endpoint", e)


routes = [
    WebSocketRoute("/ws", websocket_endpoint),
]

app = Starlette(routes=routes)


@app.on_event("startup")
async def startup_event():
    """Start background tasks on application startup"""
    main_logger.logger.info("Starting background tasks...")

    # This spawns task and returns immediately
    asyncio.create_task(message_queue_processor(state))

    main_logger.logger.info("Background tasks started successfully")
