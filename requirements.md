# 🎯 **OBJETIVO DEL PROYECTO**

El objetivo del proyecto es construir una **herramienta que convierta automáticamente JSON Schemas en definiciones de tipos TypeScript**, generando código legible, seguro y consistente.
La herramienta deberá tomar como entrada un archivo o estructura JSON que describa un schema válido y producir como salida:

* **Interfaces o tipos TypeScript**, con la estructura equivalente al schema.
* **Un AST interno propio** que represente de forma independiente el esquema, permitiendo futuras extensiones, validaciones y nuevas salidas.

El proyecto debe ser **modular, extensible y fácil de mantener**, con un pipeline claro:

```
JSON Schema → Parser → AST → TypeScript Generator → Output
```

---

# 📦 **REQUERIMIENTOS DEL PROYECTO**

A continuación se detallan todos los requisitos funcionales y técnicos que definen el alcance.

---

# 1. **Requerimientos Funcionales**

### ✔️ **1.1. Entrada del sistema**

* Se debe aceptar:

  * Un objeto JSON Schema en memoria.
  * Opcionalmente: archivos `.json` en disco (en versiones posteriores).
* No se soportan referencias (`$ref`), ni internas ni externas.

---

### ✔️ **1.2. Comportamiento principal**

La herramienta debe:

1. **Leer e interpretar** un JSON Schema.
2. **Transformarlo a un AST interno**, que represente el tipo de forma abstracta y unificada.
3. **Generar TypeScript legible** a partir del AST.
4. Permitir ser utilizada:

   * como función programática dentro de un proyecto,
   * como futura base para CLI (opcional).

---

### ✔️ **1.3. Soporte mínimo de keywords de JSON Schema**

La versión MVP debe soportar correctamente:

#### **Tipos primitivos**

* `type: "string"`
* `type: "number"`
* `type: "integer"` → se convertirá a `number`
* `type: "boolean"`
* `type: "null"`
* `type: ["…"]` (union de tipos)

#### **Objetos**

* `type: "object"`
* `properties`
* `required`
* `additionalProperties` (`false`, `true`, objeto)

#### **Arrays**

* `type: "array"`
* `items` como:

  * objeto → array homogénea
  * array → tuplas
* `minItems`, `maxItems` (opcional en generación)

#### **Enum y const**

* `enum`
* `const`

#### **Combinadores**

* `oneOf`
* `anyOf`
* `allOf`

#### **Valores por defecto**

* Si `type` no se determina → se toma como `any`.

---

### ✔️ **1.4. Salida esperada**

La herramienta debe generar **código TypeScript válido**, utilizando:

* `type` o `interface`, según convenga.
* Uniones (`|`) para:

  * `oneOf`, `anyOf`
  * `enum`
  * `type` con varios tipos
* Intersecciones (`&`) para:

  * `allOf`
* Objetos con:

  * Propiedades opcionales y requeridas (`?`)
  * `additionalProperties` expresado como:

    * `{ [key: string]: T }`
    * `never` si está deshabilitado
* Arrays y tuplas:

  * `T[]`
  * `[T1, T2, …]`

El código debe ser **ordenado, indentado y fácil de leer**.

---

# 2. **Requerimientos Técnicos**

### ✔️ **2.1. Arquitectura del sistema**

Debe implementarse bajo un diseño modular con la siguiente división lógica:

```
/parser       → convierte JSON Schema → AST
/ast          → define las estructuras de AST
/generator    → convierte AST → TypeScript
/index.ts     → API pública
/tests        → pruebas unitarias
```

---

### ✔️ **2.2. AST personalizado**

El AST debe definirse explícitamente, con nodos para:

* tipos primitivos,
* objetos,
* arreglos,
* tuplas,
* enums,
* uniones e intersecciones.

Este AST debe:

* Ser independiente del JSON Schema original.
* Contener únicamente la información necesaria para generar TS.
* Ser 100% exhaustivo vía discriminantes como `kind: "…"`.
* Facilitar futuras ampliaciones (por ejemplo, branded types o Zod generators).

---

### ✔️ **2.3. Parser**

El parser debe:

* Validar mínimamente la estructura del schema.
* Convertir cada keyword soportada en un nodo AST.
* Ignorar keywords no soportadas sin romper la herramienta.
* Manejar errores claros:

  * tipos desconocidos,
  * combinaciones inválidas,
  * valores no permitidos.

---

### ✔️ **2.4. Generador TypeScript**

El generador debe:

* Recibir un nodo AST y devolver una cadena TypeScript.
* Soportar:

  * indentación,
  * comentarios opcionales,
  * nombres opcionales de tipos (cuando se use como API).
* Garantizar que el código es válido según el compilador TypeScript.

---

### ✔️ **2.5. Tests**

Debe cubrir:

* Tipos primitivos.
* Objetos simples.
* Objetos con propiedades opcionales.
* Arrays homogéneos y tuplas.
* `oneOf`, `anyOf`, `allOf`.
* `enum` y `const`.

---

# 3. **Requerimientos No Funcionales**

### 🧪 **3.1. Mantenibilidad**

* Código modular y documentado.
* AST simple y estable.
* Tests obligatorios en las partes esenciales.
* Casos de error claros.

### 📦 **3.2. Extensibilidad**

El diseño debe permitir agregar en el futuro:

* `$ref`
* compilación incremental
* CLI completo
* formatos de salida alternativos (Zod, JSDoc, JSON, etc.)

### 🧩 **3.3. Rendimiento**

No se requiere alta performance, pero sí evitar:

* ciclos infinitos,
* recursion excesiva en unions/objects profundos.

### 🔒 **3.4. Robustez**

* Manejo consistente de edge cases.
* No romper en esquemas incompletos.

---

# 📘 **RESUMEN**

Tu proyecto será una herramienta que:

1. **Lee** JSON Schemas.
2. **Los transforma** en un AST propio, simple y bien definido.
3. **Genera** tipos TypeScript de alta calidad.
4. Está diseñada para crecer y eventualmente soportar más características del estándar.

---

Si quieres, puedo generarte:

* ✔ una versión lista para pegar (`src/` completo)
* ✔ el AST totalmente tipado en TypeScript
* ✔ el parser inicial
* ✔ el generador TypeScript completo
* ✔ los primeros tests base


