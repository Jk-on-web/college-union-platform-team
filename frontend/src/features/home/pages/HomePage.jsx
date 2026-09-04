import React from "react";
import { useOutletContext } from "react-router-dom";
import { Bell, BookOpen, CalendarDays, ChevronRight, ClipboardList, Droplets, GraduationCap, Map, ShieldAlert, Sparkles, ShieldCheck } from "lucide-react";
import { events } from "../../../data/demo/events";
import { Card, Reveal, RevealGroup, Stat } from "../../../components/common/PagePrimitives";
export default function HomePage({ role, user }) {
  const { go, unreadCount = 0 } = useOutletContext();
  const firstName = user?.name?.split(" ")[0] || "there";

  return <>
    <Reveal className="hero-reveal"><div className="hero">
      <div><span className="eyebrow light">SATURDAY • AUGUST 29, 2026</span><h1>Good morning, {firstName}.</h1><p>Your campus, union services and opportunities — all in one place.</p>
        <div className="hero-actions"><button className="primary" onClick={() => go("events")}>Explore events <ChevronRight size={16} /></button><button className="ghost" onClick={() => go("grievances")}>Submit a grievance</button></div>
      </div><div className="hero-art"><div className="orbit o1" /><div className="orbit o2" /><div className="hero-card"><Sparkles /><b>One platform.</b><span>Every student service.</span></div></div>
    </div></Reveal>
    <RevealGroup className="stats">
      <Stat icon={CalendarDays} label="Upcoming events" value="12" trend="+3 this week" />
      <Stat icon={Bell} label="Unread updates" value={unreadCount.toString()} />
      <Stat icon={BookOpen} label="Academic materials" value="620" trend="+28 this month" />
      <Stat icon={GraduationCap} label="Welfare opportunities" value="71" />
    </RevealGroup>
    <Reveal><div className="section-row"><div><h2>Quick access</h2><p>Frequently used student services.</p></div></div></Reveal>
    <RevealGroup className="quickgrid">{[
      ["academics", "Academics", "Study materials", BookOpen], ["welfare", "Student Welfare", "5 opportunity hubs", GraduationCap],
      ["grievances", "Grievances", "Track your issues", ClipboardList], ["blood", "Blood Bank", "Donor & requests", Droplets],
      ["emergency", "Emergency Hub", "One-tap contacts", ShieldAlert], ["map", "University Map", "Find campus places", Map]
    ].map(([key, t, s, I]) => <button className="quick" onClick={() => go(key)} key={key}><div className="quick-icon"><I size={20} /></div><div><b>{t}</b><span>{s}</span></div><ChevronRight size={17} /></button>)}</RevealGroup>
    <div className="two-col">
      <Card><div className="card-head"><div><h3>Upcoming events</h3><p>What's happening around campus</p></div><button className="textbtn" onClick={() => go("events")}>View all</button></div>{events.map((e, i) => <div className="event-row" key={i}><div className="datebox"><b>{e.date.split(" ")[0]}</b><span>{e.date.split(" ")[1]}</span></div><div className="row-main"><b>{e.title}</b><span>{e.time} · {e.venue}</span></div><span className="pill">{e.tag}</span></div>)}</Card>
      <Card><div className="card-head"><div><h3>Latest updates</h3><p>Official union notices</p></div><button className="textbtn" onClick={() => go("announcements")}>All updates</button></div>
        {[["Library extended hours", "Until Sep 12 · 10:42 AM"], ["Student welfare applications open", "Today · 9:15 AM"], ["Football registration closes soon", "Yesterday · 4:30 PM"]].map((x, i) => <div className="update" key={i}><div className="dot" /><div><b>{x[0]}</b><span>{x[1]}</span></div></div>)}
      </Card>
    </div>
    {role !== "student" && <Reveal><div className="role-banner"><ShieldCheck size={20} /><div><b>{role === "maintainer" ? "Academic Maintainer Demo" : "Super Admin Demo"}</b><span>You are viewing the interface for this role. Switch roles from the top-right selector.</span></div></div></Reveal>}
  </>;
}
