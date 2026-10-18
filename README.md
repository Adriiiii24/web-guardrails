# web-guardrails

Tres skills de Claude Code para construir webs con criterio: seguras, legales en España y la UE, y sin gastar de más en modelos. Se instalan como un plugin e incluyen una suite de evals que mide cuánto mejoran las respuestas de Claude.

![validate](https://github.com/Adriiiii24/web-guardrails/actions/workflows/validate.yml/badge.svg)

## Qué incluye

| Skill | Qué hace | Cuándo se activa |
|---|---|---|
| `web-security` | Seguridad web según OWASP Top 10:2025, NIST SP 800-63B-4 y el OWASP Top 10 para aplicaciones con LLM: RLS en Supabase, contraseñas, sesiones, CSRF, cabeceras, SSRF, cadena de suministro y funciones con IA. | Sola, cuando la tarea toca seguridad. |
| `web-compliance-legal` | Cumplimiento en España y la UE: RGPD y LOPDGDD, LSSI-CE y guía de cookies de la AEPD, consumo (TRLGDCU y botón de desistimiento), accesibilidad (WCAG 2.2, Ley 11/2023, RD 707/2026), DSA y artículo 50 de la Ley de IA. | Sola, con formularios, cookies, compras, textos legales o IA de cara al usuario. |
| `model-router` | Clasifica una tarea y recomienda el modelo más económico que la resuelve bien: Claude Opus 5.5, Sonnet 5.5 o Haiku 5.5. | Solo cuando la llamas. |

Cada regla cita su norma o estándar, y cada skill termina con sus fuentes y la fecha en que se comprobaron.

## Instalación

**Como plugin.** Desde Claude Code:

```text
/plugin marketplace add Adriiiii24/web-guardrails
/plugin install web-guardrails@adriiiii24
```

Las skills quedan con el prefijo del plugin: `web-guardrails:web-security`, `web-guardrails:web-compliance-legal` y el comando `/web-guardrails:model-router`.

**Solo las skills que quieras.** Copia su carpeta desde [`plugins/web-guardrails/skills/`](plugins/web-guardrails/skills/) a `~/.claude/skills/` (para todos tus proyectos) o a `.claude/skills/` (para uno). Así instalado, el router se llama `/model-router`.

## Uso

Las dos primeras no hace falta nombrarlas: pide la tarea con normalidad y Claude carga la que toca.

> Crea en React el banner de cookies de mi web (uso Google Analytics).

El router se llama a mano, con la tarea detrás:

```text
/web-guardrails:model-router Diseñar el esquema multi-tenant con RLS para un SaaS de facturación y generar 200 filas de prueba por tabla
```

Responde con una evaluación por subtarea. Este es el comienzo de una respuesta real:

> ### 🔀 Model Routing Assessment
>
> - **Task Summary:** Diseñar el esquema multi-tenant de un SaaS de facturación (tenants, usuarios, clientes, facturas, líneas, impuestos, pagos) y sus políticas RLS para aislar los datos de cada tenant.
> - **Complexity Level:** TIER 1 (High)
> - **Recommended Model:** Claude Opus 5.5
> - **Reasoning:** Si una política RLS falla, los datos fiscales de un cliente quedan a la vista de otro. (…) Es arquitectura y seguridad a la vez, y ahí sí compensa pagar el razonamiento extra.
> - **Optimization Tip:** Pide que el resultado sea un único bloque DDL autocontenido. Ese bloque es lo único que necesita la siguiente subtarea.
>
> (…) La segunda subtarea, generar las filas de prueba, va a TIER 3 con Claude Haiku 5.5.

Las etiquetas van siempre en inglés y el contenido en el idioma de quien pregunta.

## Cómo se ha evaluado

La suite está en [`plugins/web-guardrails/evals/`](plugins/web-guardrails/evals/) y usa `claude plugin eval`, el sistema de evals de Claude Code. Cada caso es una petición realista con varios graders deterministas: expresiones regulares sobre la respuesta y comprobaciones de qué skill se usó. Cada caso se ejecuta en una sesión aislada, sin configuración ni memoria personal, primero con el plugin y luego sin él. La diferencia (Δ) es lo que aportan las skills.

Resultados del 18/10/2026, con Claude Code 2.1.301 y `claude-opus-5-5`, una ejecución con el plugin y otra sin él por caso:

| Caso | Qué comprueba | Con plugin | Sin plugin | Δ |
|---|---|---|---|---|
| `router-prices` | Los precios del router llegan intactos al modelo | 1,00 | 0,00 | +1,00 |
| `router-manual` | Reparte una petición mixta entre niveles con el formato fijo | 1,00 | 0,20 | +0,80 |
| `router-subscription` | Con suscripción habla de límite de uso, no de dólares | 1,00 | 0,67 | +0,33 |
| `legal-checkout` | «Pedido con obligación de pago», IVA, 14 días y botón de desistimiento | 1,00 | 0,75 | +0,25 |
| `ai-chatbot` | Aviso de que es una IA, clave en el servidor y límites de uso | 1,00 | 0,75 | +0,25 |
| `legal-newsletter` | Casillas sin marcar, primera capa informativa, doble opt-in, versión de los textos aceptados y baja | 1,00 | 0,83 | +0,17 |
| `sec-login` | Error genérico, límite de intentos, cookies HttpOnly y comprobación de origen | 1,00 | 0,88 | +0,13 |
| `sec-password` | Regla de NIST: 15 caracteres, sin reglas de composición, contraseñas filtradas y NFC | 1,00 | 0,89 | +0,11 |
| `legal-cookies` | Rechazar al mismo nivel, analítica bloqueada, caducidad y transferencia a EE. UU. | 1,00 | 1,00 | 0,00 |
| `router-negative` | Una petición normal no activa el router | 1,00 | 1,00 | 0,00 |

Lo que dicen estos números:

- **Con el plugin, los diez casos sacan 1,00.**
- **Sin él, Opus 5.5 ya resuelve bien lo básico.** Aplica la regla de NIST de 15 caracteres, no guarda tokens en `localStorage` y hace un banner de cookies correcto. El plugin aporta más en lo que el modelo no sabe o no prioriza: el botón de desistimiento de la Directiva 2023/2673, el aviso de IA del artículo 50 y el registro de qué versión de los textos se aceptó.
- **El Δ del router dice poco.** Sin el plugin el comando no existe, así que la comparación solo confirma que el formato y los precios salen de la skill. `router-negative` es la prueba contraria: si no se llama, no aparece.
- **Lo que no puntúa.** Los graders que comprueban qué skill se usó y el que busca el aviso legal (una convención de la propia skill) se muestran como indicadores, pero no cuentan para Δ.
- **Cómo se validaron los graders.** Antes de usarlos, los pasé por respuestas buenas ya revisadas a mano, y todos pasaron. Las ejecuciones sin plugin muestran que también fallan cuando falta algo.
- **Una iteración de la suite.** La primera versión solo medía lo básico, y la versión sin plugin también lo cumplía. Añadí graders para requisitos concretos que exige la skill: la versión de los textos aceptados, la baja en cada envío y la transferencia a EE. UU.

Para repetirlo: `claude plugin eval ./plugins/web-guardrails`. Por defecto hace tres ejecuciones con el plugin y tres sin él por caso, así que consume más uso.

### Fallos que encontraron las pruebas

- **El `$` de los precios.** Claude Code sustituye `$` seguido de un número por los argumentos del comando, así que «$4 / $20» le llegaba al modelo como «base / de». Ahora los precios van sin `$` y el linter lo vigila.
- **Un formato del router que cambiaba.** Unas veces traducía la plantilla y otras no. Ahora las etiquetas van siempre en inglés y el contenido en el idioma del usuario.
- **Una duda sobre la normalización.** El modelo dudaba entre NFC y NFKC. La skill aclara que NFC es lo que pide la revisión 4 de NIST.

## Decisiones de diseño

- **Router solo manual.** Lleva `disable-model-invocation: true`: Claude no puede activarlo por su cuenta. Su instrucción es responder solo con la evaluación, así que se adueñaría de cualquier tarea de código.
- **Precios de API, no de suscripción.** Los dólares solo cuentan si pagas por token. Con suscripción, el router habla de coste relativo y de límite de uso.
- **Fuentes primarias.** Solo entra lo confirmado en el BOE, EUR-Lex, NIST, OWASP, W3C o la documentación oficial. Lo que todavía no es ley, como subir a 16 años la edad de consentimiento, se marca como pendiente.

## Limitaciones

- La parte legal no es asesoramiento jurídico. Revisa los textos con un abogado.
- La normativa se revisó el 18/10/2026. Seguían pendientes la transposición española del botón de desistimiento, la subida a 16 años de la edad de consentimiento (proyecto 121/000052) y los cambios de cookies del Ómnibus Digital.
- Las evals comprueban patrones en las respuestas, no que el código generado compile o funcione.

## Desarrollo

```bash
node tools/lint-skills.mjs                                # lo que validate no mira: $N, modelos retirados, YAML
claude plugin validate ./plugins/web-guardrails --strict  # manifiesto y cabecera de cada skill
claude plugin validate . --strict                         # marketplace
claude plugin eval ./plugins/web-guardrails               # evals (Claude Code 2.1.269+): gasta uso de tu plan o de tu API
```

GitHub Actions ejecuta el linter y las dos validaciones en cada push. Las evals no, porque necesitan credenciales y consumen uso.

## Estructura

```text
.claude-plugin/marketplace.json     catálogo del marketplace
plugins/web-guardrails/
├── .claude-plugin/plugin.json      manifiesto del plugin
├── skills/                         las tres skills
└── evals/                          10 casos y 53 graders
tools/lint-skills.mjs               linter de las skills
.github/workflows/validate.yml      integración continua
```

## Licencia

[MIT](LICENSE) © 2026 Adrián Martínez Panés
