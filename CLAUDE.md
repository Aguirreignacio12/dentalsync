# Asistente de agenda: Consultorio Dra. Laura

Demo para un consultorio dental pequeño con una asistente. La agenda vive en Google Calendar, cerca del 30% de los pacientes no llega y los tratamientos de varias sesiones se abandonan. Hoy la asistente pasa buena parte de la mañana mandando recordatorios por WhatsApp, uno por uno.

La usuaria principal es la asistente. Facturación y expediente clínico no son parte del producto.

## Alcance

Este repo es una tarea de Spec Driven Development: se construye un solo feature desde su spec, no el producto completo. Si algo no está en la spec, no se construye.

Es una demo sin backend: no hay base de datos, autenticación ni variables de entorno. Los datos salen de `components/practice/demo-data.ts` y se guardan en `localStorage`. Google Calendar y WhatsApp están simulados y ningún mensaje sale de verdad.

No agregues base de datos, servicios externos ni dependencias de producción sin que la spec lo pida.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · shadcn/ui sobre Base UI · lucide-react · sonner · pnpm.

## Comandos

```bash
pnpm install
pnpm dev                 # http://localhost:3000
pnpm build
pnpm exec tsc --noEmit   # tipos
```

No hay linter configurado.

## Tests

Todavía no hay runner de tests. El feature actual agrega Vitest para la lógica de negocio. La interfaz se verifica en el navegador.

## Estructura

```
app/                    App Router: una sola página
components/practice/    Producto: vistas, estado, tipos y datos de ejemplo
components/ui/          shadcn/ui: no editar salvo necesidad real
lib/                    Utilidades compartidas
docs/superpowers/       Specs y planes de implementación
.claude/skills/         Skills del proyecto
```

`components/practice/practice-workspace.tsx` concentra el estado y las acciones.

## Forma de trabajo

- La spec en `docs/superpowers/specs/` manda. Si el resultado no cumple un criterio de aceptación, corregí la spec antes que el prompt.
- Mantené la lógica de negocio en módulos puros, sin React ni acceso al navegador, para poder testearla.
- Antes de dar algo por terminado, corré los tipos, los tests y el build, y revisá el cambio en el navegador.
- Para cualquier cambio visual o de textos de interfaz, usá la skill `marca-consultorio`.

## Convenciones

- Código e identificadores en **inglés**; textos de interfaz en **español rioplatense**, escritos directamente en los componentes.
- Decimos "turno", nunca "cita".
- Las fechas y horas se calculan en `America/Argentina/Buenos_Aires`, con los helpers de `formatters.ts`.

## Reglas del producto

- La app nunca cancela ni mueve un turno por su cuenta: eso lo hace una persona.
- Ningún mensaje a pacientes sin autorización de WhatsApp.
- Ningún dato clínico en mensajes ni en la interfaz.
- La odontóloga decide quién necesita seguimiento: la app no infiere necesidades clínicas.
- La interfaz nunca sugiere que los mensajes o la sincronización son reales.
