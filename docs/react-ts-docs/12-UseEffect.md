# useEffect y Funciones Asíncronas (Async/Await)

Un error muy común al consumir APIs en React es intentar hacer el `useEffect` asíncrono directamente.

## ❌ La forma incorrecta

**Nunca** pongas `async` directamente en la función del `useEffect`.

```tsx
// ❌ ESTO DARÁ ERROR o Warnings
useEffect(async () => {
    const data = await UserService.getUser();
}, []);
```

### ¿Por qué está mal?
`useEffect` espera que retornes **nada** (void) o una **función de limpieza** (cleanup function).
Si le pones `async`, automáticamente retorna una **Promesa**, lo cual confunde a React y puede causar bugs o memory leaks.

---

## ✅ La forma correcta

Debes crear una función `async` **dentro** del efecto y llamarla inmediatamente.

```tsx
useEffect(() => {
    // 1. Definimos la función async interna
    const fetchUser = async () => {
        try {
            // Esperamos la promesa con await para tener el dato real
            const user = await UserService.getUser();
            console.log(user); 
        } catch (error) {
            console.error(error);
        }
    };

    // 2. La ejecutamos inmediatamente
    fetchUser();
}, []);
```

## Entendiendo la Promesa vs el Dato

Cuando llamas a una función async (como `UserService.getUser()`), esta retorna inmediatamente una **Promesa**.

*   **Sin `await`:**
    ```ts
    const user = UserService.getUser();
    console.log(user); 
    // Consola: Promise { <pending> } -> "Vale por un usuario futuro"
    ```

*   **Con `await`:**
    ```ts
    const user = await UserService.getUser();
    console.log(user);
    // Consola: { id: 1, email: "..." } -> "El usuario real ya descargado"
    ```
# Ejemplo mas completo
```tsx
import { useEffect } from "react";
import { tasksService } from "../../api/services/tasks.service";

const Tasks = () => {
    useEffect(() => {
        const tasksFetch = async () => {
            try {
                const tasks = await tasksService.getTasks();
                console.log("Tareas usuario", tasks);
            } catch (error) {
                console.log(error);
            }
        }
        tasksFetch();
    }, []);

    return (
        <h1>Tareas usuario</h1>
    );
}

export default Tasks
```