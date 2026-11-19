"use client";

import { DocumentTitle } from "@/components/document-title";
import { CalendarPage } from "@/components/calendar/calendar-page";

export default function ProjectCalendarPage() {
  return (
    <>
      <DocumentTitle title="Google Calendar" />
      <CalendarPage />
    </>
  );
}
