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
  Sparkles,
  Target,
  Users,
} from "lucide-react";

const portalCards = [
  {
    title: "Parent Login",
    description: "Stay connected with your child's progress, attendance and learning journey.",
    href: "/login?portal=parent",
    icon: Users,
    accent: "from-violet-600 to-fuchsia-500",
    ring: "border-violet-200",
  },
  {
    title: "Student Login",
    description: "Access your classes, practice work, assignments and learning resources.",
    href: "/login?portal=student",
    icon: GraduationCap,
    accent: "from-blue-600 to-cyan-500",
    ring: "border-blue-200",
  },
  {
    title: "Teacher Login",
    description: "Manage classes, students, learning plans and progress from one place.",
    href: "/login?portal=teacher",
    icon: HeartHandshake,
    accent: "from-emerald-600 to-green-500",
    ring: "border-emerald-200",
  },
];

const strengths = [
  {
    title: "Experienced Teachers",
    text: "Qualified and caring educators.",
    icon: HeartHandshake,
    tone: "bg-violet-100 text-violet-700",
  },
  {
    title: "Comprehensive Curriculum",
    text: "Well-structured study material and resources.",
    icon: BookOpen,
    tone: "bg-blue-100 text-blue-700",
  },
  {
    title: "Engaging Activities",
    text: "Interactive sessions for better understanding.",
    icon: Users,
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Safe & Supportive",
    text: "A positive and encouraging learning space.",
    icon: ShieldCheck,
    tone: "bg-orange-100 text-orange-600",
  },
  {
    title: "Better Results",
    text: "Consistent practice for stronger outcomes.",
    icon: Target,
    tone: "bg-rose-100 text-rose-600",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-[#031a3d] text-white">
        <div className="absolute -right-28 -top-20 h-[32rem] w-[32rem] rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute right-[28%] top-16 h-72 w-72 rounded-full border-[18px] border-yellow-400/90" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />

        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-6">
            <Link href="/" className="group flex items-center gap-3" aria-label="Learning Is Fun home">
              <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-yellow-300/80 bg-white/5 shadow-[0_0_35px_rgba(250,204,21,0.16)]">
                <Sparkles className="h-7 w-7 text-yellow-300" />
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight sm:text-2xl">Learning Is Fun</p>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-yellow-300">Explore · Innovate · Learn</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-7 text-sm font-semibold lg:flex">
              <a className="text-yellow-300" href="#home">Home</a>
              <a className="text-white/80 transition hover:text-white" href="#about">About Us</a>
              <a className="text-white/80 transition hover:text-white" href="#courses">Courses</a>
              <a className="text-white/80 transition hover:text-white" href="#features">Features</a>
              <a className="text-white/80 transition hover:text-white" href="#contact">Contact</a>
            </nav>

            <a
              href="tel:+918420055342"
              className="hidden items-center gap-2 rounded-xl border border-yellow-300/70 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur sm:flex"
            >
              <Phone className="h-4 w-4" /> 84200 55342
            </a>
          </header>

          <div id="home" className="grid items-center gap-12 pb-8 pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:pt-20">
            <div className="relative z-10 max-w-2xl">
              <p className="mb-4 font-serif text-3xl italic text-white/95 sm:text-5xl">Learning is fun!!!</p>
              <h1 className="text-4xl font-black uppercase leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
                Explore. Innovate.
                <span className="mt-2 block text-yellow-400">Learn.</span>
              </h1>
              <div className="mt-6 h-1 w-16 rounded-full bg-yellow-400" />
              <p className="mt-6 text-xl font-medium text-white/95 sm:text-2xl">
                English Remedial & Coaching Classes
                <span className="block">for Class V to XII (ICSE / ISC / CBSE)</span>
              </p>
              <p className="mt-5 max-w-xl text-base leading-7 text-blue-100 sm:text-lg">
                Empowering students to achieve excellence through personal attention, regular assessment and confident learning.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-2xl lg:min-h-[430px]">
              <div className="absolute inset-x-7 top-6 h-[360px] rounded-[4rem_1.5rem_4rem_1.5rem] border-8 border-yellow-400 bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-700 shadow-2xl" />
              <div className="relative mx-12 mt-14 grid min-h-[330px] place-items-center rounded-[3.3rem_1rem_3.3rem_1rem] bg-[#082b5c]/95 px-8 text-center shadow-xl">
                <div>
                  <GraduationCap className="mx-auto h-24 w-24 text-yellow-300 sm:h-32 sm:w-32" strokeWidth={1.25} />
                  <p className="mt-5 text-3xl font-bold">A better future starts with strong foundations.</p>
                  <p className="mx-auto mt-3 max-w-md text-blue-100">Small batches · Regular assessment · Individual attention · Better results</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-7 max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          {portalCards.map((portal) => {
            const Icon = portal.icon;
            return (
              <article key={portal.title} className={`overflow-hidden rounded-3xl border ${portal.ring} bg-white shadow-xl shadow-slate-200/60`}>
                <div className="flex h-full min-h-64 flex-col p-6 sm:p-7">
                  <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${portal.accent} text-white shadow-lg`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h2 className="mt-5 text-2xl font-extrabold uppercase tracking-tight text-slate-900">{portal.title}</h2>
                  <p className="mt-2 flex-1 leading-6 text-slate-600">{portal.description}</p>
                  <Link href={portal.href} className={`mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r ${portal.accent} px-5 py-3 font-bold text-white shadow-md transition hover:-translate-y-0.5`}>
                    Login Now <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-600">Learning that builds confidence</p>
          <h2 className="mt-2 text-3xl font-black uppercase text-[#071d49] sm:text-4xl">Why Choose Us?</h2>
        </div>
        <div className="mt-9 grid overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          {strengths.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="border-b border-slate-200 p-6 text-center last:border-0 sm:border-r lg:border-b-0">
                <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${item.tone}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-4 font-extrabold uppercase leading-5 text-[#071d49]">{item.title}</h3>
                <p className="mt-2 text-sm leading-5 text-slate-600">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="about" className="bg-[#061f4b] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:px-10">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-blue-500/30 to-violet-500/20 p-8 sm:p-10">
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-yellow-300/20 blur-2xl" />
            <BookOpen className="h-14 w-14 text-yellow-300" />
            <p className="mt-8 text-sm font-bold uppercase tracking-[0.25em] text-yellow-300">Our classroom promise</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Focused learning. Personal attention. Steady progress.</h2>
            <p className="mt-5 max-w-lg leading-7 text-blue-100">Regular review, practice and feedback help students strengthen concepts at their own pace while preparing confidently for school and board examinations.</p>
          </div>

          <div className="flex flex-col justify-center" id="courses">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-300">About Learning Is Fun</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">English coaching and remedial support for Class V to XII.</h2>
            <p className="mt-5 leading-7 text-blue-100">We work with ICSE, ISC and CBSE students through small batches, structured practice, regular assessment and a safe, supportive learning environment.</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-black text-yellow-300">V–XII</p><p className="mt-1 text-xs text-blue-100 sm:text-sm">Classes</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-black text-yellow-300">3</p><p className="mt-1 text-xs text-blue-100 sm:text-sm">Boards</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-black text-yellow-300">100%</p><p className="mt-1 text-xs text-blue-100 sm:text-sm">Commitment</p></div>
            </div>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-[#02142e] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full border border-yellow-300 text-yellow-300"><Sparkles className="h-5 w-5" /></div>
              <p className="text-xl font-bold">Learning Is Fun</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-blue-100">Quality English remedial and coaching classes for students from Class V to XII.</p>
          </div>
          <div>
            <h3 className="font-bold uppercase tracking-wider text-yellow-300">Quick Links</h3>
            <div className="mt-4 space-y-2 text-sm text-blue-100"><a className="block hover:text-white" href="#about">About Us</a><a className="block hover:text-white" href="#courses">Courses</a><a className="block hover:text-white" href="#features">Features</a></div>
          </div>
          <div>
            <h3 className="font-bold uppercase tracking-wider text-yellow-300">Courses</h3>
            <div className="mt-4 space-y-2 text-sm text-blue-100"><p>Class V – VIII</p><p>Class IX – X</p><p>Class XI – XII</p><p>ICSE / ISC / CBSE</p></div>
          </div>
          <div>
            <h3 className="font-bold uppercase tracking-wider text-yellow-300">Contact Us</h3>
            <div className="mt-4 space-y-3 text-sm text-blue-100">
              <a href="tel:+918420055342" className="flex gap-3 hover:text-white"><Phone className="mt-0.5 h-4 w-4 shrink-0" />84200 55342</a>
              <a href="mailto:learningisfun613@gmail.com" className="flex gap-3 hover:text-white"><Mail className="mt-0.5 h-4 w-4 shrink-0" />learningisfun613@gmail.com</a>
              <p className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />251/1 N. N. Road, Old Shrachi Garden, Nagerbazar, Kolkata 700028</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-blue-200">© 2026 Learning Is Fun. All rights reserved.</div>
      </footer>
    </main>
  );
}
