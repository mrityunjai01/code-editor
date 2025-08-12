"""
Configuration Management System
Reads configuration from user-specified files via environment variables or default locations.
"""

import os
import json
import yaml
import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, Union
from pathlib import Path


@dataclass
class MessageQueueConfig:
    """Message queue configuration settings"""
    threshold: int = 1
    sleep_duration: float = 0.2
    error_sleep_duration: float = 1.0


@dataclass
class ServerConfig:
    """Server configuration settings"""
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4
    keep_alive_timeout: int = 5
    concurrency_limit: int = 100
    max_requests_per_worker: int = 1000


@dataclass
class RoomConfig:
    """Room and document configuration settings"""
    default_document_content: str = """def main():
    print('Hello, world!')
if __name__ == '__main__':
    main()"""


@dataclass
class AppConfig:
    """Main application configuration"""
    message_queue: MessageQueueConfig = field(default_factory=MessageQueueConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    room: RoomConfig = field(default_factory=RoomConfig)


class ConfigManager:
    """
    Singleton configuration manager that loads config from files and environment variables
    """
    _instance: Optional['ConfigManager'] = None
    _config: Optional[AppConfig] = None
    
    def __new__(cls) -> 'ConfigManager':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._config is None:
            self._logger = logging.getLogger(__name__)
            self._load_config()
    
    def _load_config(self) -> None:
        """Load configuration from file and environment variables"""
        config_data = self._load_config_file()
        
        # Apply environment variable overrides
        config_data = self._apply_env_overrides(config_data)
        
        # Create config objects
        self._config = self._create_config_objects(config_data)
        
        self._logger.info("Configuration loaded successfully")
    
    def _load_config_file(self) -> Dict[str, Any]:
        """Load configuration from file specified by env var or default locations"""
        config_path = self._get_config_file_path()
        
        if config_path and config_path.exists():
            try:
                return self._parse_config_file(config_path)
            except Exception as e:
                self._logger.warning(f"Failed to load config file {config_path}: {e}")
                self._logger.info("Using default configuration")
        else:
            if config_path:
                self._logger.warning(f"Config file not found: {config_path}")
            self._logger.info("Using default configuration")
        
        return {}
    
    def _get_config_file_path(self) -> Optional[Path]:
        """Get config file path from environment variable or default locations"""
        # Check environment variable first
        env_path = os.getenv('SERVER_CONFIG_PATH')
        if env_path:
            return Path(env_path)
        
        # Check default locations
        default_locations = [
            Path('./config.yaml'),
            Path('./config.yml'), 
            Path('./config.json'),
            Path('./server/config.yaml'),
            Path('./server/config.yml'),
            Path('./server/config.json'),
        ]
        
        for path in default_locations:
            if path.exists():
                self._logger.info(f"Using config file: {path}")
                return path
        
        return None
    
    def _parse_config_file(self, config_path: Path) -> Dict[str, Any]:
        """Parse configuration file (YAML or JSON)"""
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if config_path.suffix.lower() in ['.yaml', '.yml']:
            return yaml.safe_load(content) or {}
        elif config_path.suffix.lower() == '.json':
            return json.loads(content)
        else:
            raise ValueError(f"Unsupported config file format: {config_path.suffix}")
    
    def _apply_env_overrides(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply environment variable overrides to config data"""
        # Message Queue overrides
        if 'message_queue' not in config_data:
            config_data['message_queue'] = {}
        
        if threshold := os.getenv('MESSAGE_QUEUE_THRESHOLD'):
            try:
                config_data['message_queue']['threshold'] = int(threshold)
                self._logger.info(f"Override: MESSAGE_QUEUE_THRESHOLD = {threshold}")
            except ValueError:
                self._logger.warning(f"Invalid MESSAGE_QUEUE_THRESHOLD value: {threshold}")
        
        if sleep_duration := os.getenv('MESSAGE_QUEUE_SLEEP_DURATION'):
            try:
                config_data['message_queue']['sleep_duration'] = float(sleep_duration)
                self._logger.info(f"Override: MESSAGE_QUEUE_SLEEP_DURATION = {sleep_duration}")
            except ValueError:
                self._logger.warning(f"Invalid MESSAGE_QUEUE_SLEEP_DURATION value: {sleep_duration}")
        
        # Server overrides
        if 'server' not in config_data:
            config_data['server'] = {}
            
        if host := os.getenv('SERVER_HOST'):
            config_data['server']['host'] = host
            self._logger.info(f"Override: SERVER_HOST = {host}")
        
        if port := os.getenv('SERVER_PORT'):
            try:
                config_data['server']['port'] = int(port)
                self._logger.info(f"Override: SERVER_PORT = {port}")
            except ValueError:
                self._logger.warning(f"Invalid SERVER_PORT value: {port}")
        
        if workers := os.getenv('SERVER_WORKERS'):
            try:
                config_data['server']['workers'] = int(workers)
                self._logger.info(f"Override: SERVER_WORKERS = {workers}")
            except ValueError:
                self._logger.warning(f"Invalid SERVER_WORKERS value: {workers}")
        
        return config_data
    
    def _create_config_objects(self, config_data: Dict[str, Any]) -> AppConfig:
        """Create configuration objects from loaded data"""
        message_queue_data = config_data.get('message_queue', {})
        server_data = config_data.get('server', {})
        room_data = config_data.get('room', {})
        
        return AppConfig(
            message_queue=MessageQueueConfig(
                threshold=message_queue_data.get('threshold', MessageQueueConfig.threshold),
                sleep_duration=message_queue_data.get('sleep_duration', MessageQueueConfig.sleep_duration),
                error_sleep_duration=message_queue_data.get('error_sleep_duration', MessageQueueConfig.error_sleep_duration),
            ),
            server=ServerConfig(
                host=server_data.get('host', ServerConfig.host),
                port=server_data.get('port', ServerConfig.port),
                workers=server_data.get('workers', ServerConfig.workers),
                keep_alive_timeout=server_data.get('keep_alive_timeout', ServerConfig.keep_alive_timeout),
                concurrency_limit=server_data.get('concurrency_limit', ServerConfig.concurrency_limit),
                max_requests_per_worker=server_data.get('max_requests_per_worker', ServerConfig.max_requests_per_worker),
            ),
            room=RoomConfig(
                default_document_content=room_data.get('default_document_content', RoomConfig.default_document_content),
            )
        )
    
    @property
    def config(self) -> AppConfig:
        """Get the current configuration"""
        if self._config is None:
            raise RuntimeError("Configuration not loaded")
        return self._config
    
    def reload(self) -> None:
        """Reload configuration from file"""
        self._config = None
        self._load_config()


# Global config manager instance
_config_manager = ConfigManager()

def get_config() -> AppConfig:
    """Get the global configuration instance"""
    return _config_manager.config

def reload_config() -> None:
    """Reload the global configuration"""
    _config_manager.reload()