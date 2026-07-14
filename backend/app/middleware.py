"""
VELTRIX SCADA API — Rate Limiting Middleware
"""
import time
from collections import defaultdict, deque
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = None, window_seconds: int = None):
        super().__init__(app)
        self.max_requests = max_requests or settings.RATE_LIMIT_REQUESTS
        self.window = window_seconds or settings.RATE_LIMIT_WINDOW
        self._requests: dict[str, deque] = defaultdict(lambda: deque())

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        reqs = self._requests[client_ip]

        while reqs and reqs[0] < now - self.window:
            reqs.popleft()

        if len(reqs) >= self.max_requests:
            return Response(
                content='{"detail":"Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self.window)},
            )

        reqs.append(now)
        return await call_next(request)
