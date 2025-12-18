from icalendar import Calendar, Event
from datetime import datetime, time, timedelta
import pytz
from typing import Dict, Any, List

def generate_calendar_ics(data: Dict[str, Any]) -> str:
    """Generates an iCalendar (.ics) string from workflow data."""
    cal = Calendar()
    cal.add('prodid', '-//DailyWave Workflow Engine//dailywave.app//')
    cal.add('version', '2.0')
    cal.add('x-wr-calname', 'DailyWave Workflows')
    cal.add('x-wr-timezone', 'Asia/Seoul')
    
    tz = pytz.timezone('Asia/Seoul')
    
    # 1. Process Routines
    routines = data.get("routines", [])
    for r in routines:
        # We create a recurring daily event for each routine
        # Since ics feeds are often simple, we'll just generate events for the next 30 days
        # to ensure they show up reliably in all clients.
        try:
            time_str = r.get("time", "09:00")
            hour, minute = map(int, time_str.split(":"))
            
            # Start from today
            base_date = datetime.now(tz).date()
            
            for i in range(-7, 30): # 7 days past, 30 days future
                event_date = base_date + timedelta(days=i)
                dt_start = tz.localize(datetime.combine(event_date, time(hour, minute)))
                dt_end = dt_start + timedelta(minutes=30)
                
                event = Event()
                event.add('summary', f"🌊 [루틴] {r.get('title')}")
                event.add('dtstart', dt_start)
                event.add('dtend', dt_end)
                event.add('dtstamp', datetime.now(tz))
                event.add('uid', f"routine-{r.get('id')}-{event_date.isoformat()}@dailywave.app")
                event.add('description', f"시간: {time_str}\n구분: {r.get('type')}")
                cal.add_component(event)
        except Exception as e:
            print(f"Error processing routine {r.get('id')}: {e}")

    # 2. Process Weekly Pipeliens (Missions)
    pipelines = data.get("pipelines", [])
    # ID patterns: week-mon, week-tue, etc.
    day_map = {
        "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6
    }
    
    for p in pipelines:
        p_id = p.get("id", "")
        if p_id.startswith("week-"):
            day_key = p_id.split("-")[1]
            target_weekday = day_map.get(day_key)
            
            if target_weekday is not None:
                base_date = datetime.now(tz).date()
                # Find the next 4 instances of this weekday
                for i in range(-1, 5): # 1 week past, 5 weeks future
                    # Calculate date for the target weekday
                    days_ahead = target_weekday - base_date.weekday()
                    current_instance = base_date + timedelta(days=days_ahead + (i * 7))
                    
                    event = Event()
                    event.add('summary', f"📅 [미션] {p.get('title')}")
                    # All day event
                    event.add('dtstart', current_instance)
                    event.add('dtend', current_instance + timedelta(days=1))
                    event.add('dtstamp', datetime.now(tz))
                    event.add('uid', f"mission-{p.get('id')}-{current_instance.isoformat()}@dailywave.app")
                    
                    steps_text = "\n".join([f"- {s.get('title')}: {s.get('description', '')}" for s in p.get("steps", [])])
                    description = f"{p.get('subtitle')}\n\n주요 과제:\n{steps_text}"
                    event.add('description', description)
                    
                    cal.add_component(event)

    return cal.to_ical().decode('utf-8')
