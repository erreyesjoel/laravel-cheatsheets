# 🐳 Cheatsheet · Dockerizar Laravel 13 + Nginx (PHP 8.4)

> Primera fase de la dockerización de **Kasa Sofá**.
>
> Objetivo: ejecutar **Laravel 13** completamente dentro de Docker utilizando **PHP 8.4-FPM** y **Nginx**, con una arquitectura prácticamente igual a producción.

---

# Objetivo

Pasar de esto:

```text
Ubuntu
├── PHP
├── Composer
└── Laravel
```

A esto:

```text
Ubuntu
├── Docker
├── Git
└── VS Code

Docker Compose
├── app
│   ├── PHP 8.4
│   ├── Composer
│   └── Laravel 13
│
└── nginx
    └── Servidor Web
```

**Idea principal:**

- Ubuntu únicamente edita archivos.
- Docker ejecuta toda la aplicación.
- Nginx recibe las peticiones HTTP.
- PHP-FPM ejecuta Laravel.

---

# Arquitectura

```text
Navegador
     │
     ▼
localhost:8086
     │
     ▼
┌───────────┐
│   Nginx   │
│ Puerto 80 │
└─────┬─────┘
      │ FastCGI
      ▼
┌───────────────┐
│ Laravel 13    │
│ PHP 8.4-FPM   │
│ Composer      │
└───────────────┘
```

---

# Estructura del proyecto

```text
kasa-sofa/
├── docker/
│   ├── nginx/
│   │   └── default.conf
│   │
│   └── php/
│       ├── Dockerfile
│       └── entrypoint.sh
│
├── src/                  # Laravel 13
├── docker-compose.yml
└── README.md
```

---

# Paso 1 · Dockerfile

Ruta:

```text
docker/php/Dockerfile
```

```dockerfile
FROM php:8.4-fpm

# =====================================================
# DEPENDENCIAS DEL SISTEMA
# =====================================================

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    zip \
    curl \
    libzip-dev \
    libicu-dev \
    libonig-dev \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        intl \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# =====================================================
# COMPOSER
# =====================================================

# Copiamos Composer desde la imagen oficial
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Carpeta donde vivirá Laravel dentro del contenedor
WORKDIR /var/www

# =====================================================
# ENTRYPOINT
# =====================================================

# Script que se ejecutará cada vez que arranque el contenedor
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint.sh

# Permisos de ejecución
RUN chmod +x /usr/local/bin/entrypoint.sh

# Preparación del entorno
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Proceso principal del contenedor
CMD ["php-fpm"]
```

---

# ¿Qué hace cada parte?

## FROM php:8.4-fpm

Utiliza la imagen oficial de PHP preparada para trabajar con **PHP-FPM**.

¿Por qué FPM?

- No incluye Apache.
- Está diseñada para comunicarse con Nginx.
- Es la arquitectura más habitual en Laravel moderno.

---

## docker-php-ext-install

Instala las extensiones que Laravel necesita.

| Extensión | Función |
|-----------|----------|
| pdo_mysql | Conexión con MySQL |
| mbstring | Texto UTF-8 |
| intl | Internacionalización |
| zip | Compresión ZIP |

---

## Composer

```dockerfile
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
```

No instalamos Composer manualmente.

Simplemente lo copiamos desde la imagen oficial.

Resultado:

```bash
composer --version
```

funciona dentro del contenedor.

---

## WORKDIR

```dockerfile
WORKDIR /var/www
```

Equivale a:

```bash
cd /var/www
```

Todos los comandos (`artisan`, `composer`, etc.) parten desde esa carpeta.

---

# Paso 2 · ENTRYPOINT

Ruta:

```text
docker/php/entrypoint.sh
```

```bash
#!/bin/sh
set -e

# Permisos necesarios para Laravel
chown -R www-data:www-data \
    /var/www/storage \
    /var/www/bootstrap/cache \
    /var/www/database

chmod -R 775 \
    /var/www/storage \
    /var/www/bootstrap/cache \
    /var/www/database

# Ejecuta el proceso principal (php-fpm)
exec "$@"
```

---

## ¿Por qué usamos ENTRYPOINT?

Cuando montamos la carpeta `src` como volumen:

```yaml
volumes:
  - ./src:/var/www
```

Los permisos del ordenador sustituyen a los de la imagen Docker.

Por eso un simple:

```dockerfile
RUN chown ...
```

**no sirve**.

Necesitamos ejecutar los permisos **cada vez que arranca el contenedor**.

---

## ENTRYPOINT vs CMD

| ENTRYPOINT | CMD |
|------------|-----|
| Se ejecuta siempre | Proceso principal |
| Corrige permisos | Inicia PHP-FPM |
| Prepara el entorno | Mantiene el contenedor vivo |

Orden real de ejecución:

```text
ENTRYPOINT
      │
      ▼
Permisos Laravel
      │
      ▼
CMD
      │
      ▼
PHP-FPM
```

---

# Paso 3 · docker-compose.yml

Ruta:

```text
docker-compose.yml
```

```yaml
services:

  # =====================================================
  # SERVICIO PRINCIPAL · LARAVEL 13
  # =====================================================
  app:

    # Construcción de la imagen personalizada
    build:

      # Contexto de compilación.
      # "." = raíz del proyecto
      context: .

      # Ruta del Dockerfile
      dockerfile: docker/php/Dockerfile

    # Nombre fijo del contenedor
    container_name: kasa_sofa_app

    # Directorio de trabajo
    working_dir: /var/www

    # Sincronización entre el PC y Docker
    volumes:

      # Carpeta local        Carpeta del contenedor
      - ./src:/var/www


  # =====================================================
  # SERVIDOR WEB · NGINX
  # =====================================================
  nginx:

    # Imagen oficial de Nginx
    image: nginx:stable-alpine

    # Nombre del contenedor
    container_name: kasa_sofa_nginx

    # Puerto del PC : Puerto del contenedor
    ports:
      - "8086:80"

    volumes:

      # Comparte el proyecto Laravel
      - ./src:/var/www

      # Configuración personalizada
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf

    # Primero debe arrancar Laravel
    depends_on:
      - app
```

---

# Entendiendo docker-compose

## services

Cada servicio representa **un contenedor independiente**.

Actualmente tenemos dos:

```yaml
services:
  app:
  nginx:
```

Más adelante añadiremos:

- mysql
- node

---

## build

Construye una imagen personalizada.

```text
Dockerfile
      │
      ▼
Imagen Docker
      │
      ▼
Contenedor
```

**Dockerfile** = receta

**Imagen** = resultado

**Contenedor** = instancia ejecutándose.

---

## context

```yaml
context: .
```

El punto significa:

> La raíz del proyecto es el contexto de compilación.

Docker puede acceder a:

- src/
- docker/
- README.md

Si el contexto fuese `./docker`, no podría copiar el proyecto Laravel.

---

## dockerfile

```yaml
dockerfile: docker/php/Dockerfile
```

Le indica a Docker dónde está exactamente la receta.

Mantenemos toda la infraestructura agrupada dentro de `docker/`.

---

## working_dir

```yaml
working_dir: /var/www
```

Cuando entramos al contenedor:

```bash
docker compose exec app bash
```

ya estaremos aquí:

```text
/var/www
```

---

## volumes

```yaml
volumes:
  - ./src:/var/www
```

Sincroniza los archivos entre Ubuntu y Docker.

```text
PC                    Docker

./src  ─────────▶  /var/www
```

Si editas un Blade:

```text
src/resources/views/home.blade.php
```

aparece instantáneamente dentro del contenedor.

No hay que copiar archivos.

---

## ports

```yaml
ports:
  - "8086:80"
```

Significa:

| PC | Contenedor |
|-----|------------|
| 8086 | 80 |

Cuando abrimos:

```text
http://localhost:8086
```

Docker redirige la petición al puerto **80** de Nginx.

Elegimos **8086** porque el puerto **80** ya estaba ocupado por Apache.

---

## depends_on

```yaml
depends_on:
  - app
```

Ordena el arranque:

1. Laravel
2. Nginx

No crea la conexión de red; Docker Compose ya crea una red interna automáticamente.

---

# Paso 4 · Configuración de Nginx

Ruta:

```text
docker/nginx/default.conf
```

```nginx
server {

    # Puerto HTTP donde Nginx escuchará las peticiones
    listen 80;

    # Dominio del servidor (desarrollo)
    server_name localhost;

    # Carpeta pública de Laravel
    root /var/www/public;

    # Archivo inicial
    index index.php index.html;


    # =====================================================
    # RUTAS DE LARAVEL
    # =====================================================
    location / {

        # Si el archivo existe, lo sirve.
        # Si no existe, Laravel gestionará la ruta.
        try_files $uri $uri/ /index.php?$query_string;
    }


    # =====================================================
    # ARCHIVOS PHP
    # =====================================================
    location ~ \.php$ {

        # Contenedor Laravel (PHP-FPM)
        fastcgi_pass app:9000;

        fastcgi_index index.php;

        include fastcgi_params;

        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }


    # =====================================================
    # SEGURIDAD
    # =====================================================
    location ~ /\.(?!well-known).* {

        # Bloquea archivos ocultos
        deny all;
    }
}
```

---

# ¿Qué hace `try_files`?

Es la línea más importante de Nginx.

```nginx
try_files $uri $uri/ /index.php?$query_string;
```

Ejemplos:

| URL | ¿Existe? | Resultado |
|------|----------|-----------|
| /css/app.css | ✅ | Nginx sirve el archivo |
| /catalogo | ❌ | Laravel responde |
| /contacto | ❌ | Laravel responde |

Gracias a esto funcionan todas las rutas de Laravel.

---

# Paso 5 · Construir y levantar

Reconstruimos la imagen:

```bash
docker compose up --build -d
```

Comprobar contenedores:

```bash
docker compose ps
```

Entrar al contenedor:

```bash
docker compose exec app bash
```

---

# Verificaciones

## PHP

```bash
php -v
```

Debe mostrar:

```text
PHP 8.4.x
```

---

## Composer

```bash
composer --version
```

Debe mostrar Composer 2.x.

---

## Laravel

```bash
php artisan --version
```

Debe mostrar Laravel 13.x.

---

# ¿Qué hemos conseguido?

- [x] Laravel 13 dockerizado
- [x] PHP 8.4 dentro de Docker
- [x] Composer dentro de Docker
- [x] Nginx como servidor web
- [x] Permisos automáticos mediante ENTRYPOINT
- [x] Acceso desde `http://localhost:8086`
- [ ] MySQL 8.4
- [ ] Node + TypeScript
- [ ] Vite dockerizado

---

# Estado actual del proyecto

```text
Ubuntu
├── Docker
├── Git
└── VS Code

Docker Compose
│
├── app
│   ├── PHP 8.4
│   ├── Composer
│   ├── Laravel 13
│   └── PHP-FPM
│
└── nginx
    ├── Puerto 80
    └── Servidor Web

Navegador
      │
      ▼
http://localhost:8086
```

**Resultado:** Laravel ya funciona con una arquitectura muy similar a producción, donde Nginx actúa como servidor web y PHP-FPM ejecuta la aplicación.


## Paso 6 · Añadir MySQL 8.4 (LTS)

Hasta ahora Laravel funcionaba con PHP y Nginx, pero seguía utilizando SQLite.

En esta fase añadimos **MySQL 8.4 LTS** como un nuevo servicio de Docker Compose y conectamos Laravel mediante PDO.

---

## Nueva arquitectura

```text
Navegador
      │
      ▼
localhost:8086
      │
      ▼
Nginx
      │
      ▼
Laravel 13 (PHP-FPM)
      │
      ▼
MySQL 8.4
```

Ahora cada componente tiene una responsabilidad:

| Servicio | Función |
|----------|---------|
| app | Laravel + PHP 8.4 |
| nginx | Servidor web |
| db | Base de datos MySQL |

---

# Paso 6.1 · Servicio MySQL

Archivo:

`docker-compose.yml`

Añadimos un tercer servicio llamado **db**.

```yaml
services:

  # =====================================================
  # SERVICIO PRINCIPAL · LARAVEL 13 + PHP 8.4
  # =====================================================
  app:
    build:
      context: .
      dockerfile: docker/php/Dockerfile

    container_name: kasa_sofa_app
    working_dir: /var/www

    volumes:
      - ./src:/var/www


  # =====================================================
  # SERVIDOR WEB · NGINX
  # =====================================================
  nginx:
    image: nginx:stable-alpine

    container_name: kasa_sofa_nginx

    ports:
      - "8086:80"

    volumes:
      - ./src:/var/www
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf

    depends_on:
      - app


  # =====================================================
  # BASE DE DATOS · MYSQL 8.4 LTS
  # =====================================================
  db:

    # Imagen oficial de MySQL 8.4
    image: mysql:8.4

    # Nombre del contenedor
    container_name: kasa_sofa_mysql

    # Reinicio automático
    restart: unless-stopped

    # Credenciales de DESARROLLO
    environment:
      MYSQL_DATABASE: kasa_sofa
      MYSQL_USER: developer
      MYSQL_PASSWORD: ChangeMe123
      MYSQL_ROOT_PASSWORD: RootChangeMe456

    # Persistencia de datos
    volumes:
      - mysql_data:/var/lib/mysql

    # Puerto del PC : Puerto del contenedor
    ports:
      - "3311:3306"

    # Puerto interno visible para Docker
    expose:
      - "3306"


# =====================================================
# VOLÚMENES PERSISTENTES
# =====================================================
volumes:
  mysql_data:
```

---

# ¿Qué hace cada parte?

## image

```yaml
image: mysql:8.4
```

Descarga la imagen oficial de MySQL 8.4 LTS.

No necesitamos crear un Dockerfile propio para MySQL.

---

## environment

```yaml
environment:
  MYSQL_DATABASE: kasa_sofa
  MYSQL_USER: developer
  MYSQL_PASSWORD: ChangeMe123
  MYSQL_ROOT_PASSWORD: RootChangeMe456
```

Cuando el contenedor arranca por primera vez, MySQL crea automáticamente:

- La base de datos `kasa_sofa`
- El usuario `developer`
- Su contraseña
- El usuario administrador `root`

> Estas credenciales son únicamente de ejemplo para desarrollo.

---

## volumes

```yaml
volumes:
  - mysql_data:/var/lib/mysql
```

Aquí MySQL guarda físicamente todos los datos.

Sin volumen:

```text
Eliminar contenedor
        │
        ▼
❌ Base de datos perdida
```

Con volumen:

```text
Eliminar contenedor
        │
        ▼
Volumen Docker
        │
        ▼
✅ Datos conservados
```

Aunque reconstruyas el contenedor, la información seguirá existiendo.

---

## ports

```yaml
ports:
  - "3311:3306"
```

Significa:

| Equipo | Puerto |
|---------|--------|
| Ubuntu | 3311 |
| MySQL | 3306 |

**3311** solo sirve para conectarte desde tu ordenador (DBeaver, TablePlus o terminal).

Laravel **NO utiliza ese puerto**.

---

## expose

```yaml
expose:
  - "3306"
```

Hace visible el puerto **3306** únicamente para otros contenedores de la misma red Docker.

Por eso Laravel puede conectarse utilizando el nombre del servicio `db`.

---

# Paso 6.2 · Configurar Laravel

Archivo:

`src/.env`

Sustituimos SQLite por MySQL.

```env
# =====================================================
# BASE DE DATOS · MYSQL
# =====================================================

DB_CONNECTION=mysql

# Nombre del servicio Docker
DB_HOST=db

# Puerto interno del contenedor MySQL
DB_PORT=3306

DB_DATABASE=kasa_sofa
DB_USERNAME=developer
DB_PASSWORD=ChangeMe123
```

## ¿Por qué DB_HOST=db?

Porque Docker Compose crea un DNS interno automáticamente.

En lugar de escribir:

```env
DB_HOST=localhost
```

Laravel utilizará:

```text
app ─────────▶ db
```

`db` es simplemente el nombre del servicio definido en `docker-compose.yml`.

---

# Paso 6.3 · Levantar los servicios

Reconstruimos todo:

```bash
docker compose up --build -d
```

Comprobamos los contenedores:

```bash
docker compose ps
```

Resultado esperado:

```text
NAME                 STATUS

kasa_sofa_app        Up
kasa_sofa_nginx      Up
kasa_sofa_mysql      Up
```

---

# Paso 6.4 · Ejecutar migraciones

Entramos directamente desde Docker:

```bash
docker compose exec app php artisan migrate
```

Laravel creará automáticamente las tablas iniciales:

```text
create_users_table
create_cache_table
create_jobs_table
```

Si aparecen como **DONE**, significa que Laravel ya está escribiendo en MySQL.

---

# Verificación completa

## Optimizar Laravel

```bash
docker compose exec app php artisan optimize
```

Debe generar correctamente:

- Config cache
- Events
- Routes
- Views

---

## Ejecutar migraciones

```bash
docker compose exec app php artisan migrate
```

Debe finalizar sin errores.

---

# ¿Por qué ya no usamos SQLite?

SQLite era útil para arrancar Laravel rápidamente, pero una tienda necesita una base de datos real.

MySQL nos permitirá almacenar:

- Productos
- Catálogos
- Pedidos
- Clientes
- Usuarios administradores
- Métodos de pago

Además, será exactamente la misma tecnología que utilizaremos en producción.

---

# Estado actual del proyecto

- [x] Laravel 13
- [x] PHP 8.4 FPM
- [x] Composer
- [x] Nginx
- [x] ENTRYPOINT y permisos automáticos
- [x] MySQL 8.4 LTS
- [ ] Node 22
- [ ] TypeScript
- [ ] Vite
- [ ] Panel de administración
```

---

# Paso 7 · Dockerizar Node 22 + Vite + TypeScript + SCSS

Hasta ahora el backend ya estaba completamente dockerizado:

- Laravel 13
- PHP 8.4 FPM
- Nginx
- MySQL 8.4

Faltaba el **frontend**. En esta fase añadimos un cuarto servicio: **Node 22**, encargado exclusivamente de Vite, TypeScript y SCSS.

> Node **no ejecuta Laravel**. Su única responsabilidad es compilar y servir los assets del frontend.

---

# Nueva arquitectura

```text
Navegador
      │
      ▼
localhost:8086
      │
      ▼
Nginx
      │
      ▼
Laravel 13 (PHP-FPM)
      │
      ├──────────────► MySQL 8.4
      │
      └──────────────► Vite (Node 22)
                         │
                         ├── TypeScript
                         └── SCSS
```

Cada contenedor tiene una única responsabilidad.

| Servicio | Función |
|----------|---------|
| app | Laravel + PHP + Composer |
| nginx | Servidor web |
| db | MySQL |
| node | Vite + npm + TypeScript + SCSS |

---

# Paso 7.1 · Estructura del proyecto

Añadimos una nueva carpeta dentro de `docker/`.

```text
kasa-sofa/
├── docker/
│   ├── nginx/
│   ├── php/
│   └── node/
│       ├── Dockerfile
│       └── entrypoint.sh
│
├── src/
├── docker-compose.yml
└── README.md
```

---

# Paso 7.2 · Dockerfile de Node

Ruta:

`docker/node/Dockerfile`

```dockerfile
FROM node:22-alpine

# =====================================================
# CARPETA DEL PROYECTO
# =====================================================

WORKDIR /var/www

# =====================================================
# ENTRYPOINT
# =====================================================

COPY docker/node/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# =====================================================
# PROCESO PRINCIPAL
# =====================================================

CMD ["npm", "run", "dev", "--", "--host"]
```

## ¿Qué hace?

### FROM node:22-alpine

Utilizamos la imagen oficial de **Node 22 LTS** en su versión Alpine.

Ventajas:

- Muy ligera.
- Ideal para desarrollo.
- Incluye `npm` y `npx`.

---

### WORKDIR

```dockerfile
WORKDIR /var/www
```

Node trabajará exactamente sobre la misma carpeta que Laravel.

Esto significa que `package.json`, `resources/` y `vite.config.ts` son compartidos entre ambos contenedores.

---

### ENTRYPOINT

Antes de arrancar Vite ejecutaremos un pequeño script.

Su objetivo es preparar automáticamente el entorno.

---

### CMD

```dockerfile
CMD ["npm", "run", "dev", "--", "--host"]
```

Arranca Vite escuchando en todas las interfaces.

Gracias al parámetro `--host`, Vite es accesible desde Docker mediante el puerto **5173**.

---

# Paso 7.3 · entrypoint.sh

Ruta:

`docker/node/entrypoint.sh`

```sh
#!/bin/sh
set -e

# =====================================================
# INSTALAR DEPENDENCIAS
# =====================================================

# Si node_modules no existe, instala automáticamente
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias de Node..."
    npm install
fi

# Ejecuta el proceso principal (Vite)
exec "$@"
```

## ¿Por qué usamos ENTRYPOINT?

Igual que en PHP, queremos automatizar la preparación del entorno.

Cuando el contenedor arranca:

```text
Node inicia
      │
      ▼
¿Existe node_modules?
      │
 ┌────┴────┐
 │         │
No        Sí
 │         │
 ▼         ▼
npm install
      │
      ▼
Arrancar Vite
```

De esta forma nunca tenemos que ejecutar `npm install` manualmente la primera vez.

---

# Paso 7.4 · Añadir el servicio Node

Archivo:

`docker-compose.yml`

Añadimos un cuarto servicio.

```yaml
  # =====================================================
  # FRONTEND · NODE 22 + VITE
  # =====================================================
  node:

    # Construcción de la imagen personalizada
    build:
      context: .
      dockerfile: docker/node/Dockerfile

    # Nombre del contenedor
    container_name: kasa_sofa_node

    # Carpeta del proyecto
    working_dir: /var/www

    # Compartimos Laravel completo
    volumes:
      - ./src:/var/www

    # Puerto de desarrollo de Vite
    ports:
      - "5173:5173"

    # Arranca después de Laravel
    depends_on:
      - app
```

---

# ¿Qué hace cada parte?

## build

Construye nuestra propia imagen de Node utilizando el Dockerfile.

No usamos directamente `node:22-alpine`, sino una imagen personalizada con nuestro ENTRYPOINT.

---

## volumes

```yaml
volumes:
  - ./src:/var/www
```

El mismo código es compartido por:

- Laravel
- Node

Así, cuando modificamos un `.scss` o un `.ts`, Vite detecta inmediatamente el cambio.

---

## ports

```yaml
ports:
  - "5173:5173"
```

| Equipo | Puerto |
|---------|--------|
| Ubuntu | 5173 |
| Vite | 5173 |

En desarrollo tendremos dos servidores:

| Servicio | URL |
|----------|-----|
| Laravel | http://localhost:8086 |
| Vite | http://localhost:5173 |

Laravel carga automáticamente los assets desde Vite.

---

# Paso 7.5 · Instalar TypeScript y SCSS

Laravel ya incluye Vite, pero queríamos trabajar con **TypeScript** y **SCSS** en lugar de JavaScript y CSS.

Instalamos las dependencias desde el contenedor Node.

```bash
docker compose exec node npm install -D typescript sass @types/node
```

## ¿Por qué no lo ponemos en el Dockerfile?

Porque modifica el propio proyecto:

- `package.json`
- `package-lock.json`

Esas dependencias deben quedar versionadas en Git.

El Dockerfile construye el entorno; el proyecto define sus propias dependencias.

---

# Paso 7.6 · Crear tsconfig.json

Generamos la configuración una única vez.

```bash
docker compose exec node npx tsc --init
```

Se crea:

```text
src/
├── tsconfig.json
├── package.json
└── package-lock.json
```

> `tsconfig.json` forma parte del proyecto y debe subirse al repositorio.

---

# Paso 7.7 · Migrar Vite a TypeScript

Laravel crea inicialmente:

```text
vite.config.js
```

Como el proyecto utilizará TypeScript, lo renombramos:

```bash
mv src/vite.config.js src/vite.config.ts
```

Contenido final:

```ts
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/scss/app.scss',
                'resources/ts/app.ts',
            ],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
    ],

    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
```

## ¿Qué hemos cambiado?

Antes:

```text
resources/css/app.css
resources/js/app.js
```

Ahora:

```text
resources/scss/app.scss
resources/ts/app.ts
```

Toda la configuración queda completamente tipada.

---

# Paso 7.8 · Estructura del frontend

```text
src/
├── resources/
│   ├── scss/
│   │   └── app.scss
│   │
│   └── ts/
│       └── app.ts
│
├── tsconfig.json
├── vite.config.ts
├── package.json
└── package-lock.json
```

---

# Levantar todo el proyecto

```bash
docker compose up --build -d
```

Comprobar servicios:

```bash
docker compose ps
```

Resultado esperado:

```text
kasa_sofa_app
kasa_sofa_nginx
kasa_sofa_mysql
kasa_sofa_node
```

---

# Comandos oficiales del proyecto

## Laravel

```bash
docker compose exec app php artisan migrate

docker compose exec app php artisan optimize

docker compose exec app composer install
```

## Node

```bash
docker compose exec node npm install

docker compose exec node npm run dev -- --host

docker compose exec node npx tsc --init
```

---

# Estado final de la dockerización

- [x] Laravel 13
- [x] PHP 8.4 FPM
- [x] Composer
- [x] Nginx
- [x] MySQL 8.4 LTS
- [x] Node 22
- [x] npm
- [x] Vite
- [x] TypeScript
- [x] SCSS

## Arquitectura final

```text
Ubuntu
├── Docker
├── Git
└── VS Code

Docker Compose
│
├── app
│   ├── Laravel 13
│   ├── PHP 8.4
│   └── Composer
│
├── nginx
│   └── Servidor Web
│
├── db
│   └── MySQL 8.4
│
└── node
    ├── Node 22
    ├── Vite
    ├── TypeScript
    └── SCSS

Navegador
│
├── http://localhost:8086   → Laravel
└── http://localhost:5173   → Vite (desarrollo)
```

**Resultado:** Todo el entorno de desarrollo queda completamente dockerizado. Ubuntu únicamente edita el código; PHP, Composer, MySQL, Node, Vite y TypeScript viven dentro de sus respectivos contenedores.
