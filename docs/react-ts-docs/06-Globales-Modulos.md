# Globales
1. En _main.scss importamos los ficheros como globales, variables, mixins, etc
```scss
@use 'global';
```
- En el archivo de global podemos definir el body por ejemplo, para que la aplicacion tenga un color de fondo predeterminado
```scss
body {
    background: linear-gradient(68.66deg, #e8e2ff 1.3%, #debcbc 50%);
    font-family: 'Inter', sans-serif;
    color: #222;
}
```
2. Importamos _main.scss en main.tsx
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './styles/_main.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```
**Los @use dependen de la ubicacion del archivo .scss**

# Diferencia: Global (Header.scss) vs Módulo (Header.module.scss)

Es crucial entender cuándo usar uno u otro para evitar conflictos de estilos.

## 1. Global (`Header.scss`)
Si creas un archivo `.scss` normal (sin `.module`) e lo importas (`import './Header.scss'`), todas las clases se vuelven **globales**.

- **Comportamiento:**  
  Si defines `.boton` en `Header.scss` y también `.boton` en `Footer.scss`, ambos chocarán. El último que se cargue sobrescribirá al primero.
- **Cuándo usarlo:**  
  - Para estilos base (`body`, `h1`).
  - Para reescribir estilos de librerías externas que esperan clases globales.
  - **NO** recomendado para componentes individuales.

## 2. Módulo (`Header.module.scss`)
Si usas `.module.scss`, React (Vite/Webpack) renombra las clases automáticamente para hacerlas únicas.

- **Comportamiento:**  
  Una clase `.boton` en `Header.module.scss` se compila a algo como `Header_boton__xyz123`.
  Puedes tener `.boton` en `Header` y `.boton` en `Footer` y **serán estilos completamente diferentes**.
- **Cuándo usarlo:**  
  - **SIEMPRE** para componentes de React (Auth, Header, Sidebar, etc.) para encapsular sus estilos.


# Modulos
- Un modulo como Auth.module.scss, no se importa en _main.scss
- Porque mezclar estilos globales y locales puede causar problemas de sobrecarga, encapsulamiento y mantenimiento
- Es decir, Auth.module.scss solo se importa en el archivo donde se usa, como Auth.tsx
**Ejemplo con src/pages/Auth**
- Auth.tsx
- Auth.module.scss
**Auth.tsx**
```tsx
import styles from './Auth.module.scss'

const Auth = () => {
    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <h1>Iniciar sesion</h1>
                <form>
                    <div>
                        <label>Email</label>
                        <input type="email" id="email" placeholder="correo@ejemplo.com" />
                    </div>
                    <div>
                        <label>Contraseña</label>
                        <input type="password" id="password" placeholder="********" />
                    </div>
                    <button type="submit">Entrar</button>
                </form>
            </div>
        </div>
    )
}

export default Auth
```
**Auth.module.scss**
```scss
.authContainer {
    display: flex;
    justify-content: center;
    align-items: center;
}

.auth-Card {
    width: 100%;
    max-width: 400px;
    padding: 2rem;
}
```
- styles.claseEstilo, styles porque en el import ponemos

**import styles from './Auth.module.scss'**

## ¿Por qué usamos `authContainer` en vez de `auth-container`?

Cuando importamos un módulo SCSS en React:

```tsx
import styles from './Auth.module.scss'
```
El archivo SCSS se convierte internamente en un objeto de JavaScript.
Ese objeto contiene cada clase como una propiedad, por ejemplo:
```js
styles.authContainer
styles.authCard
```
En JavaScript, las propiedades no pueden llevar guiones, porque esto
```tsx
styles.auth-container
```
sería interpretado como:

- styles.auth → propiedad
- container → operación matemática inválida
Por eso, en módulos SCSS usamos camelCase:
```scss
.authContainer { ... }
.authCard { ... }
```
Y React puede acceder sin problemas:
```tsx
<div className={styles.authContainer}>
```
¿Y si quiero usar guiones igualmente?
Puedes, pero tendrías que acceder así:
```tsx
<div className={styles["auth-container"]}>
```
Funciona, pero:

- no tiene autocompletado
- es menos legible
- no es estándar en React

Por eso camelCase es la convención recomendada para módulos SCSS.

En resumen:  
Usamos `authContainer` porque los módulos SCSS se convierten en un objeto JS, y las propiedades de un objeto no pueden tener guiones. CamelCase es la forma correcta y profesional de nombrar clases en módulos SCSS.

# Resumen: ¿Cuándo usar Global vs Módulo?

La principal razón es mantener el código organizado y **evitar conflictos de nombres** (que una clase CSS rompa el diseño de otro componente por error).

## 1. Cuándo usar `Modules` (`*.module.scss`)
Úsalo **SIEMPRE** para componentes específicos (ej. `Auth`, `Header`, `Button`).

- **Evita colisiones:** Al usar módulos, React transforma tus clases a nombres únicos (ej: `.card` se convierte en `Auth_card__Xy2z`). Esto permite que puedas tener una clase `.card` en el Login y otra `.card` totalmente distinta en el Dashboard sin que se peleen.
- **Encapsulamiento:** El estilo "muere" en ese componente. Si borras `Auth.tsx`, puedes borrar `Auth.module.scss` con la seguridad de que no romperás nada más en la web.
- **Mantenimiento:** Sabes exactamente dónde está el estilo de ese botón específico.

## 2. Cuándo usar `Main` o Globales (`_main.scss`, `global.scss`)
Úsalo **SOLO** para lo que afecta a toda la aplicación por igual.

- **Variables y Mixins:** Definir colores (`$primary-color`), tamaños de fuente o variables que usarás en todos lados.
- **Resets y Base:** Quitar los márgenes por defecto del navegador, definir la fuente tipográfica (`font-family`) en el `body`, o el color de fondo general.
- **Librerías externas:** A veces necesitas sobrescribir estilos de una librería (como Bootstrap o Material UI) que requieren clases globales.
