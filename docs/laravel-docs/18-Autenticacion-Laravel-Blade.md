# Autenticación con Laravel Blade y sesiones

## 1. Introducción

Laravel incluye un sistema de autenticación basado en sesiones para aplicaciones web tradicionales.

En una aplicación Laravel con Blade no es necesario utilizar Sanctum para gestionar el login y el logout si toda la aplicación pertenece al mismo proyecto Laravel.

El flujo utiliza:

- El guard `web`.
- Sesiones de Laravel.
- Cookies de sesión.
- Directivas Blade como `@auth` y `@guest`.
- Protección CSRF.
- El modelo `User`.

## 2. El guard `web`

Laravel utiliza un guard para determinar cómo se autentican los usuarios.

En `config/auth.php` normalmente encontramos:

```php
'defaults' => [
    'guard' => 'web',
    'passwords' => 'users',
],
```

El guard `web` utiliza sesiones:

```php
'guards' => [
    'web' => [
        'driver' => 'session',
        'provider' => 'users',
    ],
],
```

El provider indica de dónde se obtienen los usuarios:

```php
'providers' => [
    'users' => [
        'driver' => 'eloquent',
        'model' => App\Models\User::class,
    ],
],
```

Esto significa que Laravel buscará los usuarios utilizando el modelo:

```php
App\Models\User
```

## 3. Cómo funciona la sesión

Cuando hacemos login:

```php
Auth::login($user);
```

Laravel realiza lo siguiente:

1. Guarda el identificador del usuario en la sesión.
2. Envía una cookie de sesión al navegador.
3. El navegador envía esa cookie automáticamente en las siguientes peticiones.
4. Laravel recupera la sesión y sabe qué usuario está autenticado.

La cookie normalmente se llama:

```text
laravel_session
```

La cookie no contiene directamente los datos completos del usuario. Contiene un identificador que permite recuperar la sesión almacenada por Laravel.

## 4. Cookie HttpOnly

Laravel configura la cookie de sesión como `HttpOnly`:

```php
'http_only' => true,
```

Esta configuración se encuentra en:

```text
config/session.php
```

Una cookie `HttpOnly` no puede ser leída desde JavaScript:

```js
document.cookie
```

Esto ayuda a proteger la sesión frente a ataques XSS.

El navegador sigue enviando automáticamente la cookie al servidor, pero el código JavaScript de la página no puede leerla directamente.

## 5. Inicio de sesión

El formulario de login debe incluir protección CSRF:

```blade
<form action="{{ route('auth.login') }}" method="POST">
    @csrf

    <label for="login-email">Email</label>
    <input
        id="login-email"
        name="email"
        type="email"
        autocomplete="email"
        required
    >

    <label for="login-password">Contraseña</label>
    <input
        id="login-password"
        name="password"
        type="password"
        autocomplete="current-password"
        required
    >

    <button type="submit">Iniciar sesión</button>
</form>
```

La ruta puede definirse en `routes/web.php`:

```php
use App\Http\Controllers\AuthController;

Route::post('/auth/login', [
    AuthController::class,
    'login',
])->name('auth.login');
```

El controlador puede utilizar `Auth::attempt()`:

```php
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

public function login(Request $request): JsonResponse
{
    $validated = $request->validate([
        'email' => ['required', 'email', 'max:255'],
        'password' => ['required', 'string'],
    ]);

    $credentials = [
        'email' => strtolower(trim($validated['email'])),
        'password' => $validated['password'],
    ];

    if (!Auth::attempt($credentials)) {
        return response()->json([
            'message' => 'El email o la contraseña son incorrectos.',
        ], 422);
    }

    if (!Auth::user()->email_verified_at) {
        Auth::logout();

        return response()->json([
            'message' => 'Debes verificar tu email antes de iniciar sesión.',
        ], 422);
    }

    $request->session()->regenerate();

    return response()->json([
        'message' => 'Has iniciado sesión correctamente.',
    ]);
}
```

`Auth::attempt()` comprueba el email y verifica la contraseña utilizando el hash almacenado en la base de datos.

La contraseña nunca se compara directamente con texto plano en la base de datos.

## 6. Regenerar la sesión después del login

Después de iniciar sesión se recomienda regenerar la sesión:

```php
$request->session()->regenerate();
```

Esto ayuda a evitar ataques de fijación de sesión.

El flujo recomendado es:

```php
if (Auth::attempt($credentials)) {
    $request->session()->regenerate();
}
```

## 7. Registro con verificación por email

El flujo de registro puede dividirse en varios pasos:

1. El usuario introduce su nombre y email.
2. Laravel genera un código aleatorio de 6 dígitos.
3. Se guarda el hash del código en `email_verifications`.
4. Se envía el código por email.
5. El usuario introduce el código.
6. Laravel comprueba que el código sea válido y no haya expirado.
7. Si el código es correcto, aparecen los campos de contraseña.
8. El usuario introduce y confirma su contraseña.
9. Se crea el usuario.
10. Se establece `email_verified_at`.
11. Se inicia sesión automáticamente.
12. La página se recarga.

El modelo `User` contiene el campo:

```php
'email_verified_at' => 'datetime',
```

Este campo indica si el email del usuario ha sido verificado.

## 8. Tabla de verificaciones

La tabla `email_verifications` puede contener:

```text
id
email
code_hash
expires_at
used_at
created_at
updated_at
```

El código nunca se guarda directamente. Se guarda utilizando un hash:

```php
use Illuminate\Support\Facades\Hash;

$code = (string) random_int(100000, 999999);

EmailVerification::create([
    'email' => $email,
    'code_hash' => Hash::make($code),
    'expires_at' => now()->addMinutes(10),
]);
```

Para comprobar el código:

```php
Hash::check($code, $verification->code_hash);
```

También se debe comprobar que:

```php
$verification->used_at === null
```

y que el código no haya expirado:

```php
$verification->expires_at->isFuture()
```

Cuando el registro finaliza correctamente:

```php
$verification->update([
    'used_at' => now(),
]);
```

## 9. Inicio de sesión automático después del registro

Después de crear el usuario y verificar el email:

```php
$user = User::create([
    'name' => $validated['name'],
    'email' => $email,
    'password' => $validated['password'],
]);

$user->forceFill([
    'email_verified_at' => now(),
])->save();

Auth::login($user);

$request->session()->regenerate();
```

Después de esta operación, Laravel considera que el usuario ya está autenticado.

El frontend puede recargar la página:

```typescript
window.location.reload();
```

De esta forma, Blade volverá a renderizar el header teniendo en cuenta la nueva sesión.

## 10. Mostrar contenido según el estado de autenticación

Blade incluye las directivas `@auth` y `@guest`.

Para usuarios autenticados:

```blade
@auth
    <p>Hola, {{ auth()->user()->name }}</p>
@endauth
```

Para usuarios no autenticados:

```blade
@guest
    <button type="button" data-auth-open="login">
        Iniciar sesión
    </button>
@endguest
```

Un header completo puede ser:

```blade
<div class="header-action">
    @auth
        <span class="header-user">
            {{ auth()->user()->name ?: auth()->user()->email }}
        </span>

        <form action="{{ route('auth.logout') }}" method="POST">
            @csrf

            <button type="submit">
                Cerrar sesión
            </button>
        </form>
    @else
        <button type="button" data-auth-open="login">
            Iniciar sesión
        </button>
    @endauth
</div>
```

Cuando el usuario está autenticado:

- Se muestra su nombre o email.
- Desaparece el botón `Iniciar sesión`.
- Aparece el botón `Cerrar sesión`.

Cuando no está autenticado:

- Se muestra el botón `Iniciar sesión`.
- No se muestra la información del usuario.
- No se muestra el botón `Cerrar sesión`.

## 11. Logout

La ruta del logout debe utilizar el método `POST`:

```php
Route::post('/auth/logout', [
    AuthController::class,
    'logout',
])->name('auth.logout');
```

El controlador puede cerrar la sesión así:

```php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

public function logout(Request $request)
{
    Auth::logout();

    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return redirect()->back();
}
```

El proceso realiza tres operaciones importantes:

### Cerrar la autenticación

```php
Auth::logout();
```

El usuario deja de estar autenticado.

### Invalidar la sesión

```php
$request->session()->invalidate();
```

La sesión anterior deja de ser válida en el servidor.

### Regenerar el token CSRF

```php
$request->session()->regenerateToken();
```

Se genera un nuevo token para proteger los formularios posteriores.

## 12. ¿Hay que eliminar manualmente la cookie?

Normalmente no.

El logout correcto es:

```php
Auth::logout();

$request->session()->invalidate();
$request->session()->regenerateToken();
```

Aunque después del logout todavía aparezca una cookie llamada:

```text
laravel_session
```

eso no significa que el usuario continúe autenticado.

Laravel puede crear una nueva sesión anónima para mantener funcionalidades como:

- Protección CSRF.
- Mensajes flash.
- Carrito de compra.
- Preferencias temporales.

La comprobación importante es:

```php
auth()->check();
```

Después de cerrar sesión debe devolver:

```php
false
```

También se puede comprobar el usuario actual:

```php
auth()->user();
```

Después del logout debe devolver:

```php
null
```

No es necesario utilizar `Cookie::forget()` manualmente para cerrar la autenticación.

La cookie no contiene por sí sola la autenticación. La autenticación se invalida en el servidor cuando se invalida la sesión.

## 13. Duración de la sesión

Laravel permite configurar la duración de la sesión desde `.env`.

Por ejemplo:

```env
SESSION_LIFETIME=120
SESSION_EXPIRE_ON_CLOSE=false
```

`SESSION_LIFETIME` se expresa en minutos.

Ejemplos:

```env
# 2 horas
SESSION_LIFETIME=120

# 1 día
SESSION_LIFETIME=1440

# 1 semana
SESSION_LIFETIME=10080
```

La duración se calcula normalmente desde la última actividad del usuario.

También se puede configurar que la sesión finalice al cerrar el navegador:

```env
SESSION_EXPIRE_ON_CLOSE=true
```

O permitir que permanezca hasta que expire:

```env
SESSION_EXPIRE_ON_CLOSE=false
```

La configuración se encuentra en:

```php
// config/session.php

'lifetime' => env('SESSION_LIFETIME', 120),

'expire_on_close' => env(
    'SESSION_EXPIRE_ON_CLOSE',
    false
),
```

Después de cambiar `.env`, limpiar la configuración:

```bash
php artisan config:clear
php artisan optimize
```

Con Docker:

```bash
docker compose exec app php artisan config:clear
docker compose exec app php artisan optimize
```

## 14. Configuración recomendada

Para una tienda online se puede utilizar:

```env
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_EXPIRE_ON_CLOSE=false
SESSION_ENCRYPT=false
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
```

La configuración `SESSION_HTTP_ONLY=true` evita que JavaScript pueda leer la cookie de sesión.

La configuración `SESSION_SAME_SITE=lax` ayuda a controlar cuándo el navegador envía la cookie en peticiones externas.

## 15. Protección CSRF

Todos los formularios Blade que utilicen `POST`, `PUT`, `PATCH` o `DELETE` deben incluir:

```blade
@csrf
```

Ejemplo:

```blade
<form action="{{ route('auth.logout') }}" method="POST">
    @csrf

    <button type="submit">
        Cerrar sesión
    </button>
</form>
```

Si se utiliza `fetch`, el token CSRF puede enviarse dentro de `FormData`:

```typescript
const data = new FormData(form);

const response = await fetch(form.action, {
    method: 'POST',
    body: data,
    headers: {
        Accept: 'application/json',
    },
});
```

El token generado por `@csrf` se incluirá automáticamente dentro del formulario.

## 16. Diferencia entre Blade y Sanctum

Para esta aplicación, Blade utiliza:

```text
Guard web
Driver session
Cookie laravel_session
```

No es necesario Sanctum porque:

- El frontend y el backend pertenecen a la misma aplicación.
- Laravel renderiza las vistas Blade.
- La autenticación utiliza sesiones tradicionales.
- El navegador envía automáticamente la cookie de sesión.

Sanctum sería más apropiado para:

- APIs.
- Aplicaciones móviles.
- SPAs separadas.
- Frontends alojados en otro proyecto.
- Autenticación mediante tokens.
- Aplicaciones con varios clientes diferentes.

Para una aplicación Blade tradicional, el guard `web` suele ser suficiente.

## 17. Resumen del flujo completo

### Registro

```text
Usuario introduce nombre y email
        ↓
Laravel genera código
        ↓
Se guarda el hash
        ↓
Se envía el código por email
        ↓
Usuario introduce el código
        ↓
Laravel valida el código
        ↓
Aparecen contraseña y confirmación
        ↓
Se crea el usuario
        ↓
Se marca email_verified_at
        ↓
Auth::login($user)
        ↓
Se regenera la sesión
        ↓
Se recarga la página
```

### Login

```text
Usuario introduce email y contraseña
        ↓
Auth::attempt()
        ↓
Se comprueban las credenciales
        ↓
Se comprueba que el email esté verificado
        ↓
Se regenera la sesión
        ↓
El usuario queda autenticado
        ↓
Se recarga la página
```

### Logout

```text
Usuario pulsa Cerrar sesión
        ↓
Auth::logout()
        ↓
Se invalida la sesión
        ↓
Se regenera el token CSRF
        ↓
El usuario deja de estar autenticado
        ↓
Blade muestra de nuevo Iniciar sesión
```

## 18. Comprobación rápida

Para comprobar si hay un usuario autenticado:

```php
auth()->check();
```

Para obtener el usuario actual:

```php
auth()->user();
```

Para comprobarlo en Blade:

```blade
@auth
    Usuario autenticado
@endauth

@guest
    Usuario no autenticado
@endguest
```

Después de hacer logout:

```php
auth()->check(); // false
auth()->user();  // null
```

Con este sistema, Laravel gestiona automáticamente la sesión, la cookie, el guard, el login, el logout y la representación condicional en las vistas Blade.
