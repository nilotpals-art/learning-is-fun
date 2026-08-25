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

const LOGO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCACAAKADASIAAhEBAxEB/8QAGwABAAIDAQEAAAAAAAAAAAAAAAUGAQMEAgf/xAA+EAABAwMCAwYDBQUHBQAAAAABAgMEAAUREiEGMUETFCJRYXEVMoFCUmKRoQcjJEOxM1NygqLB0XOS0uHw/8QAGAEBAAMBAAAAAAAAAAAAAAAAAAECAwT/xAAjEQACAwADAAEEAwAAAAAAAAAAAQIDERIhMRMEFCNhMkFR/9oADAMBAAIRAxEAPwD5XSlK7DkFKUoNFKUoBtWVIKcakkZGRkcxXtpoOvpaDjaMnGtZwkepNb4lvuFzWERIr8op2HZpKgB78hUOUV6T2clNqmXOHpKWGu2XAirGUrDsxIUfUjJx5beVavgiORvFrz5dur/xqnywJxkWBnOByp9KlUcPTHylEV2JKcUcBtiSlSj9Nq5p1tlQG0d5gyGFEnK3B4VeWD/7qVZBkYzjxjbFK2YekKUrxOKCck88AdfatdXRAptSlBopSlBopSlAKUpUgUpXtaWxp0LKspBVlOMHqPX3oDxXdbrRJuOtxGhqO1/ayHTpbb9z1PoN6m+HOGEXiGu5TAIcCJ4VuFRHeFZ5AnkeQ2B/Opgze0jPrt0VEKBBGjv8logRznH7pv73TJyrfciuWd/fGJZI4IVnt9vSh1cNDqFpITLubnYtlR5FDW6lDPmN6lpsS4w5DAuU6Sr4eQAqOluHHJ5g6lHxc+YTVZl8U6EIbtzIU62VH4hLSHJCyeZ8k+nMjzqCkSX5jxelPOPuH7biio/rWapnN6y24Wns+EmmnW5K2nFuL1lxDzjrgO+QCEhO+d6w4/wKpAZV8V0BWodmBgHGCcGqlmnOtPtv2yOZbQxwJJuKXkXGdEj53YWwR0xssEkb71pgRLxGWBa5wuUNpRWWIjusH0LZwcHrtVYr0hxbaw4hakrTuFJJBH1p8DS6ek89J6RJgSNa7jak25b6lBL0QkFvB3Cmif8AjNRk21vRGxIStuREWcIkMnKSfI9Un0NTUHixuS13TiSGLmxjCH8APteoVzV7Gut+0vREfEuHJLc6CtvS5HUjdaRzSpP2j59etZKcqpY0TiaKaN+VKl5tsbkW83e1NuCKhQTIaVuY6/fqk9D05GoxxktrSjUhRUkHwKyN+nvXZGakjNrDXSsrSptakKGCk4I9axVyBSlKAUpSgM4OCegqXs9ujXN1LkgLiwoaNc6SFasjOwSPvHkB9a0O2O4MmAhTILlxQFx0BWVKBOASOmattyhR4LjfDjDmiBa20y7u+k57V3bw+vRIHrXPbZnS9LJHPPu7d0gsypbKotnhOlNuhNL0F7HTPPY7lXrgb1V7neJt1kF2Q6QnGlDSCQhCfID/AOzzrN6u7t6uK5TjaGUfK0w2MIZR0SkVwE1NVSS1hsUpStyopSlAKUpQGc13Wq7yLS+XGjqaXjtWiThY/wBiOhG4rgpVZRUljJTwvz6osuWxerPHSHHE47BxeUS1BOFtrAxhzr5KG43qsX60dwXHlMNlMSajW0kqBLZ6oPqP6YrXZLi3EeVGlE9yk4S9jm2R8rifxJO/51aVxhNEuCoDvDqQ3KyBp7f+U+jySseEn8Q864cdMjTqSKK42ppxTa0FC0nCkkYINeay4laXFJcBCwSFBXMHrWK712jIUpSpArptsNdxucWE2MqkPJbGPU4rmq0/s7aSOJzOWAUW6K9KOfNKTj9TUPwElduIoUHjWfcUIDxtwREhM8hpT4VKz0wAf+6oG9TVJgNxi6HJE5ffZqwc+JWdCPoN8eZqFccU66p1Rypaio+53qVuXC91tLUFUtkJXP3ZZSrLnTYp6ZyKx+NctJ0h6VM3PhW6WqdFgvIacky8BtplwKUDnGk+RrngWG43JMkxY5cMZSULSDuVqVpCQOpzn8q20gjqVMWaPcIkmdMYisrVbmVmQmSkFKAfAdj1ydq02+w3G6xnX4UcvBtxDWlPzKWrOAkddgT7U1AjaV2QLVLuMxUVhAC0AlwrVpS2BzKj0ArXPhuW+a7FdW2tbZwVNq1JPsaaDnpUrZ0zI8O4XGOxHcZZZ7F4vgHSHDpGkferjRbZi7cu4pjr7o2sNqe+zqPIeppoOalMGpqDaI6+F7leZRWOyWiPGCTjU6rck+gSP1poIbbFWmBej3Fi5PpS6uKRClDkVsK+RW32k4IB9BUNIsNxjMNvLjKKXIwleHcoaJwFK8s16hWG6ToBlxIy3Wy6WglPNRCdR28gOZrKyCmiU8N/F7LDPEsrsHQ4lzS4SBjdQBP/AD9a5vgNy7+mCYxEhTPb6CRsjTqyfLbet1ijqvfEENqW6VtIwXFL+yy2Mn/SMVLO3Jbtrvl+VkP3Z/ukcdQj5lgf5QlP1qY7GKRDK0qDJTb0XBTeIzjpaQsn5lAZIH0Nc9WDitXdVwLIk+G2RwlzHIur8az+ZA+lV+tEBVm4WX3fh/iiSB4hAS0D/jcAP6VWasfDwW/w1xHEaBK1R2ngkDJUEuDP9aPwHJw3AalXBUmVtCgp7xIPmkck+6jgVYWuPLaeJ276/aX3nlKysuvhfYjGMNDAA36mom9NOWKxRbN2akvSSJM1eNirHgbz+EHJHmqq7pOrSRg+u1VzQXuFxza5fEcG6Xa2EPRVlDbqXPA21klOUAZKhnHP1rmR+0Wc3bpzHZoMiRJDjLqUpSGUb5SAB5bZ9TVMpU8UC7tX7ht+PeYKe3hfGB2jkp5GsNKCwoICU7lPPfnyrwjjaFZ7Qm1WOCUhqSlzvjpwt0DGokDkTjHoNqpdOtOIPodnvVqdkSI1nt7ypMqT3px+WUpabAOfEBzSgnIHU4qI48uTJ4guVuhRWmWRKK3nQAVvL8yegydgK9WGLpYtUJshPxF7vUxZ+zHaVsCfLwqJ+lV67TfiN3mTcYEh9bg9iSRUJdgk7DNtyrJcrPcZioaJTjLyHg0XN0E5TgeYO1WW0t23iSzyLc7BXHtNvCnITyV6XlrSnUsHoSoDJ+7tXzqrM1xWzF4bbgRYi0TRHXGL5WNKULVlZSPvKGASegpJAjpUt69yo8KFCbZbCtEaKynqfNR3UT5mrpMsJsnAEA3WOp0x5Lsh2IyoKC1HCUlagdkjG+PPFfN0nB2OK+gWh0O8Kwrit1PdrbEmxZKdQySvdsY65Kv0owarlx7bZshxpFvebhzIoZmhBAXkJASEdAlOMgHzNamePolvgwIFrtRjR4skrcKnNS3mzzBPmeZ6bCqRggAc9qAHNTxQLQq9WiLa5sO2tuI1NFDbryB2rqnFDWTjkAgYA9TXMxcoPa2GO6v+FhfvJHhPzqWVK267BIqIW7IioegqCUhSwXE4BOU8t/r0r2m4yUyW5AKAtpsNp/dpxpxjljBODzokDVNkuTZr8t3533FOK9yc1prJrFWArohT5dtkiTCkOR3kggONqwcHnXPSgJq2QbjfA6+lSpxiudq6w458yTkqVknrjB67isXO0MtXOUYqnlW9pKXS7oyUpWARtncZIFc9kkpZmKYdXoYmNlhxWflzyV9Dg1P2ta+7qt1xld3bgFbM1ByQppQwFYHMpUcZ9RXFZKcJ6XSTRUUp1JUSoAjGx6+1ea65dvchPvsvKCS0cJODh3l8p9iDXJiuuMlJaijFKUqwO9F6uKLWbaiUtMU5BbAHInJGeeM74ziuHNYpQClKUAr2nUfCnJ1EeEdTXisgEeIZHkagHtsN9sEvlaE5IVpTkj6VKwbA7IbXKdUUxERHJPapHPTtjf8AEQPzxXNBssu63Aw4Cm5DmjWVhWABtnnjlnf2q2X1tp92LYYSkstqShUladgywgHGffxOH/EK57LMfFE4Ul5bCmmuyZW25gl0k+FRJ20joMVqNdd3mpuFzdkNp0NbIaR91CRhI/IVx1vHwhilKVYClKUA6VPR5jj7aLoykLlxEaJbZ5PtctRHtsfoaga3RJL0OUiSwrS4g7ZGQfMEdQR0rK2HJdFovCwToKblAaVEK3FNpPdc/Mtsblo/jR0801W6sjNye7R65wit1l0DvkPVhTWOSknyGBhQ5cjtWy52Zq6s/EbY4264pIUtDZA1kjqPsr808j08q5q7fj6kXcd8KsQQM42rFdDkVcWR2M1K2Fac405PLatOodnp0DOc6uvtXYpJ+GWHmlMUqwFKzpJOwz7V6UUKd1BJQgn5Qc4H+9RoPFZTucE4Fe32w05gfIRqQTjJSeWccqnrTaYkNpi5XhCne0P8NbkAh2SrpnyQfPrWc7FFEpaTfDUW22GyM3y8t93ekBaIgAK1vA9dPQdM+p86gLnJdgMPx31ldznkLmr/ALtPMNe/Iny2Fd18vjgnmdLDJuwSG2mGt2oKQOnmv05D3qqLUpaytaipSjkqJySawqrcpcmWYNYpSuwoKUpQClKUApSlAbY8h+K8l+O6ptxG4UnmKl4FyiqnIlhQt8xJBVpBDD46hQG6c+mR7VB0yc1lOqMy0ZNF4m3GBNLxvNqVAMhJQidEAeQU9M55+43qHkcNBKGH7RJ+LNhOp4xyNSSD0T83LzFQ8SfLgkmLIcaB5pSfCr3HI12N3rDwfcgR+2H81jUwv80HH6Vyqmyr+D6NOSl6cMlDyXlqebdQpRJPaIIP9K0gjPOrXE4vbixgEquQXq3bU+h1AHprSfyrrHH8dKcfBm3j95zQg/6U1Z3XJdQ0hRg/7KrEiynEOORdZX8gQhKipYOxxgcvOrHa+CZcmaXDFIhBskqmK7Mg6eZSnJ2PLzxWpf7QLoFFUONFiEp05AUs4/zHH6VFy+Kb5MTodub4R/dtns0/knFQ19TPzEPxr9liXbrHwwgZeZkTOfeJSNWj/psg5J9V4FQlw4kLilfD21MuLTpdmOHVIe9zySPRNQRJJJO5PM0rWFGdyesq5f4M050pXSUFKUoBSlKA/9k=";

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
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="Learning Is Fun home"><img src={LOGO} alt="Learning Is Fun" className="h-16 w-20 rounded-full object-cover sm:h-20 sm:w-24" /></Link>
            <nav className="hidden items-center gap-7 text-sm font-semibold uppercase lg:flex"><a href="#home" className="border-b-2 border-yellow-400 pb-2 text-yellow-400">Home</a><a href="#about">About Us</a><a href="#courses">Courses</a><a href="#features">Features</a><a href="#gallery">Gallery</a><a href="#contact">Contact</a></nav>
            <a href="tel:+918420055342" className="flex rounded-lg border border-violet-400 px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm"><Phone className="mr-2 h-4 w-4"/>84200 55342</a>
          </header>

          <div className="grid items-center gap-6 py-8 md:grid-cols-[.82fr_1.18fr] lg:py-10">
            <div className="relative z-10 py-4 md:pr-5">
              <p className="font-serif text-3xl italic sm:text-5xl">Learning is fun!!!</p>
              <h1 className="mt-5 text-4xl font-black uppercase leading-[.98] sm:text-6xl">Explore. Innovate.<span className="mt-2 block text-6xl text-yellow-400 sm:text-8xl">Learn.</span></h1>
              <div className="mt-5 h-1 w-16 bg-yellow-400"/>
              <p className="mt-5 text-base font-medium sm:text-xl">English Remedial & Coaching Classes<br/>for Class V to XII (ICSE/ISC/CBSE)</p>
              <p className="mt-4 max-w-lg text-sm leading-6 text-blue-100 sm:text-lg sm:leading-7">Empowering students to achieve excellence through quality education and personal attention.</p>
            </div>
            <div id="gallery" className="relative min-h-[300px] overflow-hidden rounded-tl-[5rem] border-l-[8px] border-yellow-400 sm:min-h-[420px] lg:min-h-[520px] lg:rounded-tl-[9rem] lg:border-l-[12px]">
              <img src="https://images.unsplash.com/photo-1710615159028-e5e1b4890358?auto=format&fit=crop&fm=jpg&q=80&w=1600" alt="Graduating students" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#031a3d]/35 via-transparent to-transparent"/>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-5 max-w-7xl px-4 sm:-mt-10 sm:px-8 lg:px-10">
        <div className="flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
          {portals.map(({title,text,href,icon:Icon,color,button}) => <article key={title} className="min-w-[82%] snap-center rounded-3xl border bg-gradient-to-br from-white to-slate-50 p-5 shadow-xl sm:min-w-[55%] md:min-w-0 md:p-6">
            <div className={`grid h-12 w-12 place-items-center rounded-full border-2 ${color}`}><Icon className="h-6 w-6"/></div>
            <h2 className={`mt-4 text-lg font-black uppercase sm:text-xl ${color}`}>{title}</h2><p className="mt-2 text-sm text-slate-700 sm:text-base">{text}</p>
            <Link href={href} className={`mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white ${button}`}>Login Now <ArrowRight className="h-4 w-4"/></Link>
          </article>)}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-10 sm:px-8 lg:px-10">
        <h2 className="text-center text-2xl font-black uppercase sm:text-3xl">Why Choose Us?</h2><div className="mx-auto mt-2 h-1 w-16 bg-yellow-400"/>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {strengths.map(([title,text,Icon,bg]) => <div key={title} className="rounded-2xl border bg-white p-4 text-center shadow-sm sm:p-5">
            <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full text-white ${bg}`}><Icon className="h-6 w-6"/></div><h3 className="mt-3 text-sm font-black uppercase sm:text-base">{title}</h3><p className="mt-2 text-xs text-slate-600 sm:text-sm">{text}</p>
          </div>)}
        </div>
      </section>

      <section id="about" className="bg-[#031a3d] text-white">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <div className="relative min-h-[300px] overflow-hidden rounded-tr-[5rem] sm:min-h-[380px] lg:rounded-tr-[8rem]">
            <img src="https://images.olivetuniversity.edu/files/otcs/otcs2025-1.png" alt="Students studying in class" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div id="courses" className="p-7 sm:p-10 lg:p-12">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">About <span className="text-yellow-400">Learning Is Fun</span></h2><div className="mt-3 h-1 w-14 bg-yellow-400"/>
            <p className="mt-5 leading-7 text-blue-100">We are committed to providing quality English remedial and coaching classes for students from Class V to XII (ICSE/ISC/CBSE). Our goal is to build strong concepts, boost confidence and help every student achieve their full potential.</p>
            <div className="mt-7 grid grid-cols-3 gap-3 text-center"><div><p className="text-2xl font-black sm:text-3xl">V–XII</p><p className="text-xs text-blue-200 sm:text-sm">Classes</p></div><div><p className="text-2xl font-black sm:text-3xl">ICSE</p><p className="text-xs text-blue-200 sm:text-sm">ISC / CBSE</p></div><div><p className="text-2xl font-black sm:text-3xl">100%</p><p className="text-xs text-blue-200 sm:text-sm">Commitment</p></div></div>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-[#08245a] text-white">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-9 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
          <div><img src={LOGO} alt="Learning Is Fun" className="h-24 w-28 rounded-full object-cover"/><p className="mt-4 text-sm text-blue-100">Dedicated to providing quality English remedial and coaching classes for students from Class V to XII.</p></div>
          <div><h3 className="font-black uppercase text-yellow-400">Quick Links</h3><div className="mt-3 space-y-2 text-sm"><a className="block" href="#about">About Us</a><a className="block" href="#courses">Courses</a><a className="block" href="#features">Features</a><a className="block" href="#gallery">Gallery</a></div></div>
          <div><h3 className="font-black uppercase text-yellow-400">Courses</h3><div className="mt-3 space-y-2 text-sm"><p>Class V – VIII</p><p>Class IX – X</p><p>Class XI – XII</p><p>ICSE / ISC / CBSE</p></div></div>
          <div><h3 className="font-black uppercase text-yellow-400">Contact Us</h3><div className="mt-3 space-y-3 text-sm"><a className="flex gap-2" href="tel:+918420055342"><Phone className="h-4 w-4"/>84200 55342</a><a className="flex gap-2" href="mailto:learningisfun613@gmail.com"><Mail className="h-4 w-4"/>learningisfun613@gmail.com</a><p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0"/>251/1 N. N. Road, Old Shrachi Garden, Nagerbazar, Kolkata 700028</p></div></div>
        </div>
        <div className="border-t border-white/15 py-4 text-center text-xs text-blue-200">© 2026 Learning Is Fun. All Rights Reserved.</div>
      </footer>
    </main>
  );
}
