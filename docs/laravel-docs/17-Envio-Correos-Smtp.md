# Envio de correos con smtp (gmail)

1. Primero tener creada la contraseña de aplicacion en google accounts, y verificar que la cuenta tenga activada la verificacion en dos pasos.

2. Despues, al tener creada la contraseña de aplicacion, modificiar el .env con los siguientes datos:
- La password de aplicacion, todo junto, sin espacios

```.env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=[EMAIL_ADDRESS]
MAIL_PASSWORD=[PASSWORD_APPLICATION_GMAIL]
MAIL_FROM_ADDRESS=[EMAIL_ADDRESS]
MAIL_FROM_NAME="Kasa Sofa"
MAIL_ENCRYPTION=tls
```
**Ya podriamos probar con tinker**
```bash
php artisan tinker
Psy Shell v0.12.24 (PHP 8.4.25 — cli) by Justin Hileman
New PHP manual is available (latest: 3.1.3). Update with `doc --update-manual`
> use Illuminate\Support\Facades\Mail;

Mail::raw('Si recibes este correo, SMTP funciona.', function ($message) {
    $message->to('erreyesjoel.gms@gmail.com')
            ->subject('Prueba SMTP Kasa Sofa');
});

= Illuminate\Mail\SentMessage {#7541}

> use Illuminate\Support\Facades\Mail;
```
## ESO ES TODO POR ESO MOMENTO, PARA AUNQUE SEA, PODER ENVIAR CORREOS CON LA API DE GMAIL