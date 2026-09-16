import { api } from "../api";

// metodo para obtener el usuario autenticado
export const UserService = {
    getUser: async () => {
        return await api.get("/user", {
            credentials: "include",
        });
    },
};
