---
title: "Período contable"
section: "conceptos"
order: 4
description: "Por qué no se puede tocar un período cerrado."
---

El sistema organiza las operaciones en **períodos contables** (por lo general, un mes). Cada período tiene un estado:

| Estado | Qué permite |
|---|---|
| **Abierto** | Se pueden registrar pagos, cierres, retiros, etc. |
| **En revisión** | Solo lectura: se está controlando antes de cerrar. |
| **Cerrado** | No se puede postear nada nuevo ni modificar. |

## Por qué importa

Una vez que un período se **cierra**, los números quedan **firmes**: si necesitás corregir algo, no se edita, se **revierte** (ver "Reversión vs edición").

Al registrar cualquier operación, elegí el **período abierto** correcto (el de la fecha de la operación).

## ⚠️ Errores comunes

- Cargar una operación en el período equivocado (ej. un pago de noviembre en el período de octubre).
- Intentar postear en un período cerrado: el sistema lo rechaza, y está bien.
- Dejar operaciones sueltas sin asignar a un período abierto.
