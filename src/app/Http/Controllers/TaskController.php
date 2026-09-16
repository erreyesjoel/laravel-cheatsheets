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
