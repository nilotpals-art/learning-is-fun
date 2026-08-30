import { NextResponse } from "next/server";

import { createFacebookEnquiry, getDefaultInstituteId } from "@/features/facebook-enquiries/service";

const CLASSES = new Set(["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]);
const BOARDS = new Set(["ICSE", "ISC", "CBSE"]);
const CALLBACK_TIMES = new Set(["Morning", "Afternoon", "Evening", "Anytime"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Invisible honeypot used by the public form. Bots that fill it are silently accepted.
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ ok: true });
    }

    const studentName = typeof body.studentName === "string" ? body.studentName.trim().replace(/\s+/g, " ") : "";
    const className = typeof body.className === "string" ? body.className.trim().toUpperCase() : "";
    const board = typeof body.board === "string" ? body.board.trim().toUpperCase() : "";
    const contactNo = typeof body.contactNo === "string" ? body.contactNo.replace(/\D/g, "") : "";
    const callbackTime = typeof body.callbackTime === "string" ? body.callbackTime.trim() : "";

    if (studentName.length < 2 || studentName.length > 100) {
      return NextResponse.json({ error: "Please enter the student's name." }, { status: 400 });
    }
    if (!CLASSES.has(className)) {
      return NextResponse.json({ error: "Please select a valid class." }, { status: 400 });
    }
    if (!BOARDS.has(board)) {
      return NextResponse.json({ error: "Please select a valid board." }, { status: 400 });
    }
    if (!/^[6-9]\d{9}$/.test(contactNo)) {
      return NextResponse.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
    }
    if (!CALLBACK_TIMES.has(callbackTime)) {
      return NextResponse.json({ error: "Please select the best time to call back." }, { status: 400 });
    }

    const instituteId = await getDefaultInstituteId();
    const enquiry = await createFacebookEnquiry({
      instituteId,
      studentName,
      className,
      board: board as "ICSE" | "ISC" | "CBSE",
      contactNo,
      callbackTime: callbackTime as "Morning" | "Afternoon" | "Evening" | "Anytime",
    });

    return NextResponse.json({ ok: true, enquiryId: enquiry.id }, { status: 201 });
  } catch (error) {
    console.error("Facebook enquiry submission failed", error);
    return NextResponse.json({ error: "We could not submit your enquiry. Please try again." }, { status: 500 });
  }
}
