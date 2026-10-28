from sqlalchemy import BigInteger, Integer

# В SQLite BIGINT не автоинкрементится — нужен именно INTEGER.
# В Postgres/MySQL пойдёт BIGINT.
BigIntPK = BigInteger().with_variant(Integer, "sqlite")