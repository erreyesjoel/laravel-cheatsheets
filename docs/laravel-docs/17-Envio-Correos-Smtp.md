# Envío de correos con SMTP y Mailables en Laravel

## 1. Configurar Gmail

Primero hay que crear una contraseña de aplicación en Google Account.

Para crearla, la cuenta debe tener activada la verificación en dos pasos.

La contraseña de aplicación debe copiarse completa y sin espacios.

Añadir estos valores al archivo `.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=[EMAIL_ADDRESS]
MAIL_PASSWORD=[PASSWORD_APPLICATION_GMAIL]
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=[EMAIL_ADDRESS]
MAIL_FROM_NAME="Kasa Sofa"
```

Después de modificar el archivo `.env`, limpiar la configuración cacheada:

```bash
php artisan config:clear
php artisan optimize
```

Con Docker:

```bash
docker compose exec app php artisan config:clear
docker compose exec app php artisan optimize
```

> Esta configuración utiliza SMTP de Gmail. No utiliza la Gmail API.

## 2. Crear un Mailable

Un `Mailable` representa un correo electrónico dentro de Laravel.

Se puede crear utilizando Artisan:

```bash
php artisan make:mail EmailVerificationCode
```

El archivo se creará en:

```text
app/Mail/EmailVerificationCode.php
```

Ejemplo:

```php
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailVerificationCode extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $code)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Kasa Sofa verification code',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.email-verification-code',
        );
    }
}
```

La propiedad pública `$code` estará disponible dentro de la vista Blade del correo.

## 3. Crear la vista Blade del correo

Crear el siguiente archivo:

```text
resources/views/emails/email-verification-code.blade.php
```

Contenido:

```blade
<p>Hello,</p>

<p>Your Kasa Sofa verification code is:</p>

<p><strong>{{ $code }}</strong></p>

<p>This code expires in 10 minutes.</p>
```

La variable `{{ $code }}` contiene el código enviado desde el Mailable.

## 4. Enviar el correo desde el controlador

Para enviar un correo se utiliza `Mail::to()`:

```php
use App\Mail\EmailVerificationCode;
use Illuminate\Support\Facades\Mail;

$code = (string) random_int(100000, 999999);

Mail::to($email)->send(
    new EmailVerificationCode($code)
);
```

En el flujo de verificación de email, el código se guarda en la base de datos utilizando un hash:

```php
EmailVerification::create([
    'email' => $email,
    'code_hash' => Hash::make($code),
    'expires_at' => now()->addMinutes(10),
]);

Mail::to($email)->send(
    new EmailVerificationCode($code)
);
```

El código original se envía por email, pero nunca se guarda directamente en la base de datos.

## 5. Probar el envío con Tinker

Abrir Tinker:

```bash
php artisan tinker
```

Con Docker:

```bash
docker compose exec app php artisan tinker
```

Ejecutar:

```php
use Illuminate\Support\Facades\Mail;

Mail::raw('Si recibes este correo, SMTP funciona.', function ($message) {
    $message->to('destinatario@example.com')
        ->subject('Prueba SMTP Kasa Sofa');
});
```

Si el envío funciona, Tinker devolverá un objeto similar a:

```text
Illuminate\Mail\SentMessage
```

## 6. Probar el Mailable

También se puede probar directamente el Mailable:

```php
use App\Mail\EmailVerificationCode;
use Illuminate\Support\Facades\Mail;

Mail::to('destinatario@example.com')->send(
    new EmailVerificationCode('123456')
);
```

El destinatario debería recibir un correo con el código `123456`.

## 7. Flujo de verificación del registro

El flujo de registro funciona de la siguiente manera:

1. El usuario introduce su nombre, email y contraseña.
2. La aplicación genera un código aleatorio de 6 dígitos.
3. La aplicación guarda el hash del código en `email_verifications`.
4. El código se envía al email del usuario.
5. El usuario introduce el código recibido.
6. La aplicación comprueba que el código sea correcto.
7. También comprueba que no haya expirado y que no se haya utilizado.
8. Si todo es correcto, se crea el usuario.
9. Se establece `email_verified_at`.
10. La verificación se marca con `used_at`.

La tabla `email_verifications` guarda:

```text
email
code_hash
expires_at
used_at
created_at
updated_at
```

## 8. Errores comunes

### Contraseña incorrecta

No se debe utilizar la contraseña normal de Gmail.

Hay que utilizar una contraseña de aplicación.

### La contraseña contiene espacios

La contraseña de aplicación debe copiarse en una sola línea y sin espacios:

```env
MAIL_PASSWORD=abcdefghijklmnop
```

### Los cambios del `.env` no se aplican

Limpiar la configuración:

```bash
php artisan config:clear
php artisan optimize
```

Con Docker:

```bash
docker compose exec app php artisan config:clear
docker compose exec app php artisan optimize
```

### Puerto o cifrado incorrectos

Para Gmail mediante SMTP se utiliza normalmente:

```env
MAIL_PORT=587
MAIL_ENCRYPTION=tls
```

### El correo llega a spam

Durante las pruebas, es posible que Gmail clasifique el mensaje como spam.

Hay que revisar también la carpeta de correo no deseado.

## 9. Resumen

Para enviar correos desde Laravel necesitamos:

1. Activar la verificación en dos pasos de Google.
2. Crear una contraseña de aplicación.
3. Configurar las variables `MAIL_*` en `.env`.
4. Crear un `Mailable`.
5. Crear la vista Blade del correo.
6. Enviar el Mailable utilizando `Mail::to()->send()`.
7. Probar el envío mediante Tinker.

Con esto, la aplicación puede enviar correos utilizando el servidor SMTP de Gmail.
