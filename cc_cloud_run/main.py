from fastapi import FastAPI, Form, Request, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from google.cloud import firestore
from typing import Annotated
import datetime


app = FastAPI()

# mount static files
app.mount("/static", StaticFiles(directory="/app/static"), name="static")
templates = Jinja2Templates(directory="/app/template")

# init firestore client
db = firestore.Client()
votes_collection = db.collection("votes")


@app.get("/")
async def read_root(request: Request):
    # ====================================
    # ++++ START CODE HERE ++++
    # ====================================

    # Stream all votes from Firestore
    votes = votes_collection.stream()
    vote_data = [v.to_dict() for v in votes]

    tabs_count = sum(1 for vote in vote_data if vote.get("team") == "TABS")
    spaces_count = sum(1 for vote in vote_data if vote.get("team") == "SPACES")

    recent_votes = sorted(
        [vote for vote in vote_data if "iso_time_stamp" in vote],
        key=lambda x: x["iso_time_stamp"],
        reverse=True
    )[:5]

    # Determine the leader message and winning team
    if tabs_count == spaces_count:
        leader_message = "It's a TIE!"
        lead_team = None
    else:
        lead_team = "TABS" if tabs_count > spaces_count else "SPACES"
        leader_message = f"{lead_team} are winning!"

    # ====================================
    # ++++ STOP CODE ++++
    # ====================================

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "tabs_count": tabs_count,
            "spaces_count": spaces_count,
            "recent_votes": recent_votes,
            "leader_message": leader_message,
            "lead_team": lead_team
        },
    )


@app.post("/")
async def create_vote(team: Annotated[str, Form()]):
    if team not in ["TABS", "SPACES"]:
        raise HTTPException(status_code=400, detail="Invalid vote")

    # ====================================
    # ++++ START CODE HERE ++++
    # ====================================

    try:
        # Add the vote to Firestore
        time=datetime.datetime.now(datetime.timezone.utc)
        votes_collection.add({
            "team": team,
            "time_cast": time.strftime("%B %d, %Y, %I:%M:%S %p UTC"),
            "iso_time_stamp":time.isoformat()
        })

        # Fetch all votes from Firestore
        votes = votes_collection.order_by("iso_time_stamp", direction=firestore.Query.DESCENDING).stream()
        tabs_count = 0
        spaces_count = 0
        recent_votes = []

        for vote_doc in votes:
            vote_data = vote_doc.to_dict()
            if vote_data.get("team") == "TABS":
                tabs_count += 1
            elif vote_data.get("team") == "SPACES":
                spaces_count += 1
            recent_votes.append(vote_data)

        # Determine the leader message and winning team
        lead_team = "TABS" if tabs_count > spaces_count else "SPACES" if spaces_count > tabs_count else None
        if lead_team is None:
            leader_message = "It's a TIE!"
        else:
            leader_message = f"{lead_team} are winning!"
        return {
            "detail": "Vote recorded successfully!",
            "tabs_count": tabs_count,
            "spaces_count": spaces_count,
            "recent_votes": recent_votes[:5],
            "leader_message": leader_message,
            "lead_team": lead_team
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

    # ====================================
    # ++++ STOP CODE ++++
    # ====================================
