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
