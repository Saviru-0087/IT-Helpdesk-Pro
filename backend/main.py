
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import get_connection, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="IT Helpdesk Pro API",
    description="IT support ticket management system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TicketCreate(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=5, max_length=3000)
    category: str
    priority: str = "Medium"
    requester: str = Field(min_length=2, max_length=100)


class TicketUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    technician: str | None = None
    resolution_notes: str | None = None


VALID_STATUSES = {"Open", "In Progress", "Resolved", "Closed"}
VALID_PRIORITIES = {"Low", "Medium", "High", "Critical"}
VALID_CATEGORIES = {
    "Hardware", "Software", "Network", "Printer", "Other"
}


def ticket_dict(row):
    return dict(row)


@app.get("/")
def home():
    return {"message": "IT Helpdesk Pro backend is running"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/tickets")
def get_tickets():
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM tickets ORDER BY id DESC"
        ).fetchall()
    return [ticket_dict(row) for row in rows]


@app.post("/api/tickets", status_code=201)
def create_ticket(ticket: TicketCreate):
    if ticket.category not in VALID_CATEGORIES:
        raise HTTPException(400, "Invalid category")
    if ticket.priority not in VALID_PRIORITIES:
        raise HTTPException(400, "Invalid priority")

    with get_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO tickets
            (title, description, category, priority, requester)
            VALUES (?, ?, ?, ?, ?)""",
            (
                ticket.title,
                ticket.description,
                ticket.category,
                ticket.priority,
                ticket.requester,
            ),
        )
        row = conn.execute(
            "SELECT * FROM tickets WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    return ticket_dict(row)


@app.patch("/api/tickets/{ticket_id}")
def update_ticket(ticket_id: int, update: TicketUpdate):
    changes = update.model_dump(exclude_unset=True, exclude_none=True)

    if not changes:
        raise HTTPException(400, "No fields to update")

    if "status" in changes and changes["status"] not in VALID_STATUSES:
        raise HTTPException(400, "Invalid status")
    if "priority" in changes and changes["priority"] not in VALID_PRIORITIES:
        raise HTTPException(400, "Invalid priority")

    allowed_fields = {
        "status", "priority", "technician", "resolution_notes"
    }
    if not set(changes).issubset(allowed_fields):
        raise HTTPException(400, "Invalid field")

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM tickets WHERE id = ?", (ticket_id,)
        ).fetchone()

        if existing is None:
            raise HTTPException(404, "Ticket not found")

        fields = list(changes.keys())
        assignments = ", ".join(f"{field} = ?" for field in fields)
        values = list(changes.values()) + [ticket_id]

        conn.execute(
            f"UPDATE tickets SET {assignments} WHERE id = ?",
            values,
        )
        row = conn.execute(
            "SELECT * FROM tickets WHERE id = ?", (ticket_id,)
        ).fetchone()

    return ticket_dict(row)


@app.delete("/api/tickets/{ticket_id}", status_code=204)
def delete_ticket(ticket_id: int):
    with get_connection() as conn:
        cursor = conn.execute(
            "DELETE FROM tickets WHERE id = ?", (ticket_id,)
        )
        if cursor.rowcount == 0:
            raise HTTPException(404, "Ticket not found")
