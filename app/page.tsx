import Link from "next/link";
import { HOME_IMAGE } from "./data-home";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#031a3d]">
      <div className="relative mx-auto w-full max-w-[1024px] overflow-hidden bg-white shadow-2xl">
        <img
          src={HOME_IMAGE}
          alt="Learning Is Fun — English remedial and coaching classes for Class V to XII, ICSE, ISC and CBSE"
          width={512}
          height={768}
          className="block h-auto w-full select-none"
          draggable={false}
        />

        <Link
          href="/login?portal=parent"
          aria-label="Parent Login"
          title="Parent Login"
          className="absolute left-[4.3%] top-[50.2%] h-[2.7%] w-[12.8%] rounded focus:outline-none focus:ring-4 focus:ring-violet-300/80"
        />
        <Link
          href="/login?portal=student"
          aria-label="Student Login"
          title="Student Login"
          className="absolute left-[36.0%] top-[50.2%] h-[2.7%] w-[12.8%] rounded focus:outline-none focus:ring-4 focus:ring-blue-300/80"
        />
        <Link
          href="/login?portal=teacher"
          aria-label="Teacher Login"
          title="Teacher Login"
          className="absolute left-[67.3%] top-[50.2%] h-[2.7%] w-[13.0%] rounded focus:outline-none focus:ring-4 focus:ring-green-300/80"
        />
        <a
          href="tel:+918420055342"
          aria-label="Call Learning Is Fun"
          title="84200 55342"
          className="absolute left-[86.0%] top-[1.7%] h-[2.6%] w-[11.8%] rounded focus:outline-none focus:ring-4 focus:ring-yellow-300/80"
        />
      </div>
    </main>
  );
}
