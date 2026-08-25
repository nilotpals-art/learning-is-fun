import Image from "next/image";
import Link from "next/link";

const loginLinks = [
  {
    href: "/login?portal=parent",
    label: "Parent Login",
    className: "left-[4.5%] top-[51.45%] h-[2.65%] w-[11.1%]",
  },
  {
    href: "/login?portal=student",
    label: "Student Login",
    className: "left-[36.5%] top-[51.45%] h-[2.65%] w-[12.1%]",
  },
  {
    href: "/login?portal=teacher",
    label: "Teacher Login",
    className: "left-[68.4%] top-[51.45%] h-[2.65%] w-[12.0%]",
  },
] as const;

export default function Home() {
  return (
    <main className="bg-white">
      <div className="relative mx-auto h-[100dvh] w-full max-w-[1024px] overflow-hidden bg-white shadow-2xl md:h-auto">
        <Image
          src="/landing/learning-is-fun-home.jpg"
          alt="Learning Is Fun — English remedial and coaching classes for Class V to XII, ICSE, ISC and CBSE"
          width={1024}
          height={1536}
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="block h-full w-full select-none md:h-auto"
          draggable={false}
        />

        {loginLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-label={link.label}
            title={link.label}
            className={`absolute ${link.className} rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-300/90`}
          />
        ))}
      </div>
    </main>
  );
}
