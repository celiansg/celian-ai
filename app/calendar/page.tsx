import { Icon } from "@/components/icon";
import { EmptyState } from "@/components/ui";

export default function CalendarPage() {
  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(new Date());
  return <div className="standalone-page"><div className="standalone-head"><div><div className="eyebrow">Workspace / Calendrier</div><h1>Votre journée, en un regard</h1><p>Le calendrier interne rassemble tâches, échéances et points importants.</p></div><button className="primary-button"><Icon name="plus" size={16} />Ajouter un événement</button></div><div className="calendar-page-card"><div className="calendar-page-toolbar"><button className="icon-button"><Icon name="chevronLeft" size={17} /></button><strong>{today.charAt(0).toUpperCase() + today.slice(1)}</strong><button className="icon-button"><Icon name="chevronRight" size={17} /></button><button className="secondary-button">Aujourd’hui</button></div><EmptyState icon="calendar" title="Aucun événement planifié" text="Les tâches avec échéance et les rendez-vous apparaîtront ici." /></div></div>;
}
