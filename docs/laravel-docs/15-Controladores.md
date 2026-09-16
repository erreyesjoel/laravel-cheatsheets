# Controladores
- Son aquellas que controlan la logica de la aplicacion
- Comando para crear uno
```bash
php artisan make:controller TaskController
```
- Podremos definir metodos, importar modulos, modelos, etc...
- Con resource
- Esto creara un controlador con todos los metodos
1. index
2. create
3. store
4. show
5. edit
6. update
7. destroy
```bash
php artisan make:controller TaskController --resource
```
