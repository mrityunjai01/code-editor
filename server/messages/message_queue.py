from logger import main_logger


async def message_queue_processor(state):
    """Background task to process queued messages"""
    main_logger.logger.info("Message queue processor started")

    while True:
        try:
            # Check if there are more than 10 messages in queue
            total_messages = state.get_total_pending_messages()

            if total_messages > 10:
                main_logger.logger.debug(f"Processing {total_messages} queued messages")
                await state.send_messages()
            else:
                # If we don't have enough messages, sleep for 1 second
                await asyncio.sleep(1)

        except Exception as e:
            main_logger.log_error("Error in message queue processor", e)
            await asyncio.sleep(1)  # Sleep on error to prevent tight loop
