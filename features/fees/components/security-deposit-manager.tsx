"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { adjustSecurityDeposit, refundSecurityDeposit } from "@/features/fees/actions/fee-actions";
import type { FeeDue, SecurityDepositBalance, SecurityDepositEntry } from "@/features/fees/types/fees";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster, toast } from "@/components/ui/toast";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });
const select = "h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm";
function notify(result: { status: string; message: string }) { toast.add({ title: result.status === "success" ? "Success" : "Unable to continue", description: result.message, type: result.status === "success" ? "success" : "error" }); }

export function SecurityDepositManager({ balances, entries, dues }: { balances: SecurityDepositBalance[]; entries: SecurityDepositEntry[]; dues: FeeDue[] }) {
  const router = useRouter(); const [pending,start] = useTransition();
  const available = balances.filter((x) => x.balance > 0);
  const [studentId,setStudentId] = useState(available[0]?.studentId ?? "");
  const studentDues = useMemo(() => dues.filter((x) => x.studentId === studentId && x.outstanding > 0 && x.feeHeadName.toLowerCase() !== "security deposit"), [dues,studentId]);
  const [dueId,setDueId] = useState(""); const [adjustAmount,setAdjustAmount] = useState(""); const [refundAmount,setRefundAmount] = useState(""); const [referenceNo,setReferenceNo] = useState(""); const [remarks,setRemarks] = useState("");
  const balance = available.find((x) => x.studentId === studentId)?.balance ?? 0;
  function adjust(e: React.FormEvent) { e.preventDefault(); const target = dueId || studentDues[0]?.id; if (!target) return; start(async()=>{ const result = await adjustSecurityDeposit({ studentId, dueId: target, amount: Number(adjustAmount), remarks: remarks || null }); notify(result); if(result.status==="success"){ setAdjustAmount(""); setRemarks(""); router.refresh(); } }); }
  function refund(e: React.FormEvent) { e.preventDefault(); start(async()=>{ const result = await refundSecurityDeposit({ studentId, amount: Number(refundAmount), referenceNo: referenceNo || null, remarks: remarks || null }); notify(result); if(result.status==="success"){ setRefundAmount(""); setReferenceNo(""); setRemarks(""); router.refresh(); } }); }
  return <div className="space-y-4">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5"/>Security Deposit</CardTitle></CardHeader><CardContent className="space-y-5">
      {available.length===0 ? <p className="text-sm text-muted-foreground">No refundable Security Deposit balance is available yet. A balance is created automatically when a posted payment is allocated to the Security Deposit fee head.</p> : <>
        <div className="grid gap-4 md:grid-cols-3"><label className="grid gap-2 text-sm">Student<select className={select} value={studentId} onChange={(e)=>{setStudentId(e.target.value);setDueId("")}}>{available.map((x)=><option key={x.studentId} value={x.studentId}>{x.studentName}{x.admissionNo?` · ${x.admissionNo}`:""}</option>)}</select></label><div className="rounded-2xl border p-4"><p className="text-xs uppercase text-muted-foreground">Available Deposit</p><p className="mt-1 text-xl font-semibold">{money.format(balance)}</p></div></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <form className="space-y-4 rounded-2xl border p-4" onSubmit={adjust}><h3 className="font-semibold">Adjust Against Pending Fees</h3><label className="grid gap-2 text-sm">Pending Fee<select className={select} value={dueId} onChange={(e)=>setDueId(e.target.value)} required>{studentDues.length===0?<option value="">No pending fees</option>:studentDues.map((x)=><option key={x.id} value={x.id}>{x.feeHeadName} · {date.format(new Date(`${x.dueDate}T00:00:00`))} · {money.format(x.outstanding)}</option>)}</select></label><label className="grid gap-2 text-sm">Amount<Input type="number" min="0.01" step="0.01" max={Math.min(balance, studentDues.find((x)=>x.id===(dueId||studentDues[0]?.id))?.outstanding ?? balance)} value={adjustAmount} onChange={(e)=>setAdjustAmount(e.target.value)} required/></label><label className="grid gap-2 text-sm">Remarks <span className="text-xs text-muted-foreground">Optional</span><Input value={remarks} onChange={(e)=>setRemarks(e.target.value)}/></label><Button disabled={pending||studentDues.length===0}>Adjust Deposit</Button></form>
          <form className="space-y-4 rounded-2xl border p-4" onSubmit={refund}><h3 className="font-semibold">Refund Security Deposit</h3><label className="grid gap-2 text-sm">Refund Amount<Input type="number" min="0.01" step="0.01" max={balance} value={refundAmount} onChange={(e)=>setRefundAmount(e.target.value)} required/></label><label className="grid gap-2 text-sm">Reference No. <span className="text-xs text-muted-foreground">Optional</span><Input value={referenceNo} onChange={(e)=>setReferenceNo(e.target.value)}/></label><label className="grid gap-2 text-sm">Remarks <span className="text-xs text-muted-foreground">Optional</span><Input value={remarks} onChange={(e)=>setRemarks(e.target.value)}/></label><Button variant="outline" disabled={pending}><RotateCcw/>Record Refund</Button></form>
        </div>
      </>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Security Deposit History</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Reference</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader><TableBody>{entries.map((x)=><TableRow key={x.id}><TableCell>{date.format(new Date(x.createdAt))}</TableCell><TableCell>{x.studentName}<span className="block text-xs text-muted-foreground">{x.admissionNo}</span></TableCell><TableCell><Badge variant="outline">{x.entryType}</Badge></TableCell><TableCell>{money.format(x.amount)}</TableCell><TableCell>{x.referenceNo || "—"}</TableCell><TableCell>{x.remarks || "—"}</TableCell></TableRow>)}{entries.length===0?<TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No Security Deposit transactions yet.</TableCell></TableRow>:null}</TableBody></Table></div></CardContent></Card><Toaster/>
  </div>;
}
