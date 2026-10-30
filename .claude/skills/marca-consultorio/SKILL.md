---
name: marca-consultorio
description: Use when creating or changing any screen, component, color, badge, toast, empty state, or interface copy of the Asistente de agenda for the Consultorio Dra. Laura.
---

# Marca del consultorio

## Principio

El Asistente de agenda se siente como una colega ordenada: calmo, claro y operativo. La asistente tiene que entender en segundos qué hacer y sentir que la agenda está bajo control.

**Nombres:** "Asistente de agenda" es el producto; "Consultorio Dra. Laura" es el contexto.

## Colores

Todo color nuevo sale de un token de `app/globals.css`. El código existente todavía tiene hexadecimales heredados: al tomarlo como referencia, usá el reemplazo.

| Heredado | Reemplazo |
|---|---|
| `#f2f4ef`, `#fafaf8`, `#f8f8f5` | `bg-muted` o `bg-secondary` |
| `#59655c`, `#61786c`, `#806e4d` | `text-muted-foreground` |
| `#f0f6f2`, `#dfe9e3`, `#294d40` | `bg-accent`, `border-border`, `text-accent-foreground` |
| Avisos crema (`#fbf8f0`) | `status-warning` |

## Estados

Cada significado tiene un solo tono. Usá las clases `status-badge status-*`. Los badges de estado viven en `status-badges.tsx`: si creás uno nuevo, agregalo ahí.

| Tono | Significa | Ejemplos |
|---|---|---|
| `success` | Resuelto bien | Confirmado, Asistió, Entregado |
| `pending` | Esperando al paciente, sin acción de la asistente | Sin confirmar |
| `warning` | Una persona tiene que intervenir ahora | Sin autorización, No respondió, Turno muy cercano, Cancelación solicitada, Para revisar |
| `violet` | Pedido de cambio | Reprogramación solicitada |
| `danger` | Algo falló o se perdió | No entregado, No asistió |
| `info` | En curso | Enviado, En agenda |
| `neutral` | Sin dato o terminado | Sin enviar, Cancelado, Cerrado |

Si un caso nuevo no encaja, elegí por lo que significa para la asistente, no por lo urgente que parece. El rojo queda para fallas reales: un pedido del paciente nunca es `danger`.

Esta tabla manda sobre el código existente. En particular, "Esperando respuesta" figura como `violet` en `FollowUpBadge`: no lo tomes como ejemplo.

## Forma

- **Panel:** `Card` con `rounded-[22px] border-border/80 bg-card shadow-[0_2px_12px_rgba(25,45,39,0.025)]`.
- **Tarjeta suelta en una lista:** igual, con `rounded-[20px]`.
- **Filas dentro de un panel:** `ul` con `divide-y divide-border/70`, sin tarjeta propia.
- **Estado vacío dentro de un panel:** `Empty` con `min-h-48 border-0`.
- **Contador:** `rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground`.
- **Título de panel:** `text-[17px] font-semibold tracking-tight`.
- **Horas y teléfonos:** `tabular-nums`.
- **Íconos:** lucide, con `aria-hidden="true"` si acompañan texto.
- **Base:** reutilizá `components/ui/`, `PatientAvatar` y `Empty`.

No uses tarjetas dentro de tarjetas, gradientes, emojis ni ilustraciones dentales.

## Voz

Español rioplatense, de vos, con frases cortas y verbos concretos.

- **Palabras:** "turno", "paciente", "asistente". Nunca "cita" ni "usuario".
- **Títulos:** dicen la tarea. Escribí "Hay que llamar", no "Pacientes para llamar".
- **Motivos:** usan los textos exactos de la spec vigente cuando existen.
- **Estado vacío:** dice que no hay nada pendiente, con calma. "No hay nadie para llamar".
- **Toast de éxito:** el título nombra lo que pasó. "Contacto registrado". Sumá `description` solo si agrega contexto, como el nombre del paciente.
- **Toast de error:** el título dice qué no ocurrió y `description`, qué hacer. "No se pudo guardar el contacto" y "Probá de nuevo."
- **Simulación:** si algo simula un mensaje o una sincronización, el texto lo dice. Las acciones de la asistente son reales dentro de la demo y no llevan aclaración.
- **Autorización:** decí "Sin autorización", no "Sin permiso".
- **Tono:** sin lenguaje clínico, alarmista ni técnico.

## Accesibilidad

- Contraste AA.
- Foco visible.
- Ninguna información comunicada solo por color.
- Objetivos táctiles de al menos 36 px.
- Sin scroll horizontal en 375 px.

## Antes de terminar

1. Buscá `#` en lo que escribiste: no debe haber colores hexadecimales.
2. Cada badge tiene el tono de la tabla.
3. Los textos pasan la sección Voz.
