import { EmptyState } from "@/components/ui";
import { Icon } from "@/components/icon";

export default function TasksPage() {
  return <div className="standalone-page"><div className="standalone-head"><div><div className="eyebrow">Workspace / Tâches</div><h1>Les tâches qui font avancer les projets</h1><p>Une vue simple sur ce qui est à faire maintenant, bientôt ou déjà terminé.</p></div><button className="primary-button"><Icon name="plus" size={16} />Nouvelle tâche</button></div><div className="task-view-tabs"><button className="active">Aujourd’hui <span>0</span></button><button>À venir <span>0</span></button><button>Terminées <span>0</span></button></div><section className="full-task-list"><EmptyState icon="checkCircle" title="Aucune tâche pour le moment" text="Créez une tâche pour commencer à structurer votre journée." /></section></div>;
}
