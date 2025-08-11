import logging
import json
from datetime import datetime
from typing import Any, Dict

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('websocket.log')
    ]
)

class WSLogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(f"websocket.{name}")
    
    def log_connection(self, client_id: str, room_id: str, name: str):
        self.logger.info(f"Client connected: {client_id} ({name}) joined room {room_id}")
    
    def log_disconnection(self, client_id: str, room_id: str):
        self.logger.info(f"Client disconnected: {client_id} from room {room_id}")
    
    def log_message_received(self, message_type: str, client_id: str = None, data: Dict[Any, Any] = None):
        extra_info = f" from {client_id}" if client_id else ""
        data_str = f" - Data: {json.dumps(data, indent=2)}" if data else ""
        self.logger.info(f"Received {message_type}{extra_info}{data_str}")
    
    def log_message_sent(self, message_type: str, recipient_count: int, data: Dict[Any, Any] = None):
        data_str = f" - Data: {json.dumps(data, indent=2)}" if data else ""
        self.logger.info(f"Sent {message_type} to {recipient_count} clients{data_str}")
    
    def log_error(self, error: str, exception: Exception = None):
        if exception:
            self.logger.error(f"Error: {error}", exc_info=exception)
        else:
            self.logger.error(f"Error: {error}")
    
    def log_delta_processing(self, client_id: str, delta_count: int, message_ids: list):
        self.logger.debug(f"Client {client_id} sent {delta_count} deltas with message IDs: {message_ids}")
    
    def log_room_state(self, room_id: str, client_count: int, document_length: int = None):
        doc_info = f", document length: {document_length}" if document_length is not None else ""
        self.logger.debug(f"Room {room_id} state: {client_count} clients{doc_info}")

# Create logger instances for different components
main_logger = WSLogger("main")
connect_logger = WSLogger("connect")
update_logger = WSLogger("update") 
typing_logger = WSLogger("typing")
cursor_logger = WSLogger("cursor")
input_logger = WSLogger("input")