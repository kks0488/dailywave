import pytest
from calendar_gen import generate_calendar_ics


class TestCalendarGeneration:
    """Test iCalendar generation from workflow data"""

    def test_empty_data_returns_valid_ics(self):
        """Empty data should return valid ICS structure"""
        data = {
            "pipelines": [],
            "routines": [],
            "sopLibrary": []
        }

        ics = generate_calendar_ics(data)

        # Check it's a string
        assert isinstance(ics, str)

        # Check for basic ICS structure
        assert "BEGIN:VCALENDAR" in ics
        assert "END:VCALENDAR" in ics
        assert "PRODID:-//DailyWave Workflow Engine//dailywave.app//" in ics
        assert "VERSION:2.0" in ics
        assert "X-WR-CALNAME:DailyWave Workflows" in ics
        assert "X-WR-TIMEZONE:Asia/Seoul" in ics

    def test_routines_generate_events(self):
        """Routines should generate VEVENT entries"""
        data = {
            "pipelines": [],
            "routines": [
                {
                    "id": "r1",
                    "title": "Morning Exercise",
                    "time": "08:00",
                    "type": "health"
                }
            ],
            "sopLibrary": []
        }

        ics = generate_calendar_ics(data)

        # Check for event structure
        assert "BEGIN:VEVENT" in ics
        assert "END:VEVENT" in ics
        assert "SUMMARY:🌊 [루틴] Morning Exercise" in ics
        assert "UID:routine-r1-" in ics

    def test_multiple_routines_generate_multiple_events(self):
        """Multiple routines should generate multiple events"""
        data = {
            "pipelines": [],
            "routines": [
                {
                    "id": "r1",
                    "title": "Morning Exercise",
                    "time": "08:00",
                    "type": "health"
                },
                {
                    "id": "r2",
                    "title": "Evening Review",
                    "time": "20:00",
                    "type": "work"
                }
            ],
            "sopLibrary": []
        }

        ics = generate_calendar_ics(data)

        # Check for both routines
        assert "Morning Exercise" in ics
        assert "Evening Review" in ics
        assert "routine-r1-" in ics
        assert "routine-r2-" in ics

    def test_pipelines_generate_mission_events(self):
        """Weekly pipelines should generate mission events"""
        data = {
            "pipelines": [
                {
                    "id": "week-mon",
                    "title": "Weekly Planning",
                    "subtitle": "Plan the week ahead",
                    "steps": [
                        {"title": "Review goals", "description": "Check progress"}
                    ]
                }
            ],
            "routines": [],
            "sopLibrary": []
        }

        ics = generate_calendar_ics(data)

        # Check for mission event
        assert "BEGIN:VEVENT" in ics
        assert "SUMMARY:📅 [미션] Weekly Planning" in ics
        assert "UID:mission-week-mon-" in ics
        assert "Plan the week ahead" in ics

    def test_returns_string_type(self):
        """Generated ICS should be a string"""
        data = {"pipelines": [], "routines": [], "sopLibrary": []}
        ics = generate_calendar_ics(data)
        assert isinstance(ics, str)
        assert len(ics) > 0

    def test_handles_korean_characters(self):
        """Should properly handle Korean characters"""
        data = {
            "pipelines": [],
            "routines": [
                {
                    "id": "r1",
                    "title": "아침 운동",
                    "time": "08:00",
                    "type": "건강"
                }
            ],
            "sopLibrary": []
        }

        ics = generate_calendar_ics(data)

        # Should contain Korean text
        assert "아침 운동" in ics

    def test_all_weekdays_supported(self):
        """All weekdays should be supported in pipeline IDs"""
        weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

        for day in weekdays:
            data = {
                "pipelines": [
                    {
                        "id": f"week-{day}",
                        "title": f"{day.upper()} Mission",
                        "subtitle": "Daily mission",
                        "steps": []
                    }
                ],
                "routines": [],
                "sopLibrary": []
            }

            ics = generate_calendar_ics(data)
            assert f"{day.upper()} Mission" in ics
            assert f"mission-week-{day}-" in ics
