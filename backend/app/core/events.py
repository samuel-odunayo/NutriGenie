import asyncio
import logging
import traceback
from typing import Callable, Dict, List, Any

logger = logging.getLogger("nutrigenie.events")

# In-process asynchronous event bus for our modular monolith
_subscribers: Dict[str, List[Callable[[Any], Any]]] = {}


def subscribe(event_type: str, handler: Callable[[Any], Any]):
    """Subscribe a handler function to an event type."""
    if event_type not in _subscribers:
        _subscribers[event_type] = []
    _subscribers[event_type].append(handler)


async def publish(event_type: str, payload: Any):
    """Publish an event to all subscribed handlers asynchronously."""
    if event_type in _subscribers:
        tasks = []
        for handler in _subscribers[event_type]:
            if asyncio.iscoroutinefunction(handler):
                tasks.append(asyncio.create_task(handler(payload)))
            else:
                try:
                    handler(payload)
                except Exception as e:
                    logger.error("Error executing synchronous event handler for %s: %s", event_type, e)
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for res in results:
                if isinstance(res, Exception):
                    logger.error("Error in async event handler for %s: %s\n%s", event_type, res, "".join(traceback.format_exception(type(res), res, res.__traceback__)))
