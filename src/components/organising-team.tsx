import Image, { type StaticImageData } from "next/image";

import arham from "@/assets/team/arham-shuaib.webp";
import michael from "@/assets/team/michael-domarkas.webp";
import tanuj from "@/assets/team/tanuj-kakumani.webp";
import vincent from "@/assets/team/vincent-lee.webp";

const organisers: Array<{
  name: string;
  role: string;
  bio: string;
  href: string;
  photo: StaticImageData;
}> = [
  {
    name: "Arham Shuaib",
    role: "Lead",
    bio: "Software Engineer @ Combinely (YC X25). Palantir and Null Fellow. Previously interned at Disney, JPM, and Bank of America.",
    href: "https://www.linkedin.com/in/arham-shuaib/",
    photo: tanuj,
  },
  {
    name: "Tanuj Kakumani",
    role: "Growth",
    bio: "Founder of simplytk. Ex-A* AI (10k users). Spring Intern @ Citadel, Optiver, IMC Trading. Imperial Econ & Data Science.",
    href: "https://www.linkedin.com/in/tanujkakumani/",
    photo: arham,
  },
  {
    name: "Michael Domarkas",
    role: "Judge",
    bio: "Founder @ Frontier Computing (YC S26). Previously at the University of Cambridge.",
    href: "https://www.linkedin.com/in/michael-domarkas/",
    photo: michael,
  },
  {
    name: "Vincent Lee",
    role: "Operations",
    bio: "Incoming Quant Research Intern @ Optiver. Imperial BSc in Mathematics with Statistics.",
    href: "https://www.linkedin.com/in/vincentyrlee/",
    photo: vincent,
  },
];

export function OrganisingTeam() {
  return (
    <section className="team-section section-shell" id="team" aria-labelledby="team-title">
      <div className="team-heading" data-reveal>
        <p className="section-index">01</p>
        <h2 id="team-title">Organising Team</h2>
      </div>
      <ul className="team-grid" data-reveal>
        {organisers.map((person) => (
          <li key={person.name}>
            <a className="team-card" href={person.href} target="_blank" rel="noopener noreferrer">
              <span className="team-photo">
                <Image src={person.photo} alt="" fill sizes="132px" placeholder="blur" />
              </span>
              <span className="team-copy">
                <span className="team-name">
                  {person.name}
                  <span className="sr-only"> on LinkedIn</span>
                </span>
                <span className="team-role">{person.role}</span>
                <span className="team-bio">{person.bio}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
