import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

const portals = [
  { title: "Parent Login", text: "Stay connected with your child's progress and updates.", href: "/login?portal=parent", icon: Users, color: "text-violet-700", button: "bg-violet-700" },
  { title: "Student Login", text: "Access your classes, assignments and learning resources.", href: "/login?portal=student", icon: GraduationCap, color: "text-blue-700", button: "bg-blue-700" },
  { title: "Teacher Login", text: "Manage classes, students and track progress.", href: "/login?portal=teacher", icon: HeartHandshake, color: "text-green-700", button: "bg-green-700" },
];

const strengths = [
  ["Experienced Teachers", "Qualified and caring educators.", HeartHandshake, "bg-violet-600"],
  ["Comprehensive Curriculum", "Well-structured study material and resources.", BookOpen, "bg-blue-600"],
  ["Engaging Activities", "Interactive sessions for better understanding.", Users, "bg-green-600"],
  ["Safe & Supportive Environment", "We ensure a positive learning space.", ShieldCheck, "bg-orange-500"],
  ["Better Results", "Consistent practice leads to excellent outcomes.", Target, "bg-rose-500"],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#07183b]">
      <section id="home" className="overflow-hidden bg-[#031a3d] text-white">
        <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-yellow-400 text-center text-[11px] italic leading-3 text-white shadow-[0_0_25px_rgba(250,204,21,.25)]">Learning<br/>is fun!!!</div>
            </Link>
            <nav className="hidden items-center gap-7 text-sm font-semibold uppercase lg:flex">
              <a href="#home" className="border-b-2 border-yellow-400 pb-2 text-yellow-400">Home</a>
              <a href="#about">About Us</a><a href="#courses">Courses</a><a href="#features">Features</a><a href="#gallery">Gallery</a><a href="#contact">Contact</a>
            </nav>
            <a href="tel:+918420055342" className="hidden rounded-lg border border-violet-400 px-4 py-2 text-sm font-bold sm:flex"><Phone className="mr-2 h-4 w-4"/>84200 55342</a>
          </header>

          <div className="grid items-stretch pt-10 lg:grid-cols-[.82fr_1.18fr]">
            <div className="relative z-10 pb-16 pt-8 lg:pr-10">
              <p className="font-serif text-4xl italic sm:text-5xl">Learning is fun!!!</p>
              <h1 className="mt-6 text-4xl font-black uppercase leading-[.98] sm:text-6xl">Explore. Innovate.<span className="mt-2 block text-7xl text-yellow-400 sm:text-8xl">Learn.</span></h1>
              <div className="mt-5 h-1 w-16 bg-yellow-400"/>
              <p className="mt-5 text-xl font-medium">English Remedial & Coaching Classes<br/>for Class V to XII (ICSE/ISC/CBSE)</p>
              <p className="mt-5 max-w-lg text-lg leading-7 text-blue-100">Empowering students to achieve excellence through quality education and personal attention.</p>
            </div>
            <div id="gallery" className="relative min-h-[420px] overflow-hidden rounded-tl-[9rem] border-l-[12px] border-yellow-400 bg-[linear-gradient(135deg,#225ea8,#77b5e8)] lg:min-h-[520px]">
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_65%_35%,rgba(255,255,255,.35),transparent_35%)]">
                <GraduationCap className="h-40 w-40 text-white/90" strokeWidth={1}/>
                <p className="absolute bottom-12 max-w-md px-8 text-center text-2xl font-bold">English coaching, personal attention and confident learning.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-12 max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-3 md:grid-cols-3">
          {portals.map(({title,text,href,icon:Icon,color,button}) => <article key={title} className="min-h-64 overflow-hidden rounded-3xl border bg-gradient-to-br from-white to-slate-50 p-6 shadow-xl">
            <div className={`grid h-14 w-14 place-items-center rounded-full border-2 ${color}`}><Icon className="h-7 w-7"/></div>
            <h2 className={`mt-5 text-xl font-black uppercase ${color}`}>{title}</h2><p className="mt-3 max-w-xs text-slate-700">{text}</p>
            <Link href={href} className={`mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-3 font-bold text-white ${button}`}>Login Now <ArrowRight className="h-4 w-4"/></Link>
          </article>)}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        <h2 className="text-center text-3xl font-black uppercase">Why Choose Us?</h2><div className="mx-auto mt-2 h-1 w-16 bg-yellow-400"/>
        <div className="mt-7 grid overflow-hidden rounded-3xl border bg-white shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          {strengths.map(([title,text,Icon,bg]) => <div key={title} className="border-b p-6 text-center lg:border-b-0 lg:border-r">
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-white ${bg}`}><Icon className="h-7 w-7"/></div><h3 className="mt-4 font-black uppercase">{title}</h3><p className="mt-2 text-sm text-slate-600">{text}</p>
          </div>)}
        </div>
      </section>

      <section id="about" className="bg-[#031a3d] text-white">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <div className="relative min-h-[350px] overflow-hidden rounded-tr-[8rem] bg-gradient-to-br from-amber-100 via-orange-200 to-violet-300">
            <div className="absolute inset-0 grid place-items-center"><BookOpen className="h-32 w-32 text-[#031a3d]/70"/></div>
          </div>
          <div id="courses" className="p-8 sm:p-12">
            <h2 className="text-3xl font-black uppercase">About <span className="text-yellow-400">Learning Is Fun</span></h2><div className="mt-3 h-1 w-14 bg-yellow-400"/>
            <p className="mt-5 leading-7 text-blue-100">We are committed to providing quality English remedial and coaching classes for students from Class V to XII (ICSE/ISC/CBSE). Our goal is to build strong concepts, boost confidence and help every student achieve their full potential.</p>
            <div className="mt-8 grid grid-cols-3 gap-4 text-center"><div><p className="text-3xl font-black">V–XII</p><p className="text-sm text-blue-200">Classes</p></div><div><p className="text-3xl font-black">ICSE</p><p className="text-sm text-blue-200">ISC / CBSE</p></div><div><p className="text-3xl font-black">100%</p><p className="text-sm text-blue-200">Commitment</p></div></div>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-[#08245a] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
          <div><div className="grid h-24 w-24 place-items-center rounded-full border-2 border-yellow-400 text-center text-sm italic">Learning<br/>is fun!!!</div><p className="mt-4 text-sm text-blue-100">Dedicated to providing quality English remedial and coaching classes for students from Class V to XII.</p></div>
          <div><h3 className="font-black uppercase text-yellow-400">Quick Links</h3><div className="mt-3 space-y-2 text-sm"><a className="block" href="#about">About Us</a><a className="block" href="#courses">Courses</a><a className="block" href="#features">Features</a><a className="block" href="#gallery">Gallery</a></div></div>
          <div><h3 className="font-black uppercase text-yellow-400">Courses</h3><div className="mt-3 space-y-2 text-sm"><p>Class V – VIII</p><p>Class IX – X</p><p>Class XI – XII</p><p>ICSE / ISC / CBSE</p></div></div>
          <div><h3 className="font-black uppercase text-yellow-400">Contact Us</h3><div className="mt-3 space-y-3 text-sm"><a className="flex gap-2" href="tel:+918420055342"><Phone className="h-4 w-4"/>84200 55342</a><a className="flex gap-2" href="mailto:learningisfun613@gmail.com"><Mail className="h-4 w-4"/>learningisfun613@gmail.com</a><p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0"/>251/1 N. N. Road, Old Shrachi Garden, Nagerbazar, Kolkata 700028</p></div></div>
        </div>
        <div className="border-t border-white/15 py-4 text-center text-xs text-blue-200">© 2026 Learning Is Fun. All Rights Reserved.</div>
      </footer>
    </main>
  );
}
