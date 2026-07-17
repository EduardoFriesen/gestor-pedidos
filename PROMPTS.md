# Prompts Útiles — Superpowers + OpenCode

Guía de referencia para sacarle el máximo provecho a los skills de Superpowers al construir sistemas robustos y estéticamente agradables.

---

## FASE 1: IDEACIÓN Y DISEÑO

### Explorar qué construir antes de escribir código

```
"Hagamos un sistema de [X]. Quiero que antes de implementar exploremos
juntos qué necesito, cómo debería funcionar y cómo debería verse."
```
**Skills activos:** brainstorming → frontend-design
**Cuándo:** Al inicio de cualquier feature nueva, módulo nuevo o proyecto nuevo.
**Por qué:** Evita construir la cosa equivocada. Obliga a definir requisitos antes del código.

---

### Definir la identidad visual de la app

```
"Diseñame la paleta de colores, tipografía y estilo visual para una app
de [dominio]. Que sea moderna, accesible y no parezca genérica de AI."
```
**Skills activos:** frontend-design → impeccable
**Cuándo:** Cuando arrancás un proyecto nuevo o rediseñás una app existente.
**Por qué:** Establece una dirección visual coherente desde el principio.

---

## FASE 2: PLANIFICACIÓN

### Descomponer un feature complejo en pasos

```
"Necesito implementar [feature]. Haceme un plan detallado con pasos
chicos que pueda ir verificando."
```
**Skills activos:** writing-plans
**Cuándo:** Cuando el feature tiene 3+ pasos o toca múltiples archivos.
**Por qué:** Divide trabajo complejo en chunks manejables con checkpoints.

---

### Ejecutar un plan con revisión

```
"Tenemos este plan escrito. Ejecutalo paso a paso y verifiquemos
cada bloque antes de seguir."
```
**Skills activos:** executing-plans
**Cuándo:** Cuando ya tenés un plan escrito y lo querés实施ar con control de calidad.
**Por qué:** Cada paso se verifica antes de pasar al siguiente.

---

## FASE 3: IMPLEMENTACIÓN

### Construir con TDD

```
"Implementá [feature] usando TDD. Escribí los tests primero,
después la implementación."
```
**Skills activos:** test-driven-development
**Cuándo:** Siempre que implementes lógica de negocio, cálculos, o datos.
**Por qué:** Asegura que el código haga lo que se espera. Facilita refactoring después.

---

### Ejecutar tareas independientes en paralelo

```
"Tengo 3 módulos independientes para hacer: [A], [B] y [C].
Lanzalos en paralelo para ser más eficiente."
```
**Skills activos:** dispatching-parallel-agents
**Cuándo:** Cuando tenés 2+ tareas que no dependen una de la otra.
**Por qué:** Reduce tiempo total al ejecutar en paralelo.

---

### Pulsar una interfaz existente

```
"La pantalla de [X] se ve genérica. Puliame el diseño, los colores,
la tipografía y los espacios. Que se vea profesional."
```
**Skills activos:** impeccable
**Cuándo:** Cuando la funcionalidad funciona pero la UI se ve básica.
**Por qué:** Tiene 44 reglas que detectan anti-patrones visuales comunes.

---

### Agregar animaciones y micro-interacciones

```
"Agregá transiciones y animaciones a los botones, modales y
cambios de estado de la app. Que se sienta fluido."
```
**Skills activos:** impeccable
**Cuándo:** Después de que la funcionalidad base está hecha.
**Por qué:** Las animaciones comunican estados y hacen la app se sienta viva.

---

## FASE 4: CALIDAD

### Review exhaustivo de código

```
"Haceme un review completo del código que toqué hoy.
Quiero saber si hay code smells, problemas de seguridad,
o inconsistencias de estilo."
```
**Skills activos:** code-reviewer
**Cuándo:** Antes de commitear, antes de un PR, o cuando cerrás un feature.
**Por qué:** Captura problemas que el ojo cansado no ve.

---

### Fixear un bug difícil

```
"Tengo un bug que [descripción]. No sé de dónde viene.
Ayudame a encontrar la causa raíz antes de arreglar."
```
**Skills activos:** systematic-debugging
**Cuándo:** Cuando el bug no es obvio o ya intentaste arreglarlo y fallaste.
**Por qué:** Obliga a diagnosticar antes de tocar código. Evita fixes superficiales.

---

### Verificar que todo funciona antes de dar por terminado

```
"Terminé de implementar [feature]. Corré los tests, verificá
que no se rompió nada y confirmá que está todo OK."
```
**Skills activos:** verification-before-completion
**Cuándo:** Siempre antes de declarar algo como "listo".
**Por qué:** Evidencia antes de assertion. Nunca asumir que funciona.

---

### Auditar seguridad

```
"Auditá los cambios que hice por temas de seguridad.
Quiero saber si expuse datos, secrets, o tengo vulnerabilidades."
```
**Skills activos:** infosec
**Cuándo:** Antes de deploy, al manejar auth, datos sensibles, o APIs.
**Por qué:** ISO 27001-aligned. Cubre encryption, access control, secrets, etc.

---

## FASE 5: TESTING

### Testear la app en el navegador

```
"Probame la app en el navegador. Navegá por las pantallas
principales, tomá screenshots y reportame si ves algo raro."
```
**Skills activos:** webapp-testing
**Cuándo:** Después de cambios de UI, antes de release, o para debug visual.
**Por qué:** Playwright navega la app real y captura screenshots + logs.

---

### Probar responsive / accesibilidad

```
"Probá cómo se ve la app en pantallas chicas y chicas.
Verificá que los textos sean legibles y los botones clickeables."
```
**Skills activos:** webapp-testing → impeccable
**Cuándo:** Cuando querés asegurar que funciona en todos los tamaños.
**Por qué:** Combina testing real con criteria de diseño.

---

## FASE 6: CIERRE

### Escribir un commit message

```
"Escribime un commit message para los cambios que tengo staged."
```
**Skills activos:** git-commit-writer
**Cuándo:** Antes de cada commit.
**Por qué:** Mensajes consistentes en formato Conventional Commits.

---

### Completar un branch de desarrollo

```
"El feature está terminado y todo pasa. ¿Qué hacemos con el branch?
¿Merge, PR, o limpiamos?"
```
**Skills activos:** finishing-a-development-branch
**Cuándo:** Cuando el trabajo en un branch está completo.
**Por qué:** Guía las opciones de integración de forma estructurada.

---

### Limpiar texto generado por AI

```
"Este texto lo generó AI y se nota. Limpiale las frases
predictibles y que suene humano."
```
**Skills activos:** stop-slop
**Cuándo:** Cuando redactás documentación, descripciones, o comunicaciones.
**Por qué:** Elimina los "delve", "leverage", "seamless" y otras frases de AI.

---

## TRUCOS

### Activar un skill manualmente
```
"Usá brainstorming para..."
"Activá code-reviewer"
"Cargá impeccable para revisar esta pantalla"
```

### Combinar múltiples skills
```
"Arreglá este bug y después pulí la UI"
→ systematic-debugging primero, luego impeccable
```

### Ejecutar en background mientras hacés otra cosa
```
"Dispatchá un agente que me haga tests para el módulo de pedidos
y mientras tanto ayudame con el diseño del dashboard"
```

---

## FLUJO TÍPICO PARA UN FEATURE NUEVO

```
1. brainstorming     → "¿Qué necesito exactamente?"
2. frontend-design   → "¿Cómo debería verse?"
3. writing-plans     → "¿Qué pasos son necesarios?"
4. test-driven-development → "Implemento con tests"
5. impeccable        → "Pulio la UI"
6. code-reviewer     → "Revisá mi código"
7. webapp-testing    → "Probalo en el navegador"
8. git-commit-writer → "Escribí el commit"
```

---

## FLUJO PARA UN BUG

```
1. systematic-debugging → "Diagnosticá la causa raíz"
2. test-driven-development → "Escribí test que reproduzca el bug"
3. Fix del bug
4. verification-before-completion → "Verificá que quedó resuelto"
5. code-reviewer → "Revisá que no introduje regression"
```

---

## FLUJO PARA PULIR UNA APP EXISTENTE

```
1. webapp-testing   → "Capturá el estado actual"
2. impeccable       → "Puliame el diseño"
3. frontend-design  → "¿Mejoró la coherencia visual?"
4. webapp-testing   → "Verificá que no se rompió nada"
```
