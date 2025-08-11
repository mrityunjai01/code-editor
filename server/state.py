from collections import defaultdict
from typing import Dict, List, Any
from dataclasses import dataclass, field
import threading
from client import Client
import json
import asyncio


@dataclass
class DocumentState:
    """Document state for a room"""

    content: str = ""
    last_message_id: int = 0
    deltas: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class RoomState:
    """Complete state for a room"""

    clients: List[Any] = field(default_factory=list)
    document: DocumentState = field(default_factory=DocumentState)


class GlobalState:
    """Centralized state manager for the WebSocket server"""

    def __init__(self):
        self.message_queue_count = 0
        self._rooms: Dict[str, RoomState] = {}
        self._lock = threading.RLock()  # For thread safety
        self.message_queue: Dict[str, list[str]] = defaultdict(list)
        self.client_by_id: Dict[str, Client] = {}
        self.total_message_count: int = 0

    # Room Management
    def get_room(self, room_id: str) -> RoomState:
        """Get or create a room"""
        with self._lock:
            if room_id not in self._rooms:
                self._rooms[room_id] = RoomState()
            return self._rooms[room_id]

    def delete_room(self, room_id: str) -> bool:
        """Delete a room if it exists and is empty"""
        with self._lock:
            if room_id in self._rooms and not self._rooms[room_id].clients:
                del self._rooms[room_id]
                return True
            return False

    def get_all_rooms(self) -> Dict[str, RoomState]:
        """Get all rooms (for debugging/monitoring)"""
        with self._lock:
            return self._rooms.copy()

    # Client Management
    def add_client_to_room(self, room_id: str, client) -> None:
        """Add a client to a room"""
        with self._lock:
            self.client_by_id[client.client_id] = client
            room = self.get_room(room_id)
            if client not in room.clients:
                room.clients.append(client)

    def remove_client_from_room(self, room_id: str, client) -> bool:
        """Remove a client from a room. Returns True if room became empty."""
        with self._lock:
            del self.client_by_id[client.client_id]
            if room_id not in self._rooms:
                return False

            room = self._rooms[room_id]
            if client in room.clients:
                room.clients.remove(client)

            is_empty = len(room.clients) == 0
            if is_empty:
                self.delete_room(room_id)

            return is_empty

    def get_room_clients(self, room_id: str) -> List[Any]:
        """Get all clients in a room"""
        with self._lock:
            room = self.get_room(room_id)
            return room.clients.copy()

    def get_client_count(self, room_id: str) -> int:
        """Get number of clients in a room"""
        with self._lock:
            room = self.get_room(room_id)
            return len(room.clients)

    # Document Management
    def get_document(self, room_id: str) -> DocumentState:
        """Get document state for a room"""
        with self._lock:
            room = self.get_room(room_id)
            return room.document

    def set_document_content(self, room_id: str, content: str) -> None:
        """Set document content for a room"""
        with self._lock:
            room = self.get_room(room_id)
            room.document.content = content

    def add_delta(self, room_id: str, delta: Dict[str, Any]) -> int:
        """Add a delta to a room's document. Returns the message ID."""
        with self._lock:
            room = self.get_room(room_id)
            room.document.last_message_id += 1
            delta["message_id"] = room.document.last_message_id
            room.document.deltas.append(delta)
            return room.document.last_message_id

    def get_deltas_since(self, room_id: str, message_id: int) -> List[Dict[str, Any]]:
        """Get all deltas since a specific message ID"""
        with self._lock:
            room = self.get_room(room_id)
            return [
                delta
                for delta in room.document.deltas
                if delta.get("message_id", 0) > message_id
            ]

    def get_last_message_id(self, room_id: str) -> int:
        """Get the last message ID for a room"""
        with self._lock:
            room = self.get_room(room_id)
            return room.document.last_message_id

    def get_delta_count(self, room_id: str) -> int:
        """Get total number of deltas for a room"""
        with self._lock:
            room = self.get_room(room_id)
            return len(room.document.deltas)

    # Utility methods
    def get_room_stats(self, room_id: str) -> Dict[str, Any]:
        """Get comprehensive stats for a room"""
        with self._lock:
            if room_id not in self._rooms:
                return {
                    "exists": False,
                    "client_count": 0,
                    "document_length": 0,
                    "delta_count": 0,
                    "last_message_id": 0,
                }

            room = self._rooms[room_id]
            return {
                "exists": True,
                "client_count": len(room.clients),
                "document_length": len(room.document.content),
                "delta_count": len(room.document.deltas),
                "last_message_id": room.document.last_message_id,
            }

    def get_global_stats(self) -> Dict[str, Any]:
        """Get global server stats"""
        with self._lock:
            total_clients = sum(len(room.clients) for room in self._rooms.values())
            total_deltas = sum(
                len(room.document.deltas) for room in self._rooms.values()
            )

            return {
                "room_count": len(self._rooms),
                "total_clients": total_clients,
                "total_deltas": total_deltas,
                "rooms": list(self._rooms.keys()),
            }

    def queue_message(self, message: str, client_id: str):
        """Queue a message for a specific client"""
        with self._lock:
            self.message_queue[client_id].append(message)
            self.total_message_count += 1

    def get_total_pending_messages(self) -> int:
        """Get the total count of pending messages across all clients"""
        with self._lock:
            return self.total_message_count

    async def send_messages(self):
        """Send all queued messages to their respective clients using asyncio.gather()"""
        tasks = []

        with self._lock:
            # Create tasks for each client that has messages
            for client_id, messages in list(self.message_queue.items()):
                if messages and client_id in self.client_by_id:
                    client = self.client_by_id[client_id]
                    tasks.append(client.ws.send_json(messages))

            # Clear the queue and reset counter after creating tasks
            self.message_queue.clear()
            self.total_message_count = 0

        # Send all messages concurrently
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


# Global state instance
state = GlobalState()
