import { Icon } from "./icon";

const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getCalendarDates() {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  return weekDays.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { label: String(date.getDate()), selected: date.toDateString() === today.toDateString() };
  });
}

export function RightRail() {
  const today = new Date();
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(today);
  const dates = getCalendarDates();

  return <aside className="right-rail">
    <section className="rail-section overview-section">
      <div className="rail-heading"><div><span className="rail-heading-icon pink"><Icon name="barChart" size={17} /></span><h2>Vue d’ensemble</h2></div><button className="rail-select">Aujourd’hui <Icon name="chevronDown" size={14} /></button></div>
      <div className="stats-grid">
        <div className="stat-card stat-blue"><Icon name="mail" size={19} /><strong>0</strong><span>mails à traiter</span></div>
        <div className="stat-card stat-pink"><Icon name="clock" size={19} /><strong>0</strong><span>actions en attente</span></div>
        <div className="stat-card stat-rose"><Icon name="calendar" size={19} /><strong>0</strong><span>échéances</span></div>
        <div className="stat-card stat-green"><Icon name="checkCircle" size={19} /><strong>0</strong><span>tâches du jour</span></div>
      </div>
    </section>

    <section className="rail-section calendar-section">
      <div className="rail-heading"><div><span className="rail-heading-icon violet"><Icon name="calendar" size={17} /></span><h2>Mon calendrier</h2></div><button className="text-action">Voir tout <Icon name="arrowRight" size={15} /></button></div>
      <div className="calendar-month"><button className="icon-button"><Icon name="chevronLeft" size={15} /></button><strong>{monthLabel}</strong><button className="icon-button"><Icon name="chevronRight" size={15} /></button></div>
      <div className="week-row">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="date-row">{dates.map((date) => <span className={date.selected ? "selected" : ""} key={date.label}>{date.label}</span>)}</div>
      <div className="rail-empty"><Icon name="calendar" size={18} /><span>Aucun événement planifié</span></div>
    </section>

    <section className="rail-section activity-section">
      <div className="rail-heading"><div><span className="rail-heading-icon green"><Icon name="activity" size={17} /></span><h2>Activité récente</h2></div><button className="text-action">Voir tout <Icon name="arrowRight" size={15} /></button></div>
      <div className="rail-empty"><Icon name="activity" size={18} /><span>Aucune activité récente</span></div>
    </section>
  </aside>;
}
