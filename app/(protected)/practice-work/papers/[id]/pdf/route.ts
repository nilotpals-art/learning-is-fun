import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import type { PDFImage, PDFFont } from "pdf-lib";

import { getQuestionPaperPdfSettings } from "@/features/practice-work/services/question-paper-pdf-settings-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const A4: [number, number] = [595.28, 841.89];
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

async function embedRemoteImage(pdf: PDFDocument, url: string): Promise<PDFImage | null> {
  if (!/^https:\/\//i.test(url)) return null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const type = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (type.includes("png") || url.toLowerCase().endsWith(".png")) return await pdf.embedPng(bytes);
    if (type.includes("jpeg") || type.includes("jpg") || /\.jpe?g($|\?)/i.test(url)) return await pdf.embedJpg(bytes);
    return null;
  } catch { return null; }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole([...DASHBOARD_ROLES, "Student"]);
  if (!profile.instituteId) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const s = await createClient();
  const settings = await getQuestionPaperPdfSettings(profile);

  const [paperResult, questionResult] = await Promise.all([
    s.from("practice_sets").select("id,title,description,instructions,target_total_marks,board_id,class_id").eq("id", id).eq("institute_id", profile.instituteId).maybeSingle(),
    s.from("practice_set_questions").select("question_text,options,marks,display_order").eq("practice_set_id", id).eq("institute_id", profile.instituteId).order("display_order"),
  ]);
  const paper = paperResult.data as unknown as PaperRow | null;
  const questions = questionResult.data as unknown as QuestionRow[] | null;
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
  const [headerImage, watermarkImage] = await Promise.all([
    settings.headerMode === "image" && settings.headerImageUrl ? embedRemoteImage(pdf, settings.headerImageUrl) : Promise.resolve(null),
    settings.watermarkMode === "image" && settings.watermarkImageUrl ? embedRemoteImage(pdf, settings.watermarkImageUrl) : Promise.resolve(null),
  ]);
  const margin = settings.pageMargin;
  let page = pdf.addPage(A4);
  let y = A4[1] - margin;

  const drawWatermark = () => {
    if (settings.watermarkMode === "none") return;
    if (settings.watermarkMode === "image" && watermarkImage) {
      const scale = Math.min((A4[0] * 0.55) / watermarkImage.width, (A4[1] * 0.35) / watermarkImage.height);
      const width = watermarkImage.width * scale;
      const height = watermarkImage.height * scale;
      page.drawImage(watermarkImage, { x: (A4[0] - width) / 2, y: (A4[1] - height) / 2, width, height, opacity: settings.watermarkOpacity, rotate: degrees(settings.watermarkRotation) });
      return;
    }
    if (settings.watermarkMode === "text" && settings.watermarkText) {
      const size = settings.watermarkSize;
      page.drawText(settings.watermarkText.toUpperCase(), { x: Math.max(margin, (A4[0] - bold.widthOfTextAtSize(settings.watermarkText.toUpperCase(), size)) / 2), y: A4[1] / 2, size, font: bold, color: rgb(0.72, 0.72, 0.72), rotate: degrees(settings.watermarkRotation), opacity: settings.watermarkOpacity });
    }
  };

  const drawHeader = () => {
    drawWatermark();
    if (settings.headerMode === "none") return;
    if (settings.headerMode === "image" && headerImage) {
      const maxWidth = A4[0] - margin * 2;
      const maxHeight = 90;
      const scale = Math.min(maxWidth / headerImage.width, maxHeight / headerImage.height);
      const width = headerImage.width * scale;
      const height = headerImage.height * scale;
      page.drawImage(headerImage, { x: (A4[0] - width) / 2, y: y - height, width, height });
      y -= height + 10;
    } else {
      if (settings.headerTitle) { const title = settings.headerTitle.toUpperCase(); page.drawText(title, { x: (A4[0] - bold.widthOfTextAtSize(title, 18)) / 2, y, size: 18, font: bold }); y -= 20; }
      if (settings.headerSubtitle) { page.drawText(settings.headerSubtitle, { x: (A4[0] - regular.widthOfTextAtSize(settings.headerSubtitle, 10)) / 2, y, size: 10, font: regular }); y -= 14; }
      if (settings.headerContact) { const line = settings.headerContact.slice(0, 120); page.drawText(line, { x: Math.max(margin, (A4[0] - regular.widthOfTextAtSize(line, 8)) / 2), y, size: 8, font: regular }); y -= 12; }
    }
    page.drawLine({ start: { x: margin, y }, end: { x: A4[0] - margin, y }, thickness: 1 }); y -= 18;
  };

  const newPage = () => { page = pdf.addPage(A4); y = A4[1] - margin; if (settings.repeatHeader) drawHeader(); else drawWatermark(); };
  const ensure = (height: number) => { if (y - height < margin + 24) newPage(); };

  drawHeader();
  const title = paper.title.toUpperCase();
  const displayTitle = title.length > 75 ? `${title.slice(0, 72)}...` : title;
  page.drawText(displayTitle, { x: Math.max(margin, (A4[0] - bold.widthOfTextAtSize(displayTitle, 12)) / 2), y, size: 12, font: bold }); y -= 20;
  const meta = [boardName, className, paper.description, paper.target_total_marks ? `Full Marks: ${paper.target_total_marks}` : null].filter(Boolean).join(" | ");
  if (meta) { page.drawText(meta, { x: margin, y, size: 9, font: regular }); y -= 18; }
  if (paper.instructions) {
    page.drawText("Instructions", { x: margin, y, size: 10, font: bold }); y -= 14;
    for (const line of wrap(paper.instructions, regular, 9, A4[0] - margin * 2)) { page.drawText(line, { x: margin, y, size: 9, font: regular }); y -= 12; }
    y -= 8;
  }

  questions.forEach((q, index) => {
    const lines = wrap(`${index + 1}. ${q.question_text}`, regular, 10, A4[0] - margin * 2 - 42);
    const options = Array.isArray(q.options) ? q.options.filter((option): option is string => typeof option === "string") : [];
    const optionLines = options.flatMap((option, optionIndex) => wrap(`${String.fromCharCode(65 + optionIndex)}. ${option}`, regular, 9, A4[0] - margin * 2 - 25));
    ensure(lines.length * 14 + optionLines.length * 12 + 24);
    page.drawText(`[${Number(q.marks)}]`, { x: A4[0] - margin - 30, y, size: 9, font: bold });
    for (const line of lines) { page.drawText(line, { x: margin, y, size: 10, font: regular }); y -= 14; }
    for (const line of optionLines) { page.drawText(line, { x: margin + 16, y, size: 9, font: regular }); y -= 12; }
    y -= 10;
  });

  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    if (settings.footerText) p.drawText(settings.footerText.slice(0, 120), { x: margin, y: 18, size: 8, font: regular, color: rgb(0.35,0.35,0.35) });
    if (settings.showPageNumbers) { const label = `Page ${index + 1} of ${pages.length}`; p.drawText(label, { x: A4[0] - margin - regular.widthOfTextAtSize(label, 8), y: 18, size: 8, font: regular, color: rgb(0.35,0.35,0.35) }); }
  });

  const bytes = Uint8Array.from(await pdf.save()).buffer;
  return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fileName(paper.title)}"`, "Cache-Control": "private, no-store" } });
}
