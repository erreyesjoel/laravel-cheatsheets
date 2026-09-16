import { api } from "../api";

// metodo para obtener las tareas del usuario autenticado
export const tasksService = {
    getTasks: async () => {
        return await api.get("/tasks", {
            credentials: "include"
        });
    },
};