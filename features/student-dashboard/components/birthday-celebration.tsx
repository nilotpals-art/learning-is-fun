import { CakeSlice, Gift, PartyPopper, Sparkles } from "lucide-react";

export function BirthdayCelebration({ studentName }: { studentName: string }) {
  const firstName = studentName.split(" ")[0] || studentName;
  const confetti = Array.from({ length: 24 }, (_, index) => ({
    left: `${(index * 17) % 96}%`,
    delay: `${(index % 8) * 0.18}s`,
    duration: `${3.4 + (index % 5) * 0.35}s`,
    rotate: `${(index * 47) % 360}deg`,
  }));

  return (
    <section className="birthday-stage relative isolate overflow-hidden rounded-[2rem] border border-pink-200/70 bg-[radial-gradient(circle_at_15%_20%,rgba(253,224,71,.55),transparent_24%),radial-gradient(circle_at_85%_20%,rgba(244,114,182,.45),transparent_26%),linear-gradient(135deg,#fff7ed_0%,#fdf2f8_45%,#eef2ff_100%)] px-5 py-8 text-center shadow-xl sm:px-10 sm:py-10 dark:border-pink-400/20 dark:bg-[linear-gradient(135deg,#4c1d95,#831843,#1e3a8a)]">
      <style>{`
        @keyframes birthday-fall { 0% { transform: translate3d(0,-70px,0) rotate(0deg); opacity: 0; } 12% { opacity: 1; } 100% { transform: translate3d(20px,430px,0) rotate(720deg); opacity: .15; } }
        @keyframes birthday-float { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
        @keyframes birthday-pop { 0% { transform: scale(.86); opacity: 0; } 65% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes birthday-glow { 0%,100% { box-shadow: 0 0 0 rgba(244,114,182,0); } 50% { box-shadow: 0 0 42px rgba(244,114,182,.34); } }
        .birthday-confetti { animation-name: birthday-fall; animation-timing-function: linear; animation-iteration-count: infinite; }
        .birthday-float { animation: birthday-float 3.2s ease-in-out infinite; }
        .birthday-pop { animation: birthday-pop .75s cubic-bezier(.2,.9,.3,1.2) both; }
        .birthday-glow { animation: birthday-glow 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .birthday-confetti,.birthday-float,.birthday-pop,.birthday-glow { animation: none !important; } }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {confetti.map((piece, index) => (
          <span
            key={index}
            className="birthday-confetti absolute top-0 h-3 w-2 rounded-sm bg-current"
            style={{
              left: piece.left,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              color: ["#f43f5e", "#8b5cf6", "#0ea5e9", "#f59e0b", "#10b981"][index % 5],
              transform: `rotate(${piece.rotate})`,
            }}
          />
        ))}
      </div>

      <div className="birthday-float absolute left-5 top-5 hidden rounded-full bg-white/70 p-3 text-amber-500 shadow-md sm:block dark:bg-white/10" aria-hidden="true"><Gift className="size-7" /></div>
      <div className="birthday-float absolute right-5 top-5 hidden rounded-full bg-white/70 p-3 text-pink-500 shadow-md sm:block dark:bg-white/10" aria-hidden="true"><PartyPopper className="size-7" /></div>

      <div className="birthday-pop relative z-10 mx-auto max-w-3xl">
        <div className="birthday-glow mx-auto grid size-20 place-items-center rounded-full bg-white/80 text-pink-600 shadow-lg backdrop-blur dark:bg-white/10 dark:text-pink-200">
          <CakeSlice className="size-10" />
        </div>
        <p className="mt-5 text-sm font-black uppercase tracking-[0.26em] text-violet-700 dark:text-violet-200">A special day at Learning Is Fun</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">Happy Birthday, {firstName}! 🎉</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-700 sm:text-lg dark:text-slate-200">
          Learning Is Fun wishes you a wonderful birthday filled with happiness, confidence, curiosity and many new achievements. Keep learning, keep smiling, and have a fantastic year ahead!
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-5 py-2.5 text-sm font-bold text-violet-800 shadow-sm backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-violet-100">
          <Sparkles className="size-4" /> Best wishes from Learning Is Fun
        </div>
      </div>
    </section>
  );
}
