"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, isSameDay, parseISO, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, List, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventManager } from "@/features/learning-planner/components/event-manager";
import { HolidayCalendarList } from "@/features/learning-planner/components/holiday-calendar-list";
import { SCHEDULE_STATUSES, SCHEDULE_TYPES, type PlannerOptions, type PublicHoliday, type ScheduleEvent } from "@/features/learning-planner/types/learning-planner";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarEventManager({ events, options, holidays, providerAvailable }: { events: ScheduleEvent[]; options: PlannerOptions; holidays: PublicHoliday[]; providerAvailable: boolean }) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [batchId, setBatchId] = useState("");
  const [eventType, setEventType] = useState("");
  const [status, setStatus] = useState("");
  const [agendaOnly, setAgendaOnly] = useState(false);

  const monthFrom = format(startOfMonth(month), "yyyy-MM-dd");
  const monthTo = format(endOfMonth(month), "yyyy-MM-dd");
  const filtered = useMemo(() => events.filter((event) =>
    event.eventDate >= monthFrom && event.eventDate <= monthTo &&
    (!selectedDate || event.eventDate === selectedDate) &&
    (!batchId || event.batchId === batchId) &&
    (!eventType || event.scheduleType === eventType) &&
    (!status || event.status === status)
  ), [events, monthFrom, monthTo, selectedDate, batchId, eventType, status]);

  const monthEvents = useMemo(() => events.filter((event) => event.eventDate >= monthFrom && event.eventDate <= monthTo && (!batchId || event.batchId === batchId) && (!eventType || event.scheduleType === eventType) && (!status || event.status === status)), [events, monthFrom, monthTo, batchId, eventType, status]);
  const visibleHolidays = holidays.filter((holiday) => holiday.date >= monthFrom && holiday.date <= monthTo && (!selectedDate || holiday.date === selectedDate));

  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const offset = (first.getDay() + 6) % 7;
    const total = endOfMonth(month).getDate();
    return Array.from({ length: Math.ceil((offset + total) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      return day >= 1 && day <= total ? new Date(month.getFullYear(), month.getMonth(), day) : null;
    });
  }, [month]);

  const resetFilters = () => { setSelectedDate(""); setBatchId(""); setEventType(""); setStatus(""); };

  return <div className="space-y-6">
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 border-b bg-muted/20 md:flex-row md:items-center md:justify-between">
        <div><CardTitle>Planner Calendar</CardTitle><p className="mt-1 text-sm text-muted-foreground">Batch-wise classes, tests, exams, meetings and holidays.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="size-4"/><span className="sr-only">Previous month</span></Button>
          <Button type="button" variant="outline" size="sm" onClick={() => { setMonth(startOfMonth(new Date())); setSelectedDate(""); }}>Today</Button>
          <div className="min-w-36 text-center font-semibold">{format(month, "MMMM yyyy")}</div>
          <Button type="button" variant="outline" size="sm" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="size-4"/><span className="sr-only">Next month</span></Button>
          <Button type="button" variant={agendaOnly ? "default" : "outline"} size="sm" onClick={() => setAgendaOnly((value) => !value)}><List className="mr-2 size-4"/>Agenda</Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium">Batch<select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">All Batches</option>{options.batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.label}</option>)}</select></label>
          <label className="text-sm font-medium">Event Type<select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="">All Types</option>{SCHEDULE_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
          <label className="text-sm font-medium">Status<select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All Statuses</option>{SCHEDULE_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <div className="flex items-end"><Button type="button" variant="ghost" className="w-full" onClick={resetFilters}><RotateCcw className="mr-2 size-4"/>Reset filters</Button></div>
        </div>
      </CardContent>
    </Card>

    {!agendaOnly && <Card><CardContent className="p-2 sm:p-4">
      <div className="grid grid-cols-7 border-b">{weekdays.map((day) => <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground sm:text-sm">{day}</div>)}</div>
      <div className="grid grid-cols-7">{cells.map((date, index) => {
        if (!date) return <div key={`blank-${index}`} className="min-h-24 border-b border-r bg-muted/10"/>;
        const iso = format(date, "yyyy-MM-dd");
        const dayEvents = monthEvents.filter((event) => event.eventDate === iso);
        const dayHolidays = holidays.filter((holiday) => holiday.date === iso);
        const selected = selectedDate === iso;
        return <button type="button" key={iso} onClick={() => setSelectedDate(selected ? "" : iso)} className={`min-h-24 border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40 sm:min-h-32 sm:p-2 ${selected ? "bg-primary/10 ring-1 ring-inset ring-primary" : ""}`}>
          <span className={`inline-flex size-7 items-center justify-center rounded-full text-sm ${isSameDay(date, new Date()) ? "bg-primary font-semibold text-primary-foreground" : ""}`}>{format(date, "d")}</span>
          <div className="mt-1 space-y-1">{dayHolidays.slice(0, 1).map((holiday) => <div key={holiday.id} className="truncate rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:text-xs">{holiday.name}</div>)}{dayEvents.slice(0, 3).map((event) => <div key={event.id} className="truncate rounded border px-1.5 py-0.5 text-[10px] sm:text-xs"><span className="font-medium">{event.startTime?.slice(0,5) ?? "All day"}</span> {event.title}</div>)}{dayEvents.length > 3 && <Badge variant="secondary" className="text-[10px]">+{dayEvents.length - 3} more</Badge>}</div>
        </button>;
      })}</div>
    </CardContent></Card>}

    {selectedDate && <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3"><div><p className="font-medium">{format(parseISO(selectedDate), "EEEE, d MMMM yyyy")}</p><p className="text-sm text-muted-foreground">Showing events for the selected day.</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDate("")}>Show month</Button></div>}
    <HolidayCalendarList holidays={visibleHolidays} providerAvailable={providerAvailable}/>
    <EventManager events={filtered} options={options}/>
  </div>;
}
