"""
Text-to-SQL — converts natural language to SQLite queries
"""
import logging
import re
import google.generativeai as genai
from sqlalchemy import text

from app.core.config import settings
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

SCHEMA = """
SQLite database tables available:
- employees(id INTEGER, name TEXT, department TEXT, email TEXT, hire_date TEXT, training_completed TEXT, salary REAL)
  [training_completed values contain comma-separated courses, e.g., 'Security,GDPR' or '']
- financial_data(id INTEGER, quarter TEXT, revenue REAL, expenses REAL, profit REAL, department TEXT)
- contracts(id INTEGER, vendor_name TEXT, contract_value REAL, start_date TEXT, end_date TEXT, status TEXT)
"""

SQL_PROMPT = """You are an expert SQLite query generator for a compliance analytics database.

Database Schema:
{schema}

User Question: {question}

Instructions:
- Write ONLY a valid SQLite SELECT query.
- Do NOT use PostgreSQL or MySQL-specific syntax.
- Use LIKE or LOWER() for string comparisons so comparisons are case-insensitive (e.g., department LIKE '%Engineering%' or LOWER(department) = 'engineering').
- For compliance training checks, e.g. who hasn't completed security training:
  SELECT * FROM employees WHERE training_completed NOT LIKE '%Security%'
- Output ONLY the raw SQL statement. No markdown fences, no explanations.

SQL:"""


async def ensure_sample_tables():
    """Create sample tables with data if they don't exist"""
    async with AsyncSessionLocal() as db:
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY,
                name TEXT, department TEXT, email TEXT,
                hire_date TEXT, training_completed TEXT, salary REAL
            )
        """))
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS financial_data (
                id INTEGER PRIMARY KEY,
                quarter TEXT, revenue REAL, expenses REAL, profit REAL, department TEXT
            )
        """))
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS contracts (
                id INTEGER PRIMARY KEY,
                vendor_name TEXT, contract_value REAL,
                start_date TEXT, end_date TEXT, status TEXT
            )
        """))
        
        count = (await db.execute(text("SELECT COUNT(*) FROM employees"))).scalar()
        if count == 0:
            await db.execute(text("""
                INSERT INTO employees VALUES
                (1,'Alice Johnson','Engineering','alice@co.com','2021-03-15','Security,GDPR',95000),
                (2,'Bob Smith','Sales','bob@co.com','2020-07-01','',72000),
                (3,'Carol White','HR','carol@co.com','2019-11-20','Security',68000),
                (4,'David Brown','Engineering','david@co.com','2022-01-10','Security,GDPR,ISO27001',105000),
                (5,'Eve Davis','Sales','eve@co.com','2021-06-05','',78000),
                (6,'Frank Miller','Finance','frank@co.com','2018-04-22','Security,GDPR',88000),
                (7,'Grace Lee','Engineering','grace@co.com','2023-02-14','',92000),
                (8,'Henry Wilson','Sales','henry@co.com','2020-09-30','Security',71000),
                (9,'Iris Chen','HR','iris@co.com','2022-08-17','GDPR',65000),
                (10,'Jack Taylor','Finance','jack@co.com','2019-12-01','Security,GDPR',91000)
            """))
            await db.execute(text("""
                INSERT INTO financial_data VALUES
                (1,'Q1-2025',1250000,890000,360000,'Engineering'),
                (2,'Q2-2025',1380000,920000,460000,'Sales'),
                (3,'Q3-2025',1420000,950000,470000,'Finance'),
                (4,'Q4-2025',1560000,980000,580000,'Engineering')
            """))
            await db.execute(text("""
                INSERT INTO contracts VALUES
                (1,'Acme Corp',250000,'2024-01-01','2025-12-31','active'),
                (2,'TechVendor Ltd',180000,'2024-06-01','2025-06-30','active'),
                (3,'DataServices Inc',95000,'2023-01-01','2025-01-31','expiring'),
                (4,'CloudPro',340000,'2024-03-15','2026-03-14','active'),
                (5,'SecureNet',75000,'2024-09-01','2025-09-30','active')
            """))
        await db.commit()


async def text_to_sql_answer(question: str) -> dict:
    await ensure_sample_tables()

    try:
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        sql_response = model.generate_content(SQL_PROMPT.format(schema=SCHEMA, question=question))
        generated_sql = sql_response.text.strip()
        generated_sql = re.sub(r"```[\w]*\n?", "", generated_sql).replace("```", "").strip()

        # Security check: only allow SELECT
        if not generated_sql.upper().startswith("SELECT"):
            generated_sql = "SELECT * FROM employees LIMIT 10"

        async with AsyncSessionLocal() as db:
            result = await db.execute(text(generated_sql))
            rows = result.fetchall()
            columns = list(result.keys())

        data = [dict(zip(columns, row)) for row in rows]

        summary_prompt = f"""Question: {question}
SQL executed: {generated_sql}
Data Returned ({len(data)} rows):
{str(data[:8])}

Provide a concise, professional summary answering the question based on this data:"""
        
        summary = model.generate_content(summary_prompt)
        answer_text = summary.text.strip() if summary and summary.text else f"Returned {len(data)} records."

        # Format markdown table for clean UI rendering
        table_md = ""
        if data and len(data) > 0 and columns:
            headers = " | ".join([c.replace("_", " ").title() for c in columns])
            separators = " | ".join(["---"] * len(columns))
            row_lines = []
            for r in data[:8]:
                vals = [str(r.get(c, "")).replace("|", "\\|") for c in columns]
                row_lines.append(" | ".join(vals))
            table_md = f"\n\n| {headers} |\n| {separators} |\n" + "\n".join([f"| {rl} |" for rl in row_lines])
            if len(data) > 8:
                table_md += f"\n\n*Showing top 8 of {len(data)} total records.*"

        full_answer = f"{answer_text}{table_md}\n\n```sql\n{generated_sql}\n```"

        return {
            "answer": full_answer,
            "sources": [{"type": "sql", "query": generated_sql, "rows_returned": len(data)}],
            "data": data,
            "sql": generated_sql,
            "intent": "sql",
        }

    except Exception as e:
        logger.error(f"Text-to-SQL error: {e}", exc_info=True)
        return {
            "answer": f"Unable to execute SQL query on structured data: {str(e)}. You can ask about employee counts, departments, training completion, or financials.",
            "sources": [],
            "intent": "sql",
        }
