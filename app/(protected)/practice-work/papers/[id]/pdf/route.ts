import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const WATERMARK = "LEARNING IS FUN";

function wrap(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, width: number) {
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

  const [{ data: paper, error }, { data: institute }] = await Promise.all([
    s.from("practice_sets").select("id,title,description,instructions,target_total_marks,board:boards(name),academic_class:academic_classes(class_name),questions:practice_set_questions(id,question_text,options,marks,display_order)").eq("id", id).eq("institute_id", profile.instituteId).maybeSingle(),
    s.from("institutes").select("name,address,email,phone").eq("id", profile.instituteId).maybeSingle(),
  ]);
  if (error || !paper) return new Response("Question paper not found", { status: 404 });

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const questions = [...(paper.questions ?? [])].sort((a, b) => a.display_order - b.display_order);
  let page = pdf.addPage(A4);
  let y = A4[1] - MARGIN;

  const watermark = () => {
    page.drawText(WATERMARK, { x: 105, y: 385, size: 48, font: bold, color: rgb(0.88, 0.88, 0.88), rotate: degrees(35), opacity: 0.28 });
  };
  const header = () => {
    watermark();
    const name = (institute?.name || "LEARNING IS FUN").toUpperCase();
    const nameWidth = bold.widthOfTextAtSize(name, 18);
    page.drawText(name, { x: (A4[0] - nameWidth) / 2, y, size: 18, font: bold });
    y -= 20;
    const tagline = "English Remedial Classes";
    page.drawText(tagline, { x: (A4[0] - regular.widthOfTextAtSize(tagline, 10)) / 2, y, size: 10, font: regular });
    y -= 15;
    const contact = [institute?.address, institute?.phone, institute?.email].filter(Boolean).join(" | ");
    if (contact) { const line = contact.slice(0, 110); page.drawText(line, { x: (A4[0] - regular.widthOfTextAtSize(line, 8)) / 2, y, size: 8, font: regular }); y -= 13; }
    page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 1 });
    y -= 20;
  };
  const newPage = () => { page = pdf.addPage(A4); y = A4[1] - MARGIN; header(); };
  const ensure = (height: number) => { if (y - height < MARGIN) newPage(); };

  header();
  const title = paper.title.toUpperCase();
  page.drawText(title, { x: (A4[0] - bold.widthOfTextAtSize(title, 13)) / 2, y, size: 13, font: bold });
  y -= 22;
  const meta = [Array.isArray(paper.board) ? paper.board[0]?.name : paper.board?.name, Array.isArray(paper.academic_class) ? paper.academic_class[0]?.class_name : paper.academic_class?.class_name, paper.description, paper.target_total_marks ? `Full Marks: ${paper.target_total_marks}` : null].filter(Boolean).join("  |  ");
  page.drawText(meta, { x: MARGIN, y, size: 9, font: regular });
  y -= 20;
  if (paper.instructions) {
    page.drawText("Instructions", { x: MARGIN, y, size: 10, font: bold }); y -= 14;
    for (const line of wrap(paper.instructions, regular, 9, A4[0] - MARGIN * 2)) { page.drawText(line, { x: MARGIN, y, size: 9, font: regular }); y -= 12; }
    y -= 8;
  }

  questions.forEach((q, index) => {
    const lines = wrap(`${index + 1}. ${q.question_text}`, regular, 10, A4[0] - MARGIN * 2 - 42);
    const optionLines = Array.isArray(q.options) ? q.options.flatMap((option: string, optionIndex: number) => wrap(`${String.fromCharCode(65 + optionIndex)}. ${option}`, regular, 9, A4[0] - MARGIN * 2 - 25)) : [];
    ensure((lines.length * 14) + (optionLines.length * 12) + 24);
    page.drawText(`[${Number(q.marks)}]`, { x: A4[0] - MARGIN - 30, y, size: 9, font: bold });
    for (const line of lines) { page.drawText(line, { x: MARGIN, y, size: 10, font: regular }); y -= 14; }
    for (const line of optionLines) { page.drawText(line, { x: MARGIN + 16, y, size: 9, font: regular }); y -= 12; }
    y -= 10;
  });

  const bytes = await pdf.save();
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName(paper.title)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
