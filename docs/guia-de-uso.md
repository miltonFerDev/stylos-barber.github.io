# Guía de uso — Stylo's Barber

Cómo operar cada parte de la app, en lenguaje simple. Para la documentación técnica y de arquitectura, ver [`README.md`](../README.md) y [`docs/README.md`](README.md).

---

## 1. Las tres partes

| Parte | URL | Quién la usa | Para qué |
|---|---|---|---|
| **Landing** | `/` | Público | Ver servicios, beneficios y reservar turno. |
| **Prode** | `/prode` | Público (login Google) | Torneo de predicciones del Mundial. |
| **Finanzas** | `/finanzas` | Dueño / tesorería (login email) | Registro del dinero del negocio. |

---

## 2. Finanzas (tesorería)

### 2.1 Entrar y salir

- Se entra con **email y contraseña** (los usuarios los da de alta el dueño, no hay auto-registro).
- La sesión **queda abierta** aunque cierres el navegador (dura ~30 días o hasta que toques **Salir**).
- Se puede **instalar como app** en el celular o la compu (ver §2.5).

### 2.2 Vocabulario (antes de empezar)

| Término | Qué significa en simple |
|---|---|
| **Obligación** | Algo que vas a tener que pagar (proveedor, servicio, vencimiento). |
| **Pago** | Plata que **sale** del negocio. |
| **Ingreso** | Plata que **entra** (servicios y productos vendidos). |
| **Comisión** | Lo que le debés a cada barbero por su trabajo. |
| **Transferencia** | Mover plata entre **cuentas propias** (no es ingreso ni gasto). |
| **Cierre** | Comparar cuánta plata **hay de verdad** (contada) contra la que **debería haber** (según los movimientos). |
| **Fondo** | Plata que entra o sale del dueño: **inyección** (el dueño paga algo del negocio) o **retiro** (el dueño se lleva excedente). |
| **Inversión** | Compra de algo durable (máquina, sillón, reforma). |
| **Período contable** | Un mes de operaciones. Solo se postea en períodos **abiertos**. |
| **Reversión** | Deshacer un registro ya confirmado (nunca se borra ni edita). |

### 2.3 Flujo del día (orden recomendado)

1. **Ingresos** → cargar lo que entró por servicios y productos.
2. **Comisiones** → registrar lo que ganó cada barbero hoy.
3. **Pagar** → cargar pagos y gastos del día.
4. **Cierre** → controlar que la caja coincida.
5. **Pagar comisiones** → cuando les pagues a los barberos, desde **Comisiones → Pagar**.

### 2.4 Pantalla por pantalla

#### Tablero
Resumen de un vistazo. Muestra la **disponibilidad** (total + saldo por cuenta) y las **obligaciones** (las vencidas aparecen primero, en rojo). Es de solo lectura: para cargar algo vas a la pantalla correspondiente.

#### Agenda
Los vencimientos ordenados por **fecha y prioridad**, separados en **Vencidas** (rojo) y **Próximas**. Sirve para saber qué hay que pagar y cuándo.

#### Nueva obligación
Registrá un compromiso de pago futuro. Completá **a quién**, **categoría**, **línea de resultado**, **concepto**, **monto**, **vencimiento** y **prioridad**. Queda **pendiente** y aparece en la Agenda. Cuando la pagues, usá **Pagar** en modo "aplicado a obligaciones".

#### Pagar
Dos modos:
- **Aplicado a obligaciones**: pagás una obligación que ya cargaste (te lista lo pendiente; no podés sobrepagar).
- **Egreso directo**: un gasto suelto sin obligación previa (pedís concepto, línea de resultado y monto).

Elegí **cuenta pagadora**, **fecha** y **período**. Desde **Pagos recientes** podés **Revertir** un pago mal cargado (con motivo obligatorio).

#### Ingresos
Cargá cuánto entró por **servicios** y **productos**, y **repartí el total** entre las cuentas donde entró la plata (el sistema te muestra el "restante por distribuir" hasta que cuadre). Confirmá dos veces (el botón pide confirmación). Reversible desde "Ingresos recientes".

#### Transferencias
Mové plata entre **cuentas propias** (origen distinto de destino). No es ingreso ni gasto: solo reacomoda el efectivo. Reversible.

#### Comisiones
Dos acciones:
- **Comisión del día**: cargás en lote lo que ganó cada barbero hoy (dejá en 0 a quien no trabajó).
- **Pagar**: en "Saldos pendientes", tocá **Pagar** en un barbero y repartí el pago entre cuentas.

Ambas (devengo y pago) son reversibles con motivo.

#### Cierre
Elegí una **cuenta conciliable**, el **período** y la **fecha**, y cargá el **saldo real** (lo que contaste). Si no coincide con el teórico, se crea una **diferencia**:
- **Faltante** (hay menos de lo que debería) o **Sobrante** (hay más).
- La resolvés con **Ajuste** (corrige la cuenta) o **Explicada** (solo dejás constancia del motivo).

#### Fondos
Dos modos (pestañas):
- **Inyección**: un gasto que pagó el dueño con su plata. Pedís la **línea de resultado** (el gasto) y la **naturaleza**: **cuenta corriente** (adelanta y se compensa solo), **préstamo** (monto pactado a devolver) o **aporte** (capital definitivo).
- **Retiro**: el dueño se lleva excedente de caja. Pedís de **qué cuenta** sale.

> No confundas retiro con gasto: el retiro **no** es gasto del negocio (ver "Retiro vs gasto vs sueldo" en Ayuda).

#### Inversiones
Flujo en cuatro pasos: **candidata → evaluar → aprobar → pagar**.
- Creás la candidata (concepto, monto, fecha tentativa).
- La **evaluás**, después la **aprobás** (o rechazás) con motivo, y por último la **pagás** eligiendo cuenta.
- Una inversión aprobada puede **capitalizarse** (activo que se deprecia) o **gastarse** según el monto (ver "Capitalizar vs gastar" en Ayuda). El pago es reversible.

### 2.5 Instalarla como app (PWA)

- **Android / Chrome**: abrí `/finanzas`, y en el menú del navegador tocá **Instalar app** (o "Añadir a pantalla de inicio").
- **iPhone (Safari)**: **Compartir → Añadir a pantalla de inicio**.
- Se abre a pantalla completa y queda logueada igual que en el navegador.

### 2.6 Reglas de oro (lo que más rompe los números)

1. **Nunca edites un registro confirmado**: si te equivocaste, **revertí** y volvé a cargar.
2. **Retiro ≠ gasto**: sacar plata para el dueño no es un gasto del negocio.
3. **Aporte ≠ deuda**: el capital no se "devuelve".
4. **No postees en períodos cerrados**: elegí siempre el período abierto de la fecha de la operación.
5. Si algo sale mal, mirá la **Ayuda** (menú → "Ayuda") o el mensaje de error, que te dice qué pasó.

---

## 3. Prode

> El Mundial 2026 ya terminó: `/prode` muestra los **resultados finales** (tabla general, aciertos y estadísticas). Esto vale como referencia del sistema.

### Cómo funciona

- Entrás con **Google** y completás tu perfil (nombre real, alias público, WhatsApp). El **alias se genera solo** (iniciales + día/mes de nacimiento) y **no se puede cambiar**.
- **Predecís** el resultado de cada partido (marcador a los **90 minutos**; penales no cuentan).
- Podés editar la predicción **hasta el inicio** del partido; cuando empieza, **se bloquea**.

### Puntaje

| Resultado | Puntos |
|---|---|
| Marcador exacto | **3** |
| Ganador correcto (o empate) | **1** |
| Incorrecto o sin predecir | **0** |

### Rankings y premios

- **Por fase** (Fecha 1–3, 16avos, octavos, cuartos, semis, 3er puesto y final): el 1° gana **50% de descuento** en cualquier servicio.
- **General**: acumulado de todo el torneo. El ganador se lleva la **gift card de $100.000**.
- En los rankings públicos solo se ve tu **alias**, nunca tu nombre real, email ni WhatsApp.

---

## 4. Landing (público)

- **Reservar turno**: todos los botones "Reservar" llevan a **Fresha** (agenda externa).
- **Precios de servicios** (Corte / Barba / Combo): se leen de Supabase (`site_settings`) y se actualizan **sin tocar código ni redeploy** — un admin cambia el valor en la base y se refleja solo.
- **Escuela y galería de cortes**: por ahora son "Próximamente" (con formulario de inscripción en Escuela).
