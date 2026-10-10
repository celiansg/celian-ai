import { EmptyState } from "@/components/ui";

export default function TasksPage() {
  return <div className="standalone-page"><div className="standalone-head"><div><div className="eyebrow">Workspace / Tâches</div><h1>Les tâches qui font avancer les projets</h1><p>Une vue simple sur ce qui est à faire maintenant, bientôt ou déjà terminé.</p></div></div><section className="full-task-list"><EmptyState icon="checkCircle" title="Aucune tâche pour le moment" text="Créez une tâche pour commencer à structurer votre journée." /></section></div>;
}
