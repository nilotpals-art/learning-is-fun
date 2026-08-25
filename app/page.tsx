import Image from "next/image";
import Link from "next/link";

const loginLinks = [
  {
    href: "/login?portal=parent",
    label: "Parent Login",
    className: "left-[10.5%] top-[94.45%] h-[3.1%] w-[20.2%]",
  },
  {
    href: "/login?portal=student",
    label: "Student Login",
    className: "left-[39.6%] top-[94.45%] h-[3.1%] w-[20.2%]",
  },
  {
    href: "/login?portal=teacher",
    label: "Teacher Login",
    className: "left-[68.5%] top-[94.45%] h-[3.1%] w-[20.2%]",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-[#031a3d]">
      <div className="relative mx-auto w-full max-w-[1024px] overflow-hidden bg-white shadow-2xl">
        <Image
          src="/landing/learning-is-fun-home.jpg"
          alt="Learning Is Fun — English remedial and coaching classes for Class V to XII, ICSE, ISC and CBSE"
          width={1024}
          height={1536}
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="block h-auto w-full select-none"
          draggable={false}
        />

        {loginLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-label={link.label}
            title={link.label}
            className={`absolute ${link.className} rounded-2xl focus:outline-none focus:ring-4 focus:ring-yellow-300/90`}
          />
        ))}
      </div>
    </main>
  );
}
