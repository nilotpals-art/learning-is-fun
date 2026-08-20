import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import type { PDFFont } from "pdf-lib";

import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;

type PaperRow = { id: string; title: string; description: string | null; instructions: string | null; target_total_marks: number | string | null; board_id: string | null; class_id: string | null };
type QuestionRow = { question_text: string; options: unknown; marks: number | string; display_order: number };

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) line = next;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function fileName(value: string) {
  return `${value.toUpperCase().replace(/[^A-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "QUESTION_PAPER"}.pdf`;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole([...DASHBOARD_ROLES, "Student"]);
  if (!profile.instituteId) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const s = await createClient();

  const [paperResult, questionResult, instituteResult] = await Promise.all([
    s.from("practice_sets").select("id,title,description,instructions,target_total_marks,board_id,class_id").eq("id", id).eq("institute_id", profile.instituteId).maybeSingle(),
    s.from("practice_set_questions").select("question_text,options,marks,display_order").eq("practice_set_id", id).eq("institute_id", profile.instituteId).order("display_order"),
    s.from("institutes").select("name,address,email,phone").eq("id", profile.instituteId).maybeSingle(),
  ]);
  const paper = paperResult.data as unknown as PaperRow | null;
  const questions = questionResult.data as unknown as QuestionRow[] | null;
  const institute = instituteResult.data as { name?: string; address?: string | null; email?: string | null; phone?: string | null } | null;
  if (paperResult.error || questionResult.error || !paper || !questions) return new Response("Question paper not found", { status: 404 });

  const [boardResult, classResult] = await Promise.all([
    paper.board_id ? s.from("boards").select("name").eq("id", paper.board_id).maybeSingle() : Promise.resolve({ data: null }),
    paper.class_id ? s.from("academic_classes").select("class_name").eq("id", paper.class_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const boardName = (boardResult.data as { name?: string } | null)?.name ?? null;
  const className = (classResult.data as { class_name?: string } | null)?.class_name ?? null;

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage(A4);
  let y = A4[1] - MARGIN;

  const drawHeader = () => {
    page.drawText("LEARNING IS FUN", { x: 105, y: 385, size: 48, font: bold, color: rgb(0.88, 0.88, 0.88), rotate: degrees(35), opacity: 0.28 });
    const name = (institute?.name || "LEARNING IS FUN").toUpperCase();
    page.drawText(name, { x: (A4[0] - bold.widthOfTextAtSize(name, 18)) / 2, y, size: 18, font: bold }); y -= 20;
    const tagline = "English Remedial Classes";
    page.drawText(tagline, { x: (A4[0] - regular.widthOfTextAtSize(tagline, 10)) / 2, y, size: 10, font: regular }); y -= 14;
    const contact = [institute?.address, institute?.phone, institute?.email].filter(Boolean).join(" | ").slice(0, 110);
    if (contact) { page.drawText(contact, { x: (A4[0] - regular.widthOfTextAtSize(contact, 8)) / 2, y, size: 8, font: regular }); y -= 12; }
    page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 1 }); y -= 18;
  };
  const newPage = () => { page = pdf.addPage(A4); y = A4[1] - MARGIN; drawHeader(); };
  const ensure = (height: number) => { if (y - height < MARGIN) newPage(); };

  drawHeader();
  const title = paper.title.toUpperCase();
  const displayTitle = title.length > 75 ? `${title.slice(0, 72)}...` : title;
  page.drawText(displayTitle, { x: (A4[0] - bold.widthOfTextAtSize(displayTitle, 12)) / 2, y, size: 12, font: bold }); y -= 20;
  const meta = [boardName, className, paper.description, paper.target_total_marks ? `Full Marks: ${paper.target_total_marks}` : null].filter(Boolean).join(" | ");
  if (meta) { page.drawText(meta, { x: MARGIN, y, size: 9, font: regular }); y -= 18; }
  if (paper.instructions) {
    page.drawText("Instructions", { x: MARGIN, y, size: 10, font: bold }); y -= 14;
    for (const line of wrap(paper.instructions, regular, 9, A4[0] - MARGIN * 2)) { page.drawText(line, { x: MARGIN, y, size: 9, font: regular }); y -= 12; }
    y -= 8;
  }

  questions.forEach((q, index) => {
    const lines = wrap(`${index + 1}. ${q.question_text}`, regular, 10, A4[0] - MARGIN * 2 - 42);
    const options = Array.isArray(q.options) ? q.options.filter((option): option is string => typeof option === "string") : [];
    const optionLines = options.flatMap((option, optionIndex) => wrap(`${String.fromCharCode(65 + optionIndex)}. ${option}`, regular, 9, A4[0] - MARGIN * 2 - 25));
    ensure(lines.length * 14 + optionLines.length * 12 + 24);
    page.drawText(`[${Number(q.marks)}]`, { x: A4[0] - MARGIN - 30, y, size: 9, font: bold });
    for (const line of lines) { page.drawText(line, { x: MARGIN, y, size: 10, font: regular }); y -= 14; }
    for (const line of optionLines) { page.drawText(line, { x: MARGIN + 16, y, size: 9, font: regular }); y -= 12; }
    y -= 10;
  });

  const bytes = Uint8Array.from(await pdf.save()).buffer;
  return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fileName(paper.title)}"`, "Cache-Control": "private, no-store" } });
}
