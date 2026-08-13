"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createRecommendedTemplatesAction, saveTemplateAction, setTemplateActiveAction } from "@/features/practice-work/actions/practice-work-actions";
import { QUESTION_TYPES, type QuestionTemplate } from "@/features/practice-work/types/practice-work";

type Editor = Omit<QuestionTemplate, "blueprint">;
const emptyEditor: Editor = { id: "", name: "", questionType: "short_answer", instructions: "", promptRules: "", supportsOptions: false, requiresExplanation: true, isActive: true };

export function TemplatesManager({ templates }: { templates: QuestionTemplate[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [editor, setEditor] = useState<Editor>(emptyEditor);
  const run = (fn: () => Promise<{ message: string }>) => start(async () => { const result = await fn(); setMessage(result.message); router.refresh(); });
  const submit = (form: FormData) => run(async () => {
    const result = await saveTemplateAction({ id: editor.id || undefined, name: form.get("name"), questionType: form.get("questionType"), instructions: form.get("instructions"), promptRules: form.get("promptRules"), supportsOptions: form.get("supportsOptions") === "on", requiresExplanation: form.get("requiresExplanation") === "on" });
    if (result.status === "success") setEditor(emptyEditor);
    return result;
  });

  return <div className="space-y-5">
    <Card><CardHeader><CardTitle>{editor.id ? "Edit Question Template" : "Add Question Template"}</CardTitle></CardHeader><CardContent>
      <form key={editor.id || "new"} action={submit} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Name<Input name="name" required defaultValue={editor.name} /></label>
        <label className="text-sm font-medium">Question Type<select name="questionType" defaultValue={editor.questionType} className="mt-1 h-10 w-full rounded-xl border bg-card px-3">{QUESTION_TYPES.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        <label className="text-sm font-medium md:col-span-2">Instructions<textarea name="instructions" required defaultValue={editor.instructions} className="mt-1 min-h-20 w-full rounded-xl border bg-card p-3" /></label>
        <label className="text-sm font-medium md:col-span-2">Prompt Rules<textarea name="promptRules" required defaultValue={editor.promptRules} className="mt-1 min-h-20 w-full rounded-xl border bg-card p-3" /></label>
        <label className="flex items-center gap-2 text-sm"><input name="supportsOptions" type="checkbox" defaultChecked={editor.supportsOptions} /> Supports options</label>
        <label className="flex items-center gap-2 text-sm"><input name="requiresExplanation" type="checkbox" defaultChecked={editor.requiresExplanation} /> Requires explanation</label>
        <div className="flex flex-wrap gap-2"><Button disabled={pending}>{editor.id ? "Update Template" : "Save Template"}</Button>{editor.id ? <Button type="button" variant="outline" onClick={() => setEditor(emptyEditor)}>Cancel</Button> : null}</div>
        <Button type="button" variant="outline" disabled={pending} onClick={() => run(createRecommendedTemplatesAction)}>Create Recommended Templates</Button>
      </form>{message ? <p role="status" className="mt-4 text-sm">{message}</p> : null}
    </CardContent></Card>
    <div className="grid gap-3 md:grid-cols-2">{templates.map(template => <Card key={template.id}><CardContent className="flex items-start justify-between gap-4 p-5"><div><p className="font-semibold">{template.name}</p><p className="text-sm text-muted-foreground">{template.questionType.replaceAll("_", " ")} · {template.isActive ? "Active" : "Inactive"}</p></div><div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" disabled={pending} onClick={() => setEditor({ ...template })}>Edit</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => setEditor({ ...template, id: "", name: `${template.name} COPY` })}>Duplicate</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setTemplateActiveAction({ id: template.id, isActive: !template.isActive }))}>{template.isActive ? "Deactivate" : "Reactivate"}</Button></div></CardContent></Card>)}</div>
  </div>;
}
