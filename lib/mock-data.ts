import type { AgentId } from "./ai/types";

export const projects = [
  { id: "nivo", name: "Nivo", meta: "Identité visuelle · Packaging · Site web", progress: 80, status: "En cours", image: "https://images.unsplash.com/photo-1515586000433-45406d8e6662?auto=format&fit=crop&w=500&q=80" },
  { id: "menhirs", name: "Maison des Menhirs", meta: "Catalogue · Print · Site", progress: 60, status: "En cours", image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=500&q=80" },
  { id: "portfolio", name: "Portfolio", meta: "Site personnel · Sélection de projets", progress: 40, status: "À structurer", image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=500&q=80" },
  { id: "aflph", name: "App QR AFLPH", meta: "Application · QR Codes · Suivi", progress: 25, status: "Exploration", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=500&q=80" },
  { id: "bijoux", name: "Projet bijoux", meta: "Direction artistique · Sélection matières", progress: 35, status: "En cours", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=500&q=80" },
];

export const tasks = [
  { id: "task-1", title: "Répondre aux mails clients", time: "09:00 – 09:30", project: "Relation client", agent: "celian" as AgentId, priority: "Haute", done: true },
  { id: "task-2", title: "Finaliser le BAT Nivo", time: "09:30 – 11:00", project: "Nivo", agent: "prod" as AgentId, priority: "Haute", done: true },
  { id: "task-3", title: "Préparer maquette catalogue", time: "11:00 – 13:00", project: "Maison des Menhirs", agent: "design" as AgentId, priority: "Moyenne", done: false },
  { id: "task-4", title: "Point projet bijoux", time: "14:00 – 15:00", project: "Projet bijoux", agent: "client" as AgentId, priority: "Moyenne", done: false },
  { id: "task-5", title: "Mise à jour du portfolio", time: "15:00 – 16:30", project: "Portfolio", agent: "dev" as AgentId, priority: "Basse", done: false },
  { id: "task-6", title: "Planifier la semaine prochaine", time: "16:30 – 17:00", project: "Personnel", agent: "celian" as AgentId, priority: "Basse", done: false },
];

export const activities = [
  { id: "activity-1", agent: "client" as AgentId, text: "a analysé 3 nouveaux mails et rédigé des réponses.", age: "Il y a 12 min", color: "#db2777" },
  { id: "activity-2", agent: "design" as AgentId, text: "a préparé 2 propositions pour le catalogue Menhirs.", age: "Il y a 28 min", color: "#7c3aed", image: projects[1].image },
  { id: "activity-3", agent: "prod" as AgentId, text: "a mis à jour l’avancement du projet Nivo (80%).", age: "Il y a 1 h", color: "#f97316", image: projects[0].image },
  { id: "activity-4", agent: "celian" as AgentId, text: "a planifié votre journée et organisé les priorités.", age: "Il y a 2 h", color: "#4f46e5" },
  { id: "activity-5", agent: "bts" as AgentId, text: "a trouvé 3 inspirations pour le projet bijoux.", age: "Il y a 3 h", color: "#4f46e5", image: projects[4].image },
];
