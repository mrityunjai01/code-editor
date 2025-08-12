import uvicorn
from server import app
from config_manager import get_config

if __name__ == "__main__":
    config = get_config()

    print("Starting server with config:")
    print(f"  Host: {config.server.host}")
    print(f"  Port: {config.server.port}")
    print(f"  Workers: {config.server.workers}")
    print(f"  Message queue threshold: {config.message_queue.threshold}")

    uvicorn.run(
        "server:app",
        host=config.server.host,
        port=config.server.port,
        workers=config.server.workers,
        reload=False,  # no auto-reload for production-like behavior
        log_level="debug",  # production log level
        access_log=True,  # log all requests
        use_colors=True,  # colored logs
        timeout_keep_alive=config.server.keep_alive_timeout,
        limit_concurrency=config.server.concurrency_limit,
        limit_max_requests=config.server.max_requests_per_worker,
    )
