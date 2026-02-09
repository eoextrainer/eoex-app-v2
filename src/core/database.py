from contextlib import asynccontextmanager
from typing import Optional

import asyncpg
from loguru import logger


class Database:
    def __init__(self) -> None:
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self, dsn: str, **kwargs) -> None:
        self.pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=2,
            max_size=20,
            max_queries=50000,
            max_inactive_connection_lifetime=300,
            **kwargs,
        )
        logger.info("Database connection pool established")

    async def disconnect(self) -> None:
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")

    @asynccontextmanager
    async def acquire(self):
        if not self.pool:
            raise RuntimeError("Database not connected")
        async with self.pool.acquire() as connection:
            yield connection

    async def execute(self, query: str, *args):
        async with self.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args):
        async with self.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args):
        async with self.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetchval(self, query: str, *args):
        async with self.acquire() as conn:
            return await conn.fetchval(query, *args)


db = Database()
