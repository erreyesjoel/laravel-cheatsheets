import { useEffect, useState } from "react";
import { tasksService } from "../../api/services/tasks.service";
import styles from "./Tasks.module.scss";

interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: 'low' | 'medium' | 'high';
    due_date: string;
}

const Tasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const tasksFetch = async () => {
            try {
                const data = await tasksService.getTasks();
                // Asumiendo que la API devuelve { data: Task[] } o Task[]
                setTasks(Array.isArray(data) ? data : data.data || []);
            } catch (error) {
                console.error("Error fetching tasks:", error);
            } finally {
                setLoading(false);
            }
        }
        tasksFetch();
    }, []);

    if (loading) {
        return <div className={styles.loading}>Cargando tus tareas...</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Mis Tareas</h1>
                <button className={styles.addButton}>+ Nueva Tarea</button>
            </header>

            {tasks.length === 0 ? (
                <div className={styles.emptyState}>
                    <h2>No tienes tareas pendientes</h2>
                    <p>¡Empieza creando una nueva tarea para organizarte!</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {tasks.map((task) => (
                        <article key={task.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3>{task.title}</h3>
                                <span className={`${styles.priority} ${styles[task.priority]}`}>
                                    {task.priority}
                                </span>
                            </div>

                            <p className={styles.description}>{task.description}</p>

                            <div className={styles.cardFooter}>
                                <span className={styles.dueDate}>
                                    📅 {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha'}
                                </span>
                                <span className={styles.status}>
                                    {task.status}
                                </span>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Tasks;