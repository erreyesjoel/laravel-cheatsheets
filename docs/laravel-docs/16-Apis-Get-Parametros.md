# Parametros GET
- Api get con parametros
- Ejemplo con tareas del usuario
- No será la url pasando el id de la tarea, porque eso seria inseguro en este caso, pq cualquiera podría acceder a cualquier tarea de cualquier usuario
- El usuario se autentica, y mediante el token, obtenemos el user_id, y devolvemos solo sus tareas

1. TaskController.php
- Buscamos el usuario autenticado desde el token
- Obtener solo sus tareas
- user_id es el id del usuario autenticado
```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\User;

class TaskController extends Controller
{
    public function tareasUsuario(Request $request)
    {
        // Usuario autenticado desde el token
        $user = $request->user();

        // Obtener solo sus tareas
        $tareas = Task::where('user_id', $user->id)->get();

        return response()->json($tareas);
    }
}
```
2. api.php
- Creamos la ruta, y le añadimos el middleware jwtcookieauth, que es el nuestro de autenticacion
- Es decir, solo los usuarios autenticados podran acceder a esta ruta
```php
Route::get('/tasks', [TaskController::class, 'tareasUsuario'])->middleware('jwtcookieauth');
```
**Este endpoint devuelve únicamente las tareas del usuario autenticado, evitando accesos indebidos a tareas de otros usuarios**

# NOTA
- Si accedemos a una api get que usa el middleware jwtcookieauth, y no estamos autenticados, nos devolverá un error 401
- Devolvera -> Token no encontrado
- Que es lo que tenemos en el middleware JwtCookieAuth.php
```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;

class JwtCookieAuth
{
    public function handle(Request $request, Closure $next)
    {
        try {
            // Leer token desde cookie
            $token = $request->cookie('access_token');

            if (!$token) {
                return response()->json(['error' => 'Token no encontrado'], 401);
            }

            // Validar token y autenticar usuario
            JWTAuth::setToken($token)->authenticate();

        } catch (\Exception $e) {
            return response()->json(['error' => 'No autenticado'], 401);
        }

        return $next($request);
    }
}
```
