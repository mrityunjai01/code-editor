from logger import main_logger
import asyncio
from config_manager import get_config


async def message_queue_processor(state):
    """Background task to process queued messages"""
    config = get_config()
    main_logger.logger.info("Message queue processor started")
    main_logger.logger.info(
        f"Using threshold: {config.message_queue.threshold}, sleep duration: {config.message_queue.sleep_duration}"
    )

    while True:
        try:
            # Check if there are more messages than the configured threshold
            total_messages = state.get_total_pending_messages()

            if total_messages >= config.message_queue.threshold:
                main_logger.logger.debug(f"Processing {total_messages} queued messages")
                await state.send_messages()
            else:
                await asyncio.sleep(config.message_queue.sleep_duration)

        except Exception as e:
            main_logger.log_error("Error in message queue processor", e)
            await asyncio.sleep(config.message_queue.error_sleep_duration)
