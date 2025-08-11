import uvicorn
from server import app

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",  # bind to all interfaces for production-like behavior
        port=8000,
        workers=4,  # multiple workers for production-like settings
        reload=False,  # no auto-reload for production-like behavior
        log_level="info",  # production log level
        access_log=True,  # log all requests
        use_colors=True,  # colored logs
        timeout_keep_alive=5,  # keep-alive timeout
        limit_concurrency=100,  # concurrent connections limit
        limit_max_requests=1000,  # max requests per worker before restart (disabled for never restarting)
    )

