
# 🐳 Cheatsheet · Dockerizar Laravel 13 (PHP 8.4)

> Primera fase de la dockerización: Laravel 13 + PHP 8.4.
> En este punto **todavía no usamos Nginx ni MySQL**; únicamente dejamos
> Laravel funcionando dentro de un contenedor Docker.

---

# Objetivo

Pasar de esto:

Ubuntu
├── PHP
├── Composer
└── Laravel

A esto:

Ubuntu
├── Docker
├── Git
└── VS Code

Docker
└── app
    ├── PHP 8.4
    ├── Composer
    └── Laravel 13

El sistema operativo únicamente edita archivos.
Docker es quien ejecuta Laravel.

---

# Estructura del proyecto

kasa-sofa/
├── docker/
│   ├── nginx/
│   └── php/
│       └── Dockerfile
│
├── src/                  # Laravel 13
├── docker-compose.yml
└── README.md

---

# Paso 1 · Dockerfile

Ruta:

docker/php/Dockerfile

```dockerfile
FROM php:8.4-fpm

# Dependencias necesarias para Laravel
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

# Instalar Composer desde la imagen oficial
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Carpeta donde vivirá Laravel dentro del contenedor
WORKDIR /var/www
```

## ¿Qué hace cada línea?

### FROM php:8.4-fpm

Utiliza la imagen oficial de PHP 8.4 preparada para trabajar con **PHP-FPM**.

- No incluye Apache.
- Está pensada para usarse junto a Nginx.
- Será exactamente la misma base que utilizaremos en producción.

### docker-php-ext-install

Instala las extensiones que Laravel necesita:

| Extensión | Función |
|-----------|---------|
| pdo_mysql | Conexión con MySQL |
| mbstring | Cadenas UTF-8 |
| intl | Internacionalización |
| zip | Archivos ZIP |

### Composer

```dockerfile
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
```

En lugar de instalar Composer manualmente, lo copiamos desde la imagen oficial.

Resultado:

```bash
composer --version
```

funcionará dentro del contenedor.

### WORKDIR

```dockerfile
WORKDIR /var/www
```

Equivale a hacer:

```bash
cd /var/www
```

Todos los comandos (`php artisan`, `composer`, etc.) se ejecutarán desde esa carpeta.

---

# Paso 2 · docker-compose.yml

Ubicación:

docker-compose.yml

```yaml
services:

  # Servicio principal de Laravel
  app:

    # Construcción de la imagen personalizada
    build:

      # Raíz del proyecto
      context: .

      # Dockerfile utilizado para construir la imagen
      dockerfile: docker/php/Dockerfile

    # Nombre del contenedor
    container_name: kasa_sofa_app

    # Directorio de trabajo
    working_dir: /var/www

    # Sincronización entre el PC y Docker
    volumes:
      - ./src:/var/www
```

---

# Entendiendo docker-compose

## services

Cada servicio es un contenedor independiente.

Actualmente solo existe uno:

```yaml
services:
  app:
```

Más adelante añadiremos:

- nginx
- mysql
- node

---

## build

Construye una imagen personalizada utilizando el Dockerfile.

Dockerfile
↓
Imagen Docker
↓
Contenedor

**Dockerfile** = receta

**Imagen** = resultado

**Contenedor** = instancia en ejecución

---

## context

```yaml
context: .
```

El punto (`.`) significa:

> La raíz del proyecto es el contexto de compilación.

Docker puede acceder a:

- src/
- docker/
- README.md

Si el contexto fuera `./docker`, no podría ver la carpeta `src`.

---

## dockerfile

```yaml
dockerfile: docker/php/Dockerfile
```

Le indica a Docker dónde está la receta.

Evitamos tener el Dockerfile en la raíz y mantenemos toda la infraestructura agrupada en la carpeta `docker/`.

---

## working_dir

```yaml
working_dir: /var/www
```

Cuando entres al contenedor ya estarás aquí:

```text
/var/www
```

Por eso puedes ejecutar directamente:

```bash
php artisan migrate
composer install
```

---

## volumes

```yaml
volumes:
  - ./src:/var/www
```

Es la sincronización entre el ordenador y Docker.

PC                         Docker

./src  ───────────────▶  /var/www

Si modificas un archivo en VS Code:

```text
src/resources/views/home.blade.php
```

aparece instantáneamente dentro del contenedor en:

```text
/var/www/resources/views/home.blade.php
```

No hay que copiar archivos manualmente.

---

# Paso 3 · Construir la imagen

Desde la raíz del proyecto:

```bash
docker compose build
```

Este comando:

1. Lee el Dockerfile.
2. Instala PHP 8.4.
3. Instala Composer.
4. Instala las extensiones.
5. Crea la imagen `kasa-sofa-app`.

---

# Paso 4 · Entrar al contenedor

```bash
docker compose run --rm app bash
```

Explicación:

| Opción | Significado |
|---------|------------|
| run | Crea un contenedor temporal |
| --rm | Lo elimina al salir |
| app | Servicio definido en compose |
| bash | Abre una terminal |

---

# Verificaciones

Dentro del contenedor:

```bash
php -v
```

Debe mostrar:

```text
PHP 8.4.x
```

---

```bash
composer --version
```

Debe mostrar Composer 2.x.

---

```bash
php artisan --version
```

Debe mostrar Laravel 13.x.

---

# ¿Qué hemos conseguido?

✔ Laravel ya no depende del PHP del sistema operativo.

✔ Composer vive dentro de Docker.

✔ El código sigue estando en `src/`, editable desde VS Code.

✔ El entorno es reproducible en cualquier ordenador con Docker.

---

# Próxima fase

- [x] Dockerizar Laravel
- [ ] Añadir Nginx
- [ ] Añadir MySQL
- [ ] Añadir Node + TypeScript
- [ ] Acceder mediante http://localhost