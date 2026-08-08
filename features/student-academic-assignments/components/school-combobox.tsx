"use client";

import { Check, Plus, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSchool } from "@/features/student-academic-assignments/actions/student-academic-assignment-actions";
import type { AssignmentOption } from "@/features/student-academic-assignments/types/student-academic-assignment";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function SchoolCombobox({ schools, value, disabled, onChange, onCreated }: {
  schools: AssignmentOption[];
  value: string;
  disabled?: boolean;
  onChange: (schoolId: string) => void;
  onCreated: (school: AssignmentOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = schools.find((school) => school.id === value);
  const filtered = useMemo(() => {
    const term = normalize(query);
    return term ? schools.filter((school) => normalize(school.label).includes(term)) : schools;
  }, [query, schools]);
  const exactMatch = schools.some((school) => normalize(school.label) === normalize(query));
  const canCreate = query.trim().length > 0 && !exactMatch;

  function addSchool() {
    startTransition(async () => {
      setMessage(null);
      const result = await createSchool({ name: query });
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      const school = { id: result.school.id, label: result.school.name };
      onCreated(school);
      onChange(school.id);
      setQuery("");
      setMessage(result.reused ? "Existing School selected." : "School created and selected.");
    });
  }

  return <div className="space-y-2">
    <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={selected ? selected.label : "Search or add a School"} className="pl-9" disabled={disabled || pending} aria-label="Search School" /></div>
    <div className="max-h-36 overflow-y-auto rounded-xl border bg-card p-1" role="listbox" aria-label="Schools">
      {filtered.map((school) => <Button key={school.id} type="button" variant="ghost" className="w-full justify-start" onClick={() => { onChange(school.id); setQuery(""); setMessage(null); }} disabled={disabled || pending} role="option" aria-selected={school.id === value}>{school.id === value ? <Check /> : null}{school.label}</Button>)}
      {filtered.length === 0 && !canCreate ? <p className="px-3 py-2 text-sm text-muted-foreground">No Schools found.</p> : null}
      {canCreate ? <Button type="button" variant="ghost" className="w-full justify-start" onClick={addSchool} disabled={disabled || pending}><Plus />{pending ? "Creating…" : `Add “${query.trim()}”`}</Button> : null}
    </div>
    {selected ? <p className="text-xs text-muted-foreground">Selected: {selected.label}</p> : null}
    {message ? <p className="text-xs text-muted-foreground" role="status">{message}</p> : null}
  </div>;
}
