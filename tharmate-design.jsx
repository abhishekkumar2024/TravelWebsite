import { useState, useEffect, useRef } from "react";

const COLORS = {
  sand: "#E8C99A",
  dune: "#C4975A",
  rust: "#B5451B",
  night: "#0F0A04",
  midnight: "#1A1008",
  ember: "#E85D1B",
  gold: "#F0A500",
  cream: "#FDF3E3",
  muted: "#8A7560",
  sage: "#7A9E7E",
  sky: "#5B8DB8",
};

const destinations = [
  { id: "all", label: "All Places", emoji: "🌍" },
  { id: "jaisalmer", label: "Jaisalmer", emoji: "🏯" },
  { id: "jaipur", label: "Jaipur", emoji: "🎨" },
  { id: "udaipur", label: "Udaipur", emoji: "🌊" },
  { id: "jodhpur", label: "Jodhpur", emoji: "🔵" },
  { id: "pushkar", label: "Pushkar", emoji: "🌸" },
];

const companions = [
  { id: 1, name: "Priya S.", age: 26, from: "Mumbai", dest: "Jaisalmer", dates: "Mar 12–16", vibe: "Adventure", avatar: "PS", color: "#B5451B", verified: true, msg: "Looking for someone to do the camel safari + fort trek together 🐪", tags: ["Photography", "Budget"] },
  { id: 2, name: "Arjun M.", age: 29, from: "Bangalore", dest: "Udaipur", dates: "Mar 14–18", vibe: "Culture", avatar: "AM", color: "#5B8DB8", verified: false, msg: "Planning to visit all the havelis and lake palaces. Love local food!", tags: ["Culture", "Foodie"] },
  { id: 3, name: "Zara K.", age: 24, from: "Delhi", dest: "Jaipur", dates: "Mar 15–19", vibe: "Luxury", avatar: "ZK", color: "#7A9E7E", verified: true, msg: "Heritage hotel stay, exploring the Pink City's hidden gems 🌸", tags: ["Luxury", "Solo Female"] },
  { id: 4, name: "Rohan T.", age: 31, from: "Pune", dest: "Jodhpur", dates: "Mar 18–21", vibe: "Budget", avatar: "RT", color: "#F0A500", verified: true, msg: "Backpacking through Jodhpur. Looking for travel mates who love chai & stories!", tags: ["Budget", "Backpacker"] },
];

const pulseMessages = [
  { id: 1, user: "Meera", badge: "insider", tag: "tip", msg: "Patwon Ki Haveli just opened the rooftop — best sunset view in Jaisalmer right now!", time: "2m ago", avatar: "M", color: "#B5451B" },
  { id: 2, user: "Dev", badge: null, tag: "photo", msg: "Live from Sam Sand Dunes 🐪✨", time: "5m ago", avatar: "D", color: "#5B8DB8", photo: true },
  { id: 3, user: "Ananya", badge: null, tag: "question", msg: "Is the road to Kuldhara village open today? Planning to go in 2 hours", time: "8m ago", avatar: "A", color: "#7A9E7E" },
  { id: 4, user: "Raj (Guide)", badge: "local", tag: "alert", msg: "Avoid Amar Sagar road till 6pm — local festival procession happening", time: "12m ago", avatar: "R", color: "#F0A500" },
  { id: 5, user: "Sofia", badge: null, tag: "joinme", msg: "Going to Gadisar Lake at 5pm for sunset. Anyone want to join? 🌅", time: "15m ago", avatar: "S", color: "#C4975A" },
];

const tagColors = {
  tip: { bg: "#7A9E7E22", border: "#7A9E7E", text: "#7A9E7E", label: "💡 Tip" },
  photo: { bg: "#5B8DB822", border: "#5B8DB8", text: "#5B8DB8", label: "📸 Photo" },
  question: { bg: "#F0A50022", border: "#F0A500", text: "#F0A500", label: "❓ Question" },
  alert: { bg: "#B5451B22", border: "#B5451B", text: "#B5451B", label: "🚨 Alert" },
  joinme: { bg: "#C4975A22", border: "#C4975A", text: "#C4975A", label: "🤝 Join Me" },
};

const chatMessages = [
  { id: 1, sender: "Priya", avatar: "PS", color: "#B5451B", msg: "Hey! Saw your plan for Jaisalmer fort trek 👋", time: "2:14 PM", mine: false },
  { id: 2, sender: "You", avatar: "YO", color: "#5B8DB8", msg: "Yes! Are you also going on the 14th? Would love to go together", time: "2:16 PM", mine: true },
  { id: 3, sender: "Priya", avatar: "PS", color: "#B5451B", msg: "Exactly the 14th! Also planning the sunset camel safari after 🐪", time: "2:17 PM", mine: false },
  { id: 4, sender: "You", avatar: "YO", color: "#5B8DB8", msg: "Perfect match! I'm staying at Hotel Nachana Haveli. You?", time: "2:19 PM", mine: true },
];

export default function TharMateDesign() {
  const [activeTab, setActiveTab] = useState("companion");
  const [activeCity, setActiveCity] = useState("all");
  const [activePulseCity, setActivePulseCity] = useState("jaisalmer");
  const [openRoom, setOpenRoom] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [messages, setMessages] = useState(chatMessages);
  const [timeLeft, setTimeLeft] = useState(71 * 3600 + 23 * 60 + 11);
  const [pulseScore, setPulseScore] = useState(4.2);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, openRoom]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const sendMsg = () => {
    if (!newMsg.trim()) return;
    setMessages(p => [...p, { id: Date.now(), sender: "You", avatar: "YO", color: "#5B8DB8", msg: newMsg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), mine: true }]);
    setNewMsg("");
  };

  const filteredCompanions = activeCity === "all" ? companions : companions.filter(c => c.dest.toLowerCase() === activeCity);

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: COLORS.night, minHeight: "100vh", color: COLORS.cream }}>
      {/* Grain overlay */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", pointerEvents: "none", zIndex: 999, opacity: 0.4 }} />

      {/* Header */}
      <div style={{ background: `linear-gradient(180deg, ${COLORS.midnight} 0%, transparent 100%)`, padding: "20px 24px 0", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 28 }}>🐪</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.sand, letterSpacing: "-0.5px" }}>TharMate</div>
            <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "2px", textTransform: "uppercase" }}>by CamelThar</div>
          </div>
          <div style={{ marginLeft: "auto", background: `${COLORS.ember}22`, border: `1px solid ${COLORS.ember}44`, borderRadius: 20, padding: "4px 12px", fontSize: 11, color: COLORS.ember }}>
            🟢 247 travelers online
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${COLORS.dune}22` }}>
          {[
            { id: "companion", label: "🤝 Find Companion" },
            { id: "pulse", label: "🌍 Place Pulse" },
            { id: "room", label: "🏕️ Desert Rooms" },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: "none", border: "none", padding: "10px 16px", fontSize: 13, cursor: "pointer", color: activeTab === t.id ? COLORS.gold : COLORS.muted, borderBottom: activeTab === t.id ? `2px solid ${COLORS.gold}` : "2px solid transparent", transition: "all 0.2s", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 40px" }}>

        {/* ===== COMPANION FINDER ===== */}
        {activeTab === "companion" && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.sand, lineHeight: 1.2 }}>Find Your<br /><span style={{ color: COLORS.ember }}>TharMate</span></div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>Real travelers. Real plans. No group tours.</div>
            </div>

            {/* City Filter */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 20, scrollbarWidth: "none" }}>
              {destinations.map(d => (
                <button key={d.id} onClick={() => setActiveCity(d.id)} style={{ background: activeCity === d.id ? COLORS.ember : `${COLORS.dune}15`, border: `1px solid ${activeCity === d.id ? COLORS.ember : COLORS.dune + "33"}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, color: activeCity === d.id ? "#fff" : COLORS.sand, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s", fontFamily: "Georgia, serif" }}>
                  {d.emoji} {d.label}
                </button>
              ))}
            </div>

            {/* Companion Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredCompanions.map((c, i) => (
                <div key={c.id} style={{ background: `linear-gradient(135deg, ${COLORS.midnight} 0%, #1F1508 100%)`, border: `1px solid ${COLORS.dune}25`, borderRadius: 16, padding: 18, position: "relative", overflow: "hidden", animation: `fadeIn 0.4s ease ${i * 0.1}s both` }}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${c.color}15, transparent 70%)`, borderRadius: "0 16px 0 80px" }} />
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${c.color}, ${c.color}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0, border: `2px solid ${c.color}44` }}>{c.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.cream }}>{c.name}</span>
                        <span style={{ fontSize: 12, color: COLORS.muted }}>{c.age} · {c.from}</span>
                        {c.verified && <span style={{ fontSize: 10, background: `${COLORS.sage}22`, color: COLORS.sage, border: `1px solid ${COLORS.sage}44`, borderRadius: 10, padding: "1px 6px" }}>✓ Verified</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 12, color: COLORS.gold }}>📍 {c.dest}</span>
                        <span style={{ fontSize: 11, color: COLORS.muted }}>· {c.dates}</span>
                      </div>
                    </div>
                    <div style={{ background: `${c.color}22`, border: `1px solid ${c.color}44`, borderRadius: 10, padding: "3px 8px", fontSize: 11, color: c.color, flexShrink: 0 }}>{c.vibe}</div>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 13, color: COLORS.sand, lineHeight: 1.5, fontStyle: "italic" }}>"{c.msg}"</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {c.tags.map(t => (
                      <span key={t} style={{ fontSize: 11, background: `${COLORS.dune}15`, color: COLORS.muted, borderRadius: 8, padding: "2px 8px", border: `1px solid ${COLORS.dune}22` }}>#{t}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button style={{ flex: 1, background: `linear-gradient(135deg, ${COLORS.ember}, ${COLORS.rust})`, border: "none", borderRadius: 10, padding: "10px", fontSize: 13, color: "#fff", cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: 600 }}>✨ Send Spark</button>
                    <button style={{ background: `${COLORS.dune}15`, border: `1px solid ${COLORS.dune}33`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: COLORS.muted, cursor: "pointer" }}>👁</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Post Your Plan CTA */}
            <div style={{ marginTop: 24, background: `linear-gradient(135deg, ${COLORS.ember}22, ${COLORS.gold}11)`, border: `1px solid ${COLORS.ember}44`, borderRadius: 16, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>🗺️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.sand, marginBottom: 6 }}>Post Your Travel Plan</div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14 }}>Share where you're going and find your TharMate</div>
              <button style={{ background: `linear-gradient(135deg, ${COLORS.ember}, ${COLORS.rust})`, border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 13, color: "#fff", cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: 600 }}>+ Post My Plan</button>
            </div>
          </div>
        )}

        {/* ===== PLACE PULSE ===== */}
        {activeTab === "pulse" && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.sand, lineHeight: 1.2 }}>Place<br /><span style={{ color: COLORS.ember }}>Pulse</span></div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>Real-time feed from travelers on the ground.</div>
            </div>

            {/* City selector */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 16, scrollbarWidth: "none" }}>
              {destinations.slice(1).map(d => (
                <button key={d.id} onClick={() => setActivePulseCity(d.id)} style={{ background: activePulseCity === d.id ? `${COLORS.ember}` : `${COLORS.dune}15`, border: `1px solid ${activePulseCity === d.id ? COLORS.ember : COLORS.dune + "33"}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, color: activePulseCity === d.id ? "#fff" : COLORS.sand, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Georgia, serif" }}>
                  {d.emoji} {d.label}
                </button>
              ))}
            </div>

            {/* Pulse Score Card */}
            <div style={{ background: `linear-gradient(135deg, ${COLORS.midnight}, #1F1508)`, border: `1px solid ${COLORS.dune}25`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.sand }}>🏯 Jaisalmer Today</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>🟢 43 travelers here now</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "🌤️ Weather", val: "Hot 38°C" },
                  { label: "👥 Crowd", val: "Medium" },
                  { label: "🚗 Roads", val: "Clear ✅" },
                  { label: "💰 Prices", val: "Normal" },
                ].map(s => (
                  <div key={s.label} style={{ background: `${COLORS.dune}10`, borderRadius: 10, padding: "8px 12px", fontSize: 12 }}>
                    <div style={{ color: COLORS.muted }}>{s.label}</div>
                    <div style={{ color: COLORS.sand, fontWeight: 600, marginTop: 2 }}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, color: COLORS.muted }}>Vibe Score</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 14, opacity: s <= Math.round(pulseScore) ? 1 : 0.3 }}>⭐</span>)}
                  </div>
                  <span style={{ fontSize: 13, color: COLORS.gold, fontWeight: 700 }}>{pulseScore}/5</span>
                  <button onClick={() => setPulseScore(p => Math.min(5, +(p + 0.1).toFixed(1)))} style={{ background: `${COLORS.gold}22`, border: `1px solid ${COLORS.gold}44`, borderRadius: 8, padding: "3px 8px", fontSize: 11, color: COLORS.gold, cursor: "pointer" }}>Rate</button>
                </div>
              </div>
            </div>

            {/* Live Feed */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: COLORS.muted, letterSpacing: "1px", textTransform: "uppercase" }}>Live Feed</div>
              <div style={{ fontSize: 11, color: COLORS.ember }}>🔴 Live</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pulseMessages.map((m, i) => {
                const tag = tagColors[m.tag];
                return (
                  <div key={m.id} style={{ background: `linear-gradient(135deg, ${COLORS.midnight}, #1A1008)`, border: `1px solid ${COLORS.dune}20`, borderRadius: 14, padding: 14, animation: `fadeIn 0.3s ease ${i * 0.08}s both` }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${m.color}, ${m.color}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{m.avatar}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.cream }}>{m.user}</span>
                          {m.badge === "insider" && <span style={{ fontSize: 10, background: `${COLORS.gold}22`, color: COLORS.gold, border: `1px solid ${COLORS.gold}44`, borderRadius: 8, padding: "1px 6px" }}>🏅 Insider</span>}
                          {m.badge === "local" && <span style={{ fontSize: 10, background: `${COLORS.ember}22`, color: COLORS.ember, border: `1px solid ${COLORS.ember}44`, borderRadius: 8, padding: "1px 6px" }}>📍 Local</span>}
                          <span style={{ fontSize: 10, background: tag.bg, color: tag.text, border: `1px solid ${tag.border}44`, borderRadius: 8, padding: "1px 6px", marginLeft: "auto" }}>{tag.label}</span>
                        </div>
                        <div style={{ fontSize: 13, color: COLORS.sand, lineHeight: 1.5 }}>{m.msg}</div>
                        {m.photo && <div style={{ marginTop: 8, height: 80, background: `linear-gradient(135deg, ${COLORS.dune}33, ${COLORS.ember}22)`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🌅🐪</div>}
                        <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6, display: "flex", alignItems: "center", gap: 12 }}>
                          <span>{m.time}</span>
                          <button style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 11, cursor: "pointer", padding: 0 }}>👍 Helpful</button>
                          {m.tag === "question" && <button style={{ background: "none", border: `1px solid ${COLORS.gold}44`, color: COLORS.gold, fontSize: 11, cursor: "pointer", borderRadius: 6, padding: "2px 8px" }}>Answer</button>}
                          {m.tag === "joinme" && <button style={{ background: `${COLORS.ember}22`, border: `1px solid ${COLORS.ember}44`, color: COLORS.ember, fontSize: 11, cursor: "pointer", borderRadius: 6, padding: "2px 8px" }}>Join!</button>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Post to feed */}
            <div style={{ marginTop: 16, background: `${COLORS.dune}10`, border: `1px solid ${COLORS.dune}25`, borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.sky}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>YO</div>
                <input placeholder="Share a tip, photo, or question..." style={{ flex: 1, background: `${COLORS.midnight}`, border: `1px solid ${COLORS.dune}25`, borderRadius: 10, padding: "8px 12px", fontSize: 13, color: COLORS.sand, fontFamily: "Georgia, serif", outline: "none" }} />
                <button style={{ background: `linear-gradient(135deg, ${COLORS.ember}, ${COLORS.rust})`, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#fff", cursor: "pointer" }}>Post</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== DESERT ROOMS ===== */}
        {activeTab === "room" && (
          <div style={{ paddingTop: 24 }}>
            {!openRoom ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.sand, lineHeight: 1.2 }}>Desert<br /><span style={{ color: COLORS.ember }}>Rooms</span></div>
                  <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>Private rooms that vanish like a desert sunset.</div>
                </div>

                {/* Active Room Card */}
                <div style={{ background: `linear-gradient(135deg, #2A1508, #1A0C04)`, border: `2px solid ${COLORS.ember}44`, borderRadius: 20, padding: 20, marginBottom: 20, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, background: `radial-gradient(circle, ${COLORS.ember}22, transparent 70%)` }} />
                  <div style={{ fontSize: 11, color: COLORS.ember, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>🏕️ Active Desert Room</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ display: "flex" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.ember}, ${COLORS.rust})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, border: `2px solid ${COLORS.midnight}`, zIndex: 1 }}>PS</div>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.sky}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, border: `2px solid ${COLORS.midnight}`, marginLeft: -12 }}>YO</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.cream }}>You & Priya S.</div>
                      <div style={{ fontSize: 12, color: COLORS.muted }}>📍 Jaisalmer · Mar 14–16</div>
                    </div>
                  </div>

                  {/* Timer */}
                  <div style={{ background: `${COLORS.midnight}`, borderRadius: 12, padding: "12px 16px", textAlign: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4, letterSpacing: "1px" }}>ROOM CLOSES IN</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.ember, letterSpacing: "4px", fontFamily: "monospace" }}>{formatTime(timeLeft)}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>Every desert sunset is temporary ✨</div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setOpenRoom(true)} style={{ flex: 1, background: `linear-gradient(135deg, ${COLORS.ember}, ${COLORS.rust})`, border: "none", borderRadius: 12, padding: "12px", fontSize: 13, color: "#fff", cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: 600 }}>💬 Open Chat</button>
                    <button style={{ background: `${COLORS.gold}15`, border: `1px solid ${COLORS.gold}33`, borderRadius: 12, padding: "12px 14px", fontSize: 13, color: COLORS.gold, cursor: "pointer" }}>⏰ +48h</button>
                  </div>
                </div>

                {/* Room Types */}
                <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 12, letterSpacing: "1px", textTransform: "uppercase" }}>Create a New Room</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { icon: "⚡", name: "Quick Connect", duration: "24 hours", desc: "Meet for one activity", color: COLORS.sage, price: "Free" },
                    { icon: "🏕️", name: "Desert Room", duration: "72 hours", desc: "Plan a 2–3 day trip", color: COLORS.ember, price: "Free" },
                    { icon: "🐪", name: "Caravan Room", duration: "7 days", desc: "Full Rajasthan circuit", color: COLORS.gold, price: "₹99" },
                  ].map(r => (
                    <div key={r.name} style={{ background: `linear-gradient(135deg, ${COLORS.midnight}, #1A1008)`, border: `1px solid ${COLORS.dune}20`, borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                      <div style={{ fontSize: 24 }}>{r.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.cream }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted }}>{r.desc} · {r.duration}</div>
                      </div>
                      <div style={{ background: `${r.color}22`, border: `1px solid ${r.color}44`, borderRadius: 8, padding: "4px 10px", fontSize: 12, color: r.color }}>{r.price}</div>
                    </div>
                  ))}
                </div>

                {/* Memory Capsules */}
                <div style={{ marginTop: 20, background: `linear-gradient(135deg, ${COLORS.midnight}, #1A1008)`, border: `1px solid ${COLORS.dune}20`, borderRadius: 16, padding: 16 }}>
                  <div style={{ fontSize: 13, color: COLORS.gold, marginBottom: 12 }}>✨ Memory Capsules</div>
                  {[
                    { names: "You & Arjun", place: "Udaipur", date: "Jan 2026" },
                    { names: "You & Zara", place: "Jaipur", date: "Dec 2025" },
                  ].map(m => (
                    <div key={m.names} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${COLORS.dune}15` }}>
                      <div style={{ fontSize: 20 }}>🏺</div>
                      <div>
                        <div style={{ fontSize: 13, color: COLORS.sand }}>{m.names}</div>
                        <div style={{ fontSize: 11, color: COLORS.muted }}>📍 {m.place} · {m.date}</div>
                      </div>
                      <button style={{ marginLeft: "auto", background: "none", border: `1px solid ${COLORS.dune}33`, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: COLORS.muted, cursor: "pointer" }}>Share</button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* CHAT ROOM */
              <div style={{ display: "flex", flexDirection: "column", height: "80vh" }}>
                {/* Room Header */}
                <div style={{ background: `linear-gradient(90deg, #2A1508, #1A0C04)`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => setOpenRoom(false)} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 18, cursor: "pointer", padding: 0 }}>←</button>
                    <div style={{ display: "flex" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.ember}, ${COLORS.rust})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, border: `2px solid ${COLORS.midnight}`, zIndex: 1 }}>PS</div>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.sky}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, border: `2px solid ${COLORS.midnight}`, marginLeft: -10 }}>YO</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.cream }}>Desert Room · Jaisalmer</div>
                      <div style={{ fontSize: 11, color: COLORS.ember }}>⏳ {formatTime(timeLeft)} remaining</div>
                    </div>
                    <div style={{ background: `${COLORS.sage}22`, border: `1px solid ${COLORS.sage}44`, borderRadius: 8, padding: "3px 8px", fontSize: 11, color: COLORS.sage }}>🟢 Active</div>
                  </div>

                  {/* Trip Board */}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {[
                      { icon: "📍", label: "Drop Pin" },
                      { icon: "✅", label: "Trip Board" },
                      { icon: "📅", label: "Dates" },
                      { icon: "🎯", label: "Vibe" },
                    ].map(b => (
                      <button key={b.label} style={{ flex: 1, background: `${COLORS.dune}10`, border: `1px solid ${COLORS.dune}22`, borderRadius: 8, padding: "6px 4px", fontSize: 10, color: COLORS.muted, cursor: "pointer", fontFamily: "Georgia, serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 14 }}>{b.icon}</span>
                        <span>{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 12, scrollbarWidth: "none" }}>
                  {messages.map(m => (
                    <div key={m.id} style={{ display: "flex", flexDirection: m.mine ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
                      {!m.mine && <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${m.color}, ${m.color}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{m.avatar}</div>}
                      <div style={{ maxWidth: "72%", background: m.mine ? `linear-gradient(135deg, ${COLORS.ember}, ${COLORS.rust})` : `${COLORS.midnight}`, border: m.mine ? "none" : `1px solid ${COLORS.dune}25`, borderRadius: m.mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px" }}>
                        <div style={{ fontSize: 13, color: m.mine ? "#fff" : COLORS.sand, lineHeight: 1.5 }}>{m.msg}</div>
                        <div style={{ fontSize: 10, color: m.mine ? "rgba(255,255,255,0.6)" : COLORS.muted, marginTop: 4, textAlign: m.mine ? "right" : "left" }}>{m.time}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.dune}20` }}>
                  <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder="Type a message..." style={{ flex: 1, background: COLORS.midnight, border: `1px solid ${COLORS.dune}25`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: COLORS.sand, fontFamily: "Georgia, serif", outline: "none" }} />
                  <button onClick={sendMsg} style={{ background: `linear-gradient(135deg, ${COLORS.ember}, ${COLORS.rust})`, border: "none", borderRadius: 12, padding: "10px 16px", fontSize: 16, cursor: "pointer" }}>➤</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
